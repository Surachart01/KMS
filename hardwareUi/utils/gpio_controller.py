"""
GPIO Controller for Raspberry Pi
Handles GPIO operations safely, with mock support for non-Pi environments.
"""

import logging
import platform

# Configure logging
logger = logging.getLogger(__name__)

# Constants
RELAY_PIN = 21

class GPIOController:
    """Controller for Raspberry Pi GPIO"""
    
    def __init__(self):
        self.is_rpi = False
        self.gpio = None
        self._setup()
    
    def _setup(self):
        """Initialize GPIO"""
        try:
            # Check if running on Raspberry Pi
            # Simple check: try to import RPi.GPIO
            import RPi.GPIO as GPIO
            self.gpio = GPIO
            self.is_rpi = True
            
            # Setup GPIO mode
            self.gpio.setmode(self.gpio.BCM)
            self.gpio.setwarnings(False)
            
            # Setup Relay Pin as Output and set to LOW initially
            self.gpio.setup(RELAY_PIN, self.gpio.OUT)
            self.gpio.output(RELAY_PIN, self.gpio.LOW)
            
            logger.info(f"✅ GPIO Initialized (Pin {RELAY_PIN} as OUTPUT)")
            
        except (ImportError, RuntimeError):
            # Not running on Pi or library not found
            self.is_rpi = False
            logger.warning("⚠️ RPi.GPIO not found. Running in MOCK mode.")
    
    def set_high(self):
        """Set GPIO 21 to HIGH"""
        if self.is_rpi and self.gpio:
            try:
                self.gpio.output(RELAY_PIN, self.gpio.HIGH)
                logger.info(f"⚡ GPIO {RELAY_PIN} set to HIGH")
                return True
            except Exception as e:
                logger.error(f"❌ GPIO Error: {e}")
                return False
        else:
            logger.info(f"⚡ [MOCK] GPIO {RELAY_PIN} set to HIGH")
            return True
            
    def set_low(self):
        """Set GPIO 21 to LOW"""
        if self.is_rpi and self.gpio:
            try:
                self.gpio.output(RELAY_PIN, self.gpio.LOW)
                logger.info(f"⚪ GPIO {RELAY_PIN} set to LOW")
                return True
            except Exception as e:
                logger.error(f"❌ GPIO Error: {e}")
                return False
        else:
            logger.info(f"⚪ [MOCK] GPIO {RELAY_PIN} set to LOW")
            return True

    def cleanup(self):
        """Cleanup GPIO resources"""
        if self.is_rpi and self.gpio:
            try:
                self.gpio.cleanup()
                logger.info("🧹 GPIO Cleaned up")
            except Exception as e:
                logger.error(f"❌ GPIO Cleanup Error: {e}")

# Singleton instance
gpio_controller = GPIOController()
