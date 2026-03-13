import socketio
import time
import os
import sys
import json
import signal
import threading
from gpiozero import OutputDevice
import spidev
from gpiozero import OutputDevice
from dotenv import load_dotenv

# ─────────────────────────────────────────────
# Custom MFRC522 Class for Raspberry Pi 5 (Pure spidev)
# ─────────────────────────────────────────────

class Pi5MFRC522:
    # Registers
    CommandReg = 0x01
    ComIEnReg = 0x02
    DivIEnReg = 0x03
    ComIrqReg = 0x04
    DivIrqReg = 0x05
    ErrorReg = 0x06
    Status1Reg = 0x07
    Status2Reg = 0x08
    FIFODataReg = 0x09
    FIFOLevelReg = 0x0A
    WaterLevelReg = 0x0B
    ControlReg = 0x0C
    BitFramingReg = 0x0D
    CollReg = 0x0E
    ModeReg = 0x11
    TxModeReg = 0x12
    RxModeReg = 0x13
    TxControlReg = 0x14
    TxASKReg = 0x15
    TxSelReg = 0x16
    RxSelReg = 0x17
    RxThresholdReg = 0x18
    DemodReg = 0x19
    MifareReg = 0x1C
    SerialSpeedReg = 0x1F
    TModeReg = 0x21
    TPrescalerReg = 0x22
    TReloadRegH = 0x23
    TReloadRegL = 0x24
    TCounterValueRegH = 0x25
    TCounterValueRegL = 0x26
    
    # Commands
    PCD_IDLE = 0x00
    PCD_AUTHENT = 0x0E
    PCD_RECEIVE = 0x08
    PCD_TRANSMIT = 0x04
    PCD_TRANSCEIVE = 0x0C
    PCD_RESETPHASE = 0x0F
    PCD_CALCCRC = 0x03
    
    # PICC Commands
    PICC_REQIDL = 0x26
    PICC_REQALL = 0x52
    PICC_ANTICOLL = 0x93
    MI_OK = 0
    
    def __init__(self, bus=0, device=0):
        self.spi = spidev.SpiDev()
        self.spi.open(bus, device)
        self.spi.max_speed_hz = 1000000
        self.init_pcd()

    def write_reg(self, reg, val):
        self.spi.xfer2([(reg << 1) & 0x7E, val])

    def read_reg(self, reg):
        val = self.spi.xfer2([((reg << 1) & 0x7E) | 0x80, 0])
        return val[1]

    def set_bit_mask(self, reg, mask):
        tmp = self.read_reg(reg)
        self.write_reg(reg, tmp | mask)

    def clear_bit_mask(self, reg, mask):
        tmp = self.read_reg(reg)
        self.write_reg(reg, tmp & (~mask))

    def init_pcd(self):
        self.write_reg(self.TModeReg, 0x8D)
        self.write_reg(self.TPrescalerReg, 0x3E)
        self.write_reg(self.TReloadRegL, 30)
        self.write_reg(self.TReloadRegH, 0)
        self.write_reg(self.TxASKReg, 0x40)
        self.write_reg(self.ModeReg, 0x3D)
        self.set_bit_mask(self.TxControlReg, 0x03)

    def to_card(self, cmd, send_data):
        back_data = []
        back_len = 0
        status = 1 # MI_ERR
        irq_en = 0x00
        wait_irq = 0x00
        
        if cmd == self.PCD_AUTHENT:
            irq_en = 0x12
            wait_irq = 0x10
        elif cmd == self.PCD_TRANSCEIVE:
            irq_en = 0x77
            wait_irq = 0x30
            
        self.write_reg(self.ComIEnReg, irq_en | 0x80)
        self.clear_bit_mask(self.ComIrqReg, 0x80)
        self.set_bit_mask(self.FIFOLevelReg, 0x80)
        self.write_reg(self.PCD_IDLE, 0x00)
        
        for i in range(len(send_data)):
            self.write_reg(self.FIFODataReg, send_data[i])
            
        self.write_reg(self.CommandReg, cmd)
        
        if cmd == self.PCD_TRANSCEIVE:
            self.set_bit_mask(self.BitFramingReg, 0x80)
            
        i = 2000
        while True:
            n = self.read_reg(self.ComIrqReg)
            i -= 1
            if not ((i != 0) and not (n & 0x01) and not (n & wait_irq)):
                break
                
        self.clear_bit_mask(self.BitFramingReg, 0x80)
        
        if i != 0:
            if (self.read_reg(self.ErrorReg) & 0x1B) == 0x00:
                status = self.MI_OK
                if n & irq_en & 0x01:
                    status = 1 # MI_NOTAGERR
                if cmd == self.PCD_TRANSCEIVE:
                    n = self.read_reg(self.FIFOLevelReg)
                    last_bits = self.read_reg(self.ControlReg) & 0x07
                    if last_bits != 0:
                        back_len = (n - 1) * 8 + last_bits
                    else:
                        back_len = n * 8
                    if n == 0:
                        n = 1
                    if n > 16:
                        n = 16
                    for i in range(n):
                        back_data.append(self.read_reg(self.FIFODataReg))
            else:
                status = 1 # MI_ERR
        return status, back_data, back_len

    def request(self, req_mode):
        status, back_data, back_bits = self.to_card(self.PCD_TRANSCEIVE, [req_mode])
        if status != self.MI_OK or back_bits != 0x10:
            status = 1 # MI_ERR
        return status, back_bits

    def anticoll(self):
        self.write_reg(self.BitFramingReg, 0x00)
        status, back_data, back_bits = self.to_card(self.PCD_TRANSCEIVE, [self.PICC_ANTICOLL, 0x20])
        if status == self.MI_OK:
            if len(back_data) == 5:
                # Checksum
                ser_num_check = 0
                for i in range(4):
                    ser_num_check ^= back_data[i]
                if ser_num_check != back_data[4]:
                    status = 1 # MI_ERR
            else:
                status = 1 # MI_ERR
        return status, back_data

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

