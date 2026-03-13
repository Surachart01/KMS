#!/bin/bash
# =============================================
# Kiosk Mode Setup Script for Raspberry Pi 5
# =============================================
# วิธีใช้: chmod +x setup-kiosk.sh && sudo ./setup-kiosk.sh
#
# สิ่งที่ script นี้ทำ:
# 1. ติดตั้ง dependencies (chromium, unclutter, xdotool)
# 2. สร้าง systemd service สำหรับ Kiosk UI (Vite dev server)
# 3. สร้าง systemd service สำหรับ GPIO Service
# 4. สร้าง autostart สำหรับ Chromium Kiosk Mode
# 5. ปิด screen saver / screen blank
# =============================================

set -e

# === Config ===
KIOSK_URL="http://localhost:5173"
HARDWARE_UI_DIR="/home/$(logname)/Desktop/KMS/hardwareUi"
GPIO_DIR="${HARDWARE_UI_DIR}/gpio"
USER_NAME=$(logname)

echo "============================================="
echo "🖥️  Raspberry Pi 5 — Kiosk Mode Setup"
echo "============================================="
echo "User: ${USER_NAME}"
echo "Kiosk URL: ${KIOSK_URL}"
echo "HardwareUI Dir: ${HARDWARE_UI_DIR}"
echo ""

# === Step 1: Install dependencies ===
echo "📦 Step 1: Installing dependencies..."
apt-get update -qq
# Check if Chromium is already installed
if command -v chromium-browser >/dev/null 2>&1 || command -v chromium >/dev/null 2>&1; then
    echo "✅ Chromium already installed."
    apt-get install -y -qq unclutter xdotool
else
    echo "⚠️ Chromium not found, attempting installation..."
    if ! apt-get install -y -qq chromium-browser unclutter xdotool; then
        echo "⚠️ 'chromium-browser' failed, trying 'chromium'..."
        apt-get install -y -qq chromium unclutter xdotool
    fi
fi

# === Step 1.5: Install Python deps for NFC (Pi 5 friendly) ===
echo "🐍 Step 1.5: Installing Python NFC dependencies..."
apt-get install -y -qq python3-lgpio python3-spidev

# === Step 2: Install Node.js dependencies ===
echo "📦 Step 2: Installing Node.js dependencies..."
cd "${HARDWARE_UI_DIR}" && sudo -u "${USER_NAME}" npm install
cd "${GPIO_DIR}" && sudo -u "${USER_NAME}" npm install

# === Step 3: Create systemd service for Kiosk UI (Vite) ===
echo "⚙️  Step 3: Creating kiosk-ui service..."
cat > /etc/systemd/system/kiosk-ui.service << EOF
[Unit]
Description=Kiosk UI - Vite Dev Server
After=network.target

[Service]
Type=simple
User=${USER_NAME}
WorkingDirectory=${HARDWARE_UI_DIR}
ExecStart=/usr/bin/npm run dev
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PATH=/usr/local/bin:/usr/bin:/bin

[Install]
WantedBy=multi-user.target
EOF

# === Step 4: Create systemd service for Hardware (NFC + GPIO combined) ===
echo "⚙️  Step 4: Creating kiosk-hardware service (NFC + GPIO)..."
cat > /etc/systemd/system/kiosk-hardware.service << EOF
[Unit]
Description=Hardware Service - NFC Reader + Solenoid Controller
After=network.target kiosk-ui.service

[Service]
Type=simple
User=${USER_NAME}
WorkingDirectory=${GPIO_DIR}
ExecStart=/usr/bin/node hardware.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PATH=/usr/local/bin:/usr/bin:/bin

[Install]
WantedBy=multi-user.target
EOF

# === Step 6: Create Chromium kiosk autostart ===
echo "🖥️  Step 6: Setting up Chromium kiosk autostart..."
AUTOSTART_DIR="/home/${USER_NAME}/.config/autostart"
mkdir -p "${AUTOSTART_DIR}"

