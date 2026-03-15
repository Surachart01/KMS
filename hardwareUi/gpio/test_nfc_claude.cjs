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
const REG_COMMAND      = 0x01;
const REG_COM_I_EN     = 0x02;
const REG_DIV_I_EN     = 0x03;
const REG_COM_IRQ      = 0x04;
const REG_ERROR        = 0x06;
const REG_STATUS1      = 0x07;
const REG_FIFO_DATA    = 0x09;
const REG_FIFO_LEVEL   = 0x0A;
const REG_CONTROL      = 0x0C;
const REG_BIT_FRAMING  = 0x0D;
const REG_MODE         = 0x11;
const REG_TX_CONTROL   = 0x14;
const REG_TX_ASK       = 0x15;
const REG_TMODE        = 0x2A;
const REG_TPRESCALER   = 0x2B;
const REG_TRELOAD_H    = 0x2C;
const REG_TRELOAD_L    = 0x2D;
const REG_VERSION      = 0x37;

const CMD_IDLE         = 0x00;
const CMD_TRANSCEIVE   = 0x0C;
const CMD_SOFTRESET    = 0x0F;
const REQA             = 0x26;
const SEL_CMD          = 0x93;
const NVB              = 0x20;

const VERSION_OK = [0x91, 0x92];

// ─── Embedded Python GPIO helper ──────────────────────────────────
// Uses lgpio (character-device GPIO) which works on RPi 5.
// Auto-detects the correct gpiochip (pinctrl-rp1) since RPi 5 may
// map user GPIOs to gpiochip0 or gpiochip4 depending on kernel version.
// Protocol: Node writes "<pinIndex><0|1>\n", Python sets GPIO and replies "K\n".
const PY_GPIO_HELPER = `
import sys, json, subprocess

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

# ── Step 1: Run gpiodetect to find the RP1 user GPIO chip ──
rp1_chip = None
sys.stderr.write("Detecting gpiochips...\\n")
try:
    det = subprocess.run(["gpiodetect"], capture_output=True, text=True, timeout=5)
    for line in det.stdout.strip().splitlines():
        sys.stderr.write("  " + line + "\\n")
        # e.g. "gpiochip4 [pinctrl-rp1] (54 lines)"
        if "pinctrl-rp1" in line:
            rp1_chip = int(line.split("[")[0].replace("gpiochip","").strip())
except Exception as e:
    sys.stderr.write("  gpiodetect failed: " + str(e) + "\\n")
sys.stderr.flush()

# ── Step 2: Run gpioinfo on target chip to show line status ──
target = rp1_chip if rp1_chip is not None else 0
sys.stderr.write("\\nTarget: gpiochip" + str(target) + "\\n")
try:
    info_out = subprocess.run(["gpioinfo", "gpiochip" + str(target)],
                              capture_output=True, text=True, timeout=5)
    want = set(ALL)
    for line in info_out.stdout.strip().splitlines():
        for g in want:
            tag = "line " + str(g).rjust(3) + ":"
            tag2 = "line  " + str(g) + ":"
            tag3 = "line " + str(g) + " "
            if tag in line or tag2 in line or tag3 in line:
                sys.stderr.write("  " + line.strip() + "\\n")
except Exception as e:
    sys.stderr.write("  gpioinfo failed: " + str(e) + "\\n")
sys.stderr.flush()

# ── Step 3: If auto-detect found nothing, probe chips by trying to claim GPIO4 ──
if rp1_chip is None:
    sys.stderr.write("\\nRP1 not found via gpiodetect, probing chips 0-10...\\n")
    for dev in range(0, 11):
        try:
            handle = lgpio.gpiochip_open(dev)
            try:
                lgpio.gpio_claim_output(handle, 4, 1)
                lgpio.gpio_free(handle, 4)
                rp1_chip = dev
                sys.stderr.write("  gpiochip" + str(dev) + ": GPIO4 claim OK — using this chip\\n")
                lgpio.gpiochip_close(handle)
                break
            except lgpio.error as e:
                sys.stderr.write("  gpiochip" + str(dev) + ": GPIO4 " + str(e) + "\\n")
                lgpio.gpiochip_close(handle)
        except Exception:
            pass
    sys.stderr.flush()

if rp1_chip is None:
    sys.stderr.write("\\nERROR: Could not find a gpiochip where GPIO4 is claimable.\\n")
    sys.stderr.write("Check: is another process using these GPIOs?\\n")
    sys.stderr.write("  sudo lsof /dev/gpiochip*\\n")
    sys.stderr.write("  ps aux | grep -i 'hardware\\\\|nfc\\\\|gpio'\\n")
    sys.stderr.flush()
    sys.exit(1)

# ── Step 4: Open the selected chip and claim pins ──
sys.stderr.write("\\nUsing gpiochip" + str(rp1_chip) + "\\n")
try:
    h = lgpio.gpiochip_open(rp1_chip)
except Exception as e:
    sys.stderr.write("ERROR: Cannot open gpiochip" + str(rp1_chip) + ": " + str(e) + "\\n")
    sys.stderr.flush()
    sys.exit(1)

claimed = set()
for g in ALL:
    try:
        lgpio.gpio_claim_output(h, g, 1)
        claimed.add(g)
    except lgpio.error as e:
        sys.stderr.write("WARN: GPIO" + str(g) + " on gpiochip" + str(rp1_chip) + ": " + str(e) + "\\n")
sys.stderr.flush()

sys.stdout.write("READY:" + json.dumps(sorted(claimed)) + "\\n")
sys.stdout.flush()

for raw in sys.stdin:
    cmd = raw.strip()
    if cmd == "Q":
        break
    if len(cmd) >= 2:
        try:
            idx = int(cmd[:-1])
            val = int(cmd[-1])
            if 0 <= idx < len(ALL) and ALL[idx] in claimed:
                lgpio.gpio_write(h, ALL[idx], val)
        except Exception:
            pass
    sys.stdout.write("K\\n")
    sys.stdout.flush()

for g in claimed:
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
let claimedGpios = new Set(); // GPIOs the Python helper successfully claimed

// ─── Python GPIO helper management ───────────────────────────────

function startGpioHelper() {
  return new Promise((resolve, reject) => {
    pyProc = spawn('python3', ['-u', '-c', PY_GPIO_HELPER], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let started = false;
    let stderrBuf = '';

    pyProc.stderr.on('data', (chunk) => {
      const msg = chunk.toString();
      stderrBuf += msg;
      // Print warnings immediately so user sees them during init
      if (msg.includes('WARN:')) {
        process.stderr.write(msg);
      }
    });

    pyProc.stdout.on('data', (chunk) => {
      pyBuffer += chunk.toString();
      if (!started) {
        const nlIdx = pyBuffer.indexOf('\n');
        if (nlIdx !== -1) {
          const firstLine = pyBuffer.slice(0, nlIdx);
          pyBuffer = pyBuffer.slice(nlIdx + 1);
          // Parse "READY:[4,5,6,...]" — list of claimed GPIOs
          if (firstLine.startsWith('READY:')) {
            try {
              const arr = JSON.parse(firstLine.slice(6));
              claimedGpios = new Set(arr);
            } catch (_) {}
          }
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

// ─── RC522 init (mirrors nfc_rc522_bridge.py _init_chip) ──────────

async function initReader(csIndex) {
  await writeReg(spiDev, csIndex, REG_COMMAND, CMD_SOFTRESET);
  await delay(50);
  await writeReg(spiDev, csIndex, REG_TMODE, 0x8D);
  await writeReg(spiDev, csIndex, REG_TPRESCALER, 0x3E);
  await writeReg(spiDev, csIndex, REG_TRELOAD_L, 30);
  await writeReg(spiDev, csIndex, REG_TRELOAD_H, 0);
  await writeReg(spiDev, csIndex, REG_TX_ASK, 0x40);
  await writeReg(spiDev, csIndex, REG_MODE, 0x3D);
  // Antenna on
  const txCtrl = await readReg(spiDev, csIndex, REG_TX_CONTROL);
  if ((txCtrl & 0x03) !== 0x03) {
    await writeReg(spiDev, csIndex, REG_TX_CONTROL, txCtrl | 0x03);
  }
}

// ─── Version check per reader ─────────────────────────────────────

async function readVersion(idx) {
  const { reader, gpio, pin } = CS_MAP[idx];
  await initReader(idx);
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

// Mirrors nfc_rc522_bridge.py _to_card + request + anticoll

async function toCard(csIndex, command, sendData, timeoutMs) {
  timeoutMs = timeoutMs || 30;
  await writeReg(spiDev, csIndex, REG_COMMAND, CMD_IDLE);
  await writeReg(spiDev, csIndex, REG_COM_IRQ, 0x7F);          // clear IRQs
  const fl = await readReg(spiDev, csIndex, REG_FIFO_LEVEL);
  await writeReg(spiDev, csIndex, REG_FIFO_LEVEL, fl | 0x80);  // flush FIFO

  for (const b of sendData) {
    await writeReg(spiDev, csIndex, REG_FIFO_DATA, b);
  }
  await writeReg(spiDev, csIndex, REG_COMMAND, command);
  if (command === CMD_TRANSCEIVE) {
    const bf = await readReg(spiDev, csIndex, REG_BIT_FRAMING);
    await writeReg(spiDev, csIndex, REG_BIT_FRAMING, bf | 0x80); // StartSend
  }

  const start = Date.now();
  while (true) {
    const irq = await readReg(spiDev, csIndex, REG_COM_IRQ);
    if (irq & 0x01) return { ok: false, data: [], bits: 0 }; // Timer
    if (irq & 0x30) break; // RxIRq or IdleIRq
    if (Date.now() - start >= timeoutMs) return { ok: false, data: [], bits: 0 };
    await delay(1);
  }

  // Clear StartSend
  const bf2 = await readReg(spiDev, csIndex, REG_BIT_FRAMING);
  await writeReg(spiDev, csIndex, REG_BIT_FRAMING, bf2 & 0x7F);

  const err = await readReg(spiDev, csIndex, REG_ERROR);
  if (err & 0x1B) return { ok: false, data: [], bits: 0 };

  const level = await readReg(spiDev, csIndex, REG_FIFO_LEVEL);
  const lastBits = (await readReg(spiDev, csIndex, REG_CONTROL)) & 0x07;
  const bits = lastBits ? (level - 1) * 8 + lastBits : level * 8;

  const data = [];
  for (let i = 0; i < level; i++) {
    data.push(await readReg(spiDev, csIndex, REG_FIFO_DATA));
  }
  return { ok: true, data, bits };
}

async function requestCard(csIndex) {
  await writeReg(spiDev, csIndex, REG_BIT_FRAMING, 0x07); // TxLastBits=7
  const r = await toCard(csIndex, CMD_TRANSCEIVE, [REQA]);
  return r.ok && r.bits === 0x10 && r.data.length >= 2;
}

async function anticoll(csIndex) {
  await writeReg(spiDev, csIndex, REG_BIT_FRAMING, 0x00);
  const r = await toCard(csIndex, CMD_TRANSCEIVE, [SEL_CMD, 0x20]);
  if (!r.ok || r.data.length < 5) return null;
  const uid = r.data.slice(0, 4);
  const bcc = r.data[4];
  if ((uid[0] ^ uid[1] ^ uid[2] ^ uid[3]) !== bcc) return null;
  return uid.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
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

  // Report RST status
  if (claimedGpios.has(RST_GPIO)) {
    console.log(`RST (GPIO${RST_GPIO}) : claimed OK`);
  } else {
    console.log(`RST (GPIO${RST_GPIO}) : busy (SPI CE1) — skipped, not required`);
  }
  console.log('');

  const enabled = [];
  for (let i = 0; i < CS_MAP.length; i++) {
    const { reader, gpio, pin } = CS_MAP[i];
    const col1 = ('Reader #' + reader).padEnd(11);
    const col2 = ('GPIO' + gpio).padEnd(6);
    const col3 = ('Pin ' + pin).padEnd(6);

    if (!claimedGpios.has(gpio)) {
      console.log(`${col1} | ${col2} | ${col3} | GPIO busy | FAIL`);
      enabled.push(false);
      continue;
    }

    try {
      const ok = await readVersion(i);
      enabled.push(ok);
    } catch (err) {
      console.log(`${col1} | ${col2} | ${col3} | SPI error | FAIL`);
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
        if (await requestCard(i)) {
          const uid = await anticoll(i);
          if (uid) {
            const rdr = ('#' + reader).padStart(3);
            const gpioStr = ('GPIO' + gpio).padStart(6);
            console.log(`[${timestamp()}] Reader ${rdr}  (${gpioStr}) → UID: ${uid}`);
          }
        }
      } catch (_) {}
    }
  await delay(200);
  }
}

main().catch((err) => {
  console.error(err);
  shutdown();
});
