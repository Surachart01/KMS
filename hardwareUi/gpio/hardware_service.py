import socketio
import time
import os
import sys
import json
import signal
import threading
from gpiozero import OutputDevice
from mfrc522 import MFRC522
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:4556')
NFC_POLLING_INTERVAL = 0.2  # วนลูปทุก 0.2 วินาที
KEY_PULL_TIMEOUT = 15     # เวลารอดึงกุญแจ 15 วินาที

# ─────────────────────────────────────────────
# GPIO Pin Maps (BCM)
# ─────────────────────────────────────────────

# Relay/Solenoid Pins
SLOT_PIN_MAP = {
    1: 17, 2: 27, 3: 22, 4: 23, 5: 24, 
    6: 25, 7: 14, 8: 15, 9: 18, 10: 0
}

# NFC Chip Select (CS/SDA) Pins
SLOT_CS_MAP = {
    1: 4, 2: 5, 3: 6, 4: 12, 5: 13, 
    6: 16, 7: 19, 8: 20, 9: 21, 10: 26
}

# ─────────────────────────────────────────────
# Initialization
# ─────────────────────────────────────────────

# Hardware Objects
relays = {}
cs_pins = {}
slot_has_key = {}
last_uid_map = {}
pull_checking_slots = set()
is_unlocking = False

# Initialize GPIO
print("⚡ Initializing Raspberry Pi 5 Hardware (Python)...")
for slot, pin in SLOT_PIN_MAP.items():
    try:
        relays[slot] = OutputDevice(pin, initial_value=False)
        slot_has_key[slot] = False
    except Exception as e:
        print(f"❌ Error initializing Relay Slot {slot}: {e}")

for slot, pin in SLOT_CS_MAP.items():
    try:
        # CS pin ต้องเป็น HIGH (Inactive) เสมอตอนเริ่ม
        device = OutputDevice(pin, initial_value=True)
        cs_pins[slot] = device
    except Exception as e:
        print(f"❌ Error initializing CS Pin Slot {slot}: {e}")

# NFC Reader Instance
# สังเกตว่าเราใช้บัส SPI เดียวกัน แต่จะสลับขา CS ของแต่ละช่องเอาเอง
reader = MFRC522()

# Socket.IO Client
sio = socketio.Client()

# ─────────────────────────────────────────────
# Logic Functions
# ─────────────────────────────────────────────

def read_nfc_at_slot(slot):
    """อ่านรหัส NFC จากช่องที่กำหนดโดยการสลับขา CS"""
    if slot not in cs_pins:
        return None
    
    cs = cs_pins[slot]
    # Activate CS (LOW)
    cs.off()
    
    uid_str = None
    try:
        # Reset current state of the reader
        # (บาง library อาจต้องใช้ reader.MFRC522_Init() หรือคล้ายกัน แต่ mfrc522 มักจะจัดการได้เอง)
        status, tag_type = reader.MFRC522_Request(reader.PICC_REQIDL)
        if status == reader.MI_OK:
            status, uid = reader.MFRC522_Anticoll()
            if status == reader.MI_OK:
                # แปลงรหัสเป็น Hex String แบบแผ่น
                uid_str = "".join([format(x, '02X') for x in uid[:4]])
    except Exception as e:
        pass
    finally:
        # Deactivate CS (HIGH)
        cs.on()
    
    return uid_str

