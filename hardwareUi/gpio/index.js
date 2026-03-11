/**
 * GPIO Service — Node.js process on Raspberry Pi
 * เชื่อมต่อ backend ผ่าน Socket.IO
 * รับคำสั่ง gpio:unlock → ควบคุม solenoid → ส่ง slot:unlocked กลับ
 */
import { io } from 'socket.io-client';
import dotenv from 'dotenv';

dotenv.config();

const BACKEND_URL = process.env.BACKEND_URL || 'http://172.20.10.3:4556';
const UNLOCK_DURATION_MS = 5000; // default 5 วินาที

// ── GPIO Pin Mapping (BCM) ──
// slot 1 → GPIO 17, slot 2 → GPIO 27, slot 3 → GPIO 22, etc.
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

// ── Detect if running on Raspberry Pi ──
let Gpio = null;
let IS_MOCK = true;

try {
    const onoff = await import('onoff');
    Gpio = onoff.Gpio;
    // Check if GPIO is accessible
    if (Gpio.accessible) {
        IS_MOCK = false;
        console.log('🟢 GPIO: Running on Raspberry Pi (real mode)');
    } else {
        console.log('🟡 GPIO: onoff loaded but GPIO not accessible (mock mode)');
    }
} catch (e) {
    console.log('🟡 GPIO: onoff not available — running in mock mode');
}

// ── Unlock solenoid ──
// ── Unlock solenoid ──
async function unlockSlot(slotNumber, durationMs) {
    const pin = SLOT_PIN_MAP[slotNumber];
    if (!pin) {
        console.error(`❌ Unknown slot: ${slotNumber}`);
        return false; // Fail immediately
    }

    console.log(`🔓 Unlocking slot ${slotNumber} (GPIO ${pin}) for ${durationMs}ms`);

    // Logic: Set HIGH -> Emit Success -> Wait -> Set LOW

    if (IS_MOCK) {
        console.log(`✅ [MOCK] Slot ${slotNumber} set to HIGH`);
        // In mock mode, we just return true immediately to signal "unlocked"
        // But we should simulate the auto-relock in background
        setTimeout(() => {
            console.log(`🔒 [MOCK] Slot ${slotNumber} set to LOW (Auto-relock)`);
        }, durationMs);
        return true;
    }

    // Real GPIO mode
    try {
        const gpio = new Gpio(pin, 'out');
        gpio.writeSync(1); // HIGH = solenoid open
        console.log(`✅ Slot ${slotNumber} set to HIGH`);

        // Set timer to close it later (detached from return)
        setTimeout(() => {
            try {
                gpio.writeSync(0); // LOW = solenoid close
                gpio.unexport();
                console.log(`🔒 Slot ${slotNumber} set to LOW`);
            } catch (err) {
                console.error(`❌ Error closing slot ${slotNumber}:`, err.message);
            }
        }, durationMs);

        return true; // Return success immediately after opening
    } catch (err) {
        console.error(`❌ GPIO error for slot ${slotNumber}:`, err.message);
        return false;
    }
}

// ... (Socket connection lines 77-96 remain unchanged) ...

// ── Listen for unlock commands ──
socket.on('gpio:unlock', async (data) => {
    const { slotNumber, duration } = data;
    const durationMs = (duration || UNLOCK_DURATION_MS / 1000) * 1000;

    console.log(`📩 Received gpio:unlock: slot=${slotNumber}, duration=${durationMs}ms`);

    // unlockSlot now returns immediately after setting HIGH
    const success = await unlockSlot(slotNumber, durationMs);

    // Emit 'slot:unlocked' immediately so UI shows "Pull key" while it's active
    socket.emit('slot:unlocked', {
        slotNumber,
        success,
    });
});

// ── Graceful shutdown ──
process.on('SIGINT', () => {
    console.log('\n👋 GPIO Service shutting down...');
    socket.disconnect();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('👋 GPIO Service terminated');
    socket.disconnect();
    process.exit(0);
});

console.log('⚡ GPIO Service started — waiting for commands...');
