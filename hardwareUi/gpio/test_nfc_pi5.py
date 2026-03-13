import time
import os
import sys
import spidev
import signal
from gpiozero import OutputDevice

# ─────────────────────────────────────────────
# Custom MFRC522 Class for Raspberry Pi 5
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
        status = 1 
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
                    status = 1 
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
                status = 1
        return status, back_data, back_len

    def request(self, req_mode):
        status, back_data, back_bits = self.to_card(self.PCD_TRANSCEIVE, [req_mode])
        if status != self.MI_OK or back_bits != 0x10:
            status = 1
        return status, back_bits

    def anticoll(self):
        self.write_reg(self.BitFramingReg, 0x00)
        status, back_data, back_bits = self.to_card(self.PCD_TRANSCEIVE, [self.PICC_ANTICOLL, 0x20])
        if status == self.MI_OK:
            if len(back_data) == 5:
                ser_num_check = 0
                for i in range(4):
                    ser_num_check ^= back_data[i]
                if ser_num_check != back_data[4]:
                    status = 1
            else:
                status = 1
        return status, back_data

# ─────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────

SLOT_CS_MAP = {
    1: 4, 2: 5, 3: 6, 4: 12, 5: 13, 
    6: 16, 7: 19, 8: 20, 9: 21, 10: 26
}

NFC_RST_PIN = 7 # ขา RST ตัวรองรับ (shared)

cs_pins = {}
nfc_rst = None
reader = None

def signal_handler(sig, frame):
    print('\n👋 ปิดโปรแกรมทดสอบ...')
    sys.exit(0)

# ─────────────────────────────────────────────
# Main Loop
# ─────────────────────────────────────────────

def start_test():
    global reader
    print("=============================================")
    print("🔍 NFC Tester for Raspberry Pi 5 (All Slots)")
    print("=============================================")
    
    # 1. Init CS Pins
    print("⚙️  กำลังตั้งค่า GPIO Pins (CS & RST)...")
    for slot, pin in SLOT_CS_MAP.items():
        cs_pins[slot] = OutputDevice(pin, initial_value=True)
    
    # Init shared Reset pin (Must be HIGH)
    global nfc_rst
    nfc_rst = OutputDevice(NFC_RST_PIN, initial_value=True)
    time.sleep(0.1)
    
    # 2. Init Reader
    try:
        reader = Pi5MFRC522()
        print("🟢 เริ่มต้นระบบ SPI สำเร็จ")
    except Exception as e:
        print(f"❌ Error SPI: {e}")
        return

    print("\n👉 วิธีทดสอบ: นำเหรียญ/การ์ด ไปวางที่เครื่องอ่านช่องต่างๆ")
    print("โปรแกรมจะวนสแกนช่อง 1-10 ไปเรื่อยๆ (กด Ctrl+C เพื่อเลิก)\n")

    last_scanned = {}

    try:
        while True:
            for slot in range(1, 11):
                cs = cs_pins[slot]
                cs.off() # Activate
                
                uid_str = None
                try:
                    status, _ = reader.request(reader.PICC_REQIDL)
                    if status == reader.MI_OK:
                        status, uid = reader.anticoll()
                        if status == reader.MI_OK:
                            uid_str = "".join([format(x, '02X') for x in uid[:4]])
                except:
                    pass
                finally:
                    cs.on() # Deactivate
                
                if uid_str:
                    # ป้องกันการพ่น Log ซ้ำๆ ในช่องเดิม
                    if last_scanned.get(slot) != uid_str:
                        print(f"✅ Slot [{slot:02d}]: พบ Tag UID = {uid_str}")
                        last_scanned[slot] = uid_str
                else:
                    if last_scanned.get(slot):
                        print(f"❌ Slot [{slot:02d}]: Tag ถูกดึงออก")
                        last_scanned[slot] = None
                
                time.sleep(0.02) # รอเล็กน้อยก่อนขยับไปช่องถัดไป
            
            time.sleep(0.1) # จบรอบการวนสแกน 1-10

    except KeyboardInterrupt:
        signal_handler(None, None)

if __name__ == "__main__":
    signal.signal(signal.SIGINT, signal_handler)
    start_test()
