'use strict';
/**
 * test_nfc_claude.cjs — Test 10× RC522 NFC readers on Raspberry Pi 5
 *
 * ALL hardware I/O (SPI + GPIO) runs inside an embedded Python co-process
 * using spidev + lgpio — the proven-working stack from nfc_rc522_bridge.py.
 * Node.js only sends text commands and displays results.
 * Zero native Node.js dependencies required.
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
 * Prereqs (usually pre-installed on RPi OS Bookworm):
 *   sudo apt install python3-lgpio python3-spidev
 *
 * Run:  sudo node test_nfc_claude.cjs
 */

const { spawn } = require('child_process');

// ─── Reader table (for display only — hardware config lives in Python) ──
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

const VERSION_OK = [0x91, 0x92];

// ─── Embedded Python hardware helper ─────────────────────────────
// Handles ALL SPI and GPIO. Ported from the working nfc_rc522_bridge.py.
// Protocol (text lines over stdin/stdout):
//   Startup     → prints "READY\n" when hardware is initialised
//   INIT <slot> → soft-reset + init reader, responds "VER:XX\n" or "ERR:msg\n"
//   READ <slot> → request + anticoll, responds "UID:XXXXXXXX\n" or "NONE\n" or "ERR:msg\n"
//   QUIT        → clean shutdown
const PY_HELPER = `
import sys, time, subprocess

try:
    import spidev
except ImportError:
    sys.stderr.write("ERROR: python3-spidev not found.\\n")
    sys.stderr.write("Install: sudo apt install python3-spidev\\n")
    sys.stderr.flush()
    sys.exit(1)

try:
    import lgpio
except ImportError:
    sys.stderr.write("ERROR: python3-lgpio not found.\\n")
    sys.stderr.write("Install: sudo apt install python3-lgpio\\n")
    sys.stderr.flush()
    sys.exit(1)

# ── Pin map ──
SLOT_CS = {1:4, 2:5, 3:6, 4:12, 5:13, 6:16, 7:19, 8:20, 9:21, 10:26}
RST_PIN = 7

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
PCD_SOFTRESET  = 0x0F
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
        self._wr(CommandReg, PCD_SOFTRESET)
        time.sleep(0.05)
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

    def _to_card(self, cmd, data, timeout_ms=30):
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
        # GPIO
        self.chip = lgpio.gpiochip_open(0)
        self.cs_lines = {}
        self.gpio_ok = set()
        for slot, pin in SLOT_CS.items():
            try:
                lgpio.gpio_claim_output(self.chip, pin, 1)
                self.cs_lines[slot] = pin
                self.gpio_ok.add(pin)
            except lgpio.error as e:
                sys.stderr.write("WARN: GPIO" + str(pin) + ": " + str(e) + "\\n")
        try:
            lgpio.gpio_claim_output(self.chip, RST_PIN, 1)
            self.gpio_ok.add(RST_PIN)
        except lgpio.error:
            sys.stderr.write("WARN: GPIO" + str(RST_PIN) + " (RST) busy — skipped\\n")
        sys.stderr.flush()

        # SPI
        self.spi = spidev.SpiDev()
        self.spi.open(0, 0)
        self.spi.max_speed_hz = 1_000_000
        self.spi.mode = 0
        self.spi.no_cs = True

        self.rc522 = Rc522(self.spi)

        # ── SPI diagnostic on slot 1 ──
        sys.stderr.write("\\n── SPI Diagnostic ──\\n")
        sys.stderr.write("  mode=" + str(self.spi.mode) + " speed=" + str(self.spi.max_speed_hz) + " no_cs=" + str(self.spi.no_cs) + "\\n")
        if 1 in self.cs_lines:
            pin1 = self.cs_lines[1]
            lgpio.gpio_write(self.chip, pin1, 0)
            time.sleep(0.01)
            raw1 = self.spi.xfer2([0xEF, 0x00])
            raw2 = self.spi.xfer2([0xEF, 0x00])
            raw3 = self.spi.xfer2([0xEF, 0x00])
            lgpio.gpio_write(self.chip, pin1, 1)
            sys.stderr.write("  Slot 1 (GPIO" + str(pin1) + ") read VersionReg (0x37):\\n")
            sys.stderr.write("    attempt 1: sent [0xEF,0x00] got " + str(raw1) + "\\n")
            sys.stderr.write("    attempt 2: sent [0xEF,0x00] got " + str(raw2) + "\\n")
            sys.stderr.write("    attempt 3: sent [0xEF,0x00] got " + str(raw3) + "\\n")
            if raw1[1] == 0 and raw2[1] == 0 and raw3[1] == 0:
                sys.stderr.write("  *** All 0x00 — SPI bus not responding ***\\n")
                sys.stderr.write("  Check: MOSI(Pin19) MISO(Pin21) SCK(Pin23) wiring\\n")
                sys.stderr.write("  Check: VCC(3.3V) and GND connected to RC522\\n")
            else:
                sys.stderr.write("  SPI OK — got 0x" + format(raw1[1], "02X") + "\\n")
        else:
            sys.stderr.write("  Slot 1 GPIO not claimed, skipping diag\\n")
        sys.stderr.write("── End Diagnostic ──\\n\\n")
        sys.stderr.flush()

    def close(self):
        for pin in self.cs_lines.values():
            try:
                lgpio.gpio_write(self.chip, pin, 1)
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

    def select(self, slot):
        pin = self.cs_lines.get(slot)
        if pin is None:
            return False
        for p in self.cs_lines.values():
            lgpio.gpio_write(self.chip, p, 1)
        lgpio.gpio_write(self.chip, pin, 0)
        time.sleep(0.003)
        return True

    def deselect(self):
        for p in self.cs_lines.values():
            lgpio.gpio_write(self.chip, p, 1)

    def cmd_init(self, slot):
        if not self.select(slot):
            return "ERR:GPIO_NOT_CLAIMED"
        try:
            self.rc522.init_chip()
            v = self.rc522.version()
            return "VER:" + format(v, "02X")
        except Exception as e:
            return "ERR:" + str(e)
        finally:
            self.deselect()

    def cmd_read(self, slot):
        if not self.select(slot):
            return "NONE"
        try:
            for _ in range(3):
                uid = self.rc522.read_uid_hex()
                if uid:
                    return "UID:" + uid
                time.sleep(0.005)
            return "NONE"
        except Exception as e:
            return "ERR:" + str(e)
        finally:
            self.deselect()


def main():
    mr = MultiReader()
    # Report which GPIO pins were claimed
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

// ─── Python co-process management ────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function timestamp() {
  const d = new Date();
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => n.toString().padStart(2, '0'))
    .join(':');
}

// ─── Cleanup ──────────────────────────────────────────────────────

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

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  console.log('=== RC522 NFC Reader Test — RPi5 ===');
  console.log('Initializing readers...\n');

  try {
    await startHardwareHelper();
  } catch (err) {
    console.error('Hardware init failed:', err.message);
    process.exit(1);
  }

  // RST status
  if (claimedGpios.has(7)) {
    console.log('RST (GPIO7) : claimed OK');
  } else {
    console.log('RST (GPIO7) : busy (SPI CE1) — skipped, not required');
  }
  console.log('');

  // Init each reader and read version
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

    const slot = i + 1; // slots are 1-based in the Python helper
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
    await delay(50);
  }

  const count = enabled.filter(Boolean).length;
  console.log(`\nEnabled: ${count}/${CS_MAP.length} readers`);
  console.log('--- Waiting for NFC cards (Ctrl+C to exit) ---\n');

  process.on('SIGINT', shutdown);

  // Poll loop
  while (true) {
    for (let i = 0; i < CS_MAP.length; i++) {
      if (!enabled[i]) continue;
      const { reader, gpio } = CS_MAP[i];
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
