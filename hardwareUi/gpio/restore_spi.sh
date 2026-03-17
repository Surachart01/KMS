#!/bin/bash
# Restore normal SPI config (undo spi0-0cs)
# Usage: sudo bash restore_spi.sh && sudo reboot

CONFIG="/boot/firmware/config.txt"
if [ ! -f "$CONFIG" ]; then
    CONFIG="/boot/config.txt"
fi

echo "Config: $CONFIG"

# Remove spi0-0cs line
sed -i '/dtoverlay=spi0-0cs/d' "$CONFIG"
sed -i '/# SPI with no kernel-managed CS/d' "$CONFIG"

# Restore spi0-2cs if it was commented out
sed -i 's/^#dtoverlay=spi0-2cs/dtoverlay=spi0-2cs/' "$CONFIG"

echo "[OK] SPI config restored to default (CE0 + CE1 managed by kernel)"
echo "*** sudo reboot ***"
