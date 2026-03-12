/**
 * Hardware Service — Raspberry Pi 5
 * รวม NFC Reader (RC522 ×10 via SPI + CS GPIO) + GPIO Relay Controller (Solenoid ×10)
 *
 * Flow:
 *  1. nfc polling loop วน slot 1-10
 *  2. เจอบัตร → emit 'nfc:tag' ไปยัง Backend
 *  3. Backend ตอบกลับด้วย 'gpio:unlock' { slotNumber, bookingId }
 *  4. Relay เปิด HIGH → startKeyPullCheck() ทำงาน
 *  5. Poll NFC slot นั้นทุก 1s นาน 15s
 *     - tag หาย → emit 'key:pulled' → เบิกสำเร็จ
 *     - หมดเวลา → lockSlot() + emit 'borrow:cancelled'
 */

import { io } from 'socket.io-client';
import dotenv from 'dotenv';

dotenv.config();

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4556';
const NFC_POLLING_INTERVAL_MS = 200; // loop NFC ทุก 200ms
const KEY_PULL_TIMEOUT_S = 10;       // รอดึงกุญแจสูงสุด 10 วินาที
const KEY_PULL_CHECK_INTERVAL_MS = 1000; // poll NFC ทุก 1 วินาที

// slots ที่กำลังรอดึงกุญแจออก (ห้าม NFC polling loop ทั่วไปรบกวน)
const pullCheckingSlots = new Set();

// ─────────────────────────────────────────────
// GPIO Pin Maps
// ─────────────────────────────────────────────

/** Relay pin สำหรับ Solenoid แต่ละ slot (BCM numbering) */
const SLOT_PIN_MAP = {
    1: 17,
    2: 27,
    3: 22,
    4: 23,
    5: 24,
    6: 25,
    7: 14,   // Pin 8  — ⚠️ UART TX (ต้อง disable serial ใน raspi-config)
    8: 15,   // Pin 10 — ⚠️ UART RX (ต้อง disable serial ใน raspi-config)
    9: 18,   // Pin 12
    10: 0,   // Pin 27
};

/** CS (SDA) pin ของ RC522 แต่ละ slot (BCM numbering) */
const SLOT_CS_MAP = {
    1: 4,
    2: 5,
    3: 6,
    4: 12,
    5: 13,
    6: 16,
    7: 19,
    8: 20,
    9: 21,
    10: 26,
};

// ─────────────────────────────────────────────
// Hardware Detection (onoff + mfrc522-rpi)
// ─────────────────────────────────────────────

import { exec } from 'child_process';

let Mfrc522 = null;
let IS_MOCK = true;
let isUnlocking = false; // Flag to pause NFC polling during relay operation
const slotHasKey = {}; // กุญแจอยู่ในช่องหรือไม่ (true = Green, false = Red)

async function setupHardware() {
    // Check if pinctrl is available
    await new Promise((resolve) => {
        exec('command -v pinctrl', (error) => {
            if (error) {
                console.log('🟡 GPIO: pinctrl tool not found → mock mode');
                IS_MOCK = true;
            } else {
                console.log('🟢 GPIO: Real mode (Raspberry Pi 5 detected via pinctrl)');
                IS_MOCK = false;

                // Set all pins as output low
                for (const pin of Object.values(SLOT_PIN_MAP)) {
                    exec(`pinctrl set ${pin} op dl`);
                }
            }
            resolve();
        });
    });

    if (!IS_MOCK) {
        try {
            const { default: Mfrc522Lib } = await import('mfrc522-rpi');
            Mfrc522 = new Mfrc522Lib();
            console.log('🟢 NFC: mfrc522-rpi loaded');
        } catch {
            console.log('🟡 NFC: mfrc522-rpi not found → mock NFC mode');
        }
    }
}

// ─────────────────────────────────────────────
// Socket.IO Connection
// ─────────────────────────────────────────────

const socket = io(BACKEND_URL, {
    reconnection: true,
    reconnectionDelay: 2000,
});

