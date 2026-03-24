#!/bin/bash
# Systemd script to force GPIO pins to OUTPUT HIGH extremely early at boot
# This prevents the 12V Relay voltage divider issue (6V floating state).

SOLENOID_PINS="14,15,18,23,24,25,8,7,12,16"
LED_PINS="4,17,27,22,10,9,11,6,0,5"

echo "Forcing Solenoid pins to OUTPUT HIGH..."
pinctrl set $SOLENOID_PINS op dh

echo "Forcing LED pins to OUTPUT HIGH..."
pinctrl set $LED_PINS op dh

echo "Kiosk GPIO pins initialized successfully."
