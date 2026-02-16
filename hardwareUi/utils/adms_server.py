"""
ADMS Server - Flask-based HTTP server to receive ZKTeco face scan data.
Module-level functions for server lifecycle.
"""

import threading
import logging
from flask import Flask, request

logger = logging.getLogger(__name__)

# Create Flask app with suppressed request logging
_flask_app = Flask(__name__)
_flask_app.logger.disabled = True

werkzeug_logger = logging.getLogger('werkzeug')
werkzeug_logger.setLevel(logging.ERROR)

# Module-level state
_callback = None
_is_running = False
_server_thread = None


def _parse_attlog(raw_data):
    """Parse ATTLOG data from ZKTeco device"""
    lines = raw_data.strip().splitlines()

    for line in lines:
        if not line.strip():
            continue

        parts = line.strip().split('\t')

        if len(parts) >= 4:
            user_id = parts[0].strip()
            timestamp = parts[1].strip() if len(parts) > 1 else ''
            verify_type = parts[3].strip() if len(parts) > 3 else ''

            print(f"✅ ATTLOG: User={user_id}, Time={timestamp}, Verify={verify_type}", flush=True)

            if verify_type == '15':
                print(f"😄 Face scan detected for user: {user_id}", flush=True)

            _trigger_callback(user_id)

        elif len(parts) >= 1:
            user_id = parts[0].strip()
            if user_id and user_id.isdigit():
                print(f"✅ ATTLOG User: {user_id}", flush=True)
                _trigger_callback(user_id)


def _trigger_callback(user_id):
    """Internal: trigger the callback safely"""
    if _callback and user_id:
        print(f"🎯 Triggering callback with User ID: {user_id}", flush=True)
        try:
            _callback(user_id)
        except Exception as e:
            print(f"❌ Error in callback: {e}", flush=True)
            logger.error(f"Error in callback: {e}")


# --- Register Flask routes ---

@_flask_app.route('/iclock/cdata', methods=['GET', 'POST'])
def handle_cdata():
    """Handle cdata requests - main endpoint for attendance data"""
    sn = request.args.get('SN', '')
    table = request.args.get('table', '')

    if request.method == 'GET':
        print(f"📥 GET /iclock/cdata (Device: {sn})", flush=True)
        return 'OK', 200

    try:
        raw_data = request.data.decode('utf-8', errors='ignore')
    except Exception:
        raw_data = str(request.data)

    print(f"📥 POST /iclock/cdata (Device: {sn}, Table: {table})", flush=True)
    print(f"📦 Data: {raw_data[:200]}", flush=True)

    if table == 'ATTLOG':
        _parse_attlog(raw_data)

    return 'OK', 200


@_flask_app.route('/iclock/registry', methods=['POST'])
def handle_registry():
    """Handle device registration"""
    sn = request.args.get('SN', '')
    print(f"📝 Device registered: {sn}", flush=True)
    return 'OK', 200


@_flask_app.route('/iclock/getrequest', methods=['GET'])
def handle_getrequest():
    """Handle getrequest endpoint"""
    return 'OK', 200


@_flask_app.route('/', defaults={'path': ''}, methods=['GET', 'POST'])
@_flask_app.route('/<path:path>', methods=['GET', 'POST'])
def catch_all(path):
    """Catch all other requests"""
    method = request.method
    print(f"🔍 {method} /{path}", flush=True)
    return 'OK', 200


# --- Public API ---

def start_adms(port=8089, callback=None):
    """Start the ADMS server"""
    global _callback, _is_running, _server_thread

    if _is_running:
        logger.warning("⚠️ ADMS Server is already running")
        return True

    _callback = callback

    try:
        def run_server():
            _flask_app.run(
                host='0.0.0.0',
                port=port,
                debug=False,
                use_reloader=False,
                threaded=True,
            )

        _server_thread = threading.Thread(target=run_server, daemon=True)
        _server_thread.start()
        _is_running = True

        logger.info(f"🚀 ADMS Server started on port {port}")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to start ADMS server: {e}")
        _is_running = False
        return False


def stop_adms():
    """Stop the ADMS server"""
    global _is_running
    _is_running = False
    logger.info("🛑 ADMS Server stopping...")


def set_adms_callback(callback):
    """Set the callback function for scan data"""
    global _callback
    _callback = callback
    logger.info("📡 Scan callback updated")
