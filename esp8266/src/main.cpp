// ============================================================
//  ESP8266 NFC Bridge — Multi-board Serial JSON
//  Board: NodeMCU v2 (ESP8266)  |  PlatformIO
// ============================================================
//  SPI (fixed on ESP8266):
//    SCK  = GPIO 14 (D5)
//    MOSI = GPIO 13 (D7)
//    MISO = GPIO 12 (D6)
//
//  CS pins (safe GPIO):
//    GPIO 4  (D2) → NFC #1
//    GPIO 5  (D1) → NFC #2
//    GPIO 16 (D0) → NFC #3
//    GPIO 2  (D4) → NFC #4 (Board A only, ปกติเป็น RST)
//
//  Build flags per board:
//    BOARD_ID    — board identifier (1, 2, 3)
//    NFC_COUNT   — number of NFC readers (3 or 4)
//    SLOT_OFFSET — global slot offset (0, 4, or 7)
//    PIN_RST     — RST pin (0 for Board A, 2 for Board B/C)
//
//  Board A: BOARD_ID=1, NFC_COUNT=4, SLOT_OFFSET=0, PIN_RST=0
//           → slots 1,2,3,4  CS: GPIO 4,5,16,2
//  Board B: BOARD_ID=2, NFC_COUNT=3, SLOT_OFFSET=4, PIN_RST=2
//           → slots 5,6,7    CS: GPIO 4,5,16
//  Board C: BOARD_ID=3, NFC_COUNT=3, SLOT_OFFSET=7, PIN_RST=2
//           → slots 8,9,10   CS: GPIO 4,5,16
// ============================================================

#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ArduinoJson.h>

// ── Build flags (set in platformio.ini) ──────────────────────
#ifndef BOARD_ID
#define BOARD_ID 1
#endif
#ifndef NFC_COUNT
#define NFC_COUNT 3
#endif
#ifndef SLOT_OFFSET
#define SLOT_OFFSET 0
#endif
#ifndef PIN_RST
#define PIN_RST 2
#endif

// ── CS pins ──────────────────────────────────────────────────
// ตรงกับสายที่ต่อจริง:
// Board A (4 NFC): GPIO 5, 4, 2, 15
// Board B/C (3 NFC): GPIO 5, 4, 2
const uint8_t CS_PINS[] = {
  5,    // D1 → NFC #1
  4,    // D2 → NFC #2
  2,    // D4 → NFC #3
  15,   // D8 → NFC #4 (Board A only, ⚠️มี pull-down)
};
// Only NFC_COUNT pins are actually used

// Global slot = SLOT_OFFSET + localIndex + 1
static uint8_t localToGlobalSlot(uint8_t localIdx) {
  return SLOT_OFFSET + localIdx + 1;
}

// ── Reader Objects ───────────────────────────────────────────
MFRC522* readers[4]; // max 4
bool readerOK[4] = {};

unsigned long lastDiagMs = 0;
String serialBuffer = "";

// ── Helpers ──────────────────────────────────────────────────
static String uidToHex(const MFRC522::Uid &uid) {
  String out;
  out.reserve(uid.size * 3);
  for (uint8_t i = 0; i < uid.size; i++) {
    if (i) out += ':';
    if (uid.uidByte[i] < 0x10) out += '0';
    out += String(uid.uidByte[i], HEX);
  }
  out.toUpperCase();
  return out;
}

static bool versionOK(uint8_t v) {
  return (v != 0x00 && v != 0xFF);
}

