#!/usr/bin/env python3
"""
RC522 SPI Diagnostic — ตรวจสอบทีละจุดว่าปัญหาอยู่ตรงไหน
Usage:  sudo python3 diag_spi.py
"""
import sys, time, os

PASS = "\033[92m[PASS]\033[0m"
FAIL = "\033[91m[FAIL]\033[0m"
WARN = "\033[93m[WARN]\033[0m"
INFO = "\033[96m[INFO]\033[0m"

CS_PIN = 4        # GPIO4 = Pin 7  (slot 1 CS)
RST_PIN = 7       # GPIO7 = Pin 26 (CE1 — usually busy)
SPI_BUS = 0
SPI_DEV = 0

def sep(title):
    print(f"\n{'='*50}")
    print(f"  {title}")
    print(f"{'='*50}")

# ──────────────────────────────────────────────
# Step 1: Check SPI device exists
# ──────────────────────────────────────────────
def step1_spi_device():
    sep("Step 1: SPI Device")
    dev = f"/dev/spidev{SPI_BUS}.{SPI_DEV}"
    if os.path.exists(dev):
        print(f"  {PASS} {dev} exists")
        return True
    else:
        print(f"  {FAIL} {dev} NOT found")
        print(f"  Fix: sudo raspi-config → Interface Options → SPI → Enable")
        print(f"       then reboot")
        return False

# ──────────────────────────────────────────────
# Step 2: Open SPI
# ──────────────────────────────────────────────
def step2_open_spi():
    sep("Step 2: Open SPI")
    try:
        import spidev
        spi = spidev.SpiDev()
        spi.open(SPI_BUS, SPI_DEV)
        spi.max_speed_hz = 1_000_000
        spi.mode = 0
        print(f"  {PASS} SPI opened: mode={spi.mode} speed={spi.max_speed_hz}")
        return spi
    except Exception as e:
        print(f"  {FAIL} Cannot open SPI: {e}")
        return None

# ──────────────────────────────────────────────
# Step 3: GPIO — claim CS pin
# ──────────────────────────────────────────────
def step3_gpio(cs_pin):
    sep(f"Step 3: GPIO — claim CS pin (GPIO{cs_pin})")
    try:
        import lgpio
        chip = lgpio.gpiochip_open(0)
        print(f"  {PASS} gpiochip0 opened (handle={chip})")
    except Exception as e:
        print(f"  {FAIL} Cannot open gpiochip0: {e}")
        print(f"  Fix: Check if another process holds GPIO:")
        print(f"       sudo lsof /dev/gpiochip*")
        return None, None

    try:
        lgpio.gpio_claim_output(chip, cs_pin, 1)
        print(f"  {PASS} GPIO{cs_pin} claimed as output (HIGH = deselected)")
    except Exception as e:
        print(f"  {FAIL} Cannot claim GPIO{cs_pin}: {e}")
        print(f"  Fix: Kill processes using GPIO:")
        print(f"       sudo lsof /dev/gpiochip*")
        print(f"       sudo kill <PID>")
        return chip, None

    return chip, cs_pin

# ──────────────────────────────────────────────
# Step 4: SPI Loopback test (MOSI → MISO shorted)
# ──────────────────────────────────────────────
def step4_loopback(spi):
    sep("Step 4: SPI Loopback (skip ถ้าไม่ได้ short MOSI-MISO)")
    print(f"  {INFO} ถ้าต้องการทดสอบ SPI bus โดยไม่ใช้ RC522:")
    print(f"        1. ถอดสาย MOSI และ MISO ออกจาก RC522")
    print(f"        2. ใช้สายจิ้มเชื่อม Pin 19 (MOSI) กับ Pin 21 (MISO) ชั่วคราว")
    print(f"        3. รัน script นี้อีกครั้ง")
    print()

    test_data = [0xAA, 0x55, 0xDE, 0xAD]
    result = spi.xfer2(test_data[:])
    match = result == test_data
    if match:
        print(f"  {PASS} Loopback OK! Sent {test_data} → Got {result}")
        print(f"        SPI bus ทำงานปกติ (MOSI/MISO/SCK OK)")
    else:
        all_zero = all(b == 0 for b in result)
        all_ff = all(b == 0xFF for b in result)
        print(f"  {INFO} Sent {test_data} → Got {result}")
        if all_zero:
            print(f"        All 0x00 — ถ้า short MOSI-MISO แล้วยังเป็น 0x00:")
            print(f"        → MISO line มีปัญหา หรือ SPI bus ไม่ทำงาน")
            print(f"        ถ้าไม่ได้ short → ปกติ (RC522 ยังไม่ได้ถูก select)")
        elif all_ff:
            print(f"        All 0xFF — MISO อาจถูก pull-up หรือ float")
        else:
            print(f"        ข้อมูลไม่ตรง — อาจมี noise หรือ RC522 กำลังตอบ")
    return match

