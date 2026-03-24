#!/usr/bin/env python3
"""
Test Solenoid & LED — สั่ง HIGH ทุก Relay (Solenoid ×10 + LED ×10)
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

# Relay Pin Map สำหรับ Solenoid (ตรงกับ hardware.js)
SLOT_PIN_MAP = {
    1: 14,   # Pin 8  — ⚠️ UART TX — ต้อง disable serial ก่อน
    2: 15,   # Pin 10 — ⚠️ UART RX — ต้อง disable serial ก่อน
    3: 18,   # Pin 12
    4: 23,   # Pin 16
    5: 24,   # Pin 18
    6: 25,   # Pin 22
    7: 8,    # Pin 24
    8: 7,    # Pin 26
    9: 12,   # Pin 32
    10: 16,  # Pin 36
}

# Relay Pin Map สำหรับ LED (ตรงกับ hardware.js)
LED_PIN_MAP = {
    1: 4,    # Pin 7
    2: 26,   # Pin 37
    3: 19,   # Pin 35
    4: 13,   # Pin 33
    5: 10,   # Pin 19
    6: 9,    # Pin 21
    7: 11,   # Pin 23
    8: 0,    # Pin 27
    9: 5,    # Pin 29
    10: 6,   # Pin 31
}

# สร้าง OutputDevice สำหรับทุก slot
solenoids = {}
leds = {}
RELAY_ACTIVE_STATE = (os.getenv("RELAY_ACTIVE_STATE") or "LOW").upper()
RELAY_IS_ACTIVE_LOW = RELAY_ACTIVE_STATE == "LOW"

print("=" * 45)
print("⚡ Test Solenoid & LED — Raspberry Pi 5")
print("=" * 45)
print(f"Relay active state: {RELAY_ACTIVE_STATE} (default LOW)")
print("กำลังเตรียมขา GPIO...")

for slot in sorted(SLOT_PIN_MAP.keys()):
    sol_pin = SLOT_PIN_MAP[slot]
    led_pin = LED_PIN_MAP[slot]
    
    solenoids[slot] = OutputDevice(sol_pin, active_high=not RELAY_IS_ACTIVE_LOW, initial_value=False)
    leds[slot] = OutputDevice(led_pin, active_high=not RELAY_IS_ACTIVE_LOW, initial_value=False)


def all_high():
    """สั่ง HIGH ทุก slot → Solenoid ดึงขึ้น + ไฟเปลี่ยนสีทั้งหมด"""
    print("\n🔓 กำลังสั่ง HIGH ทุุกสล็อต (เปิด Solenoid และสลับสีไฟ LED)...")
    for slot in sorted(SLOT_PIN_MAP.keys()):
        solenoids[slot].on()
        leds[slot].on()
        print(f"  ✅ Slot {slot:2d} | Solenoid GP{solenoids[slot].pin.number:2d} -> HIGH | LED GP{leds[slot].pin.number:2d} -> HIGH")
    print()
    print("🔓 Solenoid ทั้ง 10 ตัว ดึงขึ้น และ ไฟทั้ง 10 ช่องเปลี่ยนสีแล้ว!")
    print("   กด Ctrl+C เพื่อปิดการทำงาน (LOW ทั้งหมด)")


def all_low():
    """สั่ง LOW ทุก slot → Solenoid ล็อค + ไฟกลับสีเดิมทั้งหมด"""
    print("\n🔒 กำลังสั่ง LOW ทุกสล็อต...")
    for slot in sorted(SLOT_PIN_MAP.keys()):
        solenoids[slot].off()
        leds[slot].off()
        print(f"  🔒 Slot {slot:2d} | Solenoid -> LOW | LED -> LOW")
    print("🔒 Solenoid ทั้ง 10 ตัว ล็อค และ ไฟกลับสู่สถานะปกติแล้ว!")


def cleanup(sig=None, frame=None):
    """Graceful shutdown — LOW ทุกตัว + close"""
    all_low()
    for relay in list(solenoids.values()) + list(leds.values()):
        relay.close()
    print("👋 GPIO released — bye!")
    sys.exit(0)


signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)

all_high()
pause()