static void initReader(uint8_t i) {
  uint8_t ver = 0;
  bool success = false;
  
  // Retry loop for initialization
  for (int retry = 0; retry < 5; retry++) {
    readers[i]->PCD_Init();
    delay(100); // Give it plenty of time to stabilize
    
    // Explicitly turn on antenna and check
    readers[i]->PCD_AntennaOn();
    delay(50);
    
    // Check if antenna is REALLY on (TxControlReg bits 0 and 1)
    uint8_t txCtrl = readers[i]->PCD_ReadRegister(MFRC522::TxControlReg);
    ver = readers[i]->PCD_ReadRegister(MFRC522::VersionReg);
    
    // Version 0x91 or 0x92 are genuine. 
    // 0x12, 0x88, 0x89 are common clones.
    // 0x00 and 0xFF are dead/disconnected.
    if (versionOK(ver) && (txCtrl & 0x03) == 0x03) {
      success = true;
      break;
    }
    
    // If we get here, it failed. Force a soft reset before next loop.
    readers[i]->PCD_WriteRegister(MFRC522::CommandReg, MFRC522::PCD_SoftReset);
    delay(100);
  }

  // Set to absolute maximum gain (48dB) for best sensitivity
  readers[i]->PCD_SetAntennaGain(MFRC522::RxGain_max); 
  delay(20);
  
  readerOK[i] = success;

  // Diagnostic Log for boot failure
  if (!success) {
    Serial.print(F("ℹ️ Reader #"));
    Serial.print(localToGlobalSlot(i));
    Serial.print(F(" Failed to Init. Last Ver: 0x"));
    if (ver < 0x10) Serial.print('0');
    Serial.println(ver, HEX);
  }
}
// ── Cached UIDs ──────────────────────────────────────────────
String cachedUid[10] = {"", "", "", "", "", "", "", "", "", ""};
unsigned long uidExpireMs[10] = {0, 0, 0, 0, 0, 0, 0, 0, 0, 0};

static String readSlot(uint8_t idx) {
  if (idx >= NFC_COUNT || !readerOK[idx]) return "";

  if (millis() < uidExpireMs[idx] && cachedUid[idx].length() > 0) {
    return cachedUid[idx];
  }
  return "";
}

// Convert global slot → local index (-1 if not on this board)
static int8_t globalSlotToLocal(int globalSlot) {
  int first = SLOT_OFFSET + 1;
  int last  = SLOT_OFFSET + NFC_COUNT;
  if (globalSlot < first || globalSlot > last) return -1;
  return globalSlot - first;
}

// ── Command Handlers ─────────────────────────────────────────
static void handlePing(JsonDocument& req) {
  int id = req["id"] | 0;
  JsonDocument resp;
  resp["id"] = id;
  resp["ok"] = true;
  resp["pong"] = true;
  resp["boardId"] = BOARD_ID;
  resp["readers"] = NFC_COUNT;

  uint8_t active = 0;
  for (uint8_t i = 0; i < NFC_COUNT; i++) {
    if (readerOK[i]) active++;
  }
  resp["active"] = active;

  JsonArray slotsArr = resp["slots"].to<JsonArray>();
  for (uint8_t i = 0; i < NFC_COUNT; i++) {
    slotsArr.add(localToGlobalSlot(i));
  }

  serializeJson(resp, Serial);
  Serial.println();
}

static void handleRead(JsonDocument& req) {
  int id = req["id"] | 0;
  int slot = req["slot"] | 0;
  JsonDocument resp;
  resp["id"] = id;
  resp["ok"] = true;
  resp["slot"] = slot;
  resp["boardId"] = BOARD_ID;

  int8_t local = globalSlotToLocal(slot);
  if (local < 0) {
    resp["ok"] = false;
    resp["error"] = "slot not on this board";
    resp["uid"] = (const char*)nullptr;
    serializeJson(resp, Serial);
    Serial.println();
    return;
  }

  if (!readerOK[local]) {
    resp["uid"] = (const char*)nullptr;
    resp["error"] = "reader offline";
    serializeJson(resp, Serial);
    Serial.println();
    return;
  }

  String uid = readSlot(local);
  if (uid.length() > 0) {
    resp["uid"] = uid;
  } else {
    resp["uid"] = (const char*)nullptr;
  }

  serializeJson(resp, Serial);
  Serial.println();
}