socket.on('connect', () => {
    console.log(`✅ Connected to backend: ${socket.id}`);
    // ต้องขอเข้าห้อง gpio เพื่อรับคำสั่งเปิดตู้จาก backend 
    socket.emit('join:gpio');
});

socket.on('disconnect', () => {
    console.log('🔌 Disconnected from backend — retrying...');
});

socket.on('connect_error', (err) => {
    console.error('❌ Connection error:', err.message);
});

// ─────────────────────────────────────────────
// Relay / Solenoid Controller
// ─────────────────────────────────────────────

// เปิด solenoid (HIGH) — ไม่มี auto-relock, จะถูกปิดโดย startKeyPullCheck
async function unlockSlot(slotNumber) {
    const pin = SLOT_PIN_MAP[slotNumber];
    if (!pin) {
        console.error(`❌ Unknown slot: ${slotNumber}`);
        return false;
    }

    console.log(`🔓 Unlocking slot ${slotNumber} (GPIO ${pin})`);

    if (IS_MOCK) {
        console.log(`✅ [MOCK] Slot ${slotNumber} (Pin ${pin}) → HIGH`);
        return true;
    }

    return new Promise((resolve) => {
        isUnlocking = true; // Pause NFC polling temporarily
        exec(`pinctrl set ${pin} dh`, (err) => {
            isUnlocking = false; // Resume NFC polling
            if (err) {
                console.error(`❌ GPIO error slot ${slotNumber}:`, err.message);
                resolve(false);
            } else {
                console.log(`✅ Slot ${slotNumber} (Pin ${pin}) → HIGH`);
                resolve(true);
            }
        });
    });
}

// ปิด solenoid (LOW)
function lockSlot(slotNumber) {
    const pin = SLOT_PIN_MAP[slotNumber];
    if (!pin) return;

    if (IS_MOCK) {
        console.log(`🔒 [MOCK] Slot ${slotNumber} (Pin ${pin}) → LOW`);
        return;
    }

    exec(`pinctrl set ${pin} dl`, (err) => {
        if (err) {
            console.error(`❌ Lock error slot ${slotNumber}:`, err.message);
        } else {
            console.log(`🔒 Slot ${slotNumber} (Pin ${pin}) → LOW`);
        }
    });
}

// อ่าน NFC tag ที่ slot ใดสักตัว → คืน uid หรือ null
function readNfcAtSlot(slotNumber) {
    if (IS_MOCK || !Mfrc522) return null; // จัดการใน mock branch ของ startKeyPullCheck

    const csPin = SLOT_CS_MAP[slotNumber];
    if (!csPin) return null;

    const cs = new Gpio(csPin, 'out');
    cs.writeSync(0); // Activate CS
    try {
        const found = Mfrc522.findCard();
        if (found?.status) {
            const uidResult = Mfrc522.getUid();
            if (uidResult?.status) {
                return uidResult.data
                    .slice(0, 4)
                    .map((b) => b.toString(16).padStart(2, '0'))
                    .join('')
                    .toUpperCase();
            }
        }
    } catch {
        // ไม่มีการ์ด
    } finally {
        cs.writeSync(1); // Deactivate CS
        cs.unexport();
    }
    return null;
}

/**
 * Key-Pull Verification
 * หลัง unlock → poll NFC ทุก 1s นาน KEY_PULL_TIMEOUT_S วินาที
 * - tag หาย  → emit 'key:pulled' → เบิกสำเร็จ
 * - หมดเวลา → lockSlot() + emit 'borrow:cancelled'
 */
