#!/bin/bash
# Setup SPI with NO kernel-managed CS pins (needed for software CS on RPi 5)
# This allows our Python code to control CS pins via GPIO freely.
#
# Usage: sudo bash setup_spi_no_cs.sh
# Then REBOOT the Raspberry Pi.

CONFIG="/boot/firmware/config.txt"
if [ ! -f "$CONFIG" ]; then
    CONFIG="/boot/config.txt"
fi

echo "Config file: $CONFIG"

# Check if already configured
if grep -q "dtoverlay=spi0-0cs" "$CONFIG"; then
    echo "[OK] dtoverlay=spi0-0cs already present"
else
    # Remove default spi0-2cs if present
    sed -i 's/^dtoverlay=spi0-2cs/#dtoverlay=spi0-2cs/' "$CONFIG"
    
    # Add spi0-0cs (no kernel CS management)
    echo "" >> "$CONFIG"
    echo "# SPI with no kernel-managed CS — use software CS via GPIO" >> "$CONFIG"
    echo "dtoverlay=spi0-0cs" >> "$CONFIG"
    echo "[ADDED] dtoverlay=spi0-0cs"
fi

echo ""
echo "*** REBOOT REQUIRED ***"
echo "Run: sudo reboot"
echo ""
echo "After reboot, /dev/spidev0.0 will work but kernel won't toggle CE0."
echo "Software CS via GPIO will work correctly."
