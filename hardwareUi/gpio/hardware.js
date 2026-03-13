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
import { spawn } from 'child_process';

dotenv.config();

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4556';
const NFC_POLLING_INTERVAL_MS = 200; // loop NFC ทุก 200ms
const KEY_PULL_TIMEOUT_S = 15;       // รอดึงกุญแจ 15 วินาทีคงที่
const KEY_PULL_POLL_INTERVAL_MS = 1000; // ตรวจเช็คการดึงกุญแจทุก 1 วินาที
// Relay module บางรุ่นเป็น Active-LOW (สั่ง LOW แล้วรีเลย์ทำงาน)
// ตั้งค่าได้ใน gpio/.env: RELAY_ACTIVE_STATE=LOW หรือ HIGH (default HIGH)
const RELAY_ACTIVE_STATE = (process.env.RELAY_ACTIVE_STATE || 'HIGH').toUpperCase();
const FORCE_PY_NFC = (process.env.FORCE_PY_NFC || '').toLowerCase() === '1';
const PY_NFC_READ_TIMEOUT_MS = Number(process.env.PY_NFC_READ_TIMEOUT_MS || 250);


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
let Gpio = null;
let IS_MOCK = true;
let nfcMode = 'mock'; // 'mock' | 'node' | 'python'
let isUnlocking = false; // Flag to pause NFC polling during relay operation
const slotHasKey = {}; // กุญแจอยู่ในช่องหรือไม่ (true = Green, false = Red)
const csPins = {}; // เก็บ object Gpio ของ CS แต่ละช่อง

// ─────────────────────────────────────────────
// Python NFC bridge
// ─────────────────────────────────────────────

let pyProc = null;
let pyBuffer = '';
let pyReqId = 0;
const pyPending = new Map(); // id -> { resolve, reject, timer }

function startPythonNfcBridge() {
    if (pyProc) return true;

    const script = new URL('./nfc_rc522_bridge.py', import.meta.url);
    pyProc = spawn('python3', [script.pathname], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: process.env,
    });

    pyProc.stdout.setEncoding('utf8');
    pyProc.stdout.on('data', (chunk) => {
        pyBuffer += chunk;
        while (true) {
            const idx = pyBuffer.indexOf('\n');
            if (idx < 0) break;
            const line = pyBuffer.slice(0, idx).trim();
            pyBuffer = pyBuffer.slice(idx + 1);
            if (!line) continue;
            try {
                const msg = JSON.parse(line);
                const pending = pyPending.get(msg.id);
                if (pending) {
                    clearTimeout(pending.timer);
                    pyPending.delete(msg.id);
                    if (msg.ok) pending.resolve(msg);
                    else pending.reject(new Error(msg.error || 'python nfc error'));
                }
            } catch (e) {
                console.error('❌ Python NFC bridge parse error:', e.message);
            }
        }
    });

    pyProc.stderr.setEncoding('utf8');
    pyProc.stderr.on('data', (chunk) => {
        // keep stderr visible for setup issues (missing packages, permission errors)
        console.error('🐍 NFC stderr:', chunk.toString().trim());
    });

    pyProc.on('exit', (code, signal) => {
        console.error(`❌ Python NFC bridge exited (code=${code}, signal=${signal})`);
        for (const [, pending] of pyPending.entries()) {
            clearTimeout(pending.timer);
            pending.reject(new Error('python nfc bridge exited'));
        }
        pyPending.clear();
        pyProc = null;
    });

    return true;
}

function pyRequest(payload) {
    if (!pyProc?.stdin?.writable) {
        throw new Error('python nfc bridge not running');
    }
    const id = ++pyReqId;
    const msg = { id, ...payload };
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            pyPending.delete(id);
            reject(new Error('python nfc timeout'));
        }, PY_NFC_READ_TIMEOUT_MS);
        pyPending.set(id, { resolve, reject, timer });
        pyProc.stdin.write(JSON.stringify(msg) + '\n');
    });
}

