# Wire Guide — Raspberry Pi 5
## RC522 NFC ×10 (SPI) + Relay 10CH (Solenoid) + I2C Module

---

## Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                     Raspberry Pi 5 (40-pin GPIO)                 │
│                                                                  │
│  [SPI: MOSI/MISO/SCK/RST] ──────► RC522 ×10 (CS แยกทีละตัว)    │
│  [I2C: SDA/SCL]           ──────► I2C Module (LCD/Sensor/etc.)  │
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

## อุปกรณ์ที่ต้องใช้

| # | อุปกรณ์ | จำนวน | หมายเหตุ |
|---|---------|-------|----------|
| 1 | Raspberry Pi 5 | 1 | พร้อม SD Card + OS |
| 2 | RC522 NFC Module | 10 | MFRC522 13.56MHz |
| 3 | Relay Module 10CH | 1 | Active LOW/HIGH (5V) |
| 4 | Solenoid Lock 12V | 10 | ล็อคแบบ Electromagnetic |
| 5 | 12V DC Power Supply | 1 | ≥3A (300mA × 10 ตัว) |
| 6 | สายจัมเปอร์ Female-Female | ~40 เส้น | สำหรับ GPIO |
| 7 | สายไฟ 12V (แดง/ดำ) | ~20 เส้น | สำหรับ Solenoid |
| 8 | Breadboard (optional) | 1-2 | สำหรับ split สาย SPI bus |
| 9 | I2C Module | 1+ | เช่น LCD I2C, Sensor, etc. |

---

## Raspberry Pi 5 — GPIO Pinout Reference

```
  ฝั่งซ้าย = NFC CS          ┌─────────┐         ฝั่งขวา = Relay
           3.3V  1 ●│ ■ ■ │● 2   5V
  (I2C SDA) GP2  3 ●│ ■ ■ │● 4   5V
  (I2C SCL) GP3  5 ●│ ■ ■ │● 6   GND
  (CS  S1)  GP4  7 ●│ ■ ■ │● 8   GP14  (Relay S1) ⚠️
            GND  9 ●│ ■ ■ │● 10  GP15  (Relay S2) ⚠️
  (CS  S2) GP17 11 ●│ ■ ■ │● 12  GP18  (Relay S3)
  (CS  S3) GP27 13 ●│ ■ ■ │● 14  GND
  (CS  S4) GP22 15 ●│ ■ ■ │● 16  GP23  (Relay S4)
           3.3V 17 ●│ ■ ■ │● 18  GP24  (Relay S5)
  (SPI MOSI)GP10 19 ●│ ■ ■ │● 20  GND
  (SPI MISO)GP9  21 ●│ ■ ■ │● 22  GP25  (Relay S6)
  (SPI SCK) GP11 23 ●│ ■ ■ │● 24  GP8
  (NFC RST) GP7  25 ●│ ■ ■ │● 26  GP8
  (CS  S5)  GP0 27 ●│ ■ ■ │● 28  GP1
  (CS  S6)  GP5 29 ●│ ■ ■ │● 30  GND
  (CS  S7)  GP6 31 ●│ ■ ■ │● 32  GP12  (Relay S7)
  (CS  S8) GP13 33 ●│ ■ ■ │● 34  GND
  (CS  S9) GP19 35 ●│ ■ ■ │● 36  GP16  (Relay S8)
  (CS S10) GP26 37 ●│ ■ ■ │● 38  GP20  (Relay S9)
            GND 39 ●│ ■ ■ │● 40  GP21  (Relay S10)
                    └─────────┘
              (มองจากด้านบน, USB อยู่ด้านล่าง)
```

---

## ขั้นตอนที่ 1: ตั้งค่า Raspberry Pi ก่อนต่อสาย

ก่อนต่อสายใดๆ ต้องตั้งค่า RPi ก่อน:

```bash
sudo raspi-config
```

1. **เปิด SPI** → `Interface Options → SPI → Enable`
2. **เปิด I2C** → `Interface Options → I2C → Enable`
3. **ปิด Serial Port** → `Interface Options → Serial Port → No`
   - ⚠️ จำเป็นต้องปิด เพราะ GPIO 14, 15 ถูกใช้เป็น Relay slot 1, 2