def unlock_slot_logic(slot_number, booking_id):
    """ฟังก์ชันเปิดกลอนและตรวจสอบการดึงกุญแจ"""
    global is_unlocking
    
    if slot_number not in relays:
        print(f"❌ Error: Slot {slot_number} not found")
        return

    print(f"🔓 Unlocking slot {slot_number} for 15s...")
    is_unlocking = True
    relays[slot_number].on() # เปิด Solenoid (Green LED ติดถ้าต่อแบบ NO)
    
    # แจ้ง Backend ว่าปลดล็อคแล้ว
    sio.emit('slot:unlocked', {'slotNumber': slot_number, 'success': True})
    
    # รอดึงกุญแจ 15 วินาที
    pull_checking_slots.add(slot_number)
    time.sleep(KEY_PULL_TIMEOUT)
    
    # ตรวจสอบหลังครบเวลา
    uid = read_nfc_at_slot(slot_number)
    pull_checking_slots.remove(slot_number)
    
    if not uid:
        # กุญแจถูกดึงออกแล้ว
        print(f"✅ Key pulled from slot {slot_number}!")
        relays[slot_number].off() # ล็อคกลับ
        sio.emit('key:pulled', {'slotNumber': slot_number, 'bookingId': booking_id})
        slot_has_key[slot_number] = False
    else:
        # กุญแจยังคาอยู่
        print(f"⏰ Timeout: Key still in slot {slot_number}")
        sio.emit('borrow:cancelled', {'slotNumber': slot_number, 'bookingId': booking_id})
        # สั่งเปิดค้างไว้เพื่อให้ไฟเขียวยังติด (ตาม logic เดิมของตู้)
        # หรือถ้าต้องการให้ล็อคเลยก็ใส่ relays[slot_number].off()
    
    is_unlocking = False

# ─────────────────────────────────────────────
# Socket Events
# ─────────────────────────────────────────────

@sio.event
def connect():
    print(f"✅ Connected to backend! ID: {sio.sid}")
    sio.emit('join:gpio')

@sio.event
def disconnect():
    print("🔌 Disconnected from backend")

@sio.on('gpio:unlock')
def on_unlock(data):
    slot = data.get('slotNumber')
    booking_id = data.get('bookingId')
    
    # รันใน Thread แยกเพื่อไม่ให้บล็อกการเชื่อมต่อ Socket
    t = threading.Thread(target=unlock_slot_logic, args=(slot, booking_id))
    t.start()

# ─────────────────────────────────────────────
# Polling Loop
# ─────────────────────────────────────────────

def nfc_polling_loop():
    current_slot = 1
    total_slots = 10
    
    print("🟢 NFC Polling Loop started...")
    while True:
        # ถ้ากำลังปลดล็อคอยู่ ให้หยุดวนชั่วคราวเพื่อป้องกัน SPI ทับกัน
        if is_unlocking:
            time.sleep(0.5)
            continue
            
        if current_slot in pull_checking_slots:
            current_slot = (current_slot % total_slots) + 1
            continue
            
        uid = read_nfc_at_slot(current_slot)
        
        if uid:
            # อัปเดตสถานะ Green LED (ถ้าบัตรอยู่)
            if not slot_has_key.get(current_slot):
                relays[current_slot].on() # ไฟเขียว
                slot_has_key[current_slot] = True
            
            # ส่ง Event ถ้าเป็นเหรียญใหม่ที่ตรวจเจอในรอบนั้น
            if last_uid_map.get(current_slot) != uid:
                print(f"🏷️  NFC tag: {uid} at slot {current_slot}")
                last_uid_map[current_slot] = uid
                sio.emit('nfc:tag', {'slotNumber': current_slot, 'uid': uid})
        else:
            # อัปเดตสถานะ Red LED (ถ้าบัตรไม่อยู่)
            if slot_has_key.get(current_slot):
                relays[current_slot].off() # ไฟแดง
                slot_has_key[current_slot] = False
                last_uid_map[current_slot] = None
                
        current_slot = (current_slot % total_slots) + 1
        time.sleep(NFC_POLLING_INTERVAL / total_slots)

# ─────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────

def signal_handler(sig, frame):
    print('\n👋 Shutting down hardware service...')
    for relay in relays.values():
        relay.off()
    sio.disconnect()
    sys.exit(0)

if __name__ == "__main__":
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        print(f"📡 Connecting to {BACKEND_URL}...")
        sio.connect(BACKEND_URL)
        
        # เริ่ม Polling ใน Thread หลัก
        nfc_polling_loop()
        
    except Exception as e:
        print(f"❌ Critical Error: {e}")
        signal_handler(None, None)
