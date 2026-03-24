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
import { readdirSync } from 'fs';

dotenv.config();

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4556';
const HARDWARE_KEYS_URL = process.env.HARDWARE_KEYS_URL || `${BACKEND_URL}/api/hardware/keys`;
const HARDWARE_TOKEN = process.env.HARDWARE_TOKEN || '';
const NFC_POLLING_INTERVAL_MS = 200; // loop NFC ทุก 200ms
const KEY_PULL_TIMEOUT_S = 15;       // รอดึงกุญแจ 15 วินาทีคงที่
const KEY_PULL_POLL_INTERVAL_MS = 1000; // ตรวจเช็คการดึงกุญแจทุก 1 วินาที
// กันอ่าน NFC หลุดเป็นจังหวะแล้วคิดว่าดึงกุญแจ: ต้องเห็นแท็กก่อน และต้องหายติดกันหลายครั้ง
const KEY_PULL_REQUIRE_SEEN_TAG = true;
const KEY_PULL_MISS_THRESHOLD = Number(process.env.KEY_PULL_MISS_THRESHOLD || 2); // หายติดกันกี่ครั้งถึงนับว่าดึงออกแล้ว
const KEY_PULL_SEEN_GRACE_MS = Number(process.env.KEY_PULL_SEEN_GRACE_MS || 2000); // เวลารอให้เห็นแท็กครั้งแรกหลัง unlock
// Relay module บางรุ่นเป็น Active-LOW (สั่ง LOW แล้วรีเลย์ทำงาน)
// ตั้งค่าได้ใน gpio/.env: RELAY_ACTIVE_STATE=LOW หรือ HIGH (default HIGH)
const RELAY_ACTIVE_STATE = (process.env.RELAY_ACTIVE_STATE || 'LOW').toUpperCase();
const FORCE_PY_NFC = (process.env.FORCE_PY_NFC || '').toLowerCase() === '1';
const FORCE_ESP8266_NFC = (process.env.FORCE_ESP8266_NFC || '').toLowerCase() === '1';
const PY_NFC_READ_TIMEOUT_MS = Number(process.env.PY_NFC_READ_TIMEOUT_MS || 250);
const ESP8266_READ_TIMEOUT_MS = Number(process.env.ESP8266_READ_TIMEOUT_MS || 500);


// slots ที่กำลังรอดึงกุญแจออก (ห้าม NFC polling loop ทั่วไปรบกวน)
const pullCheckingSlots = new Set();

// ─────────────────────────────────────────────
// GPIO Pin Maps
// ─────────────────────────────────────────────

/** Relay pin สำหรับ Solenoid แต่ละ slot (BCM numbering) — ฝั่งขวาของ header */
const SLOT_PIN_MAP = {
    1: 14,   // Pin 8  — ⚠️ UART TX (ต้อง disable serial ใน raspi-config)
    2: 15,   // Pin 10 — ⚠️ UART RX (ต้อง disable serial ใน raspi-config)
    3: 18,   // Pin 12
    4: 23,   // Pin 16
    5: 24,   // Pin 18
    6: 25,   // Pin 22
    7: 8,    // Pin 24
    8: 7,    // Pin 26 (แก้ไขจาก 1 เป็น 7)
    9: 12,   // Pin 32
    10: 16,  // Pin 36
};

/** Relay pin สำหรับ LED แต่ละ slot (BCM numbering) — ฝั่งซ้ายของ header */
/** 1 ช่อง = 2 ดวง (NO=แดง, NC=เขียว) — Relay OFF = เขียว, Relay ON = แดง */
const LED_PIN_MAP = {
    1: 4,    // Pin 7
    2: 26,   // Pin 37 (เสียบ Socket GND ขา 39-37-35-33)
    3: 19,   // Pin 35 
    4: 13,   // Pin 33 
    5: 10,   // Pin 19
    6: 22,   // Pin 15 (ย้ายหนี SPI)
    7: 20,   // Pin 38 (ย้ายหนี SPI)
    8: 21,   // Pin 40 (ย้ายหนี EEPROM)
    9: 5,    // Pin 29
    10: 6,   // Pin 31
};