static void handleScan(JsonDocument& req) {
  int id = req["id"] | 0;
  JsonDocument resp;
  resp["id"] = id;
  resp["ok"] = true;
  resp["boardId"] = BOARD_ID;
  JsonArray slots = resp["slots"].to<JsonArray>();

  for (uint8_t i = 0; i < NFC_COUNT; i++) {
    JsonObject s = slots.add<JsonObject>();
    s["slot"] = localToGlobalSlot(i);
    s["online"] = readerOK[i];

    if (readerOK[i]) {
      String uid = readSlot(i);
      if (uid.length() > 0) {
        s["uid"] = uid;
      } else {
        s["uid"] = (const char*)nullptr;
      }
    } else {
      s["uid"] = (const char*)nullptr;
    }
    delay(10); // Reduced delay
  }

  serializeJson(resp, Serial);
  Serial.println();
}

// Re-initialize all NFC readers (recover from brownout)
static void handleReinit(JsonDocument& req) {
  int id = req["id"] | 0;

  // RST pulse to wake up all MFRC522
  digitalWrite(PIN_RST, LOW);
  delay(50);
  digitalWrite(PIN_RST, HIGH);
  delay(100);

  uint8_t recovered = 0;
  for (uint8_t i = 0; i < NFC_COUNT; i++) {
    initReader(i);
    delay(30);
    uint8_t ver = readers[i]->PCD_ReadRegister(MFRC522::VersionReg);
    readerOK[i] = versionOK(ver);
    if (readerOK[i]) recovered++;
    // Clear cached UIDs
    cachedUid[i] = "";
    uidExpireMs[i] = 0;
  }

  JsonDocument resp;
  resp["id"] = id;
  resp["ok"] = true;
  resp["cmd"] = "reinit";
  resp["boardId"] = BOARD_ID;
  resp["recovered"] = recovered;
  resp["total"] = NFC_COUNT;
  serializeJson(resp, Serial);
  Serial.println();
}

static void processSerialCommand(const String& line) {
  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, line);
  if (err) return;

  const char* cmd = doc["cmd"] | "";

  if (strcmp(cmd, "ping") == 0) {
    handlePing(doc);
  } else if (strcmp(cmd, "read") == 0) {
    handleRead(doc);
  } else if (strcmp(cmd, "scan") == 0) {
    handleScan(doc);
  } else if (strcmp(cmd, "reinit") == 0) {
    handleReinit(doc);
  } else {
    JsonDocument resp;
    resp["id"] = doc["id"] | 0;
    resp["ok"] = false;
    resp["error"] = "unknown command";
    resp["boardId"] = BOARD_ID;
    serializeJson(resp, Serial);
    Serial.println();
  }
}

// ── Setup ────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(300);

  // CS pins HIGH (inactive)
  for (uint8_t i = 0; i < NFC_COUNT; i++) {
    pinMode(CS_PINS[i], OUTPUT);
    digitalWrite(CS_PINS[i], HIGH);
  }

  // RST pulse
  pinMode(PIN_RST, OUTPUT);
  digitalWrite(PIN_RST, LOW);
  delay(50);
  digitalWrite(PIN_RST, HIGH);
  delay(100);

  // Init SPI (ESP8266 default: SCK=14, MISO=12, MOSI=13)
  SPI.begin();
  
  // Lower SPI speed significantly to improve consistency on messy wiring
  // 500kHz is usually very stable even with 20cm jumper wires
  SPI.setClockDivider(SPI_CLOCK_DIV128); 
  SPI.setDataMode(SPI_MODE0);

  uint8_t found = 0;
  for (uint8_t i = 0; i < NFC_COUNT; i++) {
    readers[i] = new MFRC522(CS_PINS[i], MFRC522::UNUSED_PIN);
    initReader(i); // Now handles readerOK internaly
    if (readerOK[i]) found++;
    delay(100);
  }

  // Boot message
  JsonDocument bootMsg;
  bootMsg["boot"] = true;
  bootMsg["boardId"] = BOARD_ID;
  bootMsg["readers_found"] = found;
  bootMsg["readers_total"] = NFC_COUNT;

  JsonArray slotsArr = bootMsg["slots"].to<JsonArray>();
  for (uint8_t i = 0; i < NFC_COUNT; i++) {
    slotsArr.add(localToGlobalSlot(i));
  }

  serializeJson(bootMsg, Serial);
  Serial.println();

  serialBuffer.reserve(256);
}