4. Reboot: `sudo reboot`

ตรวจสอบ:
```bash
ls /dev/spi*   # ควรเห็น /dev/spidev0.0
ls /dev/i2c*   # ควรเห็น /dev/i2c-1
```

---

## ขั้นตอนที่ 2: ต่อสาย SPI Bus (shared ทุก RC522)

> 🔵 ต่อ **6 เส้น** จาก RPi ไปยัง RC522 **ทุกตัว** (parallel)
> ใช้ breadboard เพื่อ split สัญญาณไปหลายตัวได้ง่าย

```
RPi                     Breadboard              RC522 ทุกตัว (×10)
─────                   ──────────              ──────────────────
Pin 19 (GPIO10) ──────► MOSI rail  ──────────► MOSI
Pin 21 (GPIO9)  ──────► MISO rail  ──────────► MISO
Pin 23 (GPIO11) ──────► SCK  rail  ──────────► SCK
Pin 25 (GPIO7)  ──────► RST  rail  ──────────► RST  ⚡ เปลี่ยนจาก GPIO2 เป็น GPIO7
Pin 1  (3.3V)   ──────► VCC  rail  ──────────► VCC (3.3V)
Pin 6  (GND)    ──────► GND  rail  ──────────► GND
```

### วิธีต่อ:

1. เสียบสาย **Pin 19** จาก RPi ไปยัง breadboard ราง MOSI
2. จาก breadboard ราง MOSI ลากสายไปยังขา **MOSI** ของ RC522 ทั้ง 10 ตัว
3. ทำเหมือนกันกับ MISO (Pin 21), SCK (Pin 23), RST (**Pin 25, GPIO 7**)
4. ต่อ **Pin 1 (3.3V)** ไปราง VCC บน breadboard แล้วลากไป VCC ของ RC522 ทุกตัว
5. ต่อ **Pin 6 (GND)** ไปราง GND บน breadboard แล้วลากไป GND ของ RC522 ทุกตัว

> ⚠️ **ใช้ไฟ 3.3V เท่านั้น!** อย่าใช้ 5V กับ RC522 เพราะจะพังได้

---

## ขั้นตอนที่ 3: ต่อสาย NFC CS (SDA) — แยกทีละตัว (ฝั่งซ้ายทั้งหมด)

> 🟢 ต่อ **10 เส้น** — แต่ละ RC522 ต้องใช้ GPIO แยกกัน (Chip Select)
> ทุกสายอยู่ **ฝั่งซ้าย** ของ GPIO header (odd pin)

```
RPi Pin              RC522 ตัวที่    ขาที่ต่อ
────────             ──────────     ────────
Pin 7  (GPIO 4)  ──► RC522 #1  ──► SDA
Pin 11 (GPIO 17) ──► RC522 #2  ──► SDA
Pin 13 (GPIO 27) ──► RC522 #3  ──► SDA
Pin 15 (GPIO 22) ──► RC522 #4  ──► SDA
Pin 27 (GPIO 0)  ──► RC522 #5  ──► SDA
Pin 29 (GPIO 5)  ──► RC522 #6  ──► SDA
Pin 31 (GPIO 6)  ──► RC522 #7  ──► SDA
Pin 33 (GPIO 13) ──► RC522 #8  ──► SDA
Pin 35 (GPIO 19) ──► RC522 #9  ──► SDA
Pin 37 (GPIO 26) ──► RC522 #10 ──► SDA
```

### วิธีต่อ:

1. ใช้สายจัมเปอร์ Female-Female **1 เส้นต่อ 1 ตัว**
2. เสียบปลายด้านหนึ่งที่ **Physical Pin** บน RPi Header
3. เสียบอีกปลายที่ขา **SDA** ของ RC522 ตัวนั้นๆ
4. **ห้ามต่อ SDA รวมกัน** — ต้องแยกทีละตัวเพราะใช้เลือก module ที่จะสื่อสาร