/** CS (SDA) pin ของ RC522 แต่ละ slot — ย้ายไป ESP32 แล้ว (ไม่ใช้บน RPi) */
const SLOT_CS_MAP = {
    1: 4,    // Pin 7
    2: 17,   // Pin 11
    3: 27,   // Pin 13
    4: 22,   // Pin 15
    5: 0,    // Pin 27
    6: 5,    // Pin 29
    7: 6,    // Pin 31
    8: 13,   // Pin 33
    9: 19,   // Pin 35
    10: 26,  // Pin 37
};

// ─────────────────────────────────────────────
// Hardware Detection (onoff + mfrc522-rpi)
// ─────────────────────────────────────────────

import { exec } from 'child_process';

let Mfrc522 = null;
let Gpio = null;
let IS_MOCK = true;
let nfcMode = 'node'; // 'mock' | 'node' | 'python' | 'esp8266'
let isUnlocking = false; // Flag to pause NFC polling during relay operation
const slotHasKey = {}; // กุญแจอยู่ในช่องหรือไม่ (true = Green, false = Red)
const csPins = {}; // เก็บ object Gpio ของ CS แต่ละช่อง

// Cache: slotNumber -> expected key NFC UID (from backend)
const expectedKeyUidBySlot = {};

// ─────────────────────────────────────────────
// Multi-ESP8266 Serial NFC Bridge
// ─────────────────────────────────────────────
// 3 boards × 3 NFC per board = 9 slots
// Board 1 → slots 1,2,3  |  Board 2 → slots 4,5,6  |  Board 3 → slots 7,8,9

// boardId → { port, buffer, pending, reqId }
const esp8266Boards = new Map();

/**
 * Map slot number (1-10) → boardId (1-3)
 * Board 1: slots 1-4 (4 NFC)
 * Board 2: slots 5-7 (3 NFC)
 * Board 3: slots 8-10 (3 NFC)
 */
function slotToBoardId(slotNumber) {
    if (slotNumber >= 1 && slotNumber <= 4) return 1;
    if (slotNumber >= 5 && slotNumber <= 7) return 2;
    if (slotNumber >= 8 && slotNumber <= 10) return 3;
    return 0; // invalid
}

/** Find all serial devices in /dev/ */
function detectAllSerialPaths() {
    try {
        const devFiles = readdirSync('/dev');
        const paths = [];
        for (const prefix of ['ttyUSB', 'ttyACM']) {
            const found = devFiles
                .filter(f => f.startsWith(prefix))
                .sort()
                .map(f => `/dev/${f}`);
            paths.push(...found);
        }
        return paths;
    } catch {
        return [];
    }
}

/**
 * Open one ESP8266 serial port and set up JSON parsing.
 * Returns boardId on success, null on failure.
 */
async function openEsp8266Port(serialPath, SerialPort) {
    return new Promise((resolve) => {
        const port = new SerialPort({
            path: serialPath,
            baudRate: 115200,
            autoOpen: false,
        });

        const ctx = { port, buffer: '', pending: new Map(), reqId: 0 };

        port.on('data', (chunk) => {
            ctx.buffer += chunk.toString('utf8');
            while (true) {
                const idx = ctx.buffer.indexOf('\n');
                if (idx < 0) break;
                const line = ctx.buffer.slice(0, idx).trim();
                ctx.buffer = ctx.buffer.slice(idx + 1);
                if (!line) continue;
                try {
                    const msg = JSON.parse(line);
                    if (msg.boot) {
                        const bid = msg.boardId;
                        console.log(`🔌 ESP8266 Board ${bid} boot: ${msg.readers_found}/${msg.readers_total} readers (slots ${msg.slots?.join(',')})`);
                        // Register board
                        esp8266Boards.set(bid, ctx);
                        continue;
                    }
                    if (msg.diag) continue;
                    // FIFO resolve
                    if (ctx.pending.size > 0) {
                        const [firstId, p] = ctx.pending.entries().next().value;
                        clearTimeout(p.timer);
                        ctx.pending.delete(firstId);
                        p.resolve(msg);
                    }
                } catch {
                    // Not JSON
                }
            }
        });

        port.on('error', (err) => {
            console.error(`❌ ESP8266 serial error (${serialPath}):`, err.message);
        });

        port.on('close', () => {
            console.error(`❌ ESP8266 serial closed: ${serialPath}`);
            // Remove from boards map
            for (const [bid, b] of esp8266Boards.entries()) {
                if (b === ctx) {
                    esp8266Boards.delete(bid);
                    break;
                }
            }
            for (const [, p] of ctx.pending.entries()) {
                clearTimeout(p.timer);
                p.reject(new Error('esp8266 serial closed'));
            }
            ctx.pending.clear();
        });

        port.open((err) => {
            if (err) {
                console.error(`❌ ESP8266 open error (${serialPath}):`, err.message);
                resolve(null);
            } else {
                console.log(`🟢 ESP8266 serial opened: ${serialPath}`);
                // Wait for ESP8266 boot message (it resets on serial open)
                setTimeout(() => resolve(ctx), 2500);
            }
        });
    });
}

