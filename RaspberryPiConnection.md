# Raspberry Pi 5 — Deployment Guide
## hardwareUI (React Kiosk + GPIO Service + NFC Service)

---

## 1. สิ่งที่จะรันบน Raspberry Pi 5

| Service | ไฟล์ | คำอธิบาย |
|---------|------|---------|
| **kiosk-ui** | `npm run dev` (Vite) | หน้าจอ Kiosk แสดงบน Chromium |
| **kiosk-gpio** | `gpio/index.js` | ควบคุม Relay / Solenoid ผ่าน `onoff` |
| **kiosk-nfc** | `gpio/nfc.js` | อ่าน NFC RC522 ×10 ผ่าน SPI + CS GPIO |

> ทุก service ใช้ **Socket.IO** คุยกับ Backend Server (Node.js บนเครื่องอื่น)

---

## 2. ขั้นตอน Deploy (ทำครั้งแรก)

### Step 1 — Copy โปรเจกต์ขึ้น Raspberry Pi

```bash
# วิธี 1: ใช้ scp จากเครื่อง Mac
scp -r /Users/surachartlimrattanaphun/Desktop/KMS/hardwareUI \
    pi@<rpi-ip>:~/Desktop/KMS/

# วิธี 2: ใช้ git (แนะนำ ถ้ามี repo)
git clone <repo-url> ~/Desktop/KMS
```

---

### Step 2 — แก้ไข IP Backend ใน `.env`

> ⚠️ ต้องแก้ IP ให้ตรงกับ Backend Server ก่อนรันทุกครั้ง

**`hardwareUI/.env`** (สำหรับ Vite/UI)
```env
VITE_BACKEND_URL=http://<backend-server-ip>:4556
```

**`hardwareUI/gpio/.env`** (สำหรับ GPIO + NFC)
```env
BACKEND_URL=http://<backend-server-ip>:4556
```

ปัจจุบันตั้งไว้ที่: `http://172.20.10.3:4556` → ตรวจสอบว่า IP ยังถูกต้อง

---

### Step 3 — ติดตั้ง Node.js บน Raspberry Pi 5

```bash
# ติดตั้ง Node.js 20 LTS (แนะนำ)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# ตรวจสอบ version
node -v   # ควรได้ v20.x.x
npm -v
```

---

### Step 4 — เปิดใช้งาน SPI (สำหรับ RC522)

```bash
sudo raspi-config
# → Interface Options → SPI → Enable → Finish → Reboot
```

หรือ manual:
```bash
# เพิ่มบรรทัดนี้ใน /boot/firmware/config.txt (RPi 5)
echo "dtparam=spi=on" | sudo tee -a /boot/firmware/config.txt
sudo reboot
```

ตรวจสอบ:
```bash
ls /dev/spi*   # ควรเห็น /dev/spidev0.0
```

---

### Step 5 — ติดตั้ง Library สำหรับ NFC (mfrc522)

> `nfc.js` ปัจจุบันมี placeholder ต้อง uncomment และเพิ่ม library จริง

```bash
cd ~/Desktop/KMS/hardwareUI/gpio
npm install mfrc522-rpi
```

จากนั้นแก้ `nfc.js` บรรทัดที่มี comment เป็น:
```js
// เปลี่ยนจาก (commented out):
// const Mfrc522Lib = await import('mfrc522-rpi');
// Mfrc522 = new Mfrc522Lib();

// เป็น:
const { default: Mfrc522Lib } = await import('mfrc522-rpi');
Mfrc522 = new Mfrc522Lib();
```

และใน polling loop เพิ่ม:
```js
const response = Mfrc522.findCard();
if (response.status) {
    const uidResult = Mfrc522.getUid();
    if (uidResult.status) {
        const uid = uidResult.data
            .slice(0, 4)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('').toUpperCase();
        socket.emit('nfc:tag', { slotNumber: currentSlot, uid });
    }
}
```

---

### Step 6 — รัน Setup Script (ติดตั้ง systemd services ทั้งหมด)

```bash
cd ~/Desktop/KMS/hardwareUI
chmod +x setup-kiosk.sh
sudo ./setup-kiosk.sh
```

Script จะสร้าง systemd services ให้อัตโนมัติ:
- `kiosk-ui.service` — Vite dev server (port 5173)
- `kiosk-gpio.service` — Relay/Solenoid controller
- `kiosk-nfc.service` — NFC polling
- Chromium autostart ใน kiosk mode