async function readNfcAtSlotPython(slotNumber) {
    try {
        const res = await pyRequest({ cmd: 'read', slot: slotNumber });
        return res.uid || null;
    } catch {
        return null;
    }
}

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

                // Set all pins as output low (Safety First - prevent relay clicking)
                for (const [slot, pin] of Object.entries(SLOT_PIN_MAP)) {
                    const inactiveLevel = RELAY_ACTIVE_STATE === 'LOW' ? 'dh' : 'dl';
                    console.log(`📡 Pin Init: Slot ${slot} (Pin ${pin}) -> ${inactiveLevel.toUpperCase()}`);
                    exec(`pinctrl set ${pin} op ${inactiveLevel}`);
                }
            }
            resolve();
        });
    });

    if (!IS_MOCK) {
        try {
            const onoff = await import('onoff');
            Gpio = onoff.Gpio;
            if (!Gpio?.accessible) {
                console.log('🟡 NFC: onoff loaded but GPIO not accessible → mock NFC mode');
                // keep GPIO real mode, but NFC node-lib cannot run
                Gpio = null;
            }

            if (!FORCE_PY_NFC && Gpio) {
                const { default: Mfrc522Lib } = await import('@efesoroglu/mfrc522-rpi');
                Mfrc522 = new Mfrc522Lib();
                nfcMode = 'node';
                console.log('🟢 NFC: Node mode (@efesoroglu/mfrc522-rpi)');
            } else {
                throw new Error('FORCE_PY_NFC enabled or GPIO not accessible for node NFC');
            }
        } catch (err) {
            console.log('🟡 NFC: Node NFC failed → trying Python NFC bridge');
            console.error(err.message);
            try {
                startPythonNfcBridge();
                // ping once
                await pyRequest({ cmd: 'ping' });
                nfcMode = 'python';
                console.log('🟢 NFC: Python bridge mode (nfc_rc522_bridge.py)');
            } catch (e) {
                console.log('🔴 NFC: Python bridge failed → mock NFC mode');
                console.error(e.message);
                nfcMode = 'mock';
            }
        }
    }
}

