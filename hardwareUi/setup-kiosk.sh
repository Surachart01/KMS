#!/bin/bash
# =============================================
# KMS — Raspberry Pi 5 Kiosk Full Setup
# =============================================
# รวมทุกอย่างในไฟล์เดียว:
#   1. System update + Node.js 20
#   2. npm install (Frontend + GPIO service)
#   3. USB Serial permissions (ESP8266)
#   4. Disable serial console (GPIO 14/15 → Relay)
#   5. Systemd services (UI + Hardware auto-start)
#   6. Chromium kiosk mode (fullscreen)
#   7. Disable screen blanking
#
# วิธีใช้:
#   chmod +x setup-kiosk.sh && sudo ./setup-kiosk.sh
# =============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

HARDWARE_UI_DIR="$(cd "$(dirname "$0")" && pwd)"
GPIO_DIR="${HARDWARE_UI_DIR}/gpio"
ESP_DIR="${HARDWARE_UI_DIR}/../esp8266"
USER_NAME=$(logname)
HOME_DIR="/home/${USER_NAME}"

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  KMS — Raspberry Pi 5 Kiosk Full Setup          ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║  Frontend  : Kiosk UI (React + Vite)            ║${NC}"
echo -e "${CYAN}║  Hardware  : GPIO Relay + NFC (ESP8266 ×3)      ║${NC}"
echo -e "${CYAN}║  Backend   : External server (URL ระบุด้านล่าง)  ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "📂 HardwareUI: ${YELLOW}${HARDWARE_UI_DIR}${NC}"
echo -e "📂 GPIO:       ${YELLOW}${GPIO_DIR}${NC}"
echo -e "👤 User:       ${YELLOW}${USER_NAME}${NC}"
echo ""

# ── ถาม Backend URL ──
DEFAULT_BACKEND_URL="http://localhost:4556"
read -p "🌐 Backend URL (เช่น http://192.168.1.100:4556): " BACKEND_INPUT
BACKEND_URL="${BACKEND_INPUT:-$DEFAULT_BACKEND_URL}"

# ── ถาม Hardware Token ──
DEFAULT_TOKEN=",7'9hv'dkivtwi"
read -p "🔑 Hardware Token (กด Enter ใช้ default): " TOKEN_INPUT
HW_TOKEN="${TOKEN_INPUT:-$DEFAULT_TOKEN}"

echo ""
echo -e "   Backend URL:     ${GREEN}$BACKEND_URL${NC}"
echo -e "   Hardware Token:  ${GREEN}(set)${NC}"
echo ""
read -p "กด Enter เพื่อเริ่มติดตั้ง... " _

# ─────────────────────────────────────────────────
# 1. System Update + Dependencies
# ─────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━ [1/7] System Update + Dependencies ━━━${NC}"
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq git curl wget build-essential python3 python3-pip python3-venv

# Chromium + kiosk tools
if command -v chromium-browser >/dev/null 2>&1 || command -v chromium >/dev/null 2>&1; then
    echo "✅ Chromium already installed"
else
    apt-get install -y -qq chromium-browser || apt-get install -y -qq chromium
fi
apt-get install -y -qq unclutter xdotool

# Node.js 20
if command -v node >/dev/null 2>&1; then
    echo "✅ Node.js already installed ($(node -v))"
else
    echo "📦 Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y -qq nodejs
fi

echo -e "✅ Node $(node -v) | npm $(npm -v)"

# ─────────────────────────────────────────────────
# 2. NPM Install (Frontend + GPIO)
# ─────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━ [2/7] NPM Install ━━━${NC}"

cd "${HARDWARE_UI_DIR}"
sudo -u "${USER_NAME}" npm install
echo "✅ Kiosk UI (React+Vite) installed"

cd "${GPIO_DIR}"
sudo -u "${USER_NAME}" npm install
echo "✅ GPIO service installed"

# ─────────────────────────────────────────────────
# 3. Config Files (.env)
# ─────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━ [3/7] Config Files ━━━${NC}"

# GPIO .env
cat > "${GPIO_DIR}/.env" << EOF
BACKEND_URL=${BACKEND_URL}
HARDWARE_TOKEN=${HW_TOKEN}
RELAY_ACTIVE_STATE=LOW
EOF
chown "${USER_NAME}:${USER_NAME}" "${GPIO_DIR}/.env"
echo "✅ gpio/.env → BACKEND_URL=${BACKEND_URL}"

