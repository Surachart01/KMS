#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>

// ============================================================
// NodeMCU v2 (ESP8266) + 3x RC522 — SPI + Software CS
// ============================================================
//
// SPI Bus (shared ทุก reader):
//   D5  (GPIO14) → SCK  ของ RC522 ทุกตัว
//   D7  (GPIO13) → MOSI ของ RC522 ทุกตัว  ← ถ้า clone: ต่อเข้าขา MISO
//   D6  (GPIO12) → MISO ของ RC522 ทุกตัว  ← ถ้า clone: ต่อเข้าขา MOSI
//   D3  (GPIO0 ) → RST  ของ RC522 ทุกตัว  (shared)
//
// CS (SDA/SS) แยกทีละตัว (active-LOW):
//   D1 (GPIO5 ) → RC522 #1 SDA/SS
//   D2 (GPIO4 ) → RC522 #2 SDA/SS
//   D0 (GPIO16) → RC522 #3 SDA/SS
//
// Power:
//   3V3 → VCC ของ RC522 ทุกตัว   ⚠️ ห้ามใช้ 5V
//   GND → GND ของ RC522 ทุกตัว   ⚠️ GND ต้องร่วมกันทั้งหมด
//
// ⚠️ Clone board หมายเหตุ:
//   บางล็อต MOSI/MISO label สลับกัน
//   ถ้า VersionReg=0x00/0xFF → สลับสาย D7 กับ D6 แล้วเทสใหม่
// ============================================================

#ifndef SERIAL_BAUD
#define SERIAL_BAUD 115200
#endif

// ── Pin Definitions ─────────────────────────────────────────
static constexpr uint8_t PIN_RST  = D3;   // GPIO0  — RST shared

static constexpr uint8_t READER_COUNT = 3;

static const uint8_t CS_PINS[READER_COUNT] = {
  D1,   // GPIO5  — Reader #1
  D2,   // GPIO4  — Reader #2
  D0,   // GPIO16 — Reader #3
};

// ── MFRC522 object (จะสลับ CS ด้วยตัวเอง) ──────────────────
MFRC522 rc522(CS_PINS[0], PIN_RST);

// ── สถานะ reader ─────────────────────────────────────────────
bool readerOK[READER_COUNT] = {};

// ── Helpers ──────────────────────────────────────────────────
static String uidToHex(const MFRC522::Uid &uid) {
  String out;
  out.reserve(uid.size * 2);
  for (byte i = 0; i < uid.size; i++) {
    if (uid.uidByte[i] < 0x10) out += '0';
    out += String(uid.uidByte[i], HEX);
  }
  out.toUpperCase();
  return out;
}

static bool versionOK(byte v) {
  switch (v) {
    case 0x91: case 0x92: case 0x88:   // NXP แท้
    case 0x18: case 0x12:              // FM17522E clone
    case 0x82: case 0x8A: case 0x9A:  // clone อื่น
      return true;
    default: return false;
  }
}

// ── CS Control ───────────────────────────────────────────────
static void csAllHigh() {
  for (uint8_t i = 0; i < READER_COUNT; i++) {
    digitalWrite(CS_PINS[i], HIGH);
  }
}

static void csSelect(uint8_t idx) {
  csAllHigh();
  digitalWrite(CS_PINS[idx], LOW);
  delayMicroseconds(100);
}

// ── Setup ────────────────────────────────────────────────────
void setup() {
  Serial.begin(SERIAL_BAUD);
  delay(200);
  Serial.println();
  Serial.println("=== NodeMCU v2 — 3x RC522 Test ===");
  Serial.println("CS: D1(R1) D2(R2) D0(R3) | RST: D3");
  Serial.println();

  // ตั้ง CS pins ทุกตัวเป็น OUTPUT HIGH (deselect)
  for (uint8_t i = 0; i < READER_COUNT; i++) {
    pinMode(CS_PINS[i], OUTPUT);
    digitalWrite(CS_PINS[i], HIGH);
  }

  SPI.begin(); // ESP8266: SCK=D5, MISO=D6, MOSI=D7

  // Probe ทุก reader
  Serial.println("Probing readers...");
  Serial.println("-----------------------------------");

  uint8_t found = 0;
  for (uint8_t i = 0; i < READER_COUNT; i++) {
    csSelect(i);
    delay(10);
    rc522.PCD_Init(CS_PINS[i], PIN_RST);
    delay(5);

    const byte ver = rc522.PCD_ReadRegister(MFRC522::VersionReg);
    const bool ok  = versionOK(ver);
    readerOK[i] = ok;
    if (ok) found++;

    Serial.printf("Reader #%d | CS=D%-2d | VersionReg=0x%02X | %s\n",
      i + 1,
      (CS_PINS[i] == D1) ? 1 :
      (CS_PINS[i] == D2) ? 2 : 0,
      ver,
      ok ? "OK" : "FAIL (check wiring)"
    );
  }

  csAllHigh();
  Serial.println("-----------------------------------");
  Serial.printf("Enabled: %d/%d readers\n\n", found, READER_COUNT);

  if (found == 0) {
    Serial.println("⚠  ไม่พบ reader เลย:");
    Serial.println("   1. เช็คสาย VCC=3.3V, GND, SCK, MOSI, MISO, SDA, RST");
    Serial.println("   2. ถ้าได้ 0x00/0xFF ลองสลับสาย D6 กับ D7 (MOSI/MISO clone)");
  } else {
    Serial.println("Place NFC card/tag on any reader...");
    Serial.println("Output format:  R1 UID:58A8A027");
  }
  Serial.println();
}

// ── Loop ─────────────────────────────────────────────────────
void loop() {
  for (uint8_t i = 0; i < READER_COUNT; i++) {
    if (!readerOK[i]) continue;

    csSelect(i);
    rc522.PCD_Init(CS_PINS[i], PIN_RST);
    delay(2);

    if (!rc522.PICC_IsNewCardPresent()) continue;
    if (!rc522.PICC_ReadCardSerial())   continue;

    const String uid = uidToHex(rc522.uid);

    // Format ที่ RPi parse ได้ง่าย: "R1 UID:58A8A027"
    Serial.print("R");
    Serial.print(i + 1);
    Serial.print(" UID:");
    Serial.println(uid);

    rc522.PICC_HaltA();
    rc522.PCD_StopCrypto1();

    delay(300); // debounce
  }

  csAllHigh();
  delay(10);
}
