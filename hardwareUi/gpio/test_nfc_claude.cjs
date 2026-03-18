'use strict';
/**
 * test_nfc_claude.cjs — Test 10× RC522 NFC readers on Raspberry Pi 5
 *
 * Architecture: CE0 shared SDA + RST per reader
 *   - CE0 (Pin 24) → all RC522 SDA pins (shared, kernel handles CS)
 *   - Each GPIO controls the RST pin of one reader
 *   - RST LOW = reader disabled (MISO tri-state)
 *   - RST HIGH = reader active
 *   - Only ONE reader active at a time
 *
 * PREREQUISITE: Restore normal SPI if spi0-0cs was applied:
 *   sudo bash restore_spi.sh && sudo reboot
 *
 * Wiring:
 *   SDA  → Pin 24 (CE0) — ALL readers share this
 *   SCK  → Pin 23 (GPIO11) — shared
 *   MOSI → Pin 19 (GPIO10) — shared (swap if board labels reversed)
 *   MISO → Pin 21 (GPIO9)  — shared (swap if board labels reversed)
 *   VCC  → 3.3V, GND → GND (common with RPi!)
 *
 *   RST per reader (GPIO pin → RC522 RST):
 *     Reader #1  : GPIO4   (Pin 7)  → RST
 *     Reader #2  : GPIO17  (Pin 11) → RST
 *     Reader #3  : GPIO27  (Pin 13) → RST
 *     Reader #4  : GPIO22  (Pin 15) → RST
 *     Reader #5  : GPIO0   (Pin 27) → RST
 *     Reader #6  : GPIO5   (Pin 29) → RST
 *     Reader #7  : GPIO6   (Pin 31) → RST
 *     Reader #8  : GPIO13  (Pin 33) → RST
 *     Reader #9  : GPIO19  (Pin 35) → RST
 *     Reader #10 : GPIO26  (Pin 37) → RST
 *
 * Run: sudo node test_nfc_claude.cjs
 */

const { spawn } = require('child_process');

const READER_MAP = [
  { reader: 1,  gpio: 4,  pin: 7 },
  { reader: 2,  gpio: 17, pin: 11 },
  { reader: 3,  gpio: 27, pin: 13 },
  { reader: 4,  gpio: 22, pin: 15 },
  { reader: 5,  gpio: 0,  pin: 27 },
  { reader: 6,  gpio: 5,  pin: 29 },
  { reader: 7,  gpio: 6,  pin: 31 },
  { reader: 8,  gpio: 13, pin: 33 },
  { reader: 9,  gpio: 19, pin: 35 },
  { reader: 10, gpio: 26, pin: 37 },
];

const VERSION_OK = [0x91, 0x92, 0x88, 0x18, 0x12, 0x9A, 0x82];

