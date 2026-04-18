# Hardware Architecture Diagram — ระบบจัดการกุญแจ (KMS)

> ไฟล์นี้ใช้อ้างอิงใน `text.md` ของ Phase 3 ส่วนสถาปัตยกรรม Hardware

## ภาพรวมการเชื่อมต่อระบบ Hardware

```mermaid
flowchart TB
    subgraph BOX["ตู้กุญแจ (Key Cabinet)"]
        SOLENOID["🔒 Solenoid Lock x10\n(ล็อก/ปลดล็อกช่องกุญแจ)"]
        RELAY["⚡ Relay Module x10\n(ควบคุมไฟ Solenoid)"]
        LED["💡 LED BiColor (R/G) x10\n(แสดงสถานะช่องกุญแจ)"]
        MFRC["📡 NFC Tag บนกุญแจ\n(MIFARE Classic 1K)"]
    end

    subgraph ESP8266["ESP8266 Boards (NFC Bridge)"]
        B1["Board 1\nSlot 1-4 (MFRC522)"]
        B2["Board 2\nSlot 5-7 (MFRC522)"]
        B3["Board 3\nSlot 8-10 (MFRC522)"]
    end

    subgraph RPI["Raspberry Pi 5 (Main Controller)"]
        HW["Hardware Service\n(hardware.js / Node.js)"]
        GPIO["GPIO Pins\n(ควบคุม Relay + LED โดยตรง)"]
    end

    subgraph ZK["ZKTeco SmartAC1"]
        CAM["📷 กล้องสแกนใบหน้า"]
        NFC2["📡 NFC Reader\n(บัตร MIFARE)"]
    end

    subgraph BACKEND["Backend Server (Node.js)"]
        BE["hardwareController.js\n+ Socket.IO"]
    end

    %% Connections
    HW -- "GPIO (BCM)" --> GPIO
    GPIO -- "HIGH/LOW" --> RELAY
    RELAY -- "5V DC" --> SOLENOID
    GPIO -- "HIGH/LOW" --> LED

    HW -- "USB Serial\n(JSON Protocol)" --> B1
    HW -- "USB Serial\n(JSON Protocol)" --> B2
    HW -- "USB Serial\n(JSON Protocol)" --> B3

    B1 -- "SPI" --> MFRC
    B2 -- "SPI" --> MFRC
    B3 -- "SPI" --> MFRC

    ZK -- "HTTP ADMS\n(Attendance Data)" --> BE
    BE -- "Socket.IO" --> HW
    HW -- "Socket.IO" --> BE
```

---

## ตารางการกำหนด GPIO Pins บน Raspberry Pi

| บอร์ด | ช่อง (Slot) | GPIO Relay Pin | GPIO LED Pin (Red) |
|---|---|---|---|
| ESP8266 Board 1 | Slot 1 | GPIO 17 | GPIO 27 |
| ESP8266 Board 1 | Slot 2 | GPIO 22 | GPIO 23 |
| ESP8266 Board 1 | Slot 3 | GPIO 24 | GPIO 25 |
| ESP8266 Board 1 | Slot 4 | GPIO 5 | GPIO 6 |
| ESP8266 Board 2 | Slot 5 | GPIO 13 | GPIO 19 |
| ESP8266 Board 2 | Slot 6 | GPIO 26 | GPIO 16 |
| ESP8266 Board 2 | Slot 7 | GPIO 20 | GPIO 21 |
| ESP8266 Board 3 | Slot 8 | GPIO 12 | GPIO 7 |
| ESP8266 Board 3 | Slot 9 | GPIO 8 | GPIO 11 |
| ESP8266 Board 3 | Slot 10 | GPIO 9 | GPIO 10 |

---

## โปรโตคอล Serial JSON ระหว่าง RPi และ ESP8266

```mermaid
sequenceDiagram
    participant RPi as Raspberry Pi (hardware.js)
    participant ESP as ESP8266 Board

    RPi->>ESP: {"cmd":"read","slot":1}
    ESP-->>RPi: {"slot":1,"uid":"A1B2C3D4"}

    RPi->>ESP: {"cmd":"read","slot":2}
    ESP-->>RPi: {"slot":2,"uid":null}
```

**รูปแบบคำสั่ง (Request):**
```json
{ "cmd": "read", "slot": 1 }
```

**รูปแบบผลลัพธ์ (Response):**
```json
{ "slot": 1, "uid": "A1B2C3D4" }
```