// ── Loop ─────────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

    // อ่าน UID ตลอดเวลาเพื่อรักษาคลื่นสัญญาณ
  for (uint8_t i = 0; i < NFC_COUNT; i++) {
    if (!readerOK[i]) continue;

    // --- Antenna Watchdog ---
    // สำหรับรุ่น Clone (0x82/0x18) บางทีเสาอากาศจะดับเอง
    // ตรวจสอบ TxControlReg (0x14): Bit 0 & 1 ต้องเป็น HIGH
    uint8_t txCtrl = readers[i]->PCD_ReadRegister(MFRC522::TxControlReg);
    if ((txCtrl & 0x03) != 0x03) {
      readers[i]->PCD_AntennaOn();
      readers[i]->PCD_SetAntennaGain(MFRC522::RxGain_max);
    }
    
    // ย้ำ Antenna Gain ทุกครั้งเพื่อกันร่วง
    readers[i]->PCD_SetAntennaGain(MFRC522::RxGain_max);
    
    // ลองอ่าน 3 ครั้งถ้าพลาด (Internal Retry)
    bool success = false;
    for (int retry = 0; retry < 3; retry++) {
      byte bufferATQA[2];
      byte bufferSize = sizeof(bufferATQA);
      
      if (readers[i]->PICC_WakeupA(bufferATQA, &bufferSize) == MFRC522::STATUS_OK ||
          readers[i]->PICC_RequestA(bufferATQA, &bufferSize) == MFRC522::STATUS_OK) 
      {
        if (readers[i]->PICC_ReadCardSerial()) {
          cachedUid[i] = uidToHex(readers[i]->uid);
          uidExpireMs[i] = millis() + 1000;
          
          readers[i]->PICC_HaltA();
          readers[i]->PCD_StopCrypto1();
          success = true;
          break;
        }
      }
      delay(2); // พักนิดหน่อยระหว่างลองใหม่
    }

    if (!success) {
      cachedUid[i] = "";
      uidExpireMs[i] = 0;
    }
    
    yield(); // ให้ระบบ ESP8266 ทำงานเบื้องหลังได้ลื่น (Serial/Network)
    delay(5); // ป้องกันกระแสตกจากการเปิดเสาอากาศพร้อมกันเกินไป
  }

  // Handle incoming Serial commands
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n' || c == '\r') {
      if (serialBuffer.length() > 0) {
        processSerialCommand(serialBuffer);
        serialBuffer = "";
      }
    } else {
      serialBuffer += c;
      if (serialBuffer.length() > 512) {
        serialBuffer = "";
      }
    }
  }

  // Diag heartbeat every 5s (เหมือนผู้ใช้ทำไว้)
  if (now - lastDiagMs > 5000) {
    lastDiagMs = now;

    JsonDocument diag;
    diag["diag"] = true;
    diag["boardId"] = BOARD_ID;
    JsonArray arr = diag["readers"].to<JsonArray>();

    for (uint8_t i = 0; i < NFC_COUNT; i++) {
      uint8_t ver = readers[i]->PCD_ReadRegister(MFRC522::VersionReg);
      bool ok = versionOK(ver);

      if (!readerOK[i] && ok) {
        initReader(i);
        ver = readers[i]->PCD_ReadRegister(MFRC522::VersionReg);
        ok = versionOK(ver);
      }
      readerOK[i] = ok;

      JsonObject r = arr.add<JsonObject>();
      r["slot"] = localToGlobalSlot(i);
      r["ver"] = ver;
      r["ok"] = ok;
    }

    serializeJson(diag, Serial);
    Serial.println();
  }
}