### สรุปการต่อ RC522 แต่ละตัว (รวม 8 ขา/ตัว):

```
RC522 ตัวที่ N:
  ┌─────────┐
  │  RC522  │
  │         │
  │ VCC ────│──► 3.3V rail (shared)
  │ GND ────│──► GND  rail (shared)
  │ RST ────│──► RST  rail (shared, GPIO 7)
  │ MISO ───│──► MISO rail (shared, GPIO 9)
  │ MOSI ───│──► MOSI rail (shared, GPIO 10)
  │ SCK ────│──► SCK  rail (shared, GPIO 11)
  │ SDA ────│──► GPIO ที่กำหนดให้ slot N (แยกเฉพาะตัว)
  │ IRQ ────│──► ไม่ต้องต่อ (ไม่ใช้)
  └─────────┘
```

---

## ขั้นตอนที่ 4: ต่อสาย Relay Module (ฝั่งขวาทั้งหมด)

> 🔴 ต่อ **12 เส้น** (10 สัญญาณ + VCC + GND) จาก RPi ไปยัง Relay Module
> ทุกสายอยู่ **ฝั่งขวา** ของ GPIO header (even pin)

```
RPi Pin               Relay Module
────────              ────────────
Pin 2  (5V)      ──► VCC
Pin 6  (GND)     ──► GND
Pin 8  (GPIO 14) ──► IN1  (Slot 1)  ⚠️ UART TX
Pin 10 (GPIO 15) ──► IN2  (Slot 2)  ⚠️ UART RX
Pin 12 (GPIO 18) ──► IN3  (Slot 3)
Pin 16 (GPIO 23) ──► IN4  (Slot 4)
Pin 18 (GPIO 24) ──► IN5  (Slot 5)
Pin 22 (GPIO 25) ──► IN6  (Slot 6)
Pin 32 (GPIO 12) ──► IN7  (Slot 7)
Pin 36 (GPIO 16) ──► IN8  (Slot 8)
Pin 38 (GPIO 20) ──► IN9  (Slot 9)
Pin 40 (GPIO 21) ──► IN10 (Slot 10)
```

### วิธีต่อ:

1. ต่อ **Pin 2 (5V)** ไปยังขา **VCC** บน Relay Module
2. ต่อ **Pin 6 (GND)** ไปยังขา **GND** บน Relay Module
3. ต่อ GPIO แต่ละตัวไปยัง **IN1-IN10** ตามตาราง (10 เส้น)
4. **ตรวจสอบ Jumper**: Relay Module ส่วนใหญ่จะมี jumper เลือก VCC-JD
   - ถ้า Relay ใช้ไฟ **5V จาก RPi** → ให้ jumper VCC-JD ไว้
   - ถ้าใช้ **ไฟภายนอก** แยก → ถอด jumper แล้วต่อ VCC-JD กับไฟ 5V ภายนอก

> ⚠️ **GPIO 14, 15** ปกติเป็น UART TX/RX
> ต้อง **disable Serial Port** ใน raspi-config ก่อนใช้งาน (ทำในขั้นตอนที่ 1 แล้ว)

---

## ขั้นตอนที่ 5: ต่อ Solenoid เข้ากับ Relay

> 🟡 ต่อ **ไฟ 12V DC ภายนอก** ผ่าน Relay ไปยัง Solenoid ×10

### วงจรต่อ Solenoid แต่ละตัว:

```
                    Relay Module
                    ┌──────────────┐
12V DC (+) ────────►│ COM (Common) │
                    │              │
                    │ NO  (Normal  │──────► Solenoid (+)
                    │      Open)   │
                    │              │       Solenoid (-)
                    │ NC  (Normal  │        │
                    │      Close)  │        │
                    └──────────────┘        │
                                            │
12V DC (-) ◄────────────────────────────────┘
```

### วิธีต่อ (ทำซ้ำ 10 ชุด):

