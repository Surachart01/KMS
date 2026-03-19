#!/usr/bin/env python3
"""
Test Solenoid — สั่ง HIGH ทุก Relay (Solenoid ×10)
ใช้ GPIO Zero library สำหรับ Raspberry Pi 5

วิธีติดตั้ง: pip install gpiozero
วิธีใช้:    python3 test_solenoid.py
กด Ctrl+C เพื่อปิด (จะ LOW ทุกตัวก่อนออก)
"""

from gpiozero import OutputDevice
from signal import pause
import signal
import sys
import os

# Relay Pin Map (BCM) — ตรงกับ SLOT_PIN_MAP ใน hardware.js (ฝั่งขวาของ header)
SLOT_PIN_MAP = {
    1: 14,   # Pin 8  — ⚠️ UART TX — ต้อง disable serial ก่อน
    2: 15,   # Pin 10 — ⚠️ UART RX — ต้อง disable serial ก่อน
    3: 18,   # Pin 12
    4: 23,   # Pin 16
    5: 24,   # Pin 18
    6: 25,   # Pin 22
    7: 12,   # Pin 32
    8: 16,   # Pin 36
    9: 20,   # Pin 38
    10: 21,  # Pin 40
}

# สร้าง OutputDevice สำหรับทุก slot
relays = {}
RELAY_ACTIVE_STATE = (os.getenv("RELAY_ACTIVE_STATE") or "LOW").upper()
RELAY_IS_ACTIVE_LOW = RELAY_ACTIVE_STATE == "HIGH"

print("=" * 45)
print("⚡ Test Solenoid — Raspberry Pi 5 (GPIO Zero)")
print("=" * 45)
print(f"Relay active state: {RELAY_ACTIVE_STATE} (default LOW)")

for slot, pin in sorted(SLOT_PIN_MAP.items()):
    relays[slot] = OutputDevice(
        pin,
        active_high=not RELAY_IS_ACTIVE_LOW,
        initial_value=False,  # start inactive/safe
    )
    print(f"  📌 Slot {slot:2d} (GPIO {pin:2d}) → registered (inactive)")


def all_high():
    """สั่ง HIGH ทุก slot → Solenoid ดึงขึ้นทั้งหมด"""
    print("\n🔓 กำลังสั่ง HIGH ทุก slot...")
    for slot, relay in sorted(relays.items()):
        relay.on()
        print(f"  ✅ Slot {slot:2d} (GPIO {relay.pin.number:2d}) → HIGH")
    print()
    print("🔓 Solenoid ทั้ง 10 ตัว ดึงขึ้นแล้ว!")
    print("   กด Ctrl+C เพื่อปิด (LOW ทั้งหมด)")


def all_low():
    """สั่ง LOW ทุก slot → Solenoid ล็อคทั้งหมด"""
    print("\n🔒 กำลังสั่ง LOW ทุก slot...")
    for slot, relay in sorted(relays.items()):
        relay.off()
        print(f"  🔒 Slot {slot:2d} (GPIO {relay.pin.number:2d}) → LOW")
    print("🔒 Solenoid ทั้ง 10 ตัว ล็อคแล้ว!")


def cleanup(sig=None, frame=None):
    """Graceful shutdown — LOW ทุกตัว + close"""
    all_low()
    for relay in relays.values():
        relay.close()
    print("👋 GPIO released — bye!")
    sys.exit(0)



signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)

all_high()
pause()

