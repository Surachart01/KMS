/**
 * test_nfc_claude.cjs — Test 10× RC522 NFC readers on Raspberry Pi 5
 * Single SPI bus (/dev/spidev0.0), 10× software CS (GPIO).
 * Uses node-libgpiod (character device) so GPIO works on RPi 5 where
 * legacy sysfs /sys/class/gpio is disabled or returns EINVAL.
 *
 * Pin connections (do not change):
 * ─────────────────────────────────────────────────────────────────
 * SPI (shared busbar):
 *   MOSI : GPIO10 (Pin 19)
 *   MISO : GPIO9  (Pin 21)
 *   SCK  : GPIO11 (Pin 23)
 *   RST  : GPIO7  (Pin 25) — shared, all readers
 *   VCC  : 3.3V, GND : GND
 *
 * CS (SDA) per reader:
 *   Reader #1  : GPIO4   (Pin 7)
 *   Reader #2  : GPIO5   (Pin 29)
 *   Reader #3  : GPIO6   (Pin 31)
 *   Reader #4  : GPIO12  (Pin 32)
 *   Reader #5  : GPIO13  (Pin 33)
 *   Reader #6  : GPIO16  (Pin 36)
 *   Reader #7  : GPIO19  (Pin 35)
 *   Reader #8  : GPIO20  (Pin 38)
 *   Reader #9  : GPIO21  (Pin 40)
 *   Reader #10 : GPIO26  (Pin 37)
 * ─────────────────────────────────────────────────────────────────
 *
 * Prereqs on RPi: sudo apt install build-essential gpiod libgpiod2 libgpiod-dev
 * Run: node test_nfc_claude.cjs   (or sudo if /dev/gpiochip* not in your group)
 */

const spi = require('spi-device');
const { Chip, Line } = require('node-libgpiod');

// ─── Constants ────────────────────────────────────────────────────
const SPI_BUS = 0;
const SPI_DEVICE = 0;
const SPI_MODE = spi.MODE0;
const SPI_SPEED_HZ = 1000000;

const RST_GPIO = 7;   // Pin 25, shared

const CS_MAP = [
  { reader: 1, gpio: 4,  pin: 7 },
  { reader: 2, gpio: 5,  pin: 29 },
  { reader: 3, gpio: 6,  pin: 31 },
  { reader: 4, gpio: 12, pin: 32 },
  { reader: 5, gpio: 13, pin: 33 },
  { reader: 6, gpio: 16, pin: 36 },
  { reader: 7, gpio: 19, pin: 35 },
  { reader: 8, gpio: 20, pin: 38 },
  { reader: 9, gpio: 21, pin: 40 },
  { reader: 10, gpio: 26, pin: 37 },
];

// RC522 registers
const REG_COMMAND    = 0x01;
const REG_COM_IRQ    = 0x04;
const REG_FIFO_DATA  = 0x09;
const REG_FIFO_LEVEL = 0x0A;
const REG_BIT_FRAMING = 0x0D;
const REG_VERSION   = 0x37;

const CMD_IDLE       = 0x00;
const CMD_TRANSCEIVE = 0x0C;
const REQA           = 0x26;
const SEL_CMD        = 0x93;
const NVB            = 0x20;
const COM_IRQ_IRQ    = 0x20; // bit 5 = IdleIrq

const VERSION_OK = [0x91, 0x92];

// ─── Globals (set during init, used in cleanup) ────────────────────
let spiDev = null;
let gpioChip = null;  // keep ref so Line instances are not GC'd
let csPins = [];      // Line instances (libgpiod)
let rstPin = null;

// ─── Helpers ──────────────────────────────────────────────────────

function spiTransfer(spiDev, sendBuf, receiveLen) {
  const recv = receiveLen != null ? Buffer.alloc(receiveLen) : Buffer.alloc(sendBuf.length);
  return new Promise((resolve, reject) => {
    const transfer = [{
      sendBuffer: sendBuf,
      receiveBuffer: recv,
      byteLength: sendBuf.length,
      speedHz: SPI_SPEED_HZ,
    }];
    spiDev.transfer(transfer, (err) => {
      if (err) return reject(err);
      resolve(recv);
    });
  });
}

function csLow(line) {
  line.setValue(0);
}

function csHigh(line) {
  line.setValue(1);
}

function readReg(spiDev, csGpio, reg) {
  const addrRead = ((reg << 1) & 0x7E) | 0x80;
  const sendBuf = Buffer.from([addrRead, 0x00]);
  return new Promise((resolve, reject) => {
    csLow(csGpio);
    const recv = Buffer.alloc(2);
    const transfer = [{
      sendBuffer: sendBuf,
      receiveBuffer: recv,
      byteLength: 2,
      speedHz: SPI_SPEED_HZ,
    }];
    spiDev.transfer(transfer, (err) => {
      csHigh(csGpio);
      if (err) return reject(err);
      resolve(recv[1]);
    });
  });
}