cat > "${AUTOSTART_DIR}/kiosk-chromium.desktop" << EOF
[Desktop Entry]
Type=Application
Name=Kiosk Chromium
Comment=Open Chromium in kiosk mode
Exec=/bin/bash /home/${USER_NAME}/kiosk-start.sh
X-GNOME-Autostart-enabled=true
EOF

# === Step 7: Create kiosk start script ===
echo "📜 Step 7: Creating kiosk start script..."
cat > "/home/${USER_NAME}/kiosk-start.sh" << 'SCRIPT'
#!/bin/bash
# รอให้ Vite server พร้อมก่อน (timeout 30 วินาที)
echo "⏳ Waiting for Kiosk UI server..."
for i in $(seq 1 30); do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo "✅ Server ready!"
        break
    fi
    sleep 1
done

# ซ่อน cursor เมื่อไม่ขยับ 3 วินาที
unclutter -idle 3 -root &

# ปิด screen saver
xset s off
xset s noblank
xset -dpms

# เปิด Chromium kiosk mode
if command -v chromium-browser >/dev/null 2>&1; then
  BROWSER="chromium-browser"
else
  BROWSER="chromium"
fi

$BROWSER \
    --kiosk \
    --noerrdialogs \
    --disable-infobars \
    --disable-translate \
    --disable-features=TranslateUI \
    --disable-session-crashed-bubble \
    --disable-restore-session-state \
    --disable-component-update \
    --check-for-update-interval=31536000 \
    --no-first-run \
    --start-fullscreen \
    --incognito \
    --autoplay-policy=no-user-gesture-required \
    http://localhost:5173
SCRIPT

chmod +x "/home/${USER_NAME}/kiosk-start.sh"
chown "${USER_NAME}:${USER_NAME}" "/home/${USER_NAME}/kiosk-start.sh"
chown "${USER_NAME}:${USER_NAME}" "${AUTOSTART_DIR}/kiosk-chromium.desktop"

# === Step 8: Disable screen blanking globally ===
echo "🔆 Step 8: Disabling screen blanking..."
# สำหรับ Wayland/Labwc (default RPi 5)
LABWC_DIR="/home/${USER_NAME}/.config/labwc"
if [ -d "${LABWC_DIR}" ]; then
    # Disable idle in labwc
    if [ -f "${LABWC_DIR}/rc.xml" ]; then
        sed -i 's/<screenSaverTime>.*</<screenSaverTime>0</' "${LABWC_DIR}/rc.xml" 2>/dev/null || true
    fi
fi

# สำหรับ X11 (fallback)
LIGHTDM_CONF="/etc/lightdm/lightdm.conf"
if [ -f "${LIGHTDM_CONF}" ]; then
    if ! grep -q "xserver-command" "${LIGHTDM_CONF}"; then
        sed -i '/\[Seat:\*\]/a xserver-command=X -s 0 -dpms' "${LIGHTDM_CONF}" 2>/dev/null || true
    fi
fi

# === Step 9: Enable services ===
echo "🚀 Step 9: Enabling services..."
systemctl daemon-reload
systemctl enable kiosk-ui.service
systemctl enable kiosk-hardware.service

echo ""
echo "============================================="
echo "✅ Kiosk Mode Setup Complete!"
echo "============================================="
echo ""
echo "Services created:"
echo "  • kiosk-ui.service       (Vite dev server)"
echo "  • kiosk-hardware.service (NFC + GPIO combined)"
echo "  • Chromium autostart     (kiosk mode)"
echo ""
echo "Commands:"
echo "  sudo systemctl start kiosk-ui          # Start UI server"
echo "  sudo systemctl start kiosk-hardware    # Start Hardware (NFC+GPIO)"
echo "  sudo systemctl status kiosk-hardware   # Check status"
echo ""
echo "🔄 Reboot to test: sudo reboot"
echo ""
