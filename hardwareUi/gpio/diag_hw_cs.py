#!/usr/bin/env python3
"""
Test RC522 using hardware CE0 (Pin 24) + RST GPIO activation.
Usage: sudo python3 diag_hw_cs.py [slot]
  slot = 1-10 (default: 1), controls which RST GPIO to activate
"""
import sys, spidev, time

try:
    import lgpio
except ImportError:
    lgpio = None

SLOT_RST = {1:17, 2:17, 3:27, 4:22, 5:0, 6:5, 7:6, 8:13, 9:19, 10:26}

slot = int(sys.argv[1]) if len(sys.argv) > 1 else 1
rst_pin = SLOT_RST.get(slot)

PASS = "\033[92m[PASS]\033[0m"
FAIL = "\033[91m[FAIL]\033[0m"
INFO = "\033[93m[INFO]\033[0m"

print("=" * 55)
print("  RC522 Test — CE0 (Pin 24) + RST per reader")
print(f"  Slot: {slot}  RST GPIO: {rst_pin}  SPI: /dev/spidev0.0")
print("=" * 55)

# --- Activate RST for the target reader ---
chip = None
if lgpio and rst_pin is not None:
    print(f"\n{INFO} Activating RST: setting all RST LOW, then GPIO{rst_pin} HIGH")
    chip = lgpio.gpiochip_open(0)
    for s, p in SLOT_RST.items():
        try:
            lgpio.gpio_claim_output(chip, p, 0)
        except lgpio.error:
            pass
    lgpio.gpio_write(chip, rst_pin, 1)
    time.sleep(0.05)
    print(f"{PASS} GPIO{rst_pin} = HIGH (reader #{slot} active)")
else:
    print(f"\n{INFO} lgpio not available or invalid slot — RST not controlled")
    print(f"{INFO} Make sure RST is connected to 3.3V manually")

# --- Open SPI ---
spi = spidev.SpiDev()
spi.open(0, 0)
spi.max_speed_hz = 50_000
spi.mode = 0

# Test 1: Read VersionReg (0x37)
print("\n--- Test 1: Read VersionReg ---")
ver = 0
for i in range(3):
    r = spi.xfer2([0xEE, 0x00])
    ver = r[1]
    print(f"  Try {i+1}: xfer2([0xEE, 0x00]) → {[hex(b) for b in r]}  Version=0x{ver:02X}")

if ver == 0x00:
    print(f"\n  {FAIL} Version=0x00 — RC522 ไม่ตอบ")
    print("  สาเหตุที่เป็นไปได้:")
    print("    1. สาย SDA/MOSI/MISO/SCK/GND หลวม")
    print("    2. RST ไม่ได้เป็น HIGH (เช็ค GPIO wiring)")
    print("    3. RC522 ไม่มีไฟ (VCC ไม่ได้ 3.3V)")
elif ver == 0xFF:
    print(f"\n  {FAIL} Version=0xFF — MISO อาจ float")
elif ver in (0x91, 0x92, 0x88, 0x18, 0x12, 0x9A, 0x82, 0x8A):
    print(f"\n  {PASS} RC522 ตอบ! Version=0x{ver:02X}")

    # Test 2: Read more registers
    print("\n--- Test 2: Read Multiple Registers ---")
    regs = {
        "CommandReg (0x01)": 0x01,
        "Status1Reg (0x07)": 0x07,
        "TxControlReg (0x14)": 0x14,
        "ModeReg (0x11)": 0x11,
        "VersionReg (0x37)": 0x37,
    }
    for name, addr in regs.items():
        rd = ((addr << 1) & 0x7E) | 0x80
        val = spi.xfer2([rd, 0x00])[1]
        print(f"  {name} = 0x{val:02X}")

    # Test 3: Try to detect a card
    print("\n--- Test 3: Card Detection ---")
    print("  กรุณาวางบัตร NFC ไว้บน RC522...")

    def wr(reg, val):
        spi.xfer2([(reg << 1) & 0x7E, val & 0xFF])
    def rd(reg):
        return spi.xfer2([((reg << 1) & 0x7E) | 0x80, 0x00])[1]
    def set_bits(reg, mask):
        wr(reg, rd(reg) | mask)

    wr(0x01, 0x00)
    wr(0x2A, 0x8D)
    wr(0x2B, 0x3E)
    wr(0x2D, 30)
    wr(0x2C, 0)
    wr(0x15, 0x40)
    wr(0x11, 0x3D)
    if (rd(0x14) & 0x03) != 0x03:
        set_bits(0x14, 0x03)

    for attempt in range(30):
        wr(0x0D, 0x07)
        wr(0x01, 0x00)
        wr(0x04, 0x7F)
        set_bits(0x0A, 0x80)
        wr(0x09, 0x26)
        wr(0x01, 0x0C)
        set_bits(0x0D, 0x80)

        t0 = time.time()
        while True:
            irq = rd(0x04)
            if irq & 0x30:
                break
            if irq & 0x01:
                break
            if time.time() - t0 > 0.05:
                break

        err = rd(0x06)
        if not (err & 0x1B) and (irq & 0x30):
            n = rd(0x0A)
            if n > 0:
                atqa = [rd(0x09) for _ in range(min(n, 2))]
                print(f"  {PASS} Card detected! ATQA={[hex(b) for b in atqa]}")

                wr(0x0D, 0x00)
                wr(0x01, 0x00)
                wr(0x04, 0x7F)
                set_bits(0x0A, 0x80)
                for b in [0x93, 0x20]:
                    wr(0x09, b)
                wr(0x01, 0x0C)
                set_bits(0x0D, 0x80)

                t0 = time.time()
                while True:
                    irq = rd(0x04)
                    if irq & 0x30:
                        break
                    if time.time() - t0 > 0.05:
                        break

                n = rd(0x0A)
                if n >= 5:
                    uid = [rd(0x09) for _ in range(5)]
                    uid_hex = "".join(f"{b:02X}" for b in uid[:4])
                    print(f"  {PASS} UID = {uid_hex}")
                else:
                    print(f"  อ่าน UID ไม่สำเร็จ (n={n})")
                break

        if attempt % 10 == 9:
            print(f"  ... รอบัตร ({attempt+1}/30) ...")
        time.sleep(0.3)
    else:
        print(f"  ไม่พบบัตร (timeout 30 รอบ)")
else:
    print(f"  Unknown version 0x{ver:02X} — อาจเป็น clone chip (ถือว่าใช้ได้)")

# --- Cleanup ---
spi.close()
if chip is not None:
    for p in SLOT_RST.values():
        try:
            lgpio.gpio_write(chip, p, 0)
        except Exception:
            pass
    lgpio.gpiochip_close(chip)

print("\n" + "=" * 55)
print("  Done")
print("=" * 55)
