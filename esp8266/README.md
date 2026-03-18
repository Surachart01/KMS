## ESP32 (Thai Easy Elec) + 10x RC522 Test

อ่าน UID จาก RC522 10 ตัวผ่าน SPI + CS แยกทีละเส้น
พิมพ์ออก Serial เป็น:

```
R1 VersionReg=0x18 OK
R2 VersionReg=0x82 OK
...
R3 UID:58A8A027
```

---

## Wiring

### SPI Bus (ร่วมทุก reader)

| สัญญาณ | ESP32 (GPIO) | RC522 ขา |
|--------|-------------|---------|
| SCK    | GPIO 18     | SCK     |
| MOSI   | GPIO 23     | MOSI *(ดูหมายเหตุ)* |
| MISO   | GPIO 19     | MISO *(ดูหมายเหตุ)* |
| RST    | GPIO 27     | RST *(shared ทุกตัว)* |
| 3.3V   | 3V3         | VCC     |
| GND    | GND         | GND     |

### CS per reader (active-LOW)

| Reader | ESP32 GPIO | RC522 ขา SDA/SS |
|--------|-----------|-----------------|
| 1  | GPIO 4  | SDA |
| 2  | GPIO 5  | SDA |
| 3  | GPIO 13 | SDA |
| 4  | GPIO 14 | SDA |
| 5  | GPIO 16 | SDA |
| 6  | GPIO 17 | SDA |
| 7  | GPIO 21 | SDA |
| 8  | GPIO 22 | SDA |
| 9  | GPIO 25 | SDA |
| 10 | GPIO 26 | SDA |

### หมายเหตุ MOSI/MISO (clone board)

RC522 clone บางล็อตมี silk-screen **MOSI/MISO สลับกัน**  
ถ้า VersionReg = `0x00` หรือ `0xFF` ให้ **สลับสาย MOSI ↔ MISO** แล้วเทสใหม่

---

## Build/Upload

1. เปิดโฟลเดอร์ `esp8266/` ด้วย PlatformIO
2. กด **Upload**
3. เปิด **Serial Monitor** ที่ 115200

---

## Serial Output

ตอน boot จะเห็น probe ทุก reader:
```
=== ESP32 10x RC522 Test (SPI + CS) ===
Reader  #1 | CS=GPIO4  | Ver=0x18 | OK
Reader  #2 | CS=GPIO5  | Ver=0x82 | OK
...
```

ตอนเอาบัตรไปทาบ:
```
R1 UID:58A8A027
R5 UID:40C65B24
```

---

## ต่อกับ Raspberry Pi

ถ้าต้องการให้ RPi อ่าน UID จาก ESP32 ให้เชื่อม:

- ESP32 TX (GPIO1) → RPi RX (GPIO15 / Pin 10)
- ESP32 GND → RPi GND
- บน RPi ใช้ `serial.Serial('/dev/serial0', 115200)` อ่านทีละบรรทัด
- แต่ละบรรทัดที่ขึ้นต้นด้วย `R` คือ UID จาก reader นั้น
