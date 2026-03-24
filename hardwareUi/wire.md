# Wire Guide — Raspberry Pi 5 + ESP8266 ×3
## Solenoid ×10 (Relay) + LED ×20 (Relay) + NFC ×10 (3× ESP8266 USB Serial)

---

## Overview

```
                         USB Serial ×3 (115200 baud)
┌──────────────────────┐         ┌─────────────────────────┐
│   Raspberry Pi 5     │ USB0    │ ESP8266 Board A (ID=1)  │
│   (Main Controller)  │◄───────►│ NFC slot 1, 2, 3, 4     │
│                      │         └─────────────────────────┘
│                      │ USB1    ┌─────────────────────────┐
│                      │◄───────►│ ESP8266 Board B (ID=2)  │
│                      │         │ NFC slot 5, 6, 7        │
│                      │         └─────────────────────────┘
│  GPIO → Relay ×10    │ USB2    ┌─────────────────────────┐
│         (Solenoid)   │◄───────►│ ESP8266 Board C (ID=3)  │
│  GPIO → Relay ×10    │         │ NFC slot 8, 9, 10       │
│         (LED ×20)    │         └─────────────────────────┘
└──────────────────────┘
```

---

## อุปกรณ์

| # | อุปกรณ์ | จำนวน | หมายเหตุ |
|---|---------|-------|----------|
| 1 | Raspberry Pi 5 | 1 | Main controller |
| 2 | ESP8266 (NodeMCU v2) | 3 | NFC reader bridge |
| 3 | RC522 NFC Module | 10 | MFRC522 13.56MHz |
| 4 | Relay Module 10CH (Solenoid) | 1 | Active LOW (5V) |
| 5 | Relay Module 10CH (LED) | 1 | Active LOW (5V) |
| 6 | Solenoid Lock 12V | 10 | Electromagnetic |
| 7 | LED | 20 | 2 ดวง/ช่อง Relay |
| 8 | 12V DC Power Supply | 1 | ≥3A |
| 9 | USB Hub (optional) | 1 | ถ้า RPi USB ไม่พอ |
| 10 | สาย USB Micro | 3 | RPi ↔ ESP8266 |
| 11 | สายจัมเปอร์ F-F | ~50 | GPIO + SPI |
| 12 | Breadboard | 3 | SPI bus แต่ละ ESP |

---

## ส่วนที่ 1: Raspberry Pi 5 — GPIO Pinout

RPi5 ใช้ GPIO **20 ขา**: Solenoid ฝั่งขวา + LED ฝั่งซ้าย

```
  ฝั่งซ้าย = Relay LED        ┌─────────┐       ฝั่งขวา = Relay Solenoid
             3.3V  1 ●│ ■ ■ │● 2   5V  ── Relay VCC
  (I2C SDA)  GP2   3 ●│ ■ ■ │● 4   5V
  (I2C SCL)  GP3   5 ●│ ■ ■ │● 6   GND ── Relay GND
  (LED  S1)  GP4   7 ●│ ■ ■ │● 8   GP14  (SOL S1) ⚠️
             GND   9 ●│ ■ ■ │● 10  GP15  (SOL S2) ⚠️
  (LED  S2)  GP17 11 ●│ ■ ■ │● 12  GP18  (SOL S3)
  (LED  S3)  GP27 13 ●│ ■ ■ │● 14  GND
  (LED  S4)  GP22 15 ●│ ■ ■ │● 16  GP23  (SOL S4)
             3.3V 17 ●│ ■ ■ │● 18  GP24  (SOL S5)
  (LED  S5)  GP10 19 ●│ ■ ■ │● 20  GND
  (LED  S6)  GP9  21 ●│ ■ ■ │● 22  GP25  (SOL S6)
  (LED  S7)  GP11 23 ●│ ■ ■ │● 24  GP8   (SOL S7)
  (LED  S8)  GP6  25 ●│ ■ ■ │● 26  GP7   (SOL S8) 👈 แก้ไขเป็น GP7
  (LED  S9)  GP0  27 ●│ ■ ■ │● 28  ว่าง
  (LED S10)  GP5  29 ●│ ■ ■ │● 30  GND
             GP6  31 ●│ ■ ■ │● 32  GP12  (SOL S9)
             GP13 33 ●│ ■ ■ │● 34  GND
             GP19 35 ●│ ■ ■ │● 36  GP16  (SOL S10)
             GP26 37 ●│ ■ ■ │● 38  GP20  (ว่าง)
             GND  39 ●│ ■ ■ │● 40  GP21  (ว่าง)
                      └─────────┘
```