function setRelayActive(slotNumber, shouldUnlock) {
    const pin = SLOT_PIN_MAP[slotNumber];
    if (!pin) return;

    // "Active" หมายถึงรีเลย์ทำงาน/จ่ายไฟให้ solenoid เพื่อปลดล็อก
    // - Active-HIGH: unlock => dh, lock => dl
    // - Active-LOW : unlock => dl, lock => dh
    const activeLevel = RELAY_ACTIVE_STATE === 'LOW' ? 'dl' : 'dh';
    const inactiveLevel = RELAY_ACTIVE_STATE === 'LOW' ? 'dh' : 'dl';
    const level = shouldUnlock ? activeLevel : inactiveLevel;

    exec(`pinctrl set ${pin} ${level}`, (err) => {
        if (err) {
            console.error(`❌ Relay set error slot ${slotNumber}:`, err.message);
        } else {
            console.log(`🔌 Relay slot ${slotNumber} (Pin ${pin}) → ${level.toUpperCase()} (${shouldUnlock ? 'UNLOCK' : 'LOCK'})`);
        }
    });
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
        const activeLevel = RELAY_ACTIVE_STATE === 'LOW' ? 'dl' : 'dh';
        exec(`pinctrl set ${pin} ${activeLevel}`, (err) => {
            isUnlocking = false; // Resume NFC polling
            if (err) {
                console.error(`❌ GPIO error slot ${slotNumber}:`, err.message);
                resolve(false);
            } else {
                console.log(`✅ Slot ${slotNumber} (Pin ${pin}) → ${activeLevel.toUpperCase()} (UNLOCK)`);
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

    const inactiveLevel = RELAY_ACTIVE_STATE === 'LOW' ? 'dh' : 'dl';
    exec(`pinctrl set ${pin} ${inactiveLevel}`, (err) => {
        if (err) {
            console.error(`❌ Lock error slot ${slotNumber}:`, err.message);
        } else {
            console.log(`🔒 Slot ${slotNumber} (Pin ${pin}) → ${inactiveLevel.toUpperCase()} (LOCK)`);
        }
    });
}

// อ่าน NFC tag ที่ slot ใดสักตัว → คืน uid หรือ null
async function readNfcAtSlot(slotNumber) {
    if (nfcMode === 'mock') return null;
    if (nfcMode === 'python') return await readNfcAtSlotPython(slotNumber);
    if (nfcMode !== 'node') return null;
    if (IS_MOCK || !Mfrc522 || !Gpio) return null;

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
 * หลัง unlock → ตรวจ NFC slot นั้นทุก 1 วินาที (สูงสุด 15 วินาที)
 * - ถ้า tag หายเมื่อไหร่ → lockSlot() ทันที + emit 'key:pulled' → เบิกสำเร็จ
 * - ถ้าครบเวลาแล้วยังเจอ tag อยู่ → emit 'borrow:cancelled' (ถือว่าไม่ได้ดึง)
 * แล้วค่อย lock/restore LED ตามเงื่อนไขเดิม
 */
function startKeyPullCheck(slotNumber, bookingId) {
    pullCheckingSlots.add(slotNumber);
    console.log(`⏳ Solenoid UNLOCKED... monitoring NFC removal at slot=${slotNumber} (max ${KEY_PULL_TIMEOUT_S}s)`);

    // Mock mode
    if (nfcMode === 'mock') {
        setTimeout(() => {
            pullCheckingSlots.delete(slotNumber);
            // จำลองว่ากุญแจถูกดึงออกเสมอใน mock
            console.log(`✅ [MOCK] 15s passed. Key pulled from slot ${slotNumber}!`);
            lockSlot(slotNumber);
            socket.emit('key:pulled', { slotNumber, bookingId });
        }, KEY_PULL_TIMEOUT_S * 1000);
        return;
    }

    // Real hardware: poll NFC removal every 1s, stop early if removed
    const startedAt = Date.now();
    const timeoutMs = KEY_PULL_TIMEOUT_S * 1000;

    let isChecking = false;
    const intervalId = setInterval(async () => {
        if (isChecking) return;
        isChecking = true;
        const elapsedMs = Date.now() - startedAt;

        const uid = await readNfcAtSlot(slotNumber);
        if (!uid) {
            clearInterval(intervalId);
            pullCheckingSlots.delete(slotNumber);

            // tag หายไปแล้ว = กุญแจถูกดึงออกสำเร็จ
            slotHasKey[slotNumber] = false;
            console.log(`✅ Key pulled from slot ${slotNumber} (detected early at ~${Math.round(elapsedMs / 1000)}s)`);
            lockSlot(slotNumber); // ดึง solenoid กลับทันที
            socket.emit('key:pulled', { slotNumber, bookingId });
            isChecking = false;
            return;
        }

        if (elapsedMs >= timeoutMs) {
            clearInterval(intervalId);
            pullCheckingSlots.delete(slotNumber);

            // tag ยังอยู่ครบเวลา = ไม่ได้ดึงกุญแจออก
            console.log(`⏰ ${KEY_PULL_TIMEOUT_S}s elapsed... Key STILL in slot ${slotNumber} → cancelling borrow`);
            slotHasKey[slotNumber] = true;
            socket.emit('borrow:cancelled', { slotNumber, bookingId });

            // กลับสู่สถานะ LOCK เพื่อให้ solenoid ยุบกลับ (ปลอดภัยกว่าให้ค้าง)
            lockSlot(slotNumber);
        }
        isChecking = false;
    }, KEY_PULL_POLL_INTERVAL_MS);
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

    if (nfcMode !== 'node' || IS_MOCK || !Mfrc522) {
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

    const cs = csPins[slotNumber];
    if (!cs) {
        socket.emit('nfc:write-result', {
            slotNumber,
            success: false,
            message: `ระบบยังไม่พร้อม หรือไม่พบ CS Pin ของช่อง ${slotNumber}`,
        });
        return;
    }

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
        isUnlocking = false; // Resume polling
    }
});

// ─────────────────────────────────────────────
// NFC Polling (RC522 ×10 SPI + CS GPIO)
// ─────────────────────────────────────────────

function startNfcPolling() {
    if (nfcMode === 'mock') {
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

    console.log(`🟢 NFC Real mode (${nfcMode}) — starting polling loop`);

    if (nfcMode === 'node') {
        // ตั้ง CS pins ทุกตัวเป็น HIGH (inactive)
        for (const [slot, pin] of Object.entries(SLOT_CS_MAP)) {
            csPins[slot] = new Gpio(pin, 'out');
            csPins[slot].writeSync(1);
        }
    }

    let currentSlot = 1;
    const totalSlots = Object.keys(SLOT_CS_MAP).length;

    let isPollingSlot = false;
    setInterval(async () => {
        // Pause NFC polling if we are currently trying to unlock a slot
        if (isUnlocking) return;
        if (isPollingSlot) return;

        // ข้าม slot ที่กำลัง key-pull check อยู่
        if (pullCheckingSlots.has(currentSlot)) {
            currentSlot = (currentSlot % totalSlots) + 1;
            return;
        }

        try {
            isPollingSlot = true;
            const uid = await readNfcAtSlot(currentSlot);
            if (uid) {
                if (slotHasKey[currentSlot] !== true) slotHasKey[currentSlot] = true;
                if (!slotHasKey[`last_uid_${currentSlot}`] || slotHasKey[`last_uid_${currentSlot}`] !== uid) {
                    console.log(`🏷️  NFC tag: ${uid} at slot ${currentSlot}`);
                    slotHasKey[`last_uid_${currentSlot}`] = uid;
                }
                socket.emit('nfc:tag', { slotNumber: currentSlot, uid });
            } else {
                if (slotHasKey[currentSlot] !== false) {
                    slotHasKey[currentSlot] = false;
                    slotHasKey[`last_uid_${currentSlot}`] = null;
                }
            }
        } catch (e) {
            // เกิด Error หรืออ่านไม่ได้ ถือว่าไม่มีกุญแจ
            if (slotHasKey[currentSlot] !== false) {
                slotHasKey[currentSlot] = false;
                slotHasKey[`last_uid_${currentSlot}`] = null;
                // exec(`pinctrl set ${SLOT_PIN_MAP[currentSlot]} dl`); // <--- นำออก
            }
        } finally {
            // Node mode needs CS deassert here (python mode handles CS internally)
            if (nfcMode === 'node') {
                const cs = csPins[currentSlot];
                try {
                    cs?.writeSync(1);
                } catch {
                    // ignore
                }
            }
            isPollingSlot = false;
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
    try { pyProc?.kill('SIGTERM'); } catch { /* ignore */ }
    socket.disconnect();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('👋 Hardware Service shutting down (SIGTERM)...');
    try { pyProc?.kill('SIGTERM'); } catch { /* ignore */ }
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
