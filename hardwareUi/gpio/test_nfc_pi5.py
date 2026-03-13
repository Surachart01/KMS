#!/usr/bin/env python3
"""
ทดสอบ NFC RC522 — ตรงกับ Wire Guide
RST  = GPIO 7  (Pin 25)
MOSI = GPIO 10 (Pin 19)
MISO = GPIO 9  (Pin 21)
SCK  = GPIO 11 (Pin 23)
CS slot 1–10 = GPIO 4,5,6,12,13,16,19,20,21,26
"""

import sys
import time

# ──────────────────────────────────────────────
# ตรวจสอบ library ก่อนรัน
# ──────────────────────────────────────────────
try:
    import RPi.GPIO as GPIO
    import spidev
except ImportError as e:
    print(f"❌ Library ขาด: {e}")
    print("\n👉 ติดตั้งก่อนรันครับ:")
    print("   pip3 install RPi.GPIO spidev --break-system-packages")
    sys.exit(1)

# ──────────────────────────────────────────────
# Config ตาม Wire Guide
# ──────────────────────────────────────────────
RST_PIN = 7   # GPIO 7 (Pin 25) — shared RST ทุก RC522

# CS (SDA) ของ RC522 แต่ละ slot
CS_PINS = {
    1:  4,   # Pin 7
    2:  5,   # Pin 29
    3:  6,   # Pin 31
    4:  12,  # Pin 32
    5:  13,  # Pin 33
    6:  16,  # Pin 36
    7:  19,  # Pin 35
    8:  20,  # Pin 38
    9:  21,  # Pin 40
    10: 26,  # Pin 37
}

# ──────────────────────────────────────────────
# MFRC522 Register Map
# ──────────────────────────────────────────────
CommandReg     = 0x01
ComIEnReg      = 0x02
ComIrqReg      = 0x04
ErrorReg       = 0x06
FIFODataReg    = 0x09
FIFOLevelReg   = 0x0A
ControlReg     = 0x0C
BitFramingReg  = 0x0D
ModeReg        = 0x11
TxControlReg   = 0x14
TxASKReg       = 0x15
TModeReg       = 0x2A
TPrescalerReg  = 0x2B
TReloadRegH    = 0x2C
TReloadRegL    = 0x2D
VersionReg     = 0x37

PCD_Idle       = 0x00
PCD_Transceive = 0x0C
PCD_ReqA       = 0x26
PICC_REQA      = 0x26