NFC_RST_PIN = 7 # ขา RST ตัวรองรับ (shared)

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
print("⚡ Initializing Raspberry Pi 5 Hardware (Python Custom Logic)...")
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

# NFC Reader Instance (Using our custom Pi5 class)
try:
    # ตั้งค่าขา RST ให้เป็น HIGH เพื่อเริ่มการทำงานของ RC522 ทุกตัว
    nfc_rst = OutputDevice(NFC_RST_PIN, initial_value=True)
    time.sleep(0.1)
    
    reader = Pi5MFRC522()
except Exception as e:
    print(f"❌ Error initializing NFC Reader: {e}")
    sys.exit(1)

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
        status, tag_type = reader.request(reader.PICC_REQIDL)
        if status == reader.MI_OK:
            status, uid = reader.anticoll()
            if status == reader.MI_OK:
                # แปลงรหัสเป็น Hex String 4 bytes
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
            # อัปเดตสถานะในแรม (ไม่สั่ง Relay เพื่อป้องกันการเตะกลอนคลิกๆ)
            if not slot_has_key.get(current_slot):
                # relays[current_slot].on() # <--- นำออก: ป้องกันการสะอึกของ Relay
                slot_has_key[current_slot] = True
            
            # ส่ง Event ถ้าเป็นเหรียญใหม่ที่ตรวจเจอในรอบนั้น
            if last_uid_map.get(current_slot) != uid:
                print(f"🏷️  NFC tag: {uid} at slot {current_slot}")
                last_uid_map[current_slot] = uid
                sio.emit('nfc:tag', {'slotNumber': current_slot, 'uid': uid})
        else:
            # อัปเดตสถานะในแรม
            if slot_has_key.get(current_slot):
                # relays[current_slot].off() # <--- นำออก
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
