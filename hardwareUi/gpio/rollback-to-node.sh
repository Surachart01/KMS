#!/bin/bash
# =============================================
# Rollback Script: Python -> NodeJS Hardware Service
# =============================================

echo "🔄 Stopping Python Hardware Service..."
sudo systemctl stop kiosk-hardware

echo "⚙️  Reverting systemd service to NodeJS..."
cat << EOF | sudo tee /etc/systemd/system/kiosk-hardware.service > /dev/null
[Unit]
Description=Hardware Service - NFC Reader + Solenoid Controller
After=network.target kiosk-ui.service

[Service]
Type=simple
User=admin
WorkingDirectory=/home/admin/Desktop/KMS/hardwareUi/gpio
ExecStart=/usr/bin/node hardware.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PATH=/usr/local/bin:/usr/bin:/bin

[Install]
WantedBy=multi-user.target
EOF

echo "♻️  Reloading systemd daemon..."
sudo systemctl daemon-reload

echo "📦 Ensuring NodeJS dependencies are installed..."
cd /home/admin/Desktop/KMS/hardwareUi/gpio
npm install

echo "🚀 Starting NodeJS Hardware Service..."
sudo systemctl start kiosk-hardware

echo "✅ Rollback complete! Please check status:"
sudo systemctl status kiosk-hardware