# ──────────────────────────────────────────────
# Step 5: CS toggle + read VersionReg
# ──────────────────────────────────────────────
def step5_read_version(spi, chip, cs_pin):
    sep("Step 5: RC522 — CS select + read VersionReg")
    import lgpio

    # Deselect first
    lgpio.gpio_write(chip, cs_pin, 1)
    time.sleep(0.01)

    # Select (CS LOW)
    lgpio.gpio_write(chip, cs_pin, 0)
    time.sleep(0.005)

    # Read VersionReg (0x37): address byte = ((0x37 << 1) & 0x7E) | 0x80 = 0xEE
    result = spi.xfer2([0xEE, 0x00])
    ver = result[1]

    # Deselect
    lgpio.gpio_write(chip, cs_pin, 1)

    print(f"  SPI xfer [0xEE, 0x00] → {[hex(b) for b in result]}")
    print(f"  VersionReg = 0x{ver:02X}")
    print()

    if ver == 0x00:
        print(f"  {FAIL} Version = 0x00 — RC522 ไม่ตอบ")
        print()
        print(f"  สาเหตุที่เป็นไปได้:")
        print(f"  ┌─────────────────────────────────────────────────┐")
        print(f"  │ 1. ❌ GND ไม่เชื่อมกัน (Common GND)             │")
        print(f"  │    RPi GND ต้องเชื่อมกับ NFC GND / Step-down GND│")
        print(f"  │    → ต่อสาย RPi Pin 6 (GND) → GND bus bar      │")
        print(f"  │                                                 │")
        print(f"  │ 2. ❌ MISO ไม่ได้ต่อ หรือต่อผิดขา               │")
        print(f"  │    RPi Pin 21 (GPIO9) → RC522 MISO              │")
        print(f"  │                                                 │")
        print(f"  │ 3. ❌ MOSI ไม่ได้ต่อ หรือต่อผิดขา               │")
        print(f"  │    RPi Pin 19 (GPIO10) → RC522 MOSI             │")
        print(f"  │                                                 │")
        print(f"  │ 4. ❌ SCK ไม่ได้ต่อ หรือต่อผิดขา                │")
        print(f"  │    RPi Pin 23 (GPIO11) → RC522 SCK              │")
        print(f"  │                                                 │")
        print(f"  │ 5. ❌ SDA (CS) ต่อผิดขา                         │")
        print(f"  │    RPi Pin 7 (GPIO4) → RC522 SDA                │")
        print(f"  │                                                 │")
        print(f"  │ 6. ❌ RST ต่อ GND (ค้างใน reset)                │")
        print(f"  │    RST ต้องต่อ 3.3V หรือปล่อยลอย                │")
        print(f"  │                                                 │")
        print(f"  │ 7. ❌ VCC ไม่มีไฟ (3.3V)                        │")
        print(f"  │    วัดด้วย multimeter: VCC-GND ต้องได้ ~3.3V    │")
        print(f"  └─────────────────────────────────────────────────┘")
        return False
    elif ver == 0xFF:
        print(f"  {FAIL} Version = 0xFF — MISO อาจ float หรือ short to VCC")
        return False
    elif ver in (0x91, 0x92, 0x88):
        print(f"  {PASS} MFRC522 genuine chip detected!")
        return True
    elif ver == 0x18:
        print(f"  {PASS} FM17522E clone chip detected!")
        return True
    else:
        print(f"  {WARN} Unknown version 0x{ver:02X} — chip responds but unknown type")
        return True