class RC522:
    def __init__(self, slot: int):
        self.slot = slot
        self.cs_pin = CS_PINS[slot]
        self.spi = spidev.SpiDev()
        self.spi.open(0, 0)
        self.spi.max_speed_hz = 1000000
        self.spi.mode = 0b00
        self._init()

    def _write(self, reg, val):
        self.spi.xfer2([(reg << 1) & 0x7E, val])

    def _read(self, reg):
        return self.spi.xfer2([((reg << 1) & 0x7E) | 0x80, 0])[1]

    def _select(self):
        """เลือก RC522 ตัวนี้ (CS LOW) ปิดตัวอื่น"""
        for pin in CS_PINS.values():
            GPIO.output(pin, GPIO.HIGH)   # ปิดทุกตัวก่อน
        GPIO.output(self.cs_pin, GPIO.LOW)  # เปิดตัวที่ต้องการ

    def _deselect(self):
        GPIO.output(self.cs_pin, GPIO.HIGH)

    def _init(self):
        self._select()
        # Reset
        GPIO.output(RST_PIN, GPIO.LOW)
        time.sleep(0.05)
        GPIO.output(RST_PIN, GPIO.HIGH)
        time.sleep(0.05)
        # ตั้งค่า Timer + Modulation
        self._write(TModeReg,      0x80)
        self._write(TPrescalerReg, 0xA9)
        self._write(TReloadRegH,   0x03)
        self._write(TReloadRegL,   0xE8)
        self._write(TxASKReg,      0x40)
        self._write(ModeReg,       0x3D)
        # เปิด antenna
        tx = self._read(TxControlReg)
        if not (tx & 0x03):
            self._write(TxControlReg, tx | 0x03)
        self._deselect()

    def get_version(self):
        self._select()
        ver = self._read(VersionReg)
        self._deselect()
        return ver

    def find_card(self):
        """ส่ง REQA — คืน True ถ้ามีบัตร"""
        self._select()
        self._write(BitFramingReg, 0x07)
        self._write(ComIrqReg,     0x7F)
        self._write(FIFOLevelReg,  0x80)
        self._write(FIFODataReg,   PICC_REQA)
        self._write(CommandReg,    PCD_Transceive)
        self._write(BitFramingReg, 0x87)

        found = False
        for _ in range(2000):
            irq = self._read(ComIrqReg)
            if irq & 0x20:   # RxIRq
                found = True
                break
            if irq & 0x01:   # TimerIRq
                break

        self._write(CommandReg, PCD_Idle)
        self._deselect()
        return found

    def get_uid(self):
        """อ่าน UID — คืน string hex หรือ None"""
        self._select()
        self._write(ComIrqReg,    0x7F)
        self._write(FIFOLevelReg, 0x80)
        # Anti-collision command
        for b in [0x93, 0x20]:
            self._write(FIFODataReg, b)
        self._write(CommandReg,    PCD_Transceive)
        self._write(BitFramingReg, 0x00)
        # กระตุ้น
        self._write(BitFramingReg, 0x80)

        time.sleep(0.01)

        level = self._read(FIFOLevelReg)
        uid_bytes = [self._read(FIFODataReg) for _ in range(level)]
        self._write(CommandReg, PCD_Idle)
        self._deselect()

        if len(uid_bytes) >= 4:
            uid_hex = ''.join(f'{b:02X}' for b in uid_bytes[:4])
            return uid_hex
        return None

    def close(self):
        self._deselect()
        self.spi.close()


# ──────────────────────────────────────────────
# Setup GPIO
# ──────────────────────────────────────────────
def setup_gpio():
    GPIO.setmode(GPIO.BCM)
    GPIO.setwarnings(False)
    GPIO.setup(RST_PIN, GPIO.OUT)
    GPIO.output(RST_PIN, GPIO.HIGH)
    for pin in CS_PINS.values():
        GPIO.setup(pin, GPIO.OUT)
        GPIO.output(pin, GPIO.HIGH)  # ปิดทุกตัวก่อน


# ──────────────────────────────────────────────
# ทดสอบ: ตรวจ Version ของ RC522 ทุกตัว
# ──────────────────────────────────────────────
def test_version_all():
    print("\n" + "="*50)
    print("  ทดสอบ 1: ตรวจ Chip Version ทุก Slot")
    print("="*50)
    print("  Version 0x91 หรือ 0x92 = RC522 ✅")
    print("  Version 0x00 หรือ 0xFF = สายผิด ❌")
    print("-"*50)

    ok_count = 0
    for slot in range(1, 11):
        reader = RC522(slot)
        ver = reader.get_version()
        reader.close()

        if ver in (0x91, 0x92):
            status = "✅ RC522 พบแล้ว"
            ok_count += 1
        elif ver == 0x00:
            status = "❌ ไม่ตอบสนอง (ตรวจสาย CS / VCC / GND)"
        elif ver == 0xFF:
            status = "❌ SPI error (ตรวจสาย MOSI/MISO/SCK)"
        else:
            status = f"⚠️  Version ไม่รู้จัก (0x{ver:02X})"

        cs_gpio = CS_PINS[slot]
        print(f"  Slot {slot:>2} (CS=GPIO{cs_gpio:<2}) → 0x{ver:02X}  {status}")

    print("-"*50)
    print(f"  พบ RC522 ทั้งหมด: {ok_count}/10 ตัว")
    return ok_count


