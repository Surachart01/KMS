#!/bin/bash
# =============================================
# Migration Script: Switch Hardware Service to Python
# =============================================
# วิธีใช้: chmod +x migrate-to-python.sh && sudo ./migrate-to-python.sh

set -e

USER_NAME=$(logname)
GPIO_DIR="/home/${USER_NAME}/Desktop/KMS/hardwareUi/gpio"
SERVICE_FILE="/etc/systemd/system/kiosk-hardware.service"

echo "🚀 Starting migration to Python Hardware Service..."

# 1. Install Python dependencies
echo "📦 Installing Python dependencies..."
apt-get update -qq
apt-get install -y -qq python3-pip python3-rpi-lgpio
sudo -u "${USER_NAME}" pip3 install python-socketio[client] mfrc522 gpiozero python-dotenv --break-system-packages || \
sudo -u "${USER_NAME}" pip3 install python-socketio[client] mfrc522 gpiozero python-dotenv

# 2. Stop old service
echo "🛑 Stopping old Node.js hardware service..."
systemctl stop kiosk-hardware.service || true

# 3. Update systemd service file
echo "⚙️  Updating systemd service configuration..."
cat > "${SERVICE_FILE}" << EOF
[Unit]
Description=Hardware Service (Python) - NFC Reader + Solenoid Controller
After=network.target kiosk-ui.service

[Service]
Type=simple
User=${USER_NAME}
WorkingDirectory=${GPIO_DIR}
ExecStart=/usr/bin/python3 hardware_service.py
Restart=always
RestartSec=5
Environment=PYTHONUNBUFFERED=1
Environment=PATH=/usr/local/bin:/usr/bin:/bin

[Install]
WantedBy=multi-user.target
EOF

# 4. Reload and Start
echo "🔄 Reloading systemd and starting new service..."
systemctl daemon-reload
systemctl enable kiosk-hardware.service
systemctl start kiosk-hardware.service

echo ""
echo "============================================="
echo "✅ Migration Complete!"
echo "============================================="
echo "The hardware service is now running using Python 3."
echo "Check status with: sudo systemctl status kiosk-hardware"
echo "============================================="
