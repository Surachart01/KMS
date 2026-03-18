#!/usr/bin/env python3
"""
RC522 Multi-Reader Bridge (Raspberry Pi 5)

Purpose:
- Read UID from MFRC522 over SPI (spidev0.0)
- Select 1 of N readers by toggling its RST line via lgpio (CE0 shared as hardware CS)
- Communicate with a Node.js parent process over stdin/stdout (JSON lines)

Protocol (JSONL):
Input:  {"id":1,"cmd":"read","slot":3}
Output: {"id":1,"ok":true,"uid":"04A1B2C3"}  OR {"id":1,"ok":true,"uid":null}
Error:  {"id":1,"ok":false,"error":"..."}

Dependencies (Debian/Raspberry Pi OS):
  sudo apt-get install -y python3-lgpio python3-spidev
"""

from __future__ import annotations

import json
import sys
import time
from typing import Optional, Tuple

try:
    import spidev  # type: ignore
except Exception as e:  # pragma: no cover
    print(json.dumps({"id": None, "ok": False, "error": f"spidev import failed: {e}"}), flush=True)
    raise

try:
    import lgpio  # type: ignore
except Exception as e:  # pragma: no cover
    print(json.dumps({"id": None, "ok": False, "error": f"lgpio import failed: {e}"}), flush=True)
    raise


SLOT_CS_MAP = {
    # GPIO per reader → controls RST pin (LOW=disabled, HIGH=active)
    # CE0 (Pin 24) is shared SDA for all readers (kernel hardware CS)
    1: 4,    # Pin 7
    2: 17,   # Pin 11
    3: 27,   # Pin 13
    4: 22,   # Pin 15
    5: 0,    # Pin 27
    6: 5,    # Pin 29
    7: 6,    # Pin 31
    8: 13,   # Pin 33
    9: 19,   # Pin 35
    10: 26,  # Pin 37
}


# MFRC522 registers
CommandReg = 0x01
ComIEnReg = 0x02
DivIEnReg = 0x03
ComIrqReg = 0x04
DivIrqReg = 0x05
ErrorReg = 0x06
Status1Reg = 0x07
Status2Reg = 0x08
FIFODataReg = 0x09
FIFOLevelReg = 0x0A
ControlReg = 0x0C
BitFramingReg = 0x0D
ModeReg = 0x11
TxControlReg = 0x14
TxASKReg = 0x15
TModeReg = 0x2A
TPrescalerReg = 0x2B
TReloadRegH = 0x2C
TReloadRegL = 0x2D


# MFRC522 commands
PCD_IDLE = 0x00
PCD_TRANSCEIVE = 0x0C
PCD_SOFTRESET = 0x0F


# PICC commands
PICC_REQIDL = 0x26
PICC_ANTICOLL = 0x93


class Rc522:
    def __init__(self, spi: spidev.SpiDev):
        self.spi = spi
        self._init_chip()

    def _write_reg(self, addr: int, val: int) -> None:
        # Address format: 0XXXXXX0 for write
        self.spi.xfer2([(addr << 1) & 0x7E, val & 0xFF])

    def _read_reg(self, addr: int) -> int:
        # Address format: 1XXXXXX0 for read
        res = self.spi.xfer2([((addr << 1) & 0x7E) | 0x80, 0x00])
        return res[1]

    def _set_bitmask(self, reg: int, mask: int) -> None:
        self._write_reg(reg, self._read_reg(reg) | mask)

    def _clear_bitmask(self, reg: int, mask: int) -> None:
        self._write_reg(reg, self._read_reg(reg) & (~mask & 0xFF))

    def _init_chip(self) -> None:
        # Skip SoftReset for FM17522E clone compatibility
        self._write_reg(CommandReg, PCD_IDLE)

        # Timer: TAuto=1; f(Timer) = 6.78MHz / (2*TPreScaler+1)
        self._write_reg(TModeReg, 0x8D)
        self._write_reg(TPrescalerReg, 0x3E)
        self._write_reg(TReloadRegL, 30)
        self._write_reg(TReloadRegH, 0)

        self._write_reg(TxASKReg, 0x40)
        self._write_reg(ModeReg, 0x3D)
        self.antenna_on()

    def antenna_on(self) -> None:
        if (self._read_reg(TxControlReg) & 0x03) != 0x03:
            self._set_bitmask(TxControlReg, 0x03)

    def _to_card(self, command: int, send_data: list[int], timeout_ms: int = 30) -> Tuple[bool, list[int], int]:
        back_data: list[int] = []
        back_len_bits = 0

        self._write_reg(CommandReg, PCD_IDLE)
        self._write_reg(ComIrqReg, 0x7F)
        self._set_bitmask(FIFOLevelReg, 0x80)  # flush FIFO

        for d in send_data:
            self._write_reg(FIFODataReg, d)

        self._write_reg(CommandReg, command)
        if command == PCD_TRANSCEIVE:
            self._set_bitmask(BitFramingReg, 0x80)  # StartSend=1

        start = time.time()
        while True:
            irq = self._read_reg(ComIrqReg)
            if irq & 0x01:  # Timer interrupt
                return False, [], 0
            if irq & 0x30:  # RxIRq or IdleIRq
                break
            if (time.time() - start) * 1000 >= timeout_ms:
                return False, [], 0

        self._clear_bitmask(BitFramingReg, 0x80)

        err = self._read_reg(ErrorReg)
        if err & 0x1B:  # BufferOvfl, ParityErr, ProtocolErr, CollErr
            return False, [], 0

        fifo_level = self._read_reg(FIFOLevelReg)
        last_bits = self._read_reg(ControlReg) & 0x07
        if last_bits:
            back_len_bits = (fifo_level - 1) * 8 + last_bits
        else:
            back_len_bits = fifo_level * 8

        for _ in range(fifo_level):
            back_data.append(self._read_reg(FIFODataReg))

        return True, back_data, back_len_bits

    def request(self) -> bool:
        self._write_reg(BitFramingReg, 0x07)  # TxLastBits = 7
        ok, back, bits = self._to_card(PCD_TRANSCEIVE, [PICC_REQIDL])
        return ok and bits == 0x10 and len(back) >= 2

    def anticoll(self) -> Optional[list[int]]:
        self._write_reg(BitFramingReg, 0x00)
        ok, back, _ = self._to_card(PCD_TRANSCEIVE, [PICC_ANTICOLL, 0x20])
        if not ok or len(back) < 5:
            return None
        uid = back[0:4]
        bcc = back[4]
        if (uid[0] ^ uid[1] ^ uid[2] ^ uid[3]) != bcc:
            return None
        return uid

    def read_uid_hex(self) -> Optional[str]:
        # Quick path: request + anticollision
        if not self.request():
            return None
        uid = self.anticoll()
        if not uid:
            return None
        return "".join(f"{b:02X}" for b in uid)