1. ต่อสาย **12V DC (+) แดง** เข้าขา **COM** ของ Relay ช่องนั้น
2. ต่อสายจากขา **NO** ของ Relay ไปยังขา **(+)** ของ Solenoid
3. ต่อขา **(-)** ของ Solenoid กลับไปที่ **12V DC (-) ดำ**
4. ทำซ้ำสำหรับ Relay ช่อง 1-10 กับ Solenoid ตัวที่ 1-10

> ⚠️ **ห้ามต่อ Solenoid กับไฟจาก RPi โดยตรง — ต้องผ่าน Relay เท่านั้น!**

> 💡 **ใช้ NO (Normal Open)** = ปกติ solenoid จะ **ล็อค** อยู่
> เมื่อ Relay เปิด (GPIO HIGH) → วงจร NO จะต่อ → Solenoid ปลดล็อค

### เลือก Power Supply:

| Solenoid | กระแส/ตัว | 10 ตัว | Power Supply แนะนำ |
|----------|-----------|--------|---------------------|
| 12V DC   | ~300mA    | ~3A    | 12V 5A (มี margin) |

---

## ขั้นตอนที่ 6: ต่อ I2C Module

> 🟣 ต่อ **4 เส้น** — ใช้ GPIO 2 (SDA) + GPIO 3 (SCL)

> ⚡ **หมายเหตุ**: เดิม GPIO 2 ถูกใช้เป็น NFC RST → ย้ายไปใช้ **GPIO 7** แทน เพื่อเปิดให้ I2C ใช้งานได้

```
RPi Pin              I2C Module       ขาที่ต่อ
────────             ──────────       ────────
Pin 3  (GPIO 2)  ──► I2C Module  ──► SDA
Pin 5  (GPIO 3)  ──► I2C Module  ──► SCL
Pin 1  (3.3V)    ──► I2C Module  ──► VCC (3.3V module)
Pin 6  (GND)     ──► I2C Module  ──► GND
```

> 💡 ถ้า module ใช้ 5V → ต่อ VCC กับ **Pin 2 (5V)** แทน Pin 1

### วิธีต่อ:

1. ต่อ **Pin 3 (GPIO 2)** ไปขา **SDA** ของ I2C Module
2. ต่อ **Pin 5 (GPIO 3)** ไปขา **SCL** ของ I2C Module
3. ต่อ **Pin 1 (3.3V)** หรือ **Pin 2 (5V)** ไปขา **VCC** (ตามที่ module ต้องการ)
4. ต่อ **Pin 6 (GND)** ไปขา **GND**

### ตรวจสอบ I2C Module:

```bash
# Scan หา I2C device
sudo i2cdetect -y 1

# ควรเห็น address ของ module เช่น 0x27 (LCD), 0x3C (OLED), etc.
```

### ตัวอย่าง I2C Module ที่ใช้ได้:

| Module | I2C Address | VCC | หมายเหตุ |
|--------|-------------|-----|----------|
| LCD 16x2 (PCF8574) | 0x27 หรือ 0x3F | 5V | จอแสดงผลตัวอักษร |
| OLED SSD1306 | 0x3C | 3.3V | จอแสดงผลกราฟิก |
| BME280 Sensor | 0x76 หรือ 0x77 | 3.3V | วัดอุณหภูมิ/ความชื้น |
| PCA9685 | 0x40 | 5V | PWM 16CH (ขยาย servo/LED) |

> 💡 I2C สามารถต่อ **หลาย module** บน bus เดียวกันได้ (แค่ address ต้องไม่ซ้ำ)

---

## สรุป Pin ทั้งหมดที่ใช้

