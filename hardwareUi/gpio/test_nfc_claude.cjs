'use strict';
/**
 * test_nfc_claude.cjs — Test 10× RC522 NFC readers on Raspberry Pi 5
 * Single SPI bus (/dev/spidev0.0), software CS via Python lgpio co-process.
 *
 * RPi 5 dropped legacy sysfs GPIO (/sys/class/gpio), so onoff / node-libgpiod
 * do not work. Instead we spawn a tiny Python helper that uses lgpio (the RPi
 * Foundation's recommended library, pre-installed on RPi OS Bookworm).
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
 * Prereqs:
 *   sudo apt install python3-lgpio   (usually pre-installed on RPi OS)
 *   npm install spi-device            (in this folder)
 *
 * Run:  sudo node test_nfc_claude.cjs
 */

const spi = require('spi-device');
const { spawn } = require('child_process');

// ─── SPI Constants ────────────────────────────────────────────────
const SPI_BUS = 0;
const SPI_DEVICE = 0;
const SPI_SPEED_HZ = 1000000; // 1 MHz

// ─── GPIO Constants ───────────────────────────────────────────────
const RST_GPIO = 7;

const CS_MAP = [
  { reader: 1,  gpio: 4,  pin: 7 },
  { reader: 2,  gpio: 5,  pin: 29 },
  { reader: 3,  gpio: 6,  pin: 31 },
  { reader: 4,  gpio: 12, pin: 32 },
  { reader: 5,  gpio: 13, pin: 33 },
  { reader: 6,  gpio: 16, pin: 36 },
  { reader: 7,  gpio: 19, pin: 35 },
  { reader: 8,  gpio: 20, pin: 38 },
  { reader: 9,  gpio: 21, pin: 40 },
  { reader: 10, gpio: 26, pin: 37 },
];

// Python index 0-9 = CS for reader 1-10, index 10 = RST
const RST_INDEX = CS_MAP.length; // 10

// ─── RC522 Registers ──────────────────────────────────────────────
const REG_COMMAND     = 0x01;
const REG_COM_IRQ     = 0x04;
const REG_FIFO_DATA   = 0x09;
const REG_FIFO_LEVEL  = 0x0A;
const REG_BIT_FRAMING = 0x0D;
const REG_VERSION     = 0x37;

const CMD_IDLE        = 0x00;
const CMD_TRANSCEIVE  = 0x0C;
const REQA            = 0x26;
const SEL_CMD         = 0x93;
const NVB             = 0x20;
const COM_IRQ_RX_DONE = 0x20; // bit 5

const VERSION_OK = [0x91, 0x92];

// ─── Embedded Python GPIO helper ──────────────────────────────────
// Uses lgpio (character-device GPIO) which works on RPi 5.
// Protocol: Node writes "<pinIndex><0|1>\n", Python sets GPIO and replies "K\n".
const PY_GPIO_HELPER = `
import sys

try:
    import lgpio
except ImportError:
    sys.stderr.write("ERROR: python3-lgpio not found.\\n")
    sys.stderr.write("Install: sudo apt install python3-lgpio\\n")
    sys.stderr.flush()
    sys.exit(1)

CS  = [4, 5, 6, 12, 13, 16, 19, 20, 21, 26]
RST = 7
ALL = CS + [RST]

try:
    h = lgpio.gpiochip_open(0)
except Exception as e:
    sys.stderr.write("ERROR: Cannot open /dev/gpiochip0: " + str(e) + "\\n")
    sys.stderr.write("Try: sudo node test_nfc_claude.cjs\\n")
    sys.stderr.flush()
    sys.exit(1)

for g in ALL:
    lgpio.gpio_claim_output(h, g, 1)

sys.stdout.write("READY\\n")
sys.stdout.flush()

for raw in sys.stdin:
    cmd = raw.strip()
    if cmd == "Q":
        break
    if len(cmd) >= 2:
        try:
            idx = int(cmd[:-1])
            val = int(cmd[-1])
            if 0 <= idx < len(ALL):
                lgpio.gpio_write(h, ALL[idx], val)
        except Exception:
            pass
    sys.stdout.write("K\\n")
    sys.stdout.flush()

for g in ALL:
    try:
        lgpio.gpio_free(h, g)
    except Exception:
        pass
lgpio.gpiochip_close(h)
`;