const PY_HELPER = `
import sys, time, os

def log(msg):
    sys.stderr.write("[DBG] " + msg + "\\n")
    sys.stderr.flush()

log("Python helper starting (pid=" + str(os.getpid()) + ")")

import spidev
import lgpio

# GPIO per reader → controls RST pin (LOW=disabled, HIGH=active)
# CE0 (Pin 24) is shared SDA for all readers (hardware CS by kernel)
SLOT_RST = {1:4, 2:17, 3:27, 4:22, 5:0, 6:5, 7:6, 8:13, 9:19, 10:26}
log("SLOT_RST=" + str(SLOT_RST))

# ── MFRC522 registers ──
CommandReg    = 0x01
ComIrqReg     = 0x04
ErrorReg      = 0x06
FIFODataReg   = 0x09
FIFOLevelReg  = 0x0A
ControlReg    = 0x0C
BitFramingReg = 0x0D
ModeReg       = 0x11
TxControlReg  = 0x14
TxASKReg      = 0x15
TModeReg      = 0x2A
TPrescalerReg = 0x2B
TReloadRegH   = 0x2C
TReloadRegL   = 0x2D
VersionReg    = 0x37

PCD_IDLE       = 0x00
PCD_TRANSCEIVE = 0x0C
PICC_REQIDL    = 0x26
PICC_ANTICOLL  = 0x93


class Rc522:
    def __init__(self, spi):
        self.spi = spi

    def _wr(self, reg, val):
        self.spi.xfer2([(reg << 1) & 0x7E, val & 0xFF])

    def _rd(self, reg):
        return self.spi.xfer2([((reg << 1) & 0x7E) | 0x80, 0x00])[1]

    def _set(self, reg, mask):
        self._wr(reg, self._rd(reg) | mask)

    def _clr(self, reg, mask):
        self._wr(reg, self._rd(reg) & (~mask & 0xFF))

    def init_chip(self):
        # No SoftReset — FM17522E clones don't recover
        self._wr(CommandReg, PCD_IDLE)
        self._wr(TModeReg, 0x8D)
        self._wr(TPrescalerReg, 0x3E)
        self._wr(TReloadRegL, 30)
        self._wr(TReloadRegH, 0)
        self._wr(TxASKReg, 0x40)
        self._wr(ModeReg, 0x3D)
        if (self._rd(TxControlReg) & 0x03) != 0x03:
            self._set(TxControlReg, 0x03)

    def version(self):
        return self._rd(VersionReg)

    def _to_card(self, cmd, data, timeout_ms=50):
        self._wr(CommandReg, PCD_IDLE)
        self._wr(ComIrqReg, 0x7F)
        self._set(FIFOLevelReg, 0x80)
        for d in data:
            self._wr(FIFODataReg, d)
        self._wr(CommandReg, cmd)
        if cmd == PCD_TRANSCEIVE:
            self._set(BitFramingReg, 0x80)
        t0 = time.time()
        while True:
            irq = self._rd(ComIrqReg)
            if irq & 0x01:
                return False, [], 0
            if irq & 0x30:
                break
            if (time.time() - t0) * 1000 >= timeout_ms:
                return False, [], 0
        self._clr(BitFramingReg, 0x80)
        if self._rd(ErrorReg) & 0x1B:
            return False, [], 0
        n = self._rd(FIFOLevelReg)
        lb = self._rd(ControlReg) & 0x07
        bits = (n - 1) * 8 + lb if lb else n * 8
        out = [self._rd(FIFODataReg) for _ in range(n)]
        return True, out, bits

    def request(self):
        self._wr(BitFramingReg, 0x07)
        ok, back, bits = self._to_card(PCD_TRANSCEIVE, [PICC_REQIDL])
        return ok and bits == 0x10 and len(back) >= 2

    def anticoll(self):
        self._wr(BitFramingReg, 0x00)
        ok, back, _ = self._to_card(PCD_TRANSCEIVE, [PICC_ANTICOLL, 0x20])
        if not ok or len(back) < 5:
            return None
        uid = back[:4]
        if (uid[0] ^ uid[1] ^ uid[2] ^ uid[3]) != back[4]:
            return None
        return uid

    def read_uid_hex(self):
        if not self.request():
            return None
        uid = self.anticoll()
        if not uid:
            return None
        return "".join(f"{b:02X}" for b in uid)


class MultiReader:
    def __init__(self):
        self.chip = lgpio.gpiochip_open(0)
        log("gpiochip0 opened (handle=" + str(self.chip) + ")")

        # Claim RST pins — all LOW (readers disabled) at start
        self.rst_lines = {}
        self.gpio_ok = set()
        for slot, pin in SLOT_RST.items():
            try:
                lgpio.gpio_claim_output(self.chip, pin, 0)  # LOW = disabled
                self.rst_lines[slot] = pin
                self.gpio_ok.add(pin)
                log("GPIO" + str(pin) + " (RST slot " + str(slot) + ") claimed — LOW")
            except lgpio.error as e:
                sys.stderr.write("WARN: GPIO" + str(pin) + ": " + str(e) + "\\n")
        sys.stderr.flush()

        # SPI via /dev/spidev0.0 — CE0 (Pin 24) as hardware CS
        self.spi = spidev.SpiDev()
        self.spi.open(0, 0)
        self.spi.max_speed_hz = 50_000
        self.spi.mode = 0
        log("SPI opened: CE0 (Pin 24) as hardware CS, speed=50kHz")

        self.rc522 = Rc522(self.spi)

    def close(self):
        for pin in self.rst_lines.values():
            try:
                lgpio.gpio_write(self.chip, pin, 0)
            except Exception:
                pass
        try:
            self.spi.close()
        except Exception:
            pass
        try:
            lgpio.gpiochip_close(self.chip)
        except Exception:
            pass

    def activate(self, slot):
        """Enable ONE reader: all RST LOW, then target RST HIGH."""
        pin = self.rst_lines.get(slot)
        if pin is None:
            return False
        for p in self.rst_lines.values():
            lgpio.gpio_write(self.chip, p, 0)
        lgpio.gpio_write(self.chip, pin, 1)
        time.sleep(0.05)  # 50ms for chip to wake from reset
        return True

    def deactivate_all(self):
        for p in self.rst_lines.values():
            lgpio.gpio_write(self.chip, p, 0)

    def cmd_init(self, slot):
        if not self.activate(slot):
            return "ERR:GPIO_NOT_CLAIMED"
        try:
            self.rc522.init_chip()
            v = self.rc522.version()
            log("cmd_init slot " + str(slot) + ": Version=0x" + format(v, "02X"))
            return "VER:" + format(v, "02X")
        except Exception as e:
            log("cmd_init slot " + str(slot) + " ERR: " + str(e))
            return "ERR:" + str(e)
        finally:
            self.deactivate_all()

    def cmd_read(self, slot):
        if not self.activate(slot):
            return "NONE"
        try:
            self.rc522.init_chip()
            for _ in range(3):
                uid = self.rc522.read_uid_hex()
                if uid:
                    return "UID:" + uid
                time.sleep(0.01)
            return "NONE"
        except Exception as e:
            return "ERR:" + str(e)
        finally:
            self.deactivate_all()


def main():
    mr = MultiReader()
    sys.stdout.write("READY:" + ",".join(str(g) for g in sorted(mr.gpio_ok)) + "\\n")
    sys.stdout.flush()

    try:
        for raw in sys.stdin:
            line = raw.strip()
            if not line:
                continue
            if line == "QUIT":
                break
            parts = line.split()
            cmd = parts[0] if parts else ""
            slot = int(parts[1]) if len(parts) > 1 else 0

            if cmd == "INIT":
                result = mr.cmd_init(slot)
            elif cmd == "READ":
                result = mr.cmd_read(slot)
            else:
                result = "ERR:UNKNOWN_CMD"

            sys.stdout.write(result + "\\n")
            sys.stdout.flush()
    finally:
        mr.close()


if __name__ == "__main__":
    main()
`;

