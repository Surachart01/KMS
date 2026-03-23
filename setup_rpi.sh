#!/bin/bash
# ============================================================
#  Raspberry Pi 5 — KMS Hardware Setup (GPIO Service Only)
#  Backend อยู่ server ภายนอก — RPi ทำหน้าที่แค่ GPIO + NFC
#  รันบน RPi: bash setup_rpi.sh
# ============================================================

set -e
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GPIO_DIR="$SCRIPT_DIR/hardwareUi/gpio"

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  KMS — Raspberry Pi 5 Hardware Setup            ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║  RPi ทำหน้าที่:                                   ║${NC}"
echo -e "${CYAN}║  • GPIO Relay (Solenoid ×10 + LED ×20)          ║${NC}"
echo -e "${CYAN}║  • NFC อ่านผ่าน ESP8266 ×3 (USB Serial)         ║${NC}"
echo -e "${CYAN}║  • เชื่อมต่อ Backend server ภายนอก               ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║  1. System update                               ║${NC}"
echo -e "${CYAN}║  2. Node.js 20 LTS                              ║${NC}"
echo -e "${CYAN}║  3. GPIO Service (npm install)                   ║${NC}"
echo -e "${CYAN}║  4. USB Serial (ESP8266 permissions)             ║${NC}"
echo -e "${CYAN}║  5. Disable Serial Console (GPIO 14/15)          ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "📂 KMS directory: ${YELLOW}$SCRIPT_DIR${NC}"
echo ""

# ── ถาม Backend URL ──
DEFAULT_BACKEND_URL="http://localhost:4556"
read -p "🌐 Backend URL (กด Enter ถ้าเป็น $DEFAULT_BACKEND_URL): " BACKEND_INPUT
BACKEND_URL="${BACKEND_INPUT:-$DEFAULT_BACKEND_URL}"
echo -e "   Backend URL: ${GREEN}$BACKEND_URL${NC}"

# ── ถาม Hardware Token ──
DEFAULT_TOKEN=",7'9hv'dkivtwi"
read -p "🔑 Hardware Token (กด Enter ถ้าเป็นค่า default): " TOKEN_INPUT
HW_TOKEN="${TOKEN_INPUT:-$DEFAULT_TOKEN}"
echo ""

read -p "กด Enter เพื่อเริ่มติดตั้ง... " _

# ─────────────────────────────────────────────────
# 1. System Update
# ─────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━ [1/5] System Update ━━━${NC}"
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl wget build-essential python3 python3-pip python3-venv

# ─────────────────────────────────────────────────
# 2. Node.js 20 LTS
# ─────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━ [2/5] Node.js 20 LTS ━━━${NC}"

if command -v node &> /dev/null; then
    NODE_VER=$(node -v)
    echo -e "✅ Node.js already installed ($NODE_VER)"
else
    echo "📦 Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
    echo -e "✅ Node.js $(node -v) installed"
fi

echo -e "✅ Node $(node -v) | npm $(npm -v)"

# ─────────────────────────────────────────────────
# 3. GPIO Hardware Service
# ─────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━ [3/5] GPIO Hardware Service ━━━${NC}"

if [ ! -d "$GPIO_DIR" ]; then
    echo -e "${RED}❌ ไม่พบโฟลเดอร์ $GPIO_DIR${NC}"
    exit 1
fi

cd "$GPIO_DIR"

# สร้าง .env
cat > .env << EOF
BACKEND_URL=$BACKEND_URL
HARDWARE_TOKEN=$HW_TOKEN
RELAY_ACTIVE_STATE=LOW
EOF
echo -e "✅ Created gpio/.env"
echo -e "   BACKEND_URL=$BACKEND_URL"
echo -e "   RELAY_ACTIVE_STATE=LOW"

npm install
echo -e "✅ GPIO service npm install done"

# ─────────────────────────────────────────────────
# 4. USB Serial Permissions (ESP8266)
# ─────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━ [4/5] USB Serial Permissions ━━━${NC}"

# dialout group
if ! groups "$USER" | grep -q dialout; then
    sudo usermod -aG dialout "$USER"
    echo -e "✅ Added $USER to dialout group"
else
    echo -e "✅ $USER already in dialout group"
fi

# udev rules สำหรับ CH340 + CP210x
UDEV_FILE="/etc/udev/rules.d/99-esp8266.rules"
if [ ! -f "$UDEV_FILE" ]; then
    echo 'SUBSYSTEM=="tty", ATTRS{idVendor}=="1a86", ATTRS{idProduct}=="7523", MODE="0666"' | sudo tee "$UDEV_FILE" > /dev/null
    echo 'SUBSYSTEM=="tty", ATTRS{idVendor}=="10c4", ATTRS{idProduct}=="ea60", MODE="0666"' | sudo tee -a "$UDEV_FILE" > /dev/null
    sudo udevadm control --reload-rules
    sudo udevadm trigger
    echo -e "✅ udev rules created (CH340 + CP210x)"
else
    echo -e "✅ udev rules already exist"
fi

# ─────────────────────────────────────────────────
# 5. Disable Serial Console (GPIO 14/15 used for Relay)
# ─────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━ [5/5] Disable Serial Console ━━━${NC}"

# RPi 5 uses /boot/firmware/cmdline.txt
CMDLINE="/boot/firmware/cmdline.txt"
if [ ! -f "$CMDLINE" ]; then
    CMDLINE="/boot/cmdline.txt"
fi

if grep -q "console=serial0" "$CMDLINE" 2>/dev/null; then
    sudo sed -i 's/console=serial0,[0-9]* //g' "$CMDLINE"
    echo -e "✅ Serial console disabled in $CMDLINE"
else
    echo -e "✅ Serial console already disabled"
fi

sudo systemctl disable serial-getty@ttyAMA0.service 2>/dev/null || true
sudo systemctl stop serial-getty@ttyAMA0.service 2>/dev/null || true
echo -e "✅ Serial getty disabled"

# ─────────────────────────────────────────────────
# Done!
# ─────────────────────────────────────────────────
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  ✅ Setup เสร็จสมบูรณ์!                          ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║                                                  ║${NC}"
echo -e "${CYAN}║  📌 ขั้นตอนถัดไป:                                  ║${NC}"
echo -e "${CYAN}║                                                  ║${NC}"
echo -e "${CYAN}║  1. Reboot:                                     ║${NC}"
echo -e "${CYAN}║     sudo reboot                                  ║${NC}"
echo -e "${CYAN}║                                                  ║${NC}"
echo -e "${CYAN}║  2. เริ่ม GPIO Service:                           ║${NC}"
echo -e "${CYAN}║     cd hardwareUi/gpio && node hardware.js       ║${NC}"
echo -e "${CYAN}║                                                  ║${NC}"
echo -e "${CYAN}║  3. Flash ESP8266 (ถ้ายังไม่ได้):                 ║${NC}"
echo -e "${CYAN}║     cd esp8266 && bash setup_and_flash.sh        ║${NC}"
echo -e "${CYAN}║                                                  ║${NC}"
echo -e "${CYAN}║  Backend: $BACKEND_URL${NC}"
echo -e "${CYAN}║                                                  ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}⚠️  กรุณา reboot เพื่อให้ serial + group มีผล:${NC}"
echo -e "   ${RED}sudo reboot${NC}"
echo ""
