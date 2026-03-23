#!/bin/bash
# ============================================================
#  setup_and_flash.sh — ติดตั้ง PlatformIO + Flash ESP8266 ×3
#  รันบน Raspberry Pi: bash setup_and_flash.sh
# ============================================================

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PIO_VENV="$HOME/.pio-venv"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  ESP8266 NFC Setup & Flash Script            ║"
echo "║  Board A: slots 1-4 (4 NFC)                 ║"
echo "║  Board B: slots 5-7 (3 NFC)                 ║"
echo "║  Board C: slots 8-10 (3 NFC)                ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── 1. ติดตั้ง dependencies ──────────────────────────────────
echo "━━━ [1/5] ติดตั้ง system dependencies ━━━"
sudo apt update -qq
sudo apt install -y python3 python3-pip python3-venv git

# ── 2. ตั้งค่า udev rules + user group ──────────────────────
echo ""
echo "━━━ [2/5] ตั้งค่า USB serial permissions ━━━"

# เพิ่ม user เข้า dialout group (เข้าถึง /dev/ttyUSB*)
if ! groups "$USER" | grep -q dialout; then
    sudo usermod -aG dialout "$USER"
    echo "✅ Added $USER to dialout group"
else
    echo "✅ $USER already in dialout group"
fi

# udev rules สำหรับ CH340 (ESP8266 USB-Serial)
UDEV_RULE='SUBSYSTEM=="tty", ATTRS{idVendor}=="1a86", ATTRS{idProduct}=="7523", MODE="0666"'
UDEV_FILE="/etc/udev/rules.d/99-esp8266.rules"
if [ ! -f "$UDEV_FILE" ]; then
    echo "$UDEV_RULE" | sudo tee "$UDEV_FILE" > /dev/null
    sudo udevadm control --reload-rules
    sudo udevadm trigger
    echo "✅ udev rules created"
else
    echo "✅ udev rules already exist"
fi

# ── 3. ติดตั้ง PlatformIO ────────────────────────────────────
echo ""
echo "━━━ [3/5] ติดตั้ง PlatformIO CLI ━━━"

if [ ! -d "$PIO_VENV" ]; then
    python3 -m venv "$PIO_VENV"
    echo "✅ Created virtualenv: $PIO_VENV"
fi

source "$PIO_VENV/bin/activate"

if ! command -v pio &> /dev/null; then
    pip install -q --upgrade pip
    pip install -q platformio
    echo "✅ PlatformIO installed"
else
    echo "✅ PlatformIO already installed ($(pio --version))"
fi

# ── 4. ติดตั้ง ESP8266 platform (ดาวน์โหลดล่วงหน้า) ─────────
echo ""
echo "━━━ [4/5] ติดตั้ง ESP8266 platform + dependencies ━━━"

cd "$SCRIPT_DIR"
echo "📂 Working directory: $SCRIPT_DIR"

# ตรวจว่ามี platformio.ini
if [ ! -f "platformio.ini" ]; then
    echo "❌ ไม่พบ platformio.ini ใน $SCRIPT_DIR"
    echo "   ให้รัน script นี้จากโฟลเดอร์ esp8266/"
    exit 1
fi

# Pre-install platform + libraries
pio pkg install --environment board_a 2>/dev/null || true
echo "✅ ESP8266 platform ready"

# ── 5. Flash ESP8266 ทั้ง 3 ตัว ──────────────────────────────
echo ""
echo "━━━ [5/5] Flash ESP8266 boards ━━━"
echo ""

BOARDS=("board_a:slots 1-4 (4 NFC)" "board_b:slots 5-7 (3 NFC)" "board_c:slots 8-10 (3 NFC)")
BOARD_NUM=0

for entry in "${BOARDS[@]}"; do
    ENV="${entry%%:*}"
    DESC="${entry#*:}"
    BOARD_NUM=$((BOARD_NUM + 1))

    echo "┌─────────────────────────────────────────────┐"
    echo "│  Board $BOARD_NUM ($ENV) — $DESC"
    echo "└─────────────────────────────────────────────┘"
    echo ""

    # ตรวจว่ามี ESP8266 เสียบอยู่หรือไม่
    USB_DEVICES=$(ls /dev/ttyUSB* 2>/dev/null || true)
    if [ -z "$USB_DEVICES" ]; then
        echo "⚠️  ไม่พบ /dev/ttyUSB* — กรุณาเสียบ ESP8266 ตัวที่ $BOARD_NUM"
    else
        echo "📟 พบ USB devices: $USB_DEVICES"
    fi

    echo ""
    read -p "👉 เสียบ ESP8266 ตัวที่ $BOARD_NUM แล้วกด Enter เพื่อ flash... " _

    echo "⏳ Compiling & uploading $ENV..."
    if pio run -e "$ENV" -t upload; then
        echo "✅ Board $BOARD_NUM ($ENV) flash สำเร็จ!"
    else
        echo "❌ Board $BOARD_NUM ($ENV) flash ล้มเหลว!"
        echo "   ลองตรวจสอบ:"
        echo "   - เสียบ ESP8266 ถูกพอร์ตหรือไม่"
        echo "   - กด FLASH button ค้างตอน flash (บาง board)"
        echo ""
        read -p "   กด Enter เพื่อข้ามไปตัวถัดไป หรือ Ctrl+C เพื่อหยุด... " _
    fi
    echo ""
done

# ── สรุป ─────────────────────────────────────────────────────
echo "╔══════════════════════════════════════════════╗"
echo "║  ✅ Setup & Flash เสร็จสมบูรณ์!              ║"
echo "╠══════════════════════════════════════════════╣"
echo "║  ขั้นตอนถัดไป:                                ║"
echo "║  1. เสียบ ESP8266 ทั้ง 3 ตัวเข้า RPi          ║"
echo "║  2. cd ../hardwareUi/gpio                    ║"
echo "║  3. npm install                              ║"
echo "║  4. node hardware.js                         ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "💡 หลังจากนี้ใช้ PlatformIO:"
echo "   source $PIO_VENV/bin/activate && pio run -e board_a -t upload"
echo ""
