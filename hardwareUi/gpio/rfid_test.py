#!/usr/bin/env python3
"""
Simple MFRC522 test script (single reader)

โค้ดนี้มีหน้าตาแบบตัวอย่างในรูป:

    import RPi.GPIO as GPIO
    from mfrc522 import SimpleMFRC522

    reader = SimpleMFRC522()
    try:
        print("Place your card near the reader")
        id, text = reader.read()
        print("ID: %s\nText: %s" % (id, text))
    finally:
        GPIO.cleanup()

ข้อสำคัญ:
- ไลบรารี `mfrc522` นี้ใช้ RPi.GPIO + spidev แบบ legacy
- ใช้กับ Raspberry Pi 5 ได้ก็ต่อเมื่อ OS / เคอร์เนล รองรับ RPi.GPIO + SPI เดิม

การติดตั้งไลบรารี:

    sudo pip3 install mfrc522 RPi.GPIO spidev

การต่อสาย (ตามค่า default ของ SimpleMFRC522):

    RC522 SDA  -> CE0  (GPIO8, Pin 24)
    RC522 SCK  -> SCK  (GPIO11, Pin 23)
    RC522 MOSI -> MOSI (GPIO10, Pin 19)
    RC522 MISO -> MISO (GPIO9,  Pin 21)
    RC522 RST  -> GPIO25 (Pin 22)   # ตาม default ของไลบรารี
    RC522 3.3V -> Pin 1  (3.3V)
    RC522 GND  -> Pin 6  (GND)
"""

import RPi.GPIO as GPIO  # type: ignore
from mfrc522 import SimpleMFRC522  # type: ignore

reader = SimpleMFRC522()

print("Place your card near the reader")
card_id, text = reader.read()
print("ID: %s\nText: %s" % (card_id, text))


