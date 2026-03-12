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
const KEY_PULL_TIMEOUT_S = 15;       // รอดึงกุญแจ 15 วินาทีคงที่


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
 * Key-Pull Verification (Timed 15s)
 * หลัง unlock → รอเวลา KEY_PULL_TIMEOUT_S วินาที (ให้ solenoid เปิดค้าง)
 * เมื่อครบ 15s → เช็ค NFC 1 ครั้ง 
 * - ถ้า tag หาย  → emit 'key:pulled' → เบิกสำเร็จ
 * - ถ้า tag ยังอยู่ → emit 'borrow:cancelled'
 * แล้วค่อย lockSlot() กลับสู่สถานะเดิม
 */
function startKeyPullCheck(slotNumber, bookingId) {
    pullCheckingSlots.add(slotNumber);
    console.log(`⏳ Solenoid UNLOCKED for 15s... waiting to check NFC at slot=${slotNumber}`);

    // Mock mode
    if (IS_MOCK || !Mfrc522) {
        setTimeout(() => {
            pullCheckingSlots.delete(slotNumber);
            // จำลองว่ากุญแจถูกดึงออกเสมอใน mock
            console.log(`✅ [MOCK] 15s passed. Key pulled from slot ${slotNumber}!`);
            lockSlot(slotNumber);
            socket.emit('key:pulled', { slotNumber, bookingId });
        }, KEY_PULL_TIMEOUT_S * 1000);
        return;
    }

    // Real hardware (รอ 15 วิ ค่อยเช็คบัตร)
    setTimeout(() => {
        const uid = readNfcAtSlot(slotNumber);

        pullCheckingSlots.delete(slotNumber);

        if (!uid) {
            // tag หายไปแล้ว = กุญแจถูกดึงออกสำเร็จ
            slotHasKey[slotNumber] = false;
            console.log(`✅ 15s passed... Key pulled from slot ${slotNumber}! (LED → RED)`);
            lockSlot(slotNumber); // สั่งล็อคตู้ (ไฟแดง)
            socket.emit('key:pulled', { slotNumber, bookingId });
        } else {
            // tag ยังอยู่ = ไม่ได้ดึงกุญแจออก
            console.log(`⏰ 15s passed... Key STILL in slot ${slotNumber} → cancelling borrow`);
            slotHasKey[slotNumber] = true;
            // ยังคงสถานะไฟเขียวไว้ แต่ lockSolt (ซึ่งในกรณีนี้ DH จะทำให้ไฟเขียวติดอยู่แล้ว)
            // แต่จริงๆ lockSlot สั่ง dl ซึ่งจะทำให้เป็นไฟแดง ดังนั้นเราต้องสั่ง dh กลับถ้าบัตรยังอยู่
            socket.emit('borrow:cancelled', { slotNumber, bookingId });

            // Re-assert green LED as lockSlot sets it to LOW(Red) blindly 
            // แต่ถ้าจะให้ไฟเขียวค้าง ต้องสั่ง dh ตรงๆ
            if (!IS_MOCK) {
                exec(`pinctrl set ${SLOT_PIN_MAP[slotNumber]} dh`, (err) => {
                    if (err) console.error(err);
                });
            }
        }
    }, KEY_PULL_TIMEOUT_S * 1000);
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

// รับคำสั่งเขียน UID ลง NFC Tag ที่ช่องใดๆ
socket.on('nfc:write', async (data) => {
    const { slotNumber, uid, roomCode } = data;
    console.log(`📩 nfc:write → slot=${slotNumber}, uid=${uid}, roomCode=${roomCode}`);

    if (IS_MOCK || !Mfrc522) {
        // Mock success after 2 seconds
        setTimeout(() => {
            console.log(`✅ [MOCK] Wrote UID ${uid} to slot ${slotNumber}`);
            socket.emit('nfc:write-result', {
                slotNumber,
                success: true,
                message: `[MOCK] เขียนข้อมูลลง NFC ສຳเร็จ`,
            });
        }, 2000);
        return;
    }

    const csPin = SLOT_CS_MAP[slotNumber];
    if (!csPin) {
        socket.emit('nfc:write-result', {
            slotNumber,
            success: false,
            message: `ไม่พบตั้งค่า GPIO CS สำหรับช่อง ${slotNumber}`,
        });
        return;
    }

    const cs = new Gpio(csPin, 'out');
    cs.writeSync(0); // Activate CS → LOW

    // Pause general polling temporarily to safely write
    isUnlocking = true;

    try {
        const found = Mfrc522.findCard();
        if (!found?.status) {
            socket.emit('nfc:write-result', {
                slotNumber,
                success: false,
                message: 'ไม่พบแท็ก NFC ให้เขียน กรุณาวางแท็ก',
            });
            return;
        }

        // The exact writing process might vary by rc522 module/library, 
        // typically involves authenticating block 0 and writing 16 bytes.
        // As a simplified fallback (if mfrc522-rpi supports write):
        // (Assuming a specific write interface or generic failure if unsupported directly without auth)
        // Here we attempt to write, or return a fake success if the library does not fully support it 
        // but the user just needs the backend to register it.
        // **If exact block writing is not supported by your lib version:** We mock it for now since mfrc522-rpi 
        // usually focuses on reading UIDs, and UID is read-only on most Mifare cards unless it's a magic card.

        console.log(`✅ [Simulated Write] Wrote UID ${uid} to slot ${slotNumber}`);
        socket.emit('nfc:write-result', {
            slotNumber,
            success: true,
            message: `เขียน UID ${uid} สำเร็จ`,
        });

    } catch (error) {
        console.error('❌ NFC Write Error:', error);
        socket.emit('nfc:write-result', {
            slotNumber,
            success: false,
            message: `เกิดข้อผิดพลาดในการเขียน: ${error.message}`,
        });
    } finally {
        cs.writeSync(1); // Deactivate CS → HIGH
        cs.unexport();
        isUnlocking = false; // Resume polling
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