---

## ส่วนที่ 2: ต่อ Relay Solenoid (10CH)

| Slot | GPIO | Pin | Relay |
|------|------|-----|-------|
| 1 | GP14 | 8 | IN1 ⚠️ |
| 2 | GP15 | 10 | IN2 ⚠️ |
| 3 | GP18 | 12 | IN3 |
| 4 | GP23 | 16 | IN4 |
| 5 | GP24 | 18 | IN5 |
| 6 | GP25 | 22 | IN6 |
| 7 | GP8 | 24 | IN7 |
| 8 | GP7 | 26 | IN8 👈 แก้ไขเป็น GP7 |
| 9 | GP12 | 32 | IN9 |
| 10 | GP16 | 36 | IN10 |

+ VCC → Pin 2 (5V), GND → Pin 6

```
12V DC(+) → Relay COM → Relay NO → Solenoid(+)
                                     Solenoid(-) → 12V DC(-)
```

---

## ส่วนที่ 3: ต่อ Relay LED (10CH)

| Slot | GPIO | Pin | Relay | LED |
|------|------|-----|-------|-----|
| 1 | GP4 | 7 | IN1 | 2 ดวง |
| 2 | GP17 | 11 | IN2 | 2 ดวง |
| 3 | GP27 | 13 | IN3 | 2 ดวง |
| 4 | GP22 | 15 | IN4 | 2 ดวง |
| 5 | GP10 | 19 | IN5 | 2 ดวง |
| 6 | GP9 | 21 | IN6 | 2 ดวง |
| 7 | GP11 | 23 | IN7 | 2 ดวง |
| 8 | GP6 | 25 | IN8 👈 หลบเป็น GP6 | 2 ดวง |
| 9 | GP0 | 27 | IN9 | 2 ดวง |
| 10 | GP5 | 29 | IN10 | 2 ดวง |

+ VCC → Pin 4 (5V), GND → Pin 6

```
VCC → Relay COM
       ├── Relay NC → LED-A(เขียว) → R(220Ω) → GND   (มีกุญแจ)
       └── Relay NO → LED-B(แดง)   → R(220Ω) → GND   (ไม่มีกุญแจ)
```

---

## ส่วนที่ 4: ESP8266 ×3 — NFC Reader

### เชื่อมต่อ RPi ↔ ESP8266 (USB)

```
RPi USB Port 1 ◄── USB ──► ESP8266 Board A (BOARD_ID=1, slots 1-4, 4 NFC)
RPi USB Port 2 ◄── USB ──► ESP8266 Board B (BOARD_ID=2, slots 5-7, 3 NFC)
RPi USB Port 3 ◄── USB ──► ESP8266 Board C (BOARD_ID=3, slots 8-10, 3 NFC)
```

RPi จะเห็น: `/dev/ttyUSB0`, `/dev/ttyUSB1`, `/dev/ttyUSB2`

### ESP8266 SPI + CS Pin (เหมือนกันทุกบอร์ด)

```
ESP8266 Pin         NodeMCU   หน้าที่
──────────────────  ────────  ────────────────
GPIO 14             D5        SCK  (shared)
GPIO 13             D7        MOSI (shared)
GPIO 12             D6        MISO (shared)
GPIO 2              D4        RST  (shared)
GPIO 4              D2        CS #1 (NFC ตัวที่ 1)
GPIO 5              D1        CS #2 (NFC ตัวที่ 2)
GPIO 16             D0        CS #3 (NFC ตัวที่ 3)
3.3V                3V3       VCC  (shared)
GND                 GND       GND  (shared)
```

### ต่อ RC522 แต่ละตัว (7 ขา)

```
RC522:
  VCC  → 3.3V rail ±   MOSI → GPIO 13 (D7)
  GND  → GND rail      MISO → GPIO 12 (D6)
  RST  → GPIO 2 (D4)   SCK  → GPIO 14 (D5)
  SDA  → CS pin ที่กำหนด (แยกเฉพาะตัว)
  IRQ  → ไม่ต้องต่อ
```

