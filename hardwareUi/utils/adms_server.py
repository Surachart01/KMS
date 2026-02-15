"""
ADMS Server - Flask-based HTTP server to receive ZKTeco face scan data
"""

import threading
import logging
from flask import Flask, request

logger = logging.getLogger(__name__)

# Create Flask app with suppressed request logging
flask_app = Flask(__name__)
flask_app.logger.disabled = True

# Suppress werkzeug access logs
werkzeug_logger = logging.getLogger('werkzeug')
werkzeug_logger.setLevel(logging.ERROR)


class AdmsServer:
    """
    ADMS Server class to handle ZKTeco device communication via HTTP push
    """
    def __init__(self, port=8089, callback=None):
        self.port = port
        self.callback = callback
        self.server_thread = None
        self.is_running = False
        
        # Register routes
        self._register_routes()

    def _register_routes(self):
        """Register Flask routes"""
        
        @flask_app.route('/iclock/cdata', methods=['GET', 'POST'])
        def handle_cdata():
            """Handle cdata requests - main endpoint for attendance data"""
            sn = request.args.get('SN', '')
            table = request.args.get('table', '')
            
            if request.method == 'GET':
                # Device polling - just respond OK
                print(f"📥 GET /iclock/cdata (Device: {sn})", flush=True)
                return 'OK', 200
            
            # POST - receive data
            try:
                raw_data = request.data.decode('utf-8', errors='ignore')
            except:
                raw_data = str(request.data)
            
            print(f"📥 POST /iclock/cdata (Device: {sn}, Table: {table})", flush=True)
            print(f"📦 Data: {raw_data[:200]}", flush=True)
            
            # Check if it's ATTLOG (attendance log)
            if table == 'ATTLOG':
                self._parse_attlog(raw_data)
            
            return 'OK', 200
        
        @flask_app.route('/iclock/registry', methods=['POST'])
        def handle_registry():
            """Handle device registration"""
            sn = request.args.get('SN', '')
            print(f"📝 Device registered: {sn}", flush=True)
            return 'OK', 200
        
        @flask_app.route('/iclock/getrequest', methods=['GET'])
        def handle_getrequest():
            """Handle getrequest endpoint - device asking for commands"""
            return 'OK', 200
        
        @flask_app.route('/', defaults={'path': ''}, methods=['GET', 'POST'])
        @flask_app.route('/<path:path>', methods=['GET', 'POST'])
        def catch_all(path):
            """Catch all other requests"""
            method = request.method
            print(f"🔍 {method} /{path}", flush=True)
            return 'OK', 200

    def _parse_attlog(self, raw_data):
        """Parse ATTLOG data from ZKTeco device"""
        lines = raw_data.strip().splitlines()
        
        for line in lines:
            if not line.strip():
                continue
            
            # ATTLOG format (tab-separated):
            # user_id  timestamp  status  verify_type  ...
            parts = line.strip().split('\t')
            
            if len(parts) >= 4:
                user_id = parts[0].strip()
                timestamp = parts[1].strip() if len(parts) > 1 else ''
                status = parts[2].strip() if len(parts) > 2 else ''
                verify_type = parts[3].strip() if len(parts) > 3 else ''
                
                print(f"✅ ATTLOG: User={user_id}, Time={timestamp}, Verify={verify_type}", flush=True)
                
                # Verify type 15 = Face scan
                if verify_type == '15':
                    print(f"😄 Face scan detected for user: {user_id}", flush=True)
                
                # Trigger callback with user_id
                self._trigger_callback(user_id)
            elif len(parts) >= 1:
                # Try first field as user_id
                user_id = parts[0].strip()
                if user_id and user_id.isdigit():
                    print(f"✅ ATTLOG User: {user_id}", flush=True)
                    self._trigger_callback(user_id)

    def _trigger_callback(self, user_id):
        """Internal method to trigger the callback safely"""
        if self.callback and user_id:
            print(f"🎯 Triggering callback with User ID: {user_id}", flush=True)
            try:
                self.callback(user_id)
            except Exception as e:
                print(f"❌ Error in callback: {e}", flush=True)
                logger.error(f"Error in callback: {e}")

    def start(self):
        """Start the ADMS server"""
        if self.is_running:
            logger.warning("⚠️ ADMS Server is already running")
            return True

        try:
            def run_server():
                flask_app.run(
                    host='0.0.0.0',
                    port=self.port,
                    debug=False,
                    use_reloader=False,
                    threaded=True
                )
            
            self.server_thread = threading.Thread(target=run_server, daemon=True)
            self.server_thread.start()
            self.is_running = True
            
            logger.info(f"🚀 ADMS Server started on port {self.port}")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to start ADMS server: {e}")
            self.is_running = False
            return False

    def stop(self):
        """Stop the ADMS server"""
        self.is_running = False
        logger.info("🛑 ADMS Server stopping...")

    def set_callback(self, callback):
        """Set the callback function for when scan data is received"""
        self.callback = callback
        logger.info("📡 Scan callback updated")