# ──────────────────────────────────────────────
# Step 6: Multi-register read
# ──────────────────────────────────────────────
def step6_multi_reg(spi, chip, cs_pin):
    sep("Step 6: Read multiple registers")
    import lgpio

    regs = {
        "VersionReg (0x37)":   0x37,
        "CommandReg (0x01)":   0x01,
        "Status1Reg (0x07)":   0x07,
        "TxControlReg (0x14)": 0x14,
        "ModeReg (0x11)":      0x11,
    }

    lgpio.gpio_write(chip, cs_pin, 0)
    time.sleep(0.005)

    all_zero = True
    for name, addr in regs.items():
        rd_addr = ((addr << 1) & 0x7E) | 0x80
        result = spi.xfer2([rd_addr, 0x00])
        val = result[1]
        if val != 0x00:
            all_zero = False
        status = PASS if val != 0x00 else FAIL
        print(f"  {status} {name} = 0x{val:02X}")

    lgpio.gpio_write(chip, cs_pin, 1)

    if all_zero:
        print(f"\n  {FAIL} ทุก register เป็น 0x00 — SPI ไม่สื่อสารกับ RC522 เลย")
    else:
        print(f"\n  {PASS} RC522 ตอบสนองดี!")
    return not all_zero

# ──────────────────────────────────────────────
# Step 7: วัดด้วย Multimeter (คำแนะนำ)
# ──────────────────────────────────────────────
def step7_multimeter_guide():
    sep("Step 7: ตรวจสอบด้วย Multimeter")
    print(f"""
  ใช้ multimeter ตั้ง DC Voltage วัดจุดเหล่านี้:
  (โพรบดำ = GND ของ RPi, โพรบแดง = จุดที่วัด)

  ┌────────────────────────────────────────────────┐
  │  จุดวัด                │  ค่าที่ควรได้          │
  ├────────────────────────┼───────────────────────┤
  │  RC522 VCC             │  3.0 - 3.3V           │
  │  RC522 GND → RPi GND  │  0V (ต้อง = 0!)       │
  │  RC522 RST             │  3.0 - 3.3V           │
  │  RPi Pin 19 (MOSI)    │  ~0V (idle low)       │
  │  RPi Pin 21 (MISO)    │  ~0V - 3.3V           │
  │  RPi Pin 23 (SCK)     │  ~0V (idle low)       │
  │  RPi Pin 7  (CS/SDA)  │  3.3V (idle HIGH)     │
  └────────────────────────┴───────────────────────┘

  ⚠️ จุดสำคัญที่สุด:
  วัด RC522 GND ↔ RPi GND (Pin 6) → ต้องได้ 0V
  ถ้าได้ค่าอื่น → GND ไม่ได้เชื่อมกัน = SPI ทำงานไม่ได้!
""")

# ──────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────
def main():
    print("╔══════════════════════════════════════════╗")
    print("║   RC522 SPI Diagnostic — RPi5            ║")
    print("║   ตรวจสอบทีละจุดว่าปัญหาอยู่ตรงไหน       ║")
    print("╚══════════════════════════════════════════╝")
    print(f"\n  CS Pin: GPIO{CS_PIN} (Pin 7)")
    print(f"  SPI:    /dev/spidev{SPI_BUS}.{SPI_DEV}")

    # Step 1
    if not step1_spi_device():
        return

    # Step 2
    spi = step2_open_spi()
    if spi is None:
        return

    # Step 3
    chip, pin = step3_gpio(CS_PIN)
    if chip is None:
        return

    if pin is None:
        try:
            import lgpio
            lgpio.gpiochip_close(chip)
        except:
            pass
        return

    # Step 4
    step4_loopback(spi)

    # Step 5
    ver_ok = step5_read_version(spi, chip, pin)

    if ver_ok:
        # Step 6
        step6_multi_reg(spi, chip, pin)

    # Step 7 (always show)
    step7_multimeter_guide()

    # Cleanup
    try:
        import lgpio
        lgpio.gpio_write(chip, pin, 1)
        lgpio.gpio_free(chip, pin)
        lgpio.gpiochip_close(chip)
    except:
        pass
    spi.close()

    sep("Done")
    if ver_ok:
        print(f"  {PASS} RC522 สื่อสารได้! ลองรัน test_nfc_claude.cjs อีกครั้ง")
    else:
        print(f"  {FAIL} RC522 ยังไม่ตอบ — เช็คตามคำแนะนำด้านบน")
        print(f"        สิ่งที่ต้องเช็คก่อน: Common GND ระหว่าง RPi กับ NFC")

if __name__ == "__main__":
    main()
