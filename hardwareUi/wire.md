# Wire Guide — Raspberry Pi 5
## RC522 NFC ×10 (SPI) + Relay 10CH (Solenoid)

---

## Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                     Raspberry Pi 5 (40-pin GPIO)                 │
│                                                                  │
│  [SPI: MOSI/MISO/SCK/RST] ──────► RC522 ×10 (CS แยกทีละตัว)    │
│  [Relay GPIO ×10]         ──────► Relay Module 10CH              │
│                                          │                       │
└──────────────────────────────────────────┼───────────────────────┘
                                           │
                               ┌───────────▼─────────────┐
                               │  12V DC Power Supply    │
                               │  → Solenoid Lock ×10    │
                               └─────────────────────────┘
```

---

## 1. SPI Bus — ใช้ร่วมกันทุก RC522 (6 เส้น)

| สัญญาณ | GPIO | Physical Pin | ต่อที่ RC522 |
|--------|------|--------------|-------------|
| MOSI   | GPIO 10 | **Pin 19** | MOSI ทุกตัว |
| MISO   | GPIO 9  | **Pin 21** | MISO ทุกตัว |
| SCK    | GPIO 11 | **Pin 23** | SCK ทุกตัว  |
| RST    | GPIO 2  | **Pin 3**  | RST ทุกตัว  |
| 3.3V   | —       | **Pin 1**  | VCC ทุกตัว  |
| GND    | —       | **Pin 6**  | GND ทุกตัว  |

> สาย MOSI/MISO/SCK/RST/VCC/GND ต่อแบบ **parallel** ไปทุก RC522 พร้อมกัน

---

## 2. NFC CS (SDA) Pins — แยกทีละตัว (10 เส้น)

| Slot | GPIO    | Physical Pin | RC522 SDA |
|------|---------|--------------|-----------|
| 1    | GPIO 4  | Pin 7        | SDA       |
| 2    | GPIO 5  | Pin 29       | SDA       |
| 3    | GPIO 6  | Pin 31       | SDA       |
| 4    | GPIO 12 | Pin 32       | SDA       |
| 5    | GPIO 13 | Pin 33       | SDA       |
| 6    | GPIO 16 | Pin 36       | SDA       |
| 7    | GPIO 19 | Pin 35       | SDA       |
| 8    | GPIO 20 | Pin 38       | SDA       |
| 9    | GPIO 21 | Pin 40       | SDA       |
| 10   | GPIO 26 | Pin 37       | SDA       |

> แต่ละตัวต้องใช้ GPIO แยกกัน — ห้ามต่อรวม

---

## 3. Relay Pins — ควบคุม Solenoid (12 เส้น)

| Slot  | GPIO    | Physical Pin | Relay IN |
|-------|---------|--------------|----------|
| 1     | GPIO 17 | Pin 11       | IN1      |
| 2     | GPIO 27 | Pin 13       | IN2      |
| 3     | GPIO 22 | Pin 15       | IN3      |
| 4     | GPIO 23 | Pin 16       | IN4      |
| 5     | GPIO 24 | Pin 18       | IN5      |
| 6     | GPIO 25 | Pin 22       | IN6      |
| 7     | GPIO 14 | Pin 8        | IN7      |
| 8     | GPIO 15 | Pin 10       | IN8      |
| 9     | GPIO 18 | Pin 12       | IN9      |
| 10    | GPIO 0  | Pin 27       | IN10     |
| VCC   | 5V      | Pin 2        | VCC      |
| GND   | GND     | Pin 9        | GND      |

> ⚠️ GPIO 14, 15 ใช้เป็น UART — ต้อง disable ใน `raspi-config → Interface → Serial Port → No`

---

## 4. Solenoid — ต้องใช้ไฟ 12V DC ภายนอก

```
12V DC (+) ──────────► COM (Relay)
                        NO  (Relay) ──► Solenoid (+)
                                        Solenoid (-) ──► 12V DC (-)
```

> ⚠️ ห้ามต่อ Solenoid กับไฟจาก RPi โดยตรง — ต้องผ่าน Relay เท่านั้น

---

## 5. สรุป Raspberry Pi GPIO ที่ใช้ทั้งหมด

```
Pin  1 (3.3V) ── NFC VCC
Pin  2 (5V)   ── Relay VCC
Pin  3 (GPIO2)── NFC RST
Pin  6 (GND)  ── NFC GND
Pin  7 (GPIO4)── CS slot 1
Pin  8 (GPIO14)─ Relay slot 7
Pin  9 (GND)  ── Relay GND
Pin 10 (GPIO15)─ Relay slot 8
Pin 11 (GPIO17)─ Relay slot 1
Pin 12 (GPIO18)─ Relay slot 9
Pin 13 (GPIO27)─ Relay slot 2
Pin 15 (GPIO22)─ Relay slot 3
Pin 16 (GPIO23)─ Relay slot 4
Pin 18 (GPIO24)─ Relay slot 5
Pin 19 (GPIO10)─ NFC MOSI
Pin 21 (GPIO9) ─ NFC MISO
Pin 22 (GPIO25)─ Relay slot 6
Pin 23 (GPIO11)─ NFC SCK
Pin 27 (GPIO0) ─ Relay slot 10
Pin 29 (GPIO5) ─ CS slot 2
Pin 31 (GPIO6) ─ CS slot 3
Pin 32 (GPIO12)─ CS slot 4
Pin 33 (GPIO13)─ CS slot 5
Pin 35 (GPIO19)─ CS slot 7
Pin 36 (GPIO16)─ CS slot 6
Pin 37 (GPIO26)─ CS slot 10
Pin 38 (GPIO20)─ CS slot 8
Pin 40 (GPIO21)─ CS slot 9
```

---

## 6. นับสายทั้งหมด

| ส่วน | จำนวนสาย |
|------|---------|
| SPI Bus (MOSI/MISO/SCK/RST/VCC/GND) | 6 เส้น (shared bus) |
| NFC CS แยกทีละตัว ×10 | 10 เส้น |
| Relay GPIO ×10 + VCC + GND | 12 เส้น |
| Solenoid → Relay (NO/COM) ×10 | 10 เส้น |
| **รวม** | **~38 เส้น** |
