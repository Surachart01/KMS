#!/usr/bin/env python3
"""
ทดสอบ NFC RC522 × 10 Slot — Raspberry Pi 5
GPIO chip: gpiochip0 [pinctrl-rp1] ← RPi5 ใช้ตัวนี้

RST  = GPIO 7  (Pin 25) — shared ทุก RC522
MOSI = GPIO 10 (Pin 19)
MISO = GPIO 9  (Pin 21)
SCK  = GPIO 11 (Pin 23)
CS slot 1–10 = GPIO 4,5,6,12,13,16,19,20,21,26
"""

import sys, os, time

# ── ตรวจ library ──────────────────────────────
try:
    import gpiod
except ImportError:
    print("❌ ไม่พบ gpiod")
    print("👉  pip install gpiod")
    sys.exit(1)

try:
    import spidev
except ImportError:
    print("❌ ไม่พบ spidev")
    print("👉  pip install spidev")
    sys.exit(1)

# ── Config ────────────────────────────────────
GPIO_CHIP = "/dev/gpiochip0"   # RPi5: pinctrl-rp1, 54 lines
RST_PIN   = 7

CS_PINS = {
    1:  4,
    2:  5,
    3:  6,
    4:  12,
    5:  13,
    6:  16,
    7:  19,
    8:  20,
    9:  21,
    10: 26,
}

# ── GPIO Manager (gpiod v1 / v2 compatible) ───
class GpioManager:
    def __init__(self):
        self._lines = {}
        chip = gpiod.Chip(GPIO_CHIP)

        all_pins = [RST_PIN] + list(CS_PINS.values())

        # ลอง gpiod v2 API ก่อน ถ้าไม่มีใช้ v1
        try:
            # gpiod v2
            import gpiod
            self._v2 = hasattr(gpiod, 'request_lines')
            if self._v2:
                self._request_v2(all_pins)
            else:
                self._request_v1(chip, all_pins)
        except Exception as e:
            raise RuntimeError(f"เปิด GPIO ไม่ได้: {e}")

    def _request_v1(self, chip, pins):
        self._v2 = False
        for pin in pins:
            line = chip.get_line(pin)
            line.request(
                consumer="nfc_test",
                type=gpiod.LINE_REQ_DIR_OUT,
                default_vals=[1]
            )
            self._lines[pin] = line

    def _request_v2(self, pins):
        import gpiod
        from gpiod.line import Direction, Value
        line_settings = gpiod.LineSettings(
            direction=Direction.OUTPUT,
            output_value=Value.ACTIVE
        )
        self._req = gpiod.request_lines(
            GPIO_CHIP,
            consumer="nfc_test",
            config={pin: line_settings for pin in pins}
        )
        self._pins_v2 = pins

    def high(self, pin):
        if self._v2:
            from gpiod.line import Value
            self._req.set_value(pin, Value.ACTIVE)
        else:
            self._lines[pin].set_value(1)

    def low(self, pin):
        if self._v2:
            from gpiod.line import Value
            self._req.set_value(pin, Value.INACTIVE)
        else:
            self._lines[pin].set_value(0)

    def cleanup(self):
        if self._v2:
            self._req.release()
        else:
            for l in self._lines.values():
                l.release()

gpio = None

# ── MFRC522 Registers ─────────────────────────
CommandReg    = 0x01
ComIrqReg     = 0x04
FIFODataReg   = 0x09
FIFOLevelReg  = 0x0A
BitFramingReg = 0x0D
ModeReg       = 0x11
TxControlReg  = 0x14
TxASKReg      = 0x15
TModeReg      = 0x2A
TPrescalerReg = 0x2B
TReloadRegH   = 0x2C
TReloadRegL   = 0x2D
VersionReg    = 0x37
PCD_Idle      = 0x00
PCD_Transceive= 0x0C
PICC_REQA     = 0x26

# ── RC522 Driver ──────────────────────────────
class RC522:
    def __init__(self, slot):
        self.slot   = slot
        self.cs_pin = CS_PINS[slot]
        self.spi    = spidev.SpiDev()
        self.spi.open(0, 0)
        self.spi.max_speed_hz = 1_000_000
        self.spi.mode         = 0b00
        self._init()

    def _write(self, reg, val):
        gpio.low(self.cs_pin)
        self.spi.xfer2([(reg << 1) & 0x7E, val])
        gpio.high(self.cs_pin)

    def _read(self, reg):
        gpio.low(self.cs_pin)
        r = self.spi.xfer2([((reg << 1) & 0x7E) | 0x80, 0])[1]
        gpio.high(self.cs_pin)
        return r

    def _init(self):
        gpio.low(RST_PIN);  time.sleep(0.05)
        gpio.high(RST_PIN); time.sleep(0.05)
        self._write(TModeReg,      0x80)
        self._write(TPrescalerReg, 0xA9)
        self._write(TReloadRegH,   0x03)
        self._write(TReloadRegL,   0xE8)
        self._write(TxASKReg,      0x40)
        self._write(ModeReg,       0x3D)
        tx = self._read(TxControlReg)
        if not (tx & 0x03):
            self._write(TxControlReg, tx | 0x03)

    def get_version(self):
        return self._read(VersionReg)

    def find_card(self):
        self._write(BitFramingReg, 0x07)
        self._write(ComIrqReg,     0x7F)
        self._write(FIFOLevelReg,  0x80)
        self._write(FIFODataReg,   PICC_REQA)
        self._write(CommandReg,    PCD_Transceive)
        self._write(BitFramingReg, 0x87)
        found = False
        for _ in range(2000):
            irq = self._read(ComIrqReg)
            if irq & 0x20: found = True; break
            if irq & 0x01: break
        self._write(CommandReg, PCD_Idle)
        return found

    def get_uid(self):
        self._write(ComIrqReg,    0x7F)
        self._write(FIFOLevelReg, 0x80)
        for b in [0x93, 0x20]:
            self._write(FIFODataReg, b)
        self._write(CommandReg,    PCD_Transceive)
        self._write(BitFramingReg, 0x80)
        time.sleep(0.01)
        level = self._read(FIFOLevelReg)
        data  = [self._read(FIFODataReg) for _ in range(level)]
        self._write(CommandReg, PCD_Idle)
        if len(data) >= 4:
            return ''.join(f'{b:02X}' for b in data[:4])
        return None

    def close(self):
        self.spi.close()