// ─── Globals ──────────────────────────────────────────────────────
let pyProc = null;
let pyBuffer = '';
let cmdResolve = null;
let claimedGpios = new Set();

function startHardwareHelper() {
  return new Promise((resolve, reject) => {
    pyProc = spawn('python3', ['-u', '-c', PY_HELPER], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let started = false;
    let stderrBuf = '';

    pyProc.stderr.on('data', (chunk) => {
      const msg = chunk.toString();
      stderrBuf += msg;
      process.stderr.write(msg);
    });

    pyProc.stdout.on('data', (chunk) => {
      pyBuffer += chunk.toString();
      if (!started) {
        const nlIdx = pyBuffer.indexOf('\n');
        if (nlIdx !== -1) {
          const firstLine = pyBuffer.slice(0, nlIdx).trim();
          pyBuffer = pyBuffer.slice(nlIdx + 1);
          if (firstLine.startsWith('READY:')) {
            firstLine.slice(6).split(',').forEach((s) => {
              const n = parseInt(s, 10);
              if (!isNaN(n)) claimedGpios.add(n);
            });
          }
          started = true;
          resolve();
          return;
        }
      }
      drainBuffer();
    });

    pyProc.on('close', (code) => {
      if (!started) {
        reject(new Error(stderrBuf.trim() || 'Hardware helper exited with code ' + code));
      }
    });

    setTimeout(() => {
      if (!started) {
        pyProc.kill();
        reject(new Error('Hardware helper timed out.\n' + stderrBuf.trim()));
      }
    }, 10000);
  });
}

function drainBuffer() {
  while (true) {
    const idx = pyBuffer.indexOf('\n');
    if (idx === -1) break;
    const line = pyBuffer.slice(0, idx).trim();
    pyBuffer = pyBuffer.slice(idx + 1);
    if (cmdResolve) {
      const r = cmdResolve;
      cmdResolve = null;
      r(line);
    }
  }
}

function sendCommand(cmd) {
  return new Promise((resolve) => {
    cmdResolve = resolve;
    pyProc.stdin.write(cmd + '\n');
  });
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

function shutdown() {
  console.log('\nShutting down...');
  try {
    if (pyProc) {
      pyProc.stdin.write('QUIT\n');
      pyProc.stdin.end();
      pyProc = null;
    }
  } catch (_) {}
  console.log('Done.');
  process.exit(0);
}

async function main() {
  console.log('=== RC522 NFC Reader Test — RPi5 (CE0 + RST) ===');
  console.log('CE0 (Pin 24) = shared SDA, GPIO = per-reader RST');
  console.log('Initializing readers...\n');

  try {
    await startHardwareHelper();
  } catch (err) {
    console.error('Hardware init failed:', err.message);
    process.exit(1);
  }

  console.log('');

  const enabled = [];
  for (let i = 0; i < READER_MAP.length; i++) {
    const { reader, gpio, pin } = READER_MAP[i];
    const col1 = ('Reader #' + reader).padEnd(11);
    const col2 = ('GPIO' + gpio).padEnd(6);
    const col3 = ('Pin ' + pin).padEnd(6);

    if (!claimedGpios.has(gpio)) {
      console.log(`${col1} | ${col2} | ${col3} | GPIO busy | FAIL`);
      enabled.push(false);
      continue;
    }

    const slot = i + 1;
    const resp = await sendCommand('INIT ' + slot);

    if (resp.startsWith('VER:')) {
      const vHex = resp.slice(4);
      const vNum = parseInt(vHex, 16);
      const ok = VERSION_OK.includes(vNum);
      console.log(`${col1} | ${col2} | ${col3} | Version: 0x${vHex} | ${ok ? 'OK' : 'FAIL'}`);
      enabled.push(ok);
    } else {
      console.log(`${col1} | ${col2} | ${col3} | ${resp}    | FAIL`);
      enabled.push(false);
    }
    await delay(100);
  }

  const count = enabled.filter(Boolean).length;
  console.log(`\nEnabled: ${count}/${READER_MAP.length} readers`);
  console.log('--- Waiting for NFC cards (Ctrl+C to exit) ---\n');

  process.on('SIGINT', shutdown);

  while (true) {
    for (let i = 0; i < READER_MAP.length; i++) {
      if (!enabled[i]) continue;
      const { reader, gpio } = READER_MAP[i];
      const slot = i + 1;
      try {
        const resp = await sendCommand('READ ' + slot);
        if (resp.startsWith('UID:')) {
          const uid = resp.slice(4);
          const rdr = ('#' + reader).padStart(3);
          const gpioStr = ('GPIO' + gpio).padStart(6);
          console.log(`[${timestamp()}] Reader ${rdr}  (${gpioStr}) → UID: ${uid}`);
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
