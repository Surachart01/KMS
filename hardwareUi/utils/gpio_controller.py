"""
GPIO Controller for Raspberry Pi
Module-level functions for GPIO operations, with mock support for non-Pi environments.
Supports per-slot solenoid unlock via a slot→pin mapping.
"""

import logging
import threading

logger = logging.getLogger(__name__)

# Slot → GPIO BCM pin mapping (edit to match your wiring)
SLOT_PIN_MAP = {
    1: 21,
    2: 20,
    3: 16,
    4: 12,
    5: 25,
}

# How long to keep solenoid open (seconds)
UNLOCK_DURATION = 5

# Module-level state
_gpio = None
_is_rpi = False


def setup_gpio():
    """Initialize all GPIO pins used in the slot map"""
    global _gpio, _is_rpi
    try:
        import RPi.GPIO as GPIO
        _gpio = GPIO
        _is_rpi = True

        _gpio.setmode(_gpio.BCM)
        _gpio.setwarnings(False)

        for slot, pin in SLOT_PIN_MAP.items():
            _gpio.setup(pin, _gpio.OUT)
            _gpio.output(pin, _gpio.LOW)
            logger.info(f"  Slot {slot} → GPIO {pin} (LOW)")

        logger.info(f"✅ GPIO Initialized ({len(SLOT_PIN_MAP)} slots)")
    except (ImportError, RuntimeError):
        _is_rpi = False
        logger.warning("⚠️ RPi.GPIO not found. Running in MOCK mode.")


def set_high(pin):
    """Set a single GPIO pin to HIGH"""
    if _is_rpi and _gpio:
        try:
            _gpio.output(pin, _gpio.HIGH)
            logger.info(f"⚡ GPIO {pin} → HIGH")
            return True
        except Exception as e:
            logger.error(f"❌ GPIO Error: {e}")
            return False
    else:
        logger.info(f"⚡ [MOCK] GPIO {pin} → HIGH")
        return True


def set_low(pin):
    """Set a single GPIO pin to LOW"""
    if _is_rpi and _gpio:
        try:
            _gpio.output(pin, _gpio.LOW)
            logger.info(f"⚪ GPIO {pin} → LOW")
            return True
        except Exception as e:
            logger.error(f"❌ GPIO Error: {e}")
            return False
    else:
        logger.info(f"⚪ [MOCK] GPIO {pin} → LOW")
        return True


def unlock_slot(slot_number, duration=UNLOCK_DURATION):
    """
    Unlock a solenoid for the given slot, then auto-lock after `duration` seconds.
    Runs the lock-back in a background thread so the caller is not blocked.
    """
    pin = SLOT_PIN_MAP.get(slot_number)
    if pin is None:
        logger.error(f"❌ No GPIO pin mapped for slot {slot_number}")
        return False

    logger.info(f"🔓 Unlocking slot {slot_number} (GPIO {pin}) for {duration}s")
    set_high(pin)

    def auto_lock():
        import time
        time.sleep(duration)
        set_low(pin)
        logger.info(f"🔒 Slot {slot_number} (GPIO {pin}) auto-locked")

    threading.Thread(target=auto_lock, daemon=True).start()
    return True


def cleanup_gpio():
    """Cleanup GPIO resources"""
    if _is_rpi and _gpio:
        try:
            _gpio.cleanup()
            logger.info("🧹 GPIO Cleaned up")
        except Exception as e:
            logger.error(f"❌ GPIO Cleanup Error: {e}")


# Auto-setup on import
setup_gpio()