function startKeyPullCheck(slotNumber, bookingId) {
    pullCheckingSlots.add(slotNumber);
    console.log(`⏳ Key-pull check started: slot=${slotNumber} (${KEY_PULL_TIMEOUT_S}s timeout)`);

    let elapsedS = 0;

    // Mock mode: simulate กุญแจถูกดึงออกหลัง 3 วินาที
    if (IS_MOCK || !Mfrc522) {
        const mockInterval = setInterval(() => {
            elapsedS++;
            console.log(`🔍 [MOCK] Checking slot ${slotNumber}... elapsed=${elapsedS}s`);

            if (elapsedS >= 3) {
                // Simulate key pulled after 3s
                clearInterval(mockInterval);
                pullCheckingSlots.delete(slotNumber);
                console.log(`✅ [MOCK] Key pulled from slot ${slotNumber}!`);
                lockSlot(slotNumber);
                socket.emit('key:pulled', { slotNumber, bookingId });
                return;
            }

            if (elapsedS >= KEY_PULL_TIMEOUT_S) {
                clearInterval(mockInterval);
                pullCheckingSlots.delete(slotNumber);
                console.log(`⏰ [MOCK] Timeout! Key NOT pulled from slot ${slotNumber} → cancelling borrow`);
                lockSlot(slotNumber);
                socket.emit('borrow:cancelled', { slotNumber, bookingId });
            }
        }, KEY_PULL_CHECK_INTERVAL_MS);
        return;
    }

    // Real hardware
    const interval = setInterval(() => {
        elapsedS++;
        const uid = readNfcAtSlot(slotNumber);

        if (!uid) {
            // tag หายไปแล้ว = กุญแจถูกดึงออก
            clearInterval(interval);
            pullCheckingSlots.delete(slotNumber);
            slotHasKey[slotNumber] = false;
            console.log(`✅ Key pulled from slot ${slotNumber}! (LED → RED)`);
            lockSlot(slotNumber); // สั่งล็อค (เป็นสีแดงยาว)
            socket.emit('key:pulled', { slotNumber, bookingId });
            return;
        }

        console.log(`🔍 Slot ${slotNumber} still has tag (${elapsedS}s/${KEY_PULL_TIMEOUT_S}s)`);

        if (elapsedS >= KEY_PULL_TIMEOUT_S) {
            clearInterval(interval);
            pullCheckingSlots.delete(slotNumber);
            console.log(`⏰ Timeout! Key NOT pulled from slot ${slotNumber} → cancelling borrow`);
            // กลับไปสถานะเขียว (เพราะกุญแจยังเสียบอยู่และหมดเวลาดึง)
            slotHasKey[slotNumber] = true;
            if (!IS_MOCK) exec(`pinctrl set ${SLOT_PIN_MAP[slotNumber]} dh`);
            socket.emit('borrow:cancelled', { slotNumber, bookingId });
        }
    }, KEY_PULL_CHECK_INTERVAL_MS);
}

// รับคำสั่ง unlock จาก Backend → เปิด solenoid → เริ่ม key-pull check
socket.on('gpio:unlock', async (data) => {
    const { slotNumber, bookingId } = data;

    console.log(`📩 gpio:unlock → slot=${slotNumber}, bookingId=${bookingId}`);

    const success = await unlockSlot(slotNumber);

    // แจ้ง backend ว่าปลดล็อคแล้ว (UI จะแสดง "ดึงกุญแจได้เลย")
    socket.emit('slot:unlocked', { slotNumber, success });

    if (success) {
        // เริ่มรอดึงกุญแจออก
        startKeyPullCheck(slotNumber, bookingId);
    }
});

// ─────────────────────────────────────────────
// NFC Polling (RC522 ×10 SPI + CS GPIO)
// ─────────────────────────────────────────────