# ── โหมด 1: Version check ─────────────────────
def test_version_all():
    print("\n" + "="*50)
    print("  โหมด 1: ตรวจ Chip Version ทุก Slot")
    print("="*50)
    print("  0x91/0x92 = RC522 OK ✅  |  0x00/0xFF = สายผิด ❌")
    print("-"*50)
    ok = 0
    for slot in range(1, 11):
        r   = RC522(slot)
        ver = r.get_version()
        r.close()
        if ver in (0x91, 0x92):
            tag = "✅ OK"; ok += 1
        elif ver == 0x00:
            tag = "❌ ไม่ตอบ — ตรวจสาย CS/VCC/GND"
        elif ver == 0xFF:
            tag = "❌ SPI error — ตรวจสาย MOSI/MISO/SCK"
        else:
            tag = f"⚠️  0x{ver:02X} unknown"
        print(f"  Slot {slot:>2}  CS=GPIO{CS_PINS[slot]:<2}  ver=0x{ver:02X}  {tag}")
    print("-"*50)
    print(f"  พบ RC522: {ok}/10 ตัว")
    return ok

# ── โหมด 2: อ่าน UID ─────────────────────────
def test_read_uid(slot, timeout=15):
    print(f"\n{'='*50}")
    print(f"  โหมด 2: อ่าน UID — Slot {slot}  CS=GPIO{CS_PINS[slot]}")
    print(f"{'='*50}")
    print(f"  นำบัตร/เหรียญ NFC ทาบที่ RC522 Slot {slot}  (รอ {timeout} วิ)\n")
    r = RC522(slot); start = time.time()
    try:
        while time.time() - start < timeout:
            if r.find_card():
                uid = r.get_uid()
                if uid:
                    print(f"\n  ✅ UID: {uid}  (Slot {slot}, GPIO{CS_PINS[slot]})")
                    r.close(); return uid
            time.sleep(0.1)
            print(f"  ⏳ {int(timeout-(time.time()-start))} วิ...  \r", end='', flush=True)
    except KeyboardInterrupt:
        print("\n  ยกเลิก")
    r.close()
    print(f"\n  ⏳ หมดเวลา"); return None

# ── โหมด 3: Scan ทุก Slot ────────────────────
def test_scan_all(timeout=30):
    print(f"\n{'='*50}")
    print(f"  โหมด 3: Scan ทุก Slot  (Ctrl+C หยุด)")
    print(f"{'='*50}\n")
    readers = {s: RC522(s) for s in range(1, 11)}
    try:
        while True:
            for slot, r in readers.items():
                if r.find_card():
                    uid = r.get_uid()
                    if uid:
                        print(f"  ✅ Slot {slot:>2}  GPIO{CS_PINS[slot]:<2}  UID: {uid}")
            time.sleep(0.05)
    except KeyboardInterrupt:
        print("\n  หยุด")
    for r in readers.values():
        r.close()

# ── Main ──────────────────────────────────────
def main():
    global gpio
    print("="*50)
    print("  NFC RC522 × 10  —  Raspberry Pi 5")
    print(f"  GPIO chip : {GPIO_CHIP}  (pinctrl-rp1)")
    print(f"  RST=GPIO{RST_PIN}  SPI=GPIO10/9/11")
    print("="*50)

    try:
        gpio = GpioManager()
        print("  ✅ GPIO พร้อม")
    except Exception as e:
        print(f"\n  ❌ {e}")
        print("  💡 ลอง: sudo python3 test_nfc.py")
        sys.exit(1)

    print("\n  1 — ตรวจ Version ทุก Slot  ← แนะนำทำก่อน")
    print("  2 — อ่าน UID จาก Slot ที่เลือก")
    print("  3 — Scan ทุก Slot พร้อมกัน")
    print("  0 — ออก")

    try:
        c = input("\n  เลือก (0-3): ").strip()
        if c == '1':
            test_version_all()
        elif c == '2':
            ok = test_version_all()
            if ok == 0:
                print("\n  ⚠️  ไม่พบ RC522 เลย กรุณาตรวจสายก่อน")
            else:
                try:
                    s = int(input("\n  เลือก Slot (1-10): ").strip())
                    if 1 <= s <= 10: test_read_uid(s)
                    else: print("  ❌ Slot 1-10 เท่านั้น")
                except ValueError:
                    print("  ❌ กรอกตัวเลข")
        elif c == '3':
            test_scan_all()
        elif c == '0':
            print("  ออก")
        else:
            print("  ❌ ไม่มีตัวเลือกนี้")
    except KeyboardInterrupt:
        print("\n  ยกเลิก")
    finally:
        if gpio: gpio.cleanup()
        print("  GPIO cleanup เรียบร้อย")

if __name__ == '__main__':
    main()