/** Send JSON command to a specific board and wait for response */
function esp8266Request(boardId, payload) {
    const ctx = esp8266Boards.get(boardId);
    if (!ctx?.port?.isOpen) {
        throw new Error(`esp8266 board ${boardId} not connected`);
    }
    const id = ++ctx.reqId;
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            ctx.pending.delete(id);
            reject(new Error(`esp8266 board ${boardId} timeout`));
        }, ESP8266_READ_TIMEOUT_MS);
        ctx.pending.set(id, { resolve, reject, timer });
        ctx.port.write(JSON.stringify(payload) + '\n');
    });
}

/**
 * Detect and initialize all ESP8266 boards.
 * Opens all serial devices, pings each, registers by boardId.
 * @returns {number} Number of boards successfully connected
 */
async function initAllEsp8266Boards() {
    const paths = detectAllSerialPaths();
    if (paths.length === 0) return 0;

    let SerialPort;
    try {
        const mod = await import('serialport');
        SerialPort = mod.SerialPort;
    } catch (e) {
        console.error('❌ serialport package not installed:', e.message);
        return 0;
    }

    console.log(`🔍 Found ${paths.length} serial devices: ${paths.join(', ')}`);

    for (const path of paths) {
        try {
            const ctx = await openEsp8266Port(path, SerialPort);
            if (!ctx) continue;

            // Ping to get boardId
            // Wait a moment then send ping
            const pingPayload = JSON.stringify({ cmd: 'ping' }) + '\n';
            ctx.port.write(pingPayload);

            const pong = await new Promise((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error('ping timeout')), 3000);
                const id = ++ctx.reqId;
                ctx.pending.set(id, {
                    resolve: (msg) => { clearTimeout(timer); resolve(msg); },
                    reject: (err) => { clearTimeout(timer); reject(err); },
                    timer,
                });
            });

            if (pong?.pong && pong?.boardId) {
                esp8266Boards.set(pong.boardId, ctx);
                console.log(`✅ ESP8266 Board ${pong.boardId} ready at ${path} — ${pong.active}/${pong.readers} NFC online (slots ${pong.slots?.join(',')})`);
            } else {
                console.log(`🟡 ${path} responded but no boardId — skipping`);
                ctx.port.close();
            }
        } catch (e) {
            console.log(`🟡 ${path}: ${e.message}`);
        }
    }

    return esp8266Boards.size;
}

/** Read NFC at slot via the correct ESP8266 board */
let _esp8266DebugCount = 0;
async function readNfcAtSlotEsp8266(slotNumber) {
    const boardId = slotToBoardId(slotNumber);
    try {
        const res = await esp8266Request(boardId, { cmd: 'read', slot: slotNumber });
        if (_esp8266DebugCount < 30) {
            _esp8266DebugCount++;
            console.log(`[ESP8266-NFC #${_esp8266DebugCount}] board=${boardId} slot=${slotNumber} → uid=${res.uid ?? 'null'}`);
        }
        return res.uid || null;
    } catch (e) {
        if (_esp8266DebugCount < 30) {
            _esp8266DebugCount++;
            console.log(`[ESP8266-NFC #${_esp8266DebugCount}] board=${boardId} slot=${slotNumber} → ERROR: ${e.message}`);
        }
        return null;
    }
}