class MultiReader:
    def __init__(self):
        self.chip = lgpio.gpiochip_open(0)
        self.rst_lines = {}
        for slot, pin in SLOT_CS_MAP.items():
            # default LOW (disabled) to avoid bus contention
            lgpio.gpio_claim_output(self.chip, pin, 0)
            self.rst_lines[slot] = pin

        self.spi = spidev.SpiDev()
        self.spi.open(0, 0)
        # Long wires / multi-drop setups are noisy; keep it slow for stability
        self.spi.max_speed_hz = 50_000
        self.spi.mode = 0

        self.rc522 = Rc522(self.spi)

    def close(self) -> None:
        try:
            for pin in self.rst_lines.values():
                try:
                    lgpio.gpio_write(self.chip, pin, 0)
                except Exception:
                    pass
        finally:
            try:
                self.spi.close()
            except Exception:
                pass
            try:
                lgpio.gpiochip_close(self.chip)
            except Exception:
                pass

    def activate_slot(self, slot: int) -> bool:
        pin = self.rst_lines.get(slot)
        if pin is None:
            return False
        # Ensure all disabled (RST LOW), then enable one (RST HIGH)
        for p in self.rst_lines.values():
            lgpio.gpio_write(self.chip, p, 0)
        lgpio.gpio_write(self.chip, pin, 1)
        return True

    def deactivate_all(self) -> None:
        for p in self.rst_lines.values():
            lgpio.gpio_write(self.chip, p, 0)

    def read_uid(self, slot: int) -> Optional[str]:
        if not self.activate_slot(slot):
            return None
        try:
            # After switching RST, give the reader a brief settle time.
            time.sleep(0.01)

            # Retry a few times to avoid false negatives from noisy RF / timing.
            # Each attempt is quick (tens of ms). If a tag is present, we usually get it within 1-2 tries.
            for _ in range(3):
                # Re-init per read to recover from clone quirks / after RST toggling
                try:
                    self.rc522._init_chip()
                except Exception:
                    pass
                uid = self.rc522.read_uid_hex()
                if uid:
                    return uid
                time.sleep(0.005)
            return None
        finally:
            self.deactivate_all()


def main() -> int:
    mr = MultiReader()
    _dbg_count = 0
    _DBG_MAX = 30  # print first N reads to stderr for diagnostics
    try:
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            req = None
            try:
                req = json.loads(line)
                req_id = req.get("id")
                cmd = req.get("cmd")
                if cmd == "ping":
                    print(json.dumps({"id": req_id, "ok": True, "pong": True}), flush=True)
                    continue
                if cmd == "read":
                    slot = int(req.get("slot"))
                    # Activate slot, read version for debug, then read UID
                    if _dbg_count < _DBG_MAX:
                        mr.activate_slot(slot)
                        time.sleep(0.01)
                        ver = mr.rc522._read_reg(0x37)
                        mr.deactivate_all()
                        _dbg_count += 1
                        print(f"[PY-DBG #{_dbg_count}] slot={slot} rst_pin={mr.rst_lines.get(slot)} ver=0x{ver:02X}", file=sys.stderr, flush=True)
                    uid = mr.read_uid(slot)
                    if _dbg_count <= _DBG_MAX and uid:
                        print(f"[PY-DBG] slot={slot} uid={uid}", file=sys.stderr, flush=True)
                    print(json.dumps({"id": req_id, "ok": True, "uid": uid}), flush=True)
                    continue

                print(json.dumps({"id": req_id, "ok": False, "error": f"unknown cmd: {cmd}"}), flush=True)
            except Exception as e:
                req_id = None if req is None else req.get("id")
                print(json.dumps({"id": req_id, "ok": False, "error": str(e)}), flush=True)
    finally:
        mr.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

