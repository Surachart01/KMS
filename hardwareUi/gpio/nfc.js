/**
 * NFC Service — Handle 10 MFRC522 Readers via SPI + GPIO Chip Selects
 * 
 * Logic:
 * 1. Cycle through slots 1-10
 * 2. Activate CS pin for current slot (Low)
 * 3. Read UID from MFRC522
 * 4. Deactivate CS pin (High)
 * 5. If UID found → Emit 'nfc:tag' event with { slotNumber, uid }
 */
import { io } from 'socket.io-client';
import dotenv from 'dotenv';

dotenv.config();

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4556';
const POLLING_INTERVAL_MS = 200; // Check loop delay

// ── GPIO Chip Select Mapping (BCM) ──
// Map Slot 1..10 to GPIO Pins for CS (SDA)
const SLOT_CS_MAP = {
    1: 5,   // Example GPIO 5
    2: 6,   // Example GPIO 6
    3: 13,
    4: 19,
    5: 26,
    6: 12,
    7: 16,
    8: 20,
    9: 21,
    10: 24 // Note: Check overlaps with Solenoid map!
};

// Note: Solenoid map in index.js uses: 17, 27, 22, 23, 24, 25
// Warning: GPIO 24 is duplicated in my example example! 
// Valid BCM pins on RPi 4/5: 2,3,4,17,27,22,10,9,11,0,5,6,13,19,26,14,15,18,23,24,25,8,7,1,12,16,20,21
// SPI0 uses: 10(MOSI), 9(MISO), 11(SCK), 8(CE0 - unused here), 7(CE1 - unused here)
// Solenoids (6 slots): 17, 27, 22, 23, 24, 25
// Available for NFC CS (need 10): 
// 0, 1 (Reserved EEPROM?) -> Avoid
// 2, 3 (I2C) -> Can use as GPIO if not using I2C
// 5, 6, 13, 19, 26, 12, 16, 20, 21, 4
// Let's re-map safely.

const SAFE_CS_MAP = {
    1: 4,
    2: 5,
    3: 6,
    4: 12,
    5: 13,
    6: 16,
    7: 19,
    8: 20,
    9: 21,
    10: 26
};

let Gpio = null;
let Mfrc522 = null; // Mock or Real library
let IS_MOCK = true;

// ── Setup Socket ──
const socket = io(BACKEND_URL, {
    reconnection: true,
    reconnectionDelay: 2000
});

socket.on('connect', () => {
    console.log(`✅ NFC Service connected to backend: ${socket.id}`);
});

// ── Hardware Setup ──
async function setupHardware() {
    try {
        const onoff = await import('onoff');
        Gpio = onoff.Gpio;
        // Try to import mfrc522-rpi or similar
        // For now, let's assume valid mock if library missing
        // const Mfrc522Lib = await import('mfrc522-rpi'); 
        // Mfrc522 = new Mfrc522Lib();

        if (Gpio.accessible) {
            IS_MOCK = false;
            console.log('🟢 NFC: Running on Raspberry Pi (SPI + GPIO)');
        }
    } catch (e) {
        console.log('🟡 NFC: Hardware libraries not found — using MOCK mode');
    }
}

// ── Polling Loop ──
async function startPolling() {
    if (IS_MOCK) {
        console.log('🧪 Starting Mock NFC Polling (Simulating random scans)...');
        // Mock loop
        setInterval(() => {
            // Randomly simulate a tag read sometimes
            if (Math.random() < 0.05) { // 5% change every tick
                const mockSlot = Math.floor(Math.random() * 10) + 1;
                const mockUid = 'DEADBEEF' + mockSlot;
                console.log(`🏷️ [MOCK] Read Tag: ${mockUid} at Slot ${mockSlot}`);
                socket.emit('key:returned', { slotNumber: mockSlot, uid: mockUid });
                // Note: 'key:returned' event logic should be handled in backend
                // Or maybe 'nfc:tag' and let backend decide logic?
                // Returning a key usually implies "Key Tag" detected in "Slot".
            }
        }, 1000);
        return;
    }

    // Real Hardware Loop
    console.log('🟢 Starting Real NFC Polling...');

    // Setup CS Pins
    const csPins = {};
    for (const [slot, pin] of Object.entries(SAFE_CS_MAP)) {
        csPins[slot] = new Gpio(pin, 'out');
        csPins[slot].writeSync(1); // Set High (Inactive)
    }

    // Loop
    let currentSlot = 1;
    setInterval(() => {
        // 1. Activate CS for currentSlot
        const cs = csPins[currentSlot];
        cs.writeSync(0); // Low = Active

        // 2. Read from SPI (Shared Bus)
        try {
            // Logic depends on library. 
            // Usually: mfrc522.findCard() -> mfrc522.getUid()
            // Placeholder for actual library call:
            // const response = Mfrc522.findCard();
            // if (response.status) { ... getUid ... }
        } catch (err) {
            // Ignore errors (no card)
        }

        // 3. Deactivate CS
        cs.writeSync(1); // High = Inactive

        // 4. Next slot
        currentSlot++;
        if (currentSlot > 10) currentSlot = 1;

    }, POLLING_INTERVAL_MS / 10); // Check 10 slots per interval? Or fast cycle?
}

// ── Main ──
(async () => {
    await setupHardware();
    startPolling();
})();