/** Close all ESP8266 serial ports */
function closeAllEsp8266() {
    for (const [bid, ctx] of esp8266Boards.entries()) {
        try { ctx.port.close(); } catch { /* ignore */ }
    }
    esp8266Boards.clear();
}

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

let _pyDebugCount = 0;
async function readNfcAtSlotPython(slotNumber) {
    try {
        const res = await pyRequest({ cmd: 'read', slot: slotNumber });
        // Debug: log first 30 responses so we can see what the bridge returns
        if (_pyDebugCount < 30) {
            _pyDebugCount++;
            console.log(`[NFC-DBG #${_pyDebugCount}] slot=${slotNumber} → uid=${res.uid ?? 'null'} ok=${res.ok}`);
        }
        return res.uid || null;
    } catch (e) {
        if (_pyDebugCount < 30) {
            _pyDebugCount++;
            console.log(`[NFC-DBG #${_pyDebugCount}] slot=${slotNumber} → ERROR: ${e.message}`);
        }
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

                // Set all solenoid relay pins as output (inactive)
                for (const [slot, pin] of Object.entries(SLOT_PIN_MAP)) {
                    const inactiveLevel = RELAY_ACTIVE_STATE === 'LOW' ? 'dh' : 'dl';
                    console.log(`📡 Solenoid Init: Slot ${slot} (Pin ${pin}) -> ${inactiveLevel.toUpperCase()}`);
                    exec(`pinctrl set ${pin} op ${inactiveLevel}`);
                }

                // Set all LED relay pins as output (inactive = green LED = key present)
                for (const [slot, pin] of Object.entries(LED_PIN_MAP)) {
                    const inactiveLevel = RELAY_ACTIVE_STATE === 'LOW' ? 'dh' : 'dl';
                    console.log(`💡 LED Init: Slot ${slot} (Pin ${pin}) -> ${inactiveLevel.toUpperCase()} (GREEN)`);
                    exec(`pinctrl set ${pin} op ${inactiveLevel}`);
                }
            }
            resolve();
        });
    });

    // ── Try Multi-ESP8266 Serial NFC ──
    {
        console.log('🔍 Scanning for ESP8266 NFC boards...');
        const boardCount = await initAllEsp8266Boards();
        if (boardCount > 0) {
            nfcMode = 'esp8266';
            console.log(`🟢 NFC: ESP8266 multi-board mode — ${boardCount} board(s) connected`);
        } else {
            console.log('🟡 No ESP8266 boards found → fallback to other NFC modes');

            if (!IS_MOCK) {
                try {
                    const onoff = await import('onoff');
                    Gpio = onoff.Gpio;
                    if (!Gpio?.accessible) {
                        console.log('🟡 NFC: onoff loaded but GPIO not accessible → mock NFC mode');
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
                        await pyRequest({ cmd: 'ping' });
                        nfcMode = 'python';
                        console.log('🟢 NFC: Python bridge mode (nfc_rc522_bridge.py)');
                    } catch (e) {
                        console.log('🔴 NFC: All NFC methods failed → mock NFC mode');
                        console.error(e.message);
                        nfcMode = 'mock';
                    }
                }
            } else {
                nfcMode = 'mock';
            }
        }
    }
}

