# Phase 3: การพัฒนาฮาร์ดแวร์ (Hardware Development)
## บทที่ 3 — การออกแบบและพัฒนาระบบจัดการกุญแจ (KMS)

---

## 3.1 ภาพรวมระบบฮาร์ดแวร์

ระบบฮาร์ดแวร์ของตู้กุญแจอัตโนมัติ (KMS) ประกอบด้วยอุปกรณ์หลาย 2 ชั้น คือ **ชั้นควบคุมกลาง (Controller Layer)** บน Raspberry Pi 5 และ **ชั้นอ่าน NFC (NFC Bridge Layer)** บนบอร์ด ESP8266 โดยมีอุปกรณ์ทางกายภาพ (Solenoid, Relay, LED) ที่เชื่อมต่อโดยตรงผ่าน GPIO

> 📎 **อ้างอิงไฟล์แผนภาพ**: [`hardware_diagram.md`](./hardware_diagram.md)

---

## 3.2 อุปกรณ์ที่ใช้ในระบบ

| อุปกรณ์ | รุ่น / ประเภท | จำนวน | หน้าที่ |
|---|---|:---:|---|
| Single-Board Computer | Raspberry Pi 5 | 1 | คอมพิวเตอร์หลักที่รัน Hardware Service, Kiosk UI, และเชื่อมต่อกับทุกอุปกรณ์ |
| เครื่องสแกนใบหน้า | ZKTeco SmartAC1 | 1 | สแกนใบหน้าและบัตร NFC เพื่อยืนยันตัวตน พร้อมส่งข้อมูลผ่าน ADMS Protocol |
| NFC Bridge | ESP8266 NodeMCU | 3 | อ่านแท็ก NFC บนกุญแจและส่งข้อมูลกลับ Raspberry Pi ผ่าน Serial USB |
| NFC Reader Module | MFRC522 | 10 | ติดตั้งในแต่ละช่อง เชื่อมต่อกับ ESP8266 ผ่าน SPI |
| Relay Module | โมดูลรีเลย์ 5V | 10 | รับสัญญาณจาก GPIO เพื่อเปิด/ปิดวงจรไฟของ Solenoid |
| Solenoid Lock | Electronic Lock 12V | 10 | ล็อก/ปลดล็อกช่องกุญแจตามคำสั่ง |
| LED Indicator | LED 2 สี (แดง/เขียว) | 10 | แสดงสถานะของแต่ละช่อง (เขียว = มีกุญแจ, แดง = ไม่มีกุญแจ) |
| NFC Tag บนกุญแจ | MIFARE Classic 1K | 10 | ติดบนกุญแจ ใช้ตรวจจับว่ากุญแจอยู่ในช่องหรือไม่ |

---

## 3.3 หลักการทำงานของระบบ

### 3.3.1 การตรวจสอบสถานะกุญแจ (NFC Polling)

Hardware Service (`hardware.js`) รันบน Raspberry Pi ทำการ **Polling NFC** อย่างต่อเนื่องทุก 200 มิลลิวินาที โดยส่งคำสั่งไปยัง ESP8266 ผ่านพอร์ต USB Serial ในรูปแบบ JSON:

```
RPi → ESP8266: {"cmd":"read","slot":1}
ESP8266 → RPi: {"slot":1,"uid":"A1B2C3D4"}
```

ESP8266 แต่ละบอร์ดรับผิดชอบช่องกุญแจดังนี้:
- **Board 1 (USB /dev/ttyUSB0)**: Slot 1–4
- **Board 2 (USB /dev/ttyUSB1)**: Slot 5–7
- **Board 3 (USB /dev/ttyUSB2)**: Slot 8–10

เมื่อ Hardware Service ตรวจพบว่า UID หายไป (กุญแจถูกดึงออก) หรือ UID ปรากฏขึ้น (กุญแจถูกเสียบคืน) จะส่ง Socket Event กลับไปยัง Backend ทันที

### 3.3.2 การควบคุม Solenoid Lock (GPIO + Relay)

Raspberry Pi ควบคุม Solenoid Lock แต่ละดอกผ่าน GPIO Pins โดยมี Relay Module เป็นตัวแปลงสัญญาณ:

