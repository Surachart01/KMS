// ============================================================
//  Espino32 (ThaiEasyElec) — 4x RC522 Test
//  Board: ESP32dev  |  PlatformIO
// ============================================================
//
//  SPI Bus (shared ทุก reader):
//    GPIO18  → SCK   ของ RC522 ทุกตัว
//    GPIO23  → MOSI  ของ RC522 ทุกตัว
//    GPIO19  → MISO  ของ RC522 ทุกตัว
//    GPIO5   → RST   ของ RC522 ทุกตัว  (shared)
//
//  CS (SDA/SS) แยกทีละตัว (active-LOW):
//    GPIO25  → RC522 #1  SDA/SS
//    GPIO26  → RC522 #2  SDA/SS
//    GPIO27  → RC522 #3  SDA/SS
//    GPIO32  → RC522 #4  SDA/SS
//
//  Power:
//    3V3 → VCC ของ RC522 ทุกตัว  ⚠️ ห้ามใช้ 5V
//    GND → GND ร่วมกันทุกตัว
//
//  ⚠️ Clone board (FM17522E ฯลฯ):
//    ถ้า VersionReg = 0x00 / 0xFF → ลอง swap สาย MOSI ↔ MISO แล้วเทสใหม่
// ============================================================

#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>

// ── Constants ────────────────────────────────────────────────
static constexpr uint8_t READER_COUNT = 4;
static constexpr uint8_t PIN_RST      = 5;   // GPIO5 — shared RST

static const uint8_t CS_PINS[READER_COUNT] = {
  25,   // GPIO25 — Reader #1
  26,   // GPIO26 — Reader #2
  27,   // GPIO27 — Reader #3
  32,   // GPIO32 — Reader #4
};

// ── Objects ──────────────────────────────────────────────────
// ใช้ object เดียว แล้วสลับ CS ทีละหัวเพื่อลด state ค้างใน library
MFRC522 rc522(SS, MFRC522::UNUSED_PIN);
bool readerOK[READER_COUNT] = {};
unsigned long lastDiagMs = 0;
String lastUidByReader[READER_COUNT];

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
  switch (v) {
    case 0x91: case 0x92: case 0x88:       // NXP แท้
    case 0x18: case 0x12:                  // FM17522E clone
    case 0x82: case 0x8A: case 0x9A:       // clone อื่น
      return true;
    default:
      return false;
  }
}

static void resetAllCS() {
  for (uint8_t i = 0; i < READER_COUNT; i++) {
    digitalWrite(CS_PINS[i], HIGH);
  }
}

static uint8_t readVersionAt(uint8_t idx) {
  resetAllCS();
  digitalWrite(CS_PINS[idx], LOW);
  delayMicroseconds(200);
  rc522.PCD_Init(CS_PINS[idx], MFRC522::UNUSED_PIN);
  delay(2);
  const uint8_t ver = rc522.PCD_ReadRegister(MFRC522::VersionReg);
  digitalWrite(CS_PINS[idx], HIGH);
  return ver;
}

// ── RST hardware pulse (shared) ───────────────────────────────
static void hardReset() {
  pinMode(PIN_RST, OUTPUT);
  digitalWrite(PIN_RST, LOW);
  delay(50);
  digitalWrite(PIN_RST, HIGH);
  delay(50);
}

// ── Setup ────────────────────────────────────────────────────
void setup() {
  Serial.begin(SERIAL_BAUD);
  delay(300);
  Serial.println();
  Serial.println("============================================");
  Serial.println(" Espino32 — 4x RC522 Test");
  Serial.println(" SCK=18 MOSI=23 MISO=19 RST=5");
  Serial.println(" CS: #1=25  #2=26  #3=27  #4=32");
  Serial.println("============================================");
  Serial.println();

  // ตั้ง CS pins
  for (uint8_t i = 0; i < READER_COUNT; i++) {
    pinMode(CS_PINS[i], OUTPUT);
    digitalWrite(CS_PINS[i], HIGH);
  }

  // Hardware reset ก่อน init
  hardReset();

  // ESP32 VSPI: SCK=18, MISO=19, MOSI=23
  SPI.begin(18, 19, 23, -1);

  // Probe ทุก reader
  Serial.println("Probing readers...");
  Serial.println("--------------------------------------------");

  uint8_t found = 0;
  for (uint8_t i = 0; i < READER_COUNT; i++) {
    uint8_t ver = readVersionAt(i);
    bool ok = versionOK(ver);
    readerOK[i] = ok;
    if (ok) found++;

    Serial.printf("Reader #%d | CS=GPIO%-2d | Version=0x%02X | %s\n",
      i + 1, CS_PINS[i], ver,
      ok ? "OK" : "FAIL (ตรวจสาย SDA/CS)"
    );

  }

  Serial.println("--------------------------------------------");
  Serial.printf("Enabled: %d/%d readers\n\n", found, READER_COUNT);

  if (found == 0) {
    Serial.println("⚠️  ไม่พบ reader เลย — ตรวจสาย SCK/MOSI/MISO/VCC/GND");
    Serial.println("   ถ้าเป็น clone FM17522E ลอง swap MOSI ↔ MISO");
  } else {
    Serial.println("--- ทาบบัตร NFC เพื่ออ่าน UID ---");
  }
  Serial.println();
}

// ── Loop ─────────────────────────────────────────────────────
void loop() {
  // Diagnostic heartbeat: อ่าน VersionReg ของทุกหัวทุก 5 วินาที
  if (millis() - lastDiagMs > 5000) {
    lastDiagMs = millis();
    Serial.print("[DIAG] ");
    for (uint8_t i = 0; i < READER_COUNT; i++) {
      uint8_t ver = readVersionAt(i);
      readerOK[i] = versionOK(ver);
      Serial.printf("R%d=0x%02X%s ", i + 1, ver, readerOK[i] ? "" : "!");
    }
    Serial.println();
  }

  for (uint8_t i = 0; i < READER_COUNT; i++) {
    if (!readerOK[i]) continue;

    resetAllCS();
    digitalWrite(CS_PINS[i], LOW);
    delayMicroseconds(200);

    // re-init หลัง switch CS เพื่อปลุก reader ขึ้นมา
    rc522.PCD_Init(CS_PINS[i], MFRC522::UNUSED_PIN);

    if (rc522.PICC_IsNewCardPresent() && rc522.PICC_ReadCardSerial()) {
      String uid = uidToHex(rc522.uid);

      // ยึด UID เป็นตัวตัดสินหลัก และกัน log ซ้ำเมื่อยังวางบัตรใบเดิมค้างอยู่
      if (uid != lastUidByReader[i]) {
        lastUidByReader[i] = uid;
        Serial.printf("UID:%s SLOT:%d\n", uid.c_str(), i + 1);
      }

      rc522.PICC_HaltA();
      rc522.PCD_StopCrypto1();
      delay(300);  // debounce
    } else {
      // ไม่มีบัตรที่หัวอ่านนี้แล้ว -> reset cache เพื่อให้ทาบใหม่แล้ว log อีกครั้ง
      if (lastUidByReader[i].length() > 0) {
        lastUidByReader[i] = "";
      }
    }

    digitalWrite(CS_PINS[i], HIGH);
    delay(20);
  }
}