```
ฝั่งซ้าย (NFC + SPI + I2C)       ฝั่งขวา (Relay + Power)
──────────────────────────        ──────────────────────────
Pin  1 (3.3V)  ── NFC VCC        Pin  2 (5V)    ── Relay VCC
Pin  3 (GPIO2) ── I2C SDA        Pin  4 (5V)    ── (ว่าง)
Pin  5 (GPIO3) ── I2C SCL        Pin  6 (GND)   ── Relay GND / NFC GND
Pin  7 (GPIO4) ── CS slot 1      Pin  8 (GPIO14)── Relay slot 1  ⚠️
Pin  9 (GND)   ── (GND)          Pin 10 (GPIO15)── Relay slot 2  ⚠️
Pin 11 (GPIO17)── CS slot 2      Pin 12 (GPIO18)── Relay slot 3
Pin 13 (GPIO27)── CS slot 3      Pin 14 (GND)   ── (GND)
Pin 15 (GPIO22)── CS slot 4      Pin 16 (GPIO23)── Relay slot 4
Pin 17 (3.3V)  ── (3.3V)         Pin 18 (GPIO24)── Relay slot 5
Pin 19 (GPIO10)── NFC MOSI       Pin 20 (GND)   ── (GND)
Pin 21 (GPIO9) ── NFC MISO       Pin 22 (GPIO25)── Relay slot 6
Pin 23 (GPIO11)── NFC SCK        Pin 24 (GPIO8) ── (SPI CE0)
Pin 25 (GPIO7) ── NFC RST        Pin 26 (GPIO7) ── (SPI CE1)
Pin 27 (GPIO0) ── CS slot 5      Pin 28 (GPIO1) ── (ว่าง)
Pin 29 (GPIO5) ── CS slot 6      Pin 30 (GND)   ── (GND)
Pin 31 (GPIO6) ── CS slot 7      Pin 32 (GPIO12)── Relay slot 7
Pin 33 (GPIO13)── CS slot 8      Pin 34 (GND)   ── (GND)
Pin 35 (GPIO19)── CS slot 9      Pin 36 (GPIO16)── Relay slot 8
Pin 37 (GPIO26)── CS slot 10     Pin 38 (GPIO20)── Relay slot 9
Pin 39 (GND)   ── (GND)          Pin 40 (GPIO21)── Relay slot 10
```

**Pin ที่ว่าง:** 4, 24, 26, 28 (GPIO 1, 8 เท่านั้น)

---

## นับสายทั้งหมด

| ส่วน | จำนวนสาย | ประเภทสาย |
|------|---------|-----------|
| SPI Bus (MOSI/MISO/SCK/RST/VCC/GND) | 6 เส้น (shared) | จัมเปอร์ F-F |
| NFC CS แยกทีละตัว ×10 | 10 เส้น | จัมเปอร์ F-F |
| Relay GPIO ×10 + VCC + GND | 12 เส้น | จัมเปอร์ F-F |
| I2C Module (SDA/SCL/VCC/GND) | 4 เส้น | จัมเปอร์ F-F |
| Solenoid ↔ Relay (NO + COM) ×10 | 20 เส้น | สายไฟ 12V |
| **รวมสายจัมเปอร์ (RPi → อุปกรณ์)** | **~32 เส้น** | |
| **รวมสายไฟ 12V (Relay → Solenoid)** | **~20 เส้น** | |
| **รวมทั้งหมด** | **~52 เส้น** | |

---

## ลำดับการต่อสายที่แนะนำ

1. 🔌 **ปิดไฟ RPi ก่อนต่อสาย** — ห้ามต่อขณะเปิดเครื่อง
2. 🔴 ต่อ Relay Module (12 เส้น) — VCC, GND, IN1-IN10 ✅ **(ต่อแล้ว)**
3. 🟡 ต่อ Solenoid ↔ Relay (20 เส้น) — COM, NO, 12V DC
4. 🟣 ต่อ I2C Module (4 เส้น) — SDA, SCL, VCC, GND
5. 🔵 ต่อ SPI Bus (6 เส้น shared) — MOSI, MISO, SCK, RST (**GPIO 7**), VCC, GND
6. 🟢 ต่อ NFC CS/SDA (10 เส้น แยกตัว) — ตรวจ slot ให้ตรงกับ GPIO
7. ✅ ตรวจสอบทุกจุดต่ออีกครั้ง
8. ⚡ เปิดเครื่อง RPi + เปิดไฟ 12V DC
9. 🧪 ทดสอบ: `sudo i2cdetect -y 1` (I2C) และ `sudo systemctl start kiosk-hardware`

> 💡 **Tips**: ติดป้ายหมายเลข slot ที่สายแต่ละเส้นเพื่อง่ายต่อการ debug