> ⚠️ **Path ใน setup-kiosk.sh**: ตรวจสอบว่า path ตรงกับที่วางไฟล์จริง
> ```
> HARDWARE_UI_DIR="/home/$(logname)/Desktop/KMS/hardwareUi"
> ```
> ถ้า folder ชื่อ `hardwareUI` (ตัวใหญ่) ให้แก้เป็น `hardwareUI`

---

### Step 7 — เริ่มต้น Services

```bash
# Start ทั้งหมด
sudo systemctl start kiosk-ui
sudo systemctl start kiosk-gpio
sudo systemctl start kiosk-nfc

# ตรวจสอบสถานะ
sudo systemctl status kiosk-ui
sudo systemctl status kiosk-gpio
sudo systemctl status kiosk-nfc
```

---

### Step 8 — Reboot และทดสอบ

```bash
sudo reboot
```

หลัง reboot:
- Chromium จะเปิดอัตโนมัติในโหมด Kiosk ที่ `http://localhost:5173`
- GPIO และ NFC service จะรันอยู่เบื้องหลัง

---

## 3. คำสั่งที่ใช้บ่อย

```bash
# ดู log
journalctl -u kiosk-ui -f
journalctl -u kiosk-gpio -f
journalctl -u kiosk-nfc -f

# Restart service
sudo systemctl restart kiosk-gpio
sudo systemctl restart kiosk-nfc

# หยุด service
sudo systemctl stop kiosk-ui

# ทดสอบ GPIO relay (slot 1) ไม่ผ่าน service
cd ~/Desktop/KMS/hardwareUI
node -e "
import { Gpio } from 'onoff';
const relay = new Gpio(17, 'out');
relay.writeSync(1);
setTimeout(() => { relay.writeSync(0); relay.unexport(); }, 3000);
"

# ทดสอบ NFC อ่าน UID
cd ~/Desktop/KMS/hardwareUI/gpio
node nfc.js
```

---

## 4. Pin Map สรุป

### RC522 SPI (Shared Bus ทั้ง 10 ตัว)
| RC522 | RPi GPIO | Physical |
|-------|---------|---------|
| MOSI  | GPIO 10 | Pin 19  |
| MISO  | GPIO 9  | Pin 21  |
| SCK   | GPIO 11 | Pin 23  |
| 3.3V  | 3.3V    | Pin 1   |
| GND   | GND     | Pin 6   |

### NFC CS Pins (แต่ละ RC522 แยกกัน)
| Slot | CS GPIO | Physical |
|------|--------|---------|
| 1    | GPIO 4  | Pin 7   |
| 2    | GPIO 5  | Pin 29  |
| 3    | GPIO 6  | Pin 31  |
| 4    | GPIO 12 | Pin 32  |
| 5    | GPIO 13 | Pin 33  |
| 6    | GPIO 16 | Pin 36  |
| 7    | GPIO 19 | Pin 35  |
| 8    | GPIO 20 | Pin 38  |
| 9    | GPIO 21 | Pin 40  |
| 10   | GPIO 26 | Pin 37  |

### Relay Pins (Solenoid)
| Slot | GPIO    | Physical |
|------|---------|---------|
| 1    | GPIO 17 | Pin 11  |
| 2    | GPIO 27 | Pin 13  |
| 3    | GPIO 22 | Pin 15  |
| 4    | GPIO 23 | Pin 16  |
| 5    | GPIO 24 | Pin 18  |
| 6    | GPIO 25 | Pin 22  |
| 7-10 | ต้องเพิ่มใน `SLOT_PIN_MAP` ใน `index.js` | |

---

## 5. สิ่งที่ต้องทำเพิ่มก่อน Deploy จริง

| รายการ | สถานะ | ไฟล์ที่เกี่ยวข้อง |
|--------|-------|-----------------|
| เพิ่ม Relay Slot 7-10 ใน `SLOT_PIN_MAP` | ⏳ ต้องทำ | `gpio/index.js` |
| Implement NFC read UID จริง (uncomment + ใช้ `mfrc522-rpi`) | ⏳ ต้องทำ | `gpio/nfc.js` |
| แก้ path ใน `setup-kiosk.sh` (`hardwareUi` → `hardwareUI`) | ⚠️ ตรวจสอบ | `setup-kiosk.sh` line 19 |
| ตั้งค่า IP Backend ใน `.env` ทั้งสองไฟล์ | ⚠️ ตรวจสอบ | `.env`, `gpio/.env` |
| เปิด SPI ใน `raspi-config` | ⏳ ต้องทำ (RPi) | - |
| ติดตั้ง Node.js 20 LTS บน RPi | ⏳ ต้องทำ (RPi) | - |