function writeReg(spiDev, csGpio, reg, value) {
  const addrWrite = (reg << 1) & 0x7E;
  const sendBuf = Buffer.from([addrWrite, value]);
  return new Promise((resolve, reject) => {
    csLow(csGpio);
    const recv = Buffer.alloc(2);
    const transfer = [{
      sendBuffer: sendBuf,
      receiveBuffer: recv,
      byteLength: 2,
      speedHz: SPI_SPEED_HZ,
    }];
    spiDev.transfer(transfer, (err) => {
      csHigh(csGpio);
      if (err) return reject(err);
      resolve();
    });
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function timestamp() {
  const d = new Date();
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  const s = d.getSeconds().toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

// ─── Init: open SPI, init CS and RST ───────────────────────────────

function openSpi() {
  try {
    spiDev = spi.openSync(SPI_BUS, SPI_DEVICE, {
      mode: SPI_MODE,
      maxSpeedHz: SPI_SPEED_HZ,
    });
  } catch (err) {
    console.error('Failed to open SPI device:', err.message);
    console.error('Ensure SPI is enabled: sudo raspi-config → Interface Options → SPI → Enable');
    console.error('Then reboot and check: ls /dev/spi*');
    process.exit(1);
  }
}

function initGpio() {
  try {
    gpioChip = new Chip(0);
    rstPin = new Line(gpioChip, RST_GPIO);
    rstPin.requestOutputMode();
    rstPin.setValue(1);

    for (const { gpio } of CS_MAP) {
      const line = new Line(gpioChip, gpio);
      line.requestOutputMode();
      line.setValue(1);
      csPins.push(line);
    }
  } catch (err) {
    console.error('Failed to open GPIO (libgpiod):', err.message);
    console.error('Install: sudo apt install build-essential gpiod libgpiod2 libgpiod-dev');
    console.error('Then: npm install (node-libgpiod). You may need: sudo node test_nfc_claude.cjs');
    process.exit(1);
  }
}

// ─── Version check per reader ─────────────────────────────────────

async function readVersion(readerIndex) {
  const { reader, gpio, pin } = CS_MAP[readerIndex];
  const csGpio = csPins[readerIndex];
  const v = await readReg(spiDev, csGpio, REG_VERSION);
  const ok = VERSION_OK.includes(v);
  const padN = reader.toString().padStart(2);
  const padGpio = `GPIO${gpio}`.padEnd(6);
  const padPin = `Pin ${pin}`.padEnd(6);
  console.log(`Reader #${padN}  | ${padGpio} | ${padPin} | Version: 0x${v.toString(16).toUpperCase().padStart(2, '0')} | ${ok ? 'OK' : 'FAIL'}`);
  return ok;
}

// ─── Poll: card present + anti-collision UID ────────────────────────

async function isCardPresent(csGpio) {
  await writeReg(spiDev, csGpio, REG_BIT_FRAMING, 0x7F);
  await writeReg(spiDev, csGpio, REG_COMMAND, CMD_TRANSCEIVE);
  await writeReg(spiDev, csGpio, REG_FIFO_DATA, REQA);
  await delay(10);
  const irq = await readReg(spiDev, csGpio, REG_COM_IRQ);
  return (irq & COM_IRQ_IRQ) !== 0;
}

async function getUid(csGpio) {
  await writeReg(spiDev, csGpio, REG_COMMAND, CMD_IDLE);
  await writeReg(spiDev, csGpio, REG_FIFO_LEVEL, 0x80); // Flush FIFO (0x80 = flush)
  await writeReg(spiDev, csGpio, REG_FIFO_DATA, SEL_CMD);
  await writeReg(spiDev, csGpio, REG_FIFO_DATA, NVB);
  await writeReg(spiDev, csGpio, REG_COMMAND, CMD_TRANSCEIVE);
  await delay(10);

  const level = await readReg(spiDev, csGpio, REG_FIFO_LEVEL);
  if (level === 0 || level > 16) return null;

  const bytes = [];
  for (let i = 0; i < level; i++) {
    const b = await readReg(spiDev, csGpio, REG_FIFO_DATA);
    bytes.push(b);
  }
  // UID is typically first 4 bytes (or 7 for double-size); use first 4 for display
  const uidBytes = bytes.slice(0, 4);
  return uidBytes.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// ─── Cleanup ─────────────────────────────────────────────────────

function shutdown() {
  console.log('\nShutting down...');
  try {
    if (csPins.length) {
      for (const line of csPins) {
        try { line.release(); } catch (_) {}
      }
      csPins = [];
    }
    if (rstPin) {
      try { rstPin.release(); } catch (_) {}
      rstPin = null;
    }
    gpioChip = null;
    if (spiDev) {
      try { spiDev.closeSync(); } catch (_) {}
      spiDev = null;
    }
  } catch (e) {
    console.error(e);
  }
  console.log('Done.');
  process.exit(0);
}

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  console.log('=== RC522 NFC Reader Test — RPi5 ===');
  console.log('Initializing readers...\n');

  openSpi();
  initGpio();

  const enabled = [];
  for (let i = 0; i < CS_MAP.length; i++) {
    try {
      const ok = await readVersion(i);
      enabled.push(ok);
    } catch (err) {
      const { reader, gpio, pin } = CS_MAP[i];
      const padN = reader.toString().padStart(2);
      const padGpio = `GPIO${gpio}`.padEnd(6);
      const padPin = `Pin ${pin}`.padEnd(6);
      console.log(`Reader #${padN}  | ${padGpio} | ${padPin} | Error: ${err.message} | FAIL`);
      enabled.push(false);
    }
    await delay(50);
  }

  const count = enabled.filter(Boolean).length;
  console.log(`\nEnabled: ${count}/${CS_MAP.length} readers`);
  console.log('--- Waiting for NFC cards (Ctrl+C to exit) ---\n');

  process.on('SIGINT', shutdown);

  while (true) {
    for (let i = 0; i < CS_MAP.length; i++) {
      if (!enabled[i]) continue;
      const { reader, gpio } = CS_MAP[i];
      const csGpio = csPins[i];
      try {
        const present = await isCardPresent(csGpio);
        if (present) {
          const uid = await getUid(csGpio);
          if (uid) {
            console.log(`[${timestamp()}] Reader #${reader.toString().padStart(2)}  (GPIO${gpio.toString().padStart(2)}) → UID: ${uid}`);
          }
        }
      } catch (_) {
        // ignore single-read errors during poll
      }
    }
    await delay(200);
  }
}

main().catch((err) => {
  console.error(err);
  shutdown();
});
