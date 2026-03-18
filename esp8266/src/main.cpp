#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>

// =============================================================
// ESP32 (Thai Easy Elec / ESP32 DevKit) + 10x RC522 (SPI + CS)
// =============================================================
//
// SPI Bus (VSPI — shared ทุก reader):
//   SCK  → GPIO 18
//   MOSI → GPIO 23
//   MISO → GPIO 19
//   RST  → GPIO 27  (shared for all readers — 1 reader active at a time)
//
// CS (SDA/SS) per reader (active-LOW):
//   Reader  1 → GPIO  4
//   Reader  2 → GPIO  5
//   Reader  3 → GPIO 13
//   Reader  4 → GPIO 14
//   Reader  5 → GPIO 16
//   Reader  6 → GPIO 17
//   Reader  7 → GPIO 21
//   Reader  8 → GPIO 22
//   Reader  9 → GPIO 25
//   Reader 10 → GPIO 26
//
// Power:
//   VCC → 3.3V  (ห้ามใช้ 5V)
//   GND → GND common กับ ESP32 ทุกตัว
//
// NOTE: clone boards บางล็อตมี MOSI/MISO label สลับกัน
//   ถ้าได้ VersionReg=0x00/0xFF → ลองสลับสาย MOSI ↔ MISO
// =============================================================

#ifndef SERIAL_BAUD
#define SERIAL_BAUD 115200
#endif

// ── Pin Config ──────────────────────────────────────────────
static constexpr uint8_t PIN_RST  = 27;   // shared RST
static constexpr uint8_t PIN_SCK  = 18;
static constexpr uint8_t PIN_MOSI = 23;
static constexpr uint8_t PIN_MISO = 19;

static constexpr uint8_t READER_COUNT = 10;

// CS pins สำหรับ Reader 1-10
static const uint8_t CS_PINS[READER_COUNT] = {
  4,   // Reader 1
  5,   // Reader 2
  13,  // Reader 3
  14,  // Reader 4
  16,  // Reader 5
  17,  // Reader 6
  21,  // Reader 7
  22,  // Reader 8
  25,  // Reader 9
  26,  // Reader 10
};

// ── Globals ──────────────────────────────────────────────────
// MFRC522 object — จะ override CS ด้วยตัวเอง
MFRC522 mfrc522(CS_PINS[0], PIN_RST);

bool readerOK[READER_COUNT] = {};  // track ว่าตัวไหน version valid

// ── Helpers ──────────────────────────────────────────────────
static void printHexByte(uint8_t b) {
  if (b < 0x10) Serial.print('0');
  Serial.print(b, HEX);
}

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
    case 0x91: case 0x92: case 0x88:   // genuine NXP
    case 0x18: case 0x12:              // FM17522E clone
    case 0x82: case 0x8A: case 0x9A:  // other clones
      return true;
    default:
      return false;
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
  delayMicroseconds(50);
}

// ── Activate one reader by index ─────────────────────────────
static void activateReader(uint8_t idx) {
  // Tell MFRC522 library which SS pin to use
  mfrc522.PCD_Init(CS_PINS[idx], PIN_RST);
  csSelect(idx);
  delay(5);
}

// ── Setup ─────────────────────────────────────────────────────
void setup() {
  Serial.begin(SERIAL_BAUD);
  delay(200);
  Serial.println();
  Serial.println("=== ESP32 10x RC522 Test (SPI + CS) ===");
  Serial.println("SCK=18 MOSI=23 MISO=19 RST=27");

  // Init SPI bus
  SPI.begin(PIN_SCK, PIN_MISO, PIN_MOSI);

  // Init all CS pins as output HIGH (all deselected)
  for (uint8_t i = 0; i < READER_COUNT; i++) {
    pinMode(CS_PINS[i], OUTPUT);
    digitalWrite(CS_PINS[i], HIGH);
  }

  Serial.println();
  Serial.println("Probing all readers...");
  Serial.println("-----------------------------------");

  uint8_t found = 0;
  for (uint8_t i = 0; i < READER_COUNT; i++) {
    csSelect(i);
    delay(10);

    mfrc522.PCD_Init(CS_PINS[i], PIN_RST);
    delay(5);

    const byte ver = mfrc522.PCD_ReadRegister(MFRC522::VersionReg);
    const bool ok = versionOK(ver);
    readerOK[i] = ok;
    if (ok) found++;

    Serial.printf("Reader #%2d | CS=GPIO%-2d | Ver=0x", i + 1, CS_PINS[i]);
    printHexByte(ver);
    Serial.println(ok ? " | OK" : " | FAIL");
  }

  csAllHigh();
  Serial.println("-----------------------------------");
  Serial.printf("Enabled: %d/%d readers\n", found, READER_COUNT);
  Serial.println();
  Serial.println("Waiting for NFC cards (output: R# UID:xxxxxxxx)");
  Serial.println();
}

// ── Loop ──────────────────────────────────────────────────────
void loop() {
  for (uint8_t i = 0; i < READER_COUNT; i++) {
    if (!readerOK[i]) continue;

    csSelect(i);
    mfrc522.PCD_Init(CS_PINS[i], PIN_RST);
    delay(2);

    if (!mfrc522.PICC_IsNewCardPresent()) continue;
    if (!mfrc522.PICC_ReadCardSerial()) continue;

    const String uid = uidToHex(mfrc522.uid);

    // Format: R3 UID:58A8A027  (easy to parse on RPi)
    Serial.print("R");
    Serial.print(i + 1);
    Serial.print(" UID:");
    Serial.println(uid);

    mfrc522.PICC_HaltA();
    mfrc522.PCD_StopCrypto1();

    delay(300); // debounce ไม่ให้ spam ซ้ำ
  }

  csAllHigh();
  delay(10);
}
