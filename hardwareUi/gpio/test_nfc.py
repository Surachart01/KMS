#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# ติดตั้งไลบรารีด้วยคำสั่ง: pip3 install mfrc522 spidev RPi.GPIO

import RPi.GPIO as GPIO
from mfrc522 import SimpleMFRC522
from mfrc522 import MFRC522
import time
import sys

# ปิดการแจ้งเตือน GPIO (ถ้ามีการใช้งานค้างอยู่)
GPIO.setwarnings(False)

def read_tag():
    reader = SimpleMFRC522()
    try:
        print("\n=== โหมดสแกนอ่านค่า (Read Mode) ===")
        print("กรุณานำเหรียญ/บัตร NFC ไปทาบที่ตัวอ่าน (RC522)...")
        id, text = reader.read()
        print("\n✅ หีหรือเหรียญ NFC ที่พบ:")
        print(f"UID (รหัสประจำตัวโรงงาน): {id}")
        print(f"ข้อมูลใน Memory (Text): {text.strip() if text else 'ไม่มีข้อมูล'}")
    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาด: {e}")
    finally:
        GPIO.cleanup()

def write_tag():
    reader = SimpleMFRC522()
    try:
        print("\n=== โหมดเขียนข้อมูล (Write Mode) ===")
        data = input("กรุณาพิมพ์ข้อความที่ต้องการเขียนลงในเหรียญ (ภาษาอังกฤษ/ตัวเลข): ")
        print("กรุณานำเหรียญ/บัตร NFC ไปทาบที่ตัวอ่าน ค้างไว้จนกว่าจะเสร็จ...")
        
        # เขียนข้อมูลลง Block (เฉพาะ NTAG215 หรือ Mifare ที่ไม่ได้ล็อค User Memory)
        # หมายเหตุ: ไม่ใช่การแก้รหัส UID
        reader.write(data)
        
        print(f"\n✅ เขียนข้อมูล '{data}' ลงในเหรียญสำเร็จ!")
    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาด: {e}")
    finally:
        GPIO.cleanup()

def dump_info():
    reader = MFRC522()
    try:
        print("\n=== โหมดสแกน Raw Data (อ่าน UID ชั้นลึก) ===")
        print("กรุณานำเหรียญ/บัตร NFC ไปทาบที่ตัวอ่าน...")
        
        while True:
            (status, TagType) = reader.MFRC522_Request(reader.PICC_REQIDL)
            
            if status == reader.MI_OK:
                (status, uid) = reader.MFRC522_Anticoll()
                if status == reader.MI_OK:
                    uid_hex = "-".join([f"{x:02X}" for x in uid])
                    print(f"\n✅ เจอแท็ก! (Type: {TagType})")
                    print(f"UID (Raw Hex): {uid_hex}")
                    break
            time.sleep(0.1)
    finally:
        GPIO.cleanup()

if __name__ == '__main__':
    print("=========================================")
    print("   โปรแกรมทดสอบเครื่องอ่าน NFC (RC522)    ")
    print("=========================================")
    print("1: อ่านรหัส UID และข้อมูลทั่วไป (Read)")
    print("2: ทดสอบเขียนข้อมูลลง Memory (Write Text)")
    print("3: แสกนรหัส Raw UID แบบดิบ (Raw Hex)")
    print("=========================================")
    
    choice = input("กรุณาเลือกโหมด (1/2/3): ")
    
    if choice == '1':
        read_tag()
    elif choice == '2':
        write_tag()
    elif choice == '3':
        dump_info()
    else:
        print("ไม่พบตัวเลือก ยกเลิกการทำงาน")
        sys.exit(1)