1. **Backend** ส่ง Socket Event `gpio:unlock` พร้อมระบุหมายเลขช่อง
2. **Hardware Service** รับ event และเรียกใช้ `unlockSlot(slotNumber)`
3. **GPIO Pin** ของช่องนั้นส่งสัญญาณ `HIGH` → Relay ทำงาน → Solenoid ปลดล็อก
4. ระบบรอตรวจจับว่ากุญแจถูกดึงออก (NFC UID หายไป) สูงสุด 10 วินาที
5. หากไม่มีการดึงกุญแจ → GPIO ส่ง `LOW` → Solenoid ล็อกกลับ → ยกเลิกการเบิก

### 3.3.3 ระบบไฟ LED แสดงสถานะ

ทุกช่องกุญแจมี LED 2 สี (แดง-เขียว) ที่เชื่อมต่อกับ GPIO Pins ของ Raspberry Pi:

| LED สี | ความหมาย | เงื่อนไข |
|---|---|---|
| 🟢 เขียว | กุญแจอยู่ในช่อง | NFC Tag ตรวจจับได้ |
| 🔴 แดง | ช่องว่าง (กุญแจถูกเบิกออก) | ไม่มี NFC Tag |
| 🔴🟢 กระพริบสลับ | กำลังรอดำเนินการ | ระหว่างรอเสียบกุญแจคืน / รอดึงกุญแจออก |

### 3.3.4 การยืนยันตัวตนด้วย ZKTeco SmartAC1

เครื่อง ZKTeco SmartAC1 ทำงานโดยใช้ **ADMS Protocol** (Attendance Data Management System) ซึ่งเป็น HTTP Protocol ที่ ZKTeco ออกแบบมาเฉพาะ:

1. เมื่อผู้ใช้วางบัตรหรือสแกนใบหน้า เครื่อง ZKTeco จะส่ง HTTP POST ไปยัง `/adms/cdata` บน Backend
2. Backend แปลงข้อมูลและส่ง Socket Event `scan:received` พร้อมข้อมูลผู้ใช้ไปยัง Kiosk UI
3. Kiosk UI อัปเดต State Machine และแสดงหน้ายืนยันตัวตน (ConfirmIdentityPage) ทันที

---

## 3.4 ระบบ Auto-Recovery (Watchdog)

เพื่อรองรับปัญหาทางกายภาพ เช่น ไฟตก หรือ USB หลุด Hardware Service มีระบบ Auto-Recovery ดังนี้

| กลไก | คำอธิบาย |
|---|---|
| **Watchdog Timer** | ตรวจสอบว่า Polling Loop ยังทำงานอยู่ทุก 5 วินาที หากหยุดทำงาน จะบังคับ Reset ทันที |
| **Dynamic Port Re-scan** | สแกนหา ESP8266 ใหม่บน Serial Port ทุก 30 วินาที รองรับกรณีที่ USB เปลี่ยน Port หลังถอด-เสียบ |
| **NFC Miss Count** | ถ้า NFC อ่านไม่ได้ติดกัน 3 ครั้ง ระบบจึงถือว่า "กุญแจถูกดึงออก" (ป้องกัน false trigger) |
| **isPollingSlot guard** | ป้องกัน Polling Loop รัน 2 รอบพร้อมกัน ซึ่งอาจทำให้ Serial ขัดกัน |

---

## 3.5 สรุปการพัฒนาฮาร์ดแวร์

การออกแบบฮาร์ดแวร์ของระบบ KMS ให้ความสำคัญกับ **ความเสถียร** และ **การ Self-healing** เป็นอันดับแรก เนื่องจากระบบต้องทำงาน 24 ชั่วโมงโดยไม่มีผู้ดูแล การใช้ ESP8266 เป็น NFC Bridge แทนการต่อ MFRC522 เข้ากับ Raspberry Pi โดยตรง ทำให้ระบบสามารถขยายจำนวนช่องกุญแจได้ง่าย และแยกการทำงานระหว่างการควบคุม GPIO กับการอ่าน NFC ออกจากกันอย่างชัดเจน
