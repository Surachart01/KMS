#!/usr/bin/env python3
"""
Test Solenoid — สั่ง HIGH ทุก Relay (Solenoid ×10)
วิธีใช้: python3 test_solenoid.py
กด Ctrl+C เพื่อปิด (จะ LOW ทุกตัวก่อนออก)
"""

import subprocess
import signal
import sys
import time

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


def pin_set(pin, state):
    """ใช้ pinctrl สั่ง GPIO (Raspberry Pi 5)"""
    level = "dh" if state else "dl"
    subprocess.run(["pinctrl", "set", str(pin), "op", level], check=True)


def all_high():
    """สั่ง HIGH ทุก slot → Solenoid ดึงขึ้นทั้งหมด"""
    print("🔓 กำลังสั่ง HIGH ทุก slot...")
    for slot, pin in sorted(SLOT_PIN_MAP.items()):
        pin_set(pin, True)
        print(f"  ✅ Slot {slot:2d} (GPIO {pin:2d}) → HIGH")
    print()
    print("🔓 Solenoid ทั้ง 10 ตัว ดึงขึ้นแล้ว!")
    print("   กด Ctrl+C เพื่อปิด (LOW ทั้งหมด)")


def all_low():
    """สั่ง LOW ทุก slot → Solenoid ล็อคทั้งหมด"""
    print("\n🔒 กำลังสั่ง LOW ทุก slot...")
    for slot, pin in sorted(SLOT_PIN_MAP.items()):
        pin_set(pin, False)
        print(f"  🔒 Slot {slot:2d} (GPIO {pin:2d}) → LOW")
    print("🔒 Solenoid ทั้ง 10 ตัว ล็อคแล้ว!")


def cleanup(sig, frame):
    """Graceful shutdown — LOW ทุกตัวก่อนออก"""
    all_low()
    sys.exit(0)


if __name__ == "__main__":
    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    print("=" * 45)
    print("⚡ Test Solenoid — Raspberry Pi 5")
    print("=" * 45)

    all_high()

    # รอจนกว่าผู้ใช้จะกด Ctrl+C
    while True:
        time.sleep(1)
