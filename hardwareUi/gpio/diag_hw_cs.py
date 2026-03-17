#!/usr/bin/env python3
"""
Test RC522 using hardware CE0 (Pin 24) — no software GPIO needed.
Usage: sudo python3 diag_hw_cs.py
"""
import spidev, time

print("=" * 50)
print("  RC522 Test — Hardware CE0 (Pin 24)")
print("  SDA ต้องต่อที่ Pin 24 (CE0)")
print("=" * 50)

spi = spidev.SpiDev()
spi.open(0, 0)
spi.max_speed_hz = 50_000
spi.mode = 0

PASS = "\033[92m[PASS]\033[0m"
FAIL = "\033[91m[FAIL]\033[0m"

# Test 1: Read VersionReg (0x37)
print("\n--- Test 1: Read VersionReg ---")
for i in range(3):
    r = spi.xfer2([0xEE, 0x00])
    ver = r[1]
    print(f"  Try {i+1}: xfer2([0xEE, 0x00]) → {[hex(b) for b in r]}  Version=0x{ver:02X}")

if ver == 0x00:
    print(f"\n  {FAIL} Version=0x00 — RC522 ไม่ตอบ")
    print("  เช็ค: VCC, GND, RST, MOSI, MISO, SCK ต่อถูกไหม?")
elif ver == 0xFF:
    print(f"\n  {FAIL} Version=0xFF — MISO อาจ float")
elif ver in (0x91, 0x92, 0x88, 0x18, 0x12):
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
    
    # Configure chip
    def wr(reg, val):
        spi.xfer2([(reg << 1) & 0x7E, val & 0xFF])
    def rd(reg):
        return spi.xfer2([((reg << 1) & 0x7E) | 0x80, 0x00])[1]
    def set_bits(reg, mask):
        wr(reg, rd(reg) | mask)

    # Init
    wr(0x01, 0x00)  # CommandReg = Idle
    wr(0x2A, 0x8D)  # TModeReg
    wr(0x2B, 0x3E)  # TPrescalerReg
    wr(0x2D, 30)    # TReloadRegL
    wr(0x2C, 0)     # TReloadRegH
    wr(0x15, 0x40)  # TxASKReg
    wr(0x11, 0x3D)  # ModeReg
    if (rd(0x14) & 0x03) != 0x03:
        set_bits(0x14, 0x03)  # TxControlReg — enable antenna

    for attempt in range(30):
        # REQA command
        wr(0x0D, 0x07)  # BitFramingReg
        wr(0x01, 0x00)  # Idle
        wr(0x04, 0x7F)  # Clear IRQ
        set_bits(0x0A, 0x80)  # Flush FIFO
        wr(0x09, 0x26)  # FIFO: REQA command
        wr(0x01, 0x0C)  # Transceive
        set_bits(0x0D, 0x80)  # StartSend
        
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
                
                # Anti-collision
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
    print(f"  Unknown version 0x{ver:02X}")

spi.close()
print("\n" + "=" * 50)
print("  Done")
print("=" * 50)