# ──────────────────────────────────────────────
# ทดสอบ: อ่าน UID จาก Slot ที่เลือก
# ──────────────────────────────────────────────
def test_read_uid(slot: int, timeout: int = 15):
    print(f"\n{'='*50}")
    print(f"  ทดสอบ 2: อ่าน UID — Slot {slot} (CS=GPIO{CS_PINS[slot]})")
    print(f"{'='*50}")
    print(f"  นำบัตร/เหรียญ NFC ไปทาบที่ RC522 Slot {slot}")
    print(f"  รอ {timeout} วินาที...\n")

    reader = RC522(slot)
    start = time.time()

    try:
        while time.time() - start < timeout:
            if reader.find_card():
                uid = reader.get_uid()
                if uid:
                    print(f"  ✅ เจอบัตร!")
                    print(f"     UID (HEX): {uid}")
                    print(f"     Slot: {slot}  CS: GPIO{CS_PINS[slot]}")
                    reader.close()
                    return uid
            time.sleep(0.1)
            remaining = int(timeout - (time.time() - start))
            print(f"  ⏳ รออีก {remaining} วิ...  \r", end='', flush=True)
    except KeyboardInterrupt:
        print("\n  ยกเลิกโดยผู้ใช้")

    reader.close()
    print(f"\n  ⏳ หมดเวลา ไม่พบบัตรที่ Slot {slot}")
    return None


# ──────────────────────────────────────────────
# ทดสอบ: scan ทุก Slot พร้อมกัน (round-robin)
# ──────────────────────────────────────────────
def test_scan_all(timeout: int = 30):
    print(f"\n{'='*50}")
    print(f"  ทดสอบ 3: Scan ทุก Slot พร้อมกัน")
    print(f"{'='*50}")
    print(f"  นำบัตร NFC ไปทาบที่ RC522 ตัวใดก็ได้")
    print(f"  รอ {timeout} วินาที... (Ctrl+C เพื่อหยุด)\n")

    readers = {slot: RC522(slot) for slot in range(1, 11)}
    start = time.time()

    try:
        while time.time() - start < timeout:
            for slot, reader in readers.items():
                if reader.find_card():
                    uid = reader.get_uid()
                    if uid:
                        print(f"\n  ✅ Slot {slot:>2} (GPIO{CS_PINS[slot]:<2}) → UID: {uid}")
            time.sleep(0.05)
    except KeyboardInterrupt:
        print("\n  หยุดการ scan")

    for r in readers.values():
        r.close()


# ──────────────────────────────────────────────
# Main Menu
# ──────────────────────────────────────────────
def main():
    print("=" * 50)
    print("  ทดสอบ NFC RC522 × 10 Slot")
    print(f"  RST: GPIO{RST_PIN}  |  SPI: GPIO10/9/11")
    print("=" * 50)

    setup_gpio()

    print("\n  เลือกโหมดทดสอบ:")
    print("  1 — ตรวจ Version ทุก Slot (แนะนำทำก่อน)")
    print("  2 — อ่าน UID จาก Slot ที่เลือก")
    print("  3 — Scan ทุก Slot พร้อมกัน")
    print("  0 — ออก")

    try:
        choice = input("\n  เลือก (0-3): ").strip()

        if choice == '1':
            test_version_all()

        elif choice == '2':
            ok = test_version_all()
            if ok == 0:
                print("\n  ⚠️  ไม่พบ RC522 เลย ตรวจสายก่อนครับ")
            else:
                try:
                    slot = int(input("\n  เลือก Slot (1-10): ").strip())
                    if 1 <= slot <= 10:
                        test_read_uid(slot)
                    else:
                        print("  ❌ Slot ต้องอยู่ระหว่าง 1-10")
                except ValueError:
                    print("  ❌ กรุณากรอกตัวเลข")

        elif choice == '3':
            test_scan_all()

        elif choice == '0':
            print("  ออกจากโปรแกรม")

        else:
            print("  ❌ ไม่พบตัวเลือกนี้")

    except KeyboardInterrupt:
        print("\n  ยกเลิก")
    finally:
        GPIO.cleanup()
        print("  GPIO cleanup เรียบร้อย")


if __name__ == '__main__':
    main()