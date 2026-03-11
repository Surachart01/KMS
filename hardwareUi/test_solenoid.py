#!/usr/bin/env python3
"""
Test Solenoid — สั่ง HIGH ทุก Relay (Solenoid ×10)
ใช้ gpiod library สำหรับ Raspberry Pi 5

วิธีติดตั้ง: pip install gpiod
วิธีใช้:    python3 test_solenoid.py
กด Ctrl+C เพื่อปิด (จะ LOW ทุกตัวก่อนออก)
"""

import gpiod
import signal
import sys
import time

# GPIO Chip — Raspberry Pi 5 ใช้ /dev/gpiochip4 (บาง OS อาจเป็น gpiochip0)
CHIP_PATHS = ["/dev/gpiochip4", "/dev/gpiochip0"]

# Relay Pin Map (BCM) — ตรงกับ SLOT_PIN_MAP ใน hardware.js
SLOT_PIN_MAP = {
    1: 17,
    2: 27,
    3: 22,
    4: 23,
    5: 24,
    6: 25,
    7: 14,   # ⚠️ UART TX — ต้อง disable serial ก่อน
    8: 15,   # ⚠️ UART RX — ต้อง disable serial ก่อน
    9: 18,
    10: 0,
}

# Global reference สำหรับ cleanup
lines = {}
chip = None


def setup_gpio():
    """เปิด GPIO chip และ request ทุก pin เป็น output"""
    global chip, lines

    # Auto-detect GPIO chip
    for path in CHIP_PATHS:
        try:
            chip = gpiod.Chip(path)
            print(f"📟 เปิด GPIO chip: {path}")
            break
        except (FileNotFoundError, OSError):
            print(f"⚠️  {path} ไม่พบ — ลองตัวถัดไป...")
    else:
        # แสดง chip ที่มีอยู่จริง
        import glob
        available = glob.glob("/dev/gpiochip*")
        print(f"❌ ไม่พบ GPIO chip! มีอยู่ในระบบ: {available}")
        print("   ลองแก้ CHIP_PATHS ในไฟล์นี้ให้ตรง")
        sys.exit(1)

    for slot, pin in sorted(SLOT_PIN_MAP.items()):
        config = gpiod.LineSettings(
            direction=gpiod.line.Direction.OUTPUT,
            output_value=gpiod.line.Value.INACTIVE,
        )
        request = chip.request_lines(
            consumer=f"solenoid-slot-{slot}",
            config={pin: config},
        )
        lines[slot] = (pin, request)
        print(f"  📌 Slot {slot:2d} (GPIO {pin:2d}) → registered")


def all_high():
    """สั่ง HIGH ทุก slot → Solenoid ดึงขึ้นทั้งหมด"""
    print("\n🔓 กำลังสั่ง HIGH ทุก slot...")
    for slot, (pin, request) in sorted(lines.items()):
        request.set_value(pin, gpiod.line.Value.ACTIVE)
        print(f"  ✅ Slot {slot:2d} (GPIO {pin:2d}) → HIGH")
    print()
    print("🔓 Solenoid ทั้ง 10 ตัว ดึงขึ้นแล้ว!")
    print("   กด Ctrl+C เพื่อปิด (LOW ทั้งหมด)")


def all_low():
    """สั่ง LOW ทุก slot → Solenoid ล็อคทั้งหมด"""
    print("\n🔒 กำลังสั่ง LOW ทุก slot...")
    for slot, (pin, request) in sorted(lines.items()):
        request.set_value(pin, gpiod.line.Value.INACTIVE)
        print(f"  🔒 Slot {slot:2d} (GPIO {pin:2d}) → LOW")
    print("🔒 Solenoid ทั้ง 10 ตัว ล็อคแล้ว!")


def cleanup(sig=None, frame=None):
    """Graceful shutdown — LOW ทุกตัว + release lines"""
    all_low()
    for slot, (pin, request) in lines.items():
        request.release()
    if chip:
        chip.close()
    print("👋 GPIO released — bye!")
    sys.exit(0)


if __name__ == "__main__":
    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    print("=" * 45)
    print("⚡ Test Solenoid — Raspberry Pi 5 (gpiod)")
    print("=" * 45)

    setup_gpio()
    all_high()

    # รอจนกว่าผู้ใช้จะกด Ctrl+C
    while True:
        time.sleep(1)