# Vite .env (Frontend ใช้ VITE_ prefix)
cat > "${HARDWARE_UI_DIR}/.env" << EOF
VITE_BACKEND_URL=${BACKEND_URL}
EOF
chown "${USER_NAME}:${USER_NAME}" "${HARDWARE_UI_DIR}/.env"
echo "✅ hardwareUi/.env → VITE_BACKEND_URL=${BACKEND_URL}"

# ─────────────────────────────────────────────────
# 4. USB Serial Permissions (ESP8266)
# ─────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━ [4/7] USB Serial (ESP8266) ━━━${NC}"

# dialout group
if ! groups "${USER_NAME}" | grep -q dialout; then
    usermod -aG dialout "${USER_NAME}"
    echo "✅ Added ${USER_NAME} to dialout group"
else
    echo "✅ ${USER_NAME} already in dialout group"
fi

# udev rules (CH340 + CP210x)
UDEV_FILE="/etc/udev/rules.d/99-esp8266.rules"
cat > "$UDEV_FILE" << 'EOF'
# CH340 (NodeMCU v2)
SUBSYSTEM=="tty", ATTRS{idVendor}=="1a86", ATTRS{idProduct}=="7523", MODE="0666"
# CP210x
SUBSYSTEM=="tty", ATTRS{idVendor}=="10c4", ATTRS{idProduct}=="ea60", MODE="0666"
# FTDI
SUBSYSTEM=="tty", ATTRS{idVendor}=="0403", ATTRS{idProduct}=="6001", MODE="0666"
EOF
udevadm control --reload-rules
udevadm trigger
echo "✅ udev rules (CH340/CP210x/FTDI)"

# ─────────────────────────────────────────────────
# 5. Disable Serial Console (GPIO 14/15 → Relay)
# ─────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━ [5/7] Disable Serial Console ━━━${NC}"

CMDLINE="/boot/firmware/cmdline.txt"
[ ! -f "$CMDLINE" ] && CMDLINE="/boot/cmdline.txt"

if grep -q "console=serial0" "$CMDLINE" 2>/dev/null; then
    sed -i 's/console=serial0,[0-9]* //g' "$CMDLINE"
    echo "✅ Serial console disabled (GPIO 14/15 free)"
else
    echo "✅ Serial console already disabled"
fi

systemctl disable serial-getty@ttyAMA0.service 2>/dev/null || true
systemctl stop serial-getty@ttyAMA0.service 2>/dev/null || true

# ─────────────────────────────────────────────────
# 6. Systemd Services (Auto-start on boot)
# ─────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━ [6/7] Systemd Services ━━━${NC}"

# ── Kiosk UI (Vite dev server) ──
cat > /etc/systemd/system/kiosk-ui.service << EOF
[Unit]
Description=KMS Kiosk UI (Vite Dev Server)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${USER_NAME}
WorkingDirectory=${HARDWARE_UI_DIR}
ExecStart=/usr/bin/npm run dev
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=VITE_BACKEND_URL=${BACKEND_URL}
Environment=PATH=/usr/local/bin:/usr/bin:/bin

[Install]
WantedBy=multi-user.target
EOF
echo "✅ kiosk-ui.service (Vite → port 5173)"

# ── Hardware Service (GPIO + NFC via ESP8266) ──
cat > /etc/systemd/system/kiosk-hardware.service << EOF
[Unit]
Description=KMS Hardware Service (GPIO + NFC via ESP8266)
After=network-online.target kiosk-ui.service
Wants=network-online.target

[Service]
Type=simple
User=${USER_NAME}
WorkingDirectory=${GPIO_DIR}
ExecStart=/usr/bin/node hardware.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=BACKEND_URL=${BACKEND_URL}
Environment=HARDWARE_TOKEN=${HW_TOKEN}
Environment=RELAY_ACTIVE_STATE=LOW
Environment=PATH=/usr/local/bin:/usr/bin:/bin

[Install]
WantedBy=multi-user.target
EOF
echo "✅ kiosk-hardware.service (GPIO + ESP8266 NFC)"

# ── Chromium Kiosk Autostart ──
AUTOSTART_DIR="${HOME_DIR}/.config/autostart"
mkdir -p "${AUTOSTART_DIR}"