### ESP8266 Board A (4 NFC) — พิเศษ

Board A ใช้ GPIO 2 เป็น CS ตัวที่ 4 และย้าย RST ไปที่ GPIO 0:

```
Board A เท่านั้น:
  GPIO 0  (D3) → RST  (แทน GPIO 2)
  GPIO 2  (D4) → CS #4 (NFC ตัวที่ 4)
```

### Slot → Board → CS Pin

| Board | Slot | CS GPIO | NodeMCU | RST |
|-------|------|---------|---------|-----|
| A (ID=1) | 1 | GPIO 4 | D2 | GPIO 0 (D3) |
| A (ID=1) | 2 | GPIO 5 | D1 | GPIO 0 (D3) |
| A (ID=1) | 3 | GPIO 16 | D0 | GPIO 0 (D3) |
| A (ID=1) | **4** | **GPIO 2** | **D4** | GPIO 0 (D3) |
| B (ID=2) | 5 | GPIO 4 | D2 | GPIO 2 (D4) |
| B (ID=2) | 6 | GPIO 5 | D1 | GPIO 2 (D4) |
| B (ID=2) | 7 | GPIO 16 | D0 | GPIO 2 (D4) |
| C (ID=3) | 8 | GPIO 4 | D2 | GPIO 2 (D4) |
| C (ID=3) | 9 | GPIO 5 | D1 | GPIO 2 (D4) |
| C (ID=3) | 10 | GPIO 16 | D0 | GPIO 2 (D4) |

---

## ส่วนที่ 5: ตั้งค่า Raspberry Pi

```bash
sudo raspi-config
# Interface Options → Serial Port → No  (ปิด UART เพราะใช้ GP14/15 เป็น Relay)
sudo reboot
```

ไม่ต้องเปิด SPI/I2C บน RPi (NFC อ่านผ่าน ESP8266)

---

## สรุปสายทั้งหมด

| ส่วน | จำนวน |
|------|-------|
| USB (RPi ↔ ESP8266 ×3) | 3 เส้น |
| RPi → Relay Solenoid | 12 เส้น |
| RPi → Relay LED | 12 เส้น |
| Relay → Solenoid (12V) | 20 เส้น |
| Relay → LED | 30 เส้น |
| ESP8266 SPI bus ×3 (6 เส้น/บอร์ด) | 18 เส้น |
| ESP8266 CS (Board A=4 + B=3 + C=3) | 10 เส้น |
| **รวม** | **~104 เส้น** |

---

## Flash Firmware

```bash
cd esp8266

# Board A (slots 1-4, 4 NFC)
pio run -e board_a -t upload

# Board B (slots 5-7, 3 NFC)
pio run -e board_b -t upload

# Board C (slots 8-10, 3 NFC)
pio run -e board_c -t upload
```

> ⚠️ ต่อ ESP8266 ทีละตัวตอน flash → เปลี่ยน `-e board_a/b/c`

---

## ลำดับการต่อสาย

1. 🔴 **ปิดไฟทั้งหมด**
2. ต่อ Relay Solenoid (12 เส้น)
3. ต่อ Solenoid ↔ Relay (20 เส้น)
4. ต่อ Relay LED (12 เส้น)
5. ต่อ LED ↔ Relay (30 เส้น)
6. ต่อ SPI + CS แต่ละ ESP8266 (9 เส้น/บอร์ด)
7. Flash firmware ทีละตัว
8. ต่อ USB ทั้ง 3 ตัวเข้า RPi
9. ✅ `node hardware.js` → ดู log:
   ```
   ✅ ESP8266 Board 1 ready at /dev/ttyUSB0 — 4/4 NFC online (slots 1,2,3,4)
   ✅ ESP8266 Board 2 ready at /dev/ttyUSB1 — 3/3 NFC online (slots 5,6,7)
   ✅ ESP8266 Board 3 ready at /dev/ttyUSB2 — 3/3 NFC online (slots 8,9,10)
   🟢 NFC: ESP8266 multi-board mode — 3 board(s) connected
   ```