function startNfcPolling() {
    if (IS_MOCK || !Mfrc522) {
        console.log('🧪 NFC Mock mode — simulating random scans (5% chance/sec)');
        setInterval(() => {
            if (Math.random() < 0.05) {
                const mockSlot = Math.floor(Math.random() * 10) + 1;
                const mockUid = 'MOCK' + mockSlot.toString().padStart(2, '0') + 'DEADBEEF';
                console.log(`🏷️  [MOCK] NFC tag: ${mockUid} at slot ${mockSlot}`);
                socket.emit('nfc:tag', { slotNumber: mockSlot, uid: mockUid });
            }
        }, 1000);
        return;
    }

    console.log('🟢 NFC Real mode — starting polling loop');

    // ตั้ง CS pins ทุกตัวเป็น HIGH (inactive)
    const csPins = {};
    for (const [slot, pin] of Object.entries(SLOT_CS_MAP)) {
        csPins[slot] = new Gpio(pin, 'out');
        csPins[slot].writeSync(1);
    }

    let currentSlot = 1;
    const totalSlots = Object.keys(SLOT_CS_MAP).length;

    setInterval(() => {
        // Pause NFC polling if we are currently trying to unlock a slot
        if (isUnlocking) return;

        // ข้าม slot ที่กำลัง key-pull check อยู่
        if (pullCheckingSlots.has(currentSlot)) {
            currentSlot = (currentSlot % totalSlots) + 1;
            return;
        }

        const cs = csPins[currentSlot];
        if (!cs) {
            currentSlot = (currentSlot % totalSlots) + 1;
            return;
        }

        try {
            cs.writeSync(0); // Activate CS → LOW

            const found = Mfrc522.findCard();
            if (found?.status) {
                // อัปเดตไฟ LED เป็นสีเขียว (มีกุญแจ)
                if (slotHasKey[currentSlot] !== true) {
                    slotHasKey[currentSlot] = true;
                    if (!IS_MOCK) exec(`pinctrl set ${SLOT_PIN_MAP[currentSlot]} dh`); // Green LED (NO)
                }

                const uidResult = Mfrc522.getUid();
                if (uidResult?.status) {
                    const uid = uidResult.data
                        .slice(0, 4)
                        .map((b) => b.toString(16).padStart(2, '0'))
                        .join('')
                        .toUpperCase();

                    // ป้องกันการ log ซ้ำๆ ทุก 200ms
                    if (!slotHasKey[`last_uid_${currentSlot}`] || slotHasKey[`last_uid_${currentSlot}`] !== uid) {
                        console.log(`🏷️  NFC tag: ${uid} at slot ${currentSlot}`);
                        slotHasKey[`last_uid_${currentSlot}`] = uid;
                    }
                    socket.emit('nfc:tag', { slotNumber: currentSlot, uid });
                }
            } else {
                // อัปเดตไฟ LED เป็นสีแดง (ไม่มีกุญแจ)
                if (slotHasKey[currentSlot] !== false) {
                    slotHasKey[currentSlot] = false;
                    slotHasKey[`last_uid_${currentSlot}`] = null;
                    if (!IS_MOCK) exec(`pinctrl set ${SLOT_PIN_MAP[currentSlot]} dl`); // Red LED (NC)
                }
            }
        } catch {
            // เกิด Error หรืออ่านไม่ได้ ถือว่าไม่มีกุญแจ
            if (slotHasKey[currentSlot] !== false) {
                slotHasKey[currentSlot] = false;
                slotHasKey[`last_uid_${currentSlot}`] = null;
                if (!IS_MOCK) exec(`pinctrl set ${SLOT_PIN_MAP[currentSlot]} dl`); // Red LED (NC)
            }
        } finally {
            cs.writeSync(1); // Deactivate CS → HIGH
        }

        currentSlot = (currentSlot % totalSlots) + 1;
    }, NFC_POLLING_INTERVAL_MS);
}

// ─────────────────────────────────────────────
// Key Return Detection (NFC ตรวจพบกุญแจถูกวาง)
// ─────────────────────────────────────────────
// Backend จะแยกระหว่าง nfc:tag (เจอบัตรนักศึกษา) VS key:returned (เจอ tag บนกุญแจ)
// ตาม logic ที่ Backend กำหนด

// ─────────────────────────────────────────────
// Graceful Shutdown
// ─────────────────────────────────────────────

process.on('SIGINT', () => {
    console.log('\n👋 Hardware Service shutting down (SIGINT)...');
    socket.disconnect();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('👋 Hardware Service shutting down (SIGTERM)...');
    socket.disconnect();
    process.exit(0);
});

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

(async () => {
    console.log('===========================================');
    console.log('⚡ Hardware Service starting...');
    console.log(`📡 Backend: ${BACKEND_URL}`);
    console.log('===========================================');

    await setupHardware();
    startNfcPolling();

    console.log('✅ Hardware Service running — waiting for events...');
})();