cat > "${AUTOSTART_DIR}/kiosk-chromium.desktop" << EOF
[Desktop Entry]
Type=Application
Name=KMS Kiosk Browser
Comment=Chromium kiosk mode for KMS
Exec=/bin/bash ${HOME_DIR}/kiosk-start.sh
X-GNOME-Autostart-enabled=true
EOF
chown "${USER_NAME}:${USER_NAME}" "${AUTOSTART_DIR}/kiosk-chromium.desktop"

# ── Kiosk Start Script ──
cat > "${HOME_DIR}/kiosk-start.sh" << 'SCRIPT'
#!/bin/bash
# รอ Vite server พร้อม (timeout 60 วินาที)
echo "⏳ Waiting for Kiosk UI..."
for i in $(seq 1 60); do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo "✅ UI ready!"
        break
    fi
    sleep 1
done

# ซ่อน cursor
unclutter -idle 3 -root &

# ปิด screen saver
xset s off 2>/dev/null || true
xset s noblank 2>/dev/null || true
xset -dpms 2>/dev/null || true

# เลือก Chromium
if command -v chromium-browser >/dev/null 2>&1; then
    BROWSER="chromium-browser"
else
    BROWSER="chromium"
fi

exec $BROWSER \
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
chmod +x "${HOME_DIR}/kiosk-start.sh"
chown "${USER_NAME}:${USER_NAME}" "${HOME_DIR}/kiosk-start.sh"
echo "✅ Chromium kiosk autostart"

# Enable services
systemctl daemon-reload
systemctl enable kiosk-ui.service
systemctl enable kiosk-hardware.service

# ─────────────────────────────────────────────────
# 7. Disable Screen Blanking
# ─────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━ [7/7] Disable Screen Blanking ━━━${NC}"

# Wayland/Labwc (RPi 5 default)
LABWC_DIR="${HOME_DIR}/.config/labwc"
if [ -d "${LABWC_DIR}" ] && [ -f "${LABWC_DIR}/rc.xml" ]; then
    sed -i 's/<screenSaverTime>.*</<screenSaverTime>0</' "${LABWC_DIR}/rc.xml" 2>/dev/null || true
    echo "✅ Labwc screen saver disabled"
fi

# X11 fallback
LIGHTDM_CONF="/etc/lightdm/lightdm.conf"
if [ -f "${LIGHTDM_CONF}" ]; then
    if ! grep -q "xserver-command" "${LIGHTDM_CONF}"; then
        sed -i '/\[Seat:\*\]/a xserver-command=X -s 0 -dpms' "${LIGHTDM_CONF}" 2>/dev/null || true
    fi
    echo "✅ LightDM screen blanking disabled"
fi

# ─────────────────────────────────────────────────
# Done!
# ─────────────────────────────────────────────────
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  ✅ Kiosk Setup Complete!                       ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║                                                  ║${NC}"
echo -e "${CYAN}║  Services ที่จะ auto-start:                      ║${NC}"
echo -e "${CYAN}║  • kiosk-ui       → Vite (port 5173)            ║${NC}"
echo -e "${CYAN}║  • kiosk-hardware → GPIO + NFC (ESP8266)        ║${NC}"
echo -e "${CYAN}║  • Chromium       → Fullscreen kiosk mode       ║${NC}"
echo -e "${CYAN}║                                                  ║${NC}"
echo -e "${CYAN}║  Backend: $BACKEND_URL${NC}"
echo -e "${CYAN}║                                                  ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║  Commands:                                       ║${NC}"
echo -e "${CYAN}║  sudo systemctl status kiosk-ui                  ║${NC}"
echo -e "${CYAN}║  sudo systemctl status kiosk-hardware            ║${NC}"
echo -e "${CYAN}║  sudo journalctl -u kiosk-hardware -f            ║${NC}"
echo -e "${CYAN}║                                                  ║${NC}"
echo -e "${CYAN}║  Flash ESP8266 (ครั้งแรก):                       ║${NC}"
echo -e "${CYAN}║  cd esp8266 && bash setup_and_flash.sh           ║${NC}"
echo -e "${CYAN}║                                                  ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}⚠️  กรุณา reboot เพื่อเริ่ม kiosk mode:${NC}"
echo -e "   ${RED}sudo reboot${NC}"
echo ""