// ─── Globals ──────────────────────────────────────────────────────
let spiDev = null;
let pyProc = null;
let pyBuffer = '';
let gpioResolve = null;

// ─── Python GPIO helper management ───────────────────────────────

function startGpioHelper() {
  return new Promise((resolve, reject) => {
    pyProc = spawn('python3', ['-u', '-c', PY_GPIO_HELPER], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let started = false;
    let stderrBuf = '';

    pyProc.stderr.on('data', (chunk) => {
      stderrBuf += chunk.toString();
    });

    pyProc.stdout.on('data', (chunk) => {
      pyBuffer += chunk.toString();
      if (!started) {
        const idx = pyBuffer.indexOf('READY\n');
        if (idx !== -1) {
          pyBuffer = pyBuffer.slice(idx + 6);
          started = true;
          resolve();
          return;
        }
      }
      drainGpioBuffer();
    });

    pyProc.on('close', (code) => {
      if (!started) {
        reject(new Error(
          stderrBuf.trim() || 'GPIO helper exited with code ' + code
        ));
      }
    });

    setTimeout(() => {
      if (!started) {
        pyProc.kill();
        reject(new Error(
          'GPIO helper timed out.\n' + stderrBuf.trim()
        ));
      }
    }, 5000);
  });
}

function drainGpioBuffer() {
  while (true) {
    const idx = pyBuffer.indexOf('\n');
    if (idx === -1) break;
    const line = pyBuffer.slice(0, idx).trim();
    pyBuffer = pyBuffer.slice(idx + 1);
    if (line === 'K' && gpioResolve) {
      const r = gpioResolve;
      gpioResolve = null;
      r();
    }
  }
}

function gpioSet(pinIndex, value) {
  return new Promise((resolve) => {
    gpioResolve = resolve;
    pyProc.stdin.write(pinIndex + '' + value + '\n');
  });
}

function csLow(csIndex) {
  return gpioSet(csIndex, 0);
}

function csHigh(csIndex) {
  return gpioSet(csIndex, 1);
}

// ─── SPI helpers ──────────────────────────────────────────────────

function spiTransfer(dev, sendBuf) {
  return new Promise((resolve, reject) => {
    const recv = Buffer.alloc(sendBuf.length);
    dev.transfer([{
      sendBuffer: sendBuf,
      receiveBuffer: recv,
      byteLength: sendBuf.length,
      speedHz: SPI_SPEED_HZ,
    }], (err) => {
      if (err) return reject(err);
      resolve(recv);
    });
  });
}

async function readReg(dev, csIndex, reg) {
  const addr = ((reg << 1) & 0x7E) | 0x80;
  await csLow(csIndex);
  const recv = await spiTransfer(dev, Buffer.from([addr, 0x00]));
  await csHigh(csIndex);
  return recv[1];
}

async function writeReg(dev, csIndex, reg, value) {
  const addr = (reg << 1) & 0x7E;
  await csLow(csIndex);
  await spiTransfer(dev, Buffer.from([addr, value]));
  await csHigh(csIndex);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function timestamp() {
  const d = new Date();
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => n.toString().padStart(2, '0'))
    .join(':');
}

// ─── Open SPI ─────────────────────────────────────────────────────

function openSpi() {
  try {
    spiDev = spi.openSync(SPI_BUS, SPI_DEVICE, {
      mode: spi.MODE0,
      maxSpeedHz: SPI_SPEED_HZ,
    });
  } catch (err) {
    console.error('Failed to open /dev/spidev0.0:', err.message);
    console.error('Ensure SPI is enabled: sudo raspi-config → Interface Options → SPI → Enable');
    console.error('Then reboot and verify: ls /dev/spi*');
    process.exit(1);
  }
}

// ─── Version check per reader ─────────────────────────────────────

async function readVersion(idx) {
  const { reader, gpio, pin } = CS_MAP[idx];
  const v = await readReg(spiDev, idx, REG_VERSION);
  const ok = VERSION_OK.includes(v);
  const col1 = ('Reader #' + reader).padEnd(11);
  const col2 = ('GPIO' + gpio).padEnd(6);
  const col3 = ('Pin ' + pin).padEnd(6);
  const col4 = '0x' + v.toString(16).toUpperCase().padStart(2, '0');
  console.log(`${col1} | ${col2} | ${col3} | Version: ${col4} | ${ok ? 'OK' : 'FAIL'}`);
  return ok;
}

// ─── Card detect + anti-collision UID ────────────────────────────

async function isCardPresent(csIndex) {
  await writeReg(spiDev, csIndex, REG_BIT_FRAMING, 0x07);
  await writeReg(spiDev, csIndex, REG_COMMAND, CMD_IDLE);
  await writeReg(spiDev, csIndex, REG_FIFO_LEVEL, 0x80); // flush FIFO
  await writeReg(spiDev, csIndex, REG_FIFO_DATA, REQA);
  await writeReg(spiDev, csIndex, REG_BIT_FRAMING, 0x87); // start tx (bit 7)
  await writeReg(spiDev, csIndex, REG_COMMAND, CMD_TRANSCEIVE);
  await delay(10);
  const irq = await readReg(spiDev, csIndex, REG_COM_IRQ);
  return (irq & COM_IRQ_RX_DONE) !== 0;
}

async function getUid(csIndex) {
  await writeReg(spiDev, csIndex, REG_COMMAND, CMD_IDLE);
  await writeReg(spiDev, csIndex, REG_FIFO_LEVEL, 0x80); // flush FIFO
  await writeReg(spiDev, csIndex, REG_BIT_FRAMING, 0x00);
  await writeReg(spiDev, csIndex, REG_FIFO_DATA, SEL_CMD);
  await writeReg(spiDev, csIndex, REG_FIFO_DATA, NVB);
  await writeReg(spiDev, csIndex, REG_COMMAND, CMD_TRANSCEIVE);
  await delay(10);

  const level = await readReg(spiDev, csIndex, REG_FIFO_LEVEL);
  if (level === 0 || level > 16) return null;

  const bytes = [];
  for (let i = 0; i < level; i++) {
    bytes.push(await readReg(spiDev, csIndex, REG_FIFO_DATA));
  }
  return bytes
    .slice(0, 4)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

// ─── Cleanup ──────────────────────────────────────────────────────

function shutdown() {
  console.log('\nShutting down...');
  try {
    if (pyProc) {
      pyProc.stdin.write('Q\n');
      pyProc.stdin.end();
      pyProc = null;
    }
  } catch (_) {}
  try {
    if (spiDev) { spiDev.closeSync(); spiDev = null; }
  } catch (_) {}
  console.log('Done.');
  process.exit(0);
}

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  console.log('=== RC522 NFC Reader Test — RPi5 ===');
  console.log('Initializing readers...\n');

  openSpi();

  try {
    await startGpioHelper();
  } catch (err) {
    console.error('GPIO init failed:', err.message);
    process.exit(1);
  }

  const enabled = [];
  for (let i = 0; i < CS_MAP.length; i++) {
    try {
      const ok = await readVersion(i);
      enabled.push(ok);
    } catch (err) {
      const { reader, gpio, pin } = CS_MAP[i];
      const col1 = ('Reader #' + reader).padEnd(11);
      const col2 = ('GPIO' + gpio).padEnd(6);
      const col3 = ('Pin ' + pin).padEnd(6);
      console.log(`${col1} | ${col2} | ${col3} | Error    | FAIL`);
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
      try {
        if (await isCardPresent(i)) {
          const uid = await getUid(i);
          if (uid) {
            const rdr = ('#' + reader).padStart(3);
            const gpioStr = ('GPIO' + gpio).padStart(6);
            console.log(`[${timestamp()}] Reader ${rdr}  (${gpioStr}) → UID: ${uid}`);
          }
        }
      } catch (_) {}
ดรป    }
    await delay(200);
  }
}

main().catch((err) => {
  console.error(err);
  shutdown();
});