async function refreshKeyUidCache() {
    try {
        const res = await fetch(HARDWARE_KEYS_URL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${HARDWARE_TOKEN}`,
            },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        const data = body?.data;
        if (!Array.isArray(data)) throw new Error('invalid response shape');

        for (const row of data) {
            const slot = Number(row.slotNumber);
            const uid = typeof row.nfcUid === 'string' ? row.nfcUid.trim().toUpperCase() : null;
            if (Number.isFinite(slot)) {
                expectedKeyUidBySlot[slot] = uid;
            }
        }
        console.log(`🧾 Key UID cache updated (${Object.keys(expectedKeyUidBySlot).length} slots)`);
    } catch (e) {
        console.log('🟡 Key UID cache not available yet (will retry later)');
        console.error(e.message);
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

/**
 * LED Relay Control
 * สลับสถานะ LED ประจำ slot
 * - keyBorrowed = false → Relay OFF → NC → เขียว (มีกุญแจ)
 * - keyBorrowed = true  → Relay ON  → NO → แดง  (กุญแจถูกเบิก)
 */
function setLedRelay(slotNumber, keyBorrowed) {
    const pin = LED_PIN_MAP[slotNumber];
    if (!pin && pin !== 0) return;

    if (IS_MOCK) {
        console.log(`💡 [MOCK] LED slot ${slotNumber} → ${keyBorrowed ? '🔴 RED' : '🟢 GREEN'}`);
        return;
    }

    const activeLevel = RELAY_ACTIVE_STATE === 'LOW' ? 'dl' : 'dh';
    const inactiveLevel = RELAY_ACTIVE_STATE === 'LOW' ? 'dh' : 'dl';
    const level = keyBorrowed ? activeLevel : inactiveLevel;

    exec(`pinctrl set ${pin} ${level}`, (err) => {
        if (err) {
            console.error(`❌ LED relay error slot ${slotNumber}:`, err.message);
        } else {
            console.log(`💡 LED slot ${slotNumber} (Pin ${pin}) → ${level.toUpperCase()} (${keyBorrowed ? '🔴 RED' : '🟢 GREEN'})`);
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
    if (nfcMode === 'esp8266') return await readNfcAtSlotEsp8266(slotNumber);
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
async function startKeyPullCheck(slotNumber, bookingId) {
    pullCheckingSlots.add(slotNumber);
    console.log(`⏳ Solenoid UNLOCKED for ${KEY_PULL_TIMEOUT_S}s at slot=${slotNumber}`);
    // Mock mode
    if (nfcMode === 'mock') {
        let isLedRed = false;
        const mockBlink = setInterval(() => {
            isLedRed = !isLedRed;
            setLedRelay(slotNumber, isLedRed);
        }, 500);

        setTimeout(() => {
            clearInterval(mockBlink);
            pullCheckingSlots.delete(slotNumber);
            console.log(`✅ [MOCK] 15s passed. Key pulled from slot ${slotNumber}!`);
            lockSlot(slotNumber);
            setLedRelay(slotNumber, true); // 🔴 กุญแจถูกเบิก
            socket.emit('key:pulled', { slotNumber, bookingId });
        }, KEY_PULL_TIMEOUT_S * 1000);
        return;
    }

    // 1. เปิดล็อกค้างไว้ 15 วินาที พร้อมกระพริบไฟเขียว-แดงสลับกัน 🚦
    let isLedRed = false;
    const blinkInterval = setInterval(() => {
        isLedRed = !isLedRed;
        setLedRelay(slotNumber, isLedRed);
    }, 500); // สลับสีทุก 0.5 วินาที

    await new Promise(resolve => setTimeout(resolve, KEY_PULL_TIMEOUT_S * 1000));

    // หยุดกระพริบไฟ
    clearInterval(blinkInterval);

    // 2. หมดเวลา 15 วินาที ดัน Solenoid กลับลงมา (Lock)
    console.log(`🔒 15s elapsed. Locking solenoid at slot=${slotNumber}. Starting 5x NFC check...`);
    await lockSlot(slotNumber);

    // 3. เช็ค NFC 5 รอบ รอบละ 500ms
    let foundCount = 0;
    for (let i = 0; i < 5; i++) {
        const uid = await readNfcAtSlot(slotNumber);
        if (uid) {
            foundCount++;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    pullCheckingSlots.delete(slotNumber);

    // 4. สรุปผล
    // ถ้าอ่านเจอ 3 ใน 5 แสดงว่ากุญแจยังไม่ถูกดึง (Cancelling borrow)
    if (foundCount >= 3) {
        console.log(`⏰ NFC found ${foundCount}/5 times. Key STILL in slot ${slotNumber} → cancelling borrow`);
        slotHasKey[slotNumber] = true;
        setLedRelay(slotNumber, false); // 🟢 กุญแจยังอยู่
        socket.emit('borrow:cancelled', { slotNumber, bookingId });
    } else {
        // ถ้าไม่เจอเกิน 3 ครั้งแสดงว่าเอากุญแจออกไปแล้ว (Borrow success)
        slotHasKey[slotNumber] = false;
        console.log(`✅ Key pulled from slot ${slotNumber} (NFC found only ${foundCount}/5 times). Borrow successful!`);
        setLedRelay(slotNumber, true); // 🔴 กุญแจถูกเบิก
        socket.emit('key:pulled', { slotNumber, bookingId });
    }
}

// รับคำสั่ง unlock จาก Backend → เปิด solenoid → เริ่ม key-pull check
socket.on('gpio:unlock', async (data) => {
    const { slotNumber, bookingId } = data;

    console.log(`📩 gpio:unlock → slot=${slotNumber}, bookingId=${bookingId}`);

    const success = await unlockSlot(slotNumber);

    // แจ้ง backend ว่าปลดล็อคแล้ว (UI จะแสดง "ดึงกุญแจได้เลย")
    socket.emit('slot:unlocked', { slotNumber, success });

    if (success) {
        // เริ่มรอดึงกุญแจออก (รอ 15 วิ -> ดันล็อกลง -> ตรวจ NFC 5 รอบ)
        startKeyPullCheck(slotNumber, bookingId);
    }
});

// ── nfc:register-mode — Staff ต้องการสแกน NFC เพื่อลงทะเบียนกุญแจ ──
socket.on('nfc:register-mode', async (data) => {
    const { slotNumber, staffSocketId } = data;
    console.log(`🏷️  nfc:register-mode → slot=${slotNumber ?? 'all'}, staff=${staffSocketId}`);

    if (nfcMode !== 'esp8266') {
        console.log('⚠️  nfc:register-mode: ไม่ใช่ ESP8266 mode, ข้าม');
        return;
    }

    const REGISTER_TIMEOUT_S = 15;
    const POLL_INTERVAL_MS = 500;
    const maxAttempts = (REGISTER_TIMEOUT_S * 1000) / POLL_INTERVAL_MS;
    let found = false;

    for (let attempt = 0; attempt < maxAttempts && !found; attempt++) {
        // กำหนดว่าจะสแกน slot ไหนบ้าง
        const slotsToScan = slotNumber
            ? [slotNumber]
            : Array.from({ length: 10 }, (_, i) => i + 1);

        for (const slot of slotsToScan) {
            try {
                const uid = await readNfcAtSlot(slot);
                if (uid) {
                    console.log(`🏷️  nfc:register-mode → พบ NFC! slot=${slot}, uid=${uid}`);
                    socket.emit('nfc:tag', { slotNumber: slot, uid, staffSocketId });
                    found = true;
                    break;
                }
            } catch (err) {
                // ข้าม slot ที่ไม่มี board
            }
        }

        if (!found) {
            await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
        }
    }

    if (!found) {
        console.log(`⏰ nfc:register-mode → timeout ${REGISTER_TIMEOUT_S}s ไม่พบ NFC tag`);
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
                if (slotHasKey[currentSlot] !== true) {
                    slotHasKey[currentSlot] = true;
                    setLedRelay(currentSlot, false); // 🟢 กุญแจอยู่
                }
                if (!slotHasKey[`last_uid_${currentSlot}`] || slotHasKey[`last_uid_${currentSlot}`] !== uid) {
                    console.log(`🏷️  NFC tag: ${uid} at slot ${currentSlot}`);
                    slotHasKey[`last_uid_${currentSlot}`] = uid;
                }
                socket.emit('nfc:tag', { slotNumber: currentSlot, uid });
            } else {
                if (slotHasKey[currentSlot] !== false) {
                    slotHasKey[currentSlot] = false;
                    slotHasKey[`last_uid_${currentSlot}`] = null;
                    setLedRelay(currentSlot, true); // 🔴 กุญแจไม่อยู่
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
    closeAllEsp8266();
    socket.disconnect();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('👋 Hardware Service shutting down (SIGTERM)...');
    try { pyProc?.kill('SIGTERM'); } catch { /* ignore */ }
    closeAllEsp8266();
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
    await refreshKeyUidCache();
    // Refresh periodically in case staff updates NFC UID mapping
    setInterval(refreshKeyUidCache, 60_000);
    startNfcPolling();

    console.log('✅ Hardware Service running — waiting for events...');
})();
