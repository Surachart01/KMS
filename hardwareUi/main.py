"""
Key Management Desktop Application
Main entry point — functional style
"""

import customtkinter as ctk
import logging
import sys
import os
import threading
from dotenv import load_dotenv

from utils.theme import COLORS, WINDOW
from utils import adms_server
from utils import api_client
from utils import gpio_controller

from pages.home_page import create_home_page
from pages.key_list_page import create_key_list_page
from pages.scan_waiting_page import create_scan_waiting_page
from pages.confirm_identity_page import create_confirm_identity_page
from pages.reason_page import create_reason_page
from pages.success_page import create_success_page

# ── Bootstrap ────────────────────────────────────────────────────
load_dotenv()

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
    force=True,
)
logging.getLogger("utils.adms_server").setLevel(logging.DEBUG)
logger = logging.getLogger(__name__)


# ── Main ─────────────────────────────────────────────────────────
def main():
    """Application entry-point (no classes)."""

    # --- CTk root window ---
    root = ctk.CTk()
    root.title("🔑 ระบบเบิกกุญแจ - Key Management System")
    root.geometry(f"{WINDOW['width']}x{WINDOW['height']}")
    root.minsize(WINDOW["min_width"], WINDOW["min_height"])
    root.overrideredirect(True)  # Remove title bar for kiosk mode
    ctk.set_appearance_mode("light")
    ctk.set_default_color_theme("blue")
    root.configure(fg_color=COLORS["bg_primary"])

    # --- Application state ---
    state = {
        "selected_key": None,
        "scanned_student_id": None,
        "current_page": "home",
        "adms_running": False,
    }

    adms_port = int(os.getenv("ADMS_PORT", "8089"))

    # --- Frame container ---
    container = ctk.CTkFrame(root, fg_color=COLORS["bg_primary"])
    container.pack(fill="both", expand=True)
    container.grid_rowconfigure(0, weight=1)
    container.grid_columnconfigure(0, weight=1)

    # --- Page registry: name → (frame, actions) ---
    pages = {}

    # ------------------------------------------------------------------
    # ADMS helpers — start / stop on demand
    # ------------------------------------------------------------------
    def start_adms_for_scan():
        """Start ADMS server to wait for a face scan"""
        if state["adms_running"]:
            logger.info("🔄 ADMS already running, updating callback")
            adms_server.set_adms_callback(on_scan_received)
            return
        if adms_server.start_adms(port=adms_port, callback=on_scan_received):
            state["adms_running"] = True
            logger.info("✅ ADMS Server started (waiting for scan)")
        else:
            logger.error("❌ Failed to start ADMS Server")

    def stop_adms_after_scan():
        """Stop ADMS server after scan received"""
        if state["adms_running"]:
            adms_server.stop_adms()
            state["adms_running"] = False
            logger.info("🛑 ADMS Server stopped")

    # ------------------------------------------------------------------
    # show_page — the single navigation function shared by all pages
    # ------------------------------------------------------------------
    def show_page(name):
        # Virtual page: scan_waiting in return mode
        if name == "scan_waiting_return":
            f, acts = pages["scan_waiting"]
            acts["set_mode"]("return")
            acts["start_animation"]()
            f.tkraise()
            state["current_page"] = "scan_waiting"
            # Start ADMS for return scan
            start_adms_for_scan()
            return

        if name not in pages:
            return

        state["current_page"] = name
        f, acts = pages[name]
        f.tkraise()

        # Page-specific side-effects
        if name == "key_list":
            acts["load_keys"]()
        elif name == "success":
            suc_acts = acts
            suc_acts["set_data"](state["scanned_student_id"], state["selected_key"])
            suc_acts["start_countdown"]()
        elif name == "home":
            state["selected_key"] = None
            state["scanned_student_id"] = None

    # ------------------------------------------------------------------
    # Callbacks wired between pages
    # ------------------------------------------------------------------
    def on_key_selected(key_data):
        logger.info(f"🔑 Key selected: {key_data}")
        state["selected_key"] = key_data

        _, acts = pages["scan_waiting"]
        acts["set_mode"]("borrow")
        acts["set_key"](key_data)
        show_page("scan_waiting")
        acts["start_animation"]()

        # Start ADMS to wait for face scan
        start_adms_for_scan()

    def on_reason_confirm(reason):
        logger.info(f"📝 Reason provided: {reason}")
        _, acts = pages["confirm_identity"]
        acts["process_borrow_with_reason"](reason)

    def handle_return_scan(user_id):
        logger.info(f"🔄 Processing return for user: {user_id}")
        _, scan_acts = pages["scan_waiting"]
        scan_acts["stop_animation"]()

        def run_return():
            success, result = api_client.return_key(user_id)
            if success:
                logger.info(f"✅ Return success: {result}")
                root.after(0, lambda: show_return_success(user_id, result))
            else:
                logger.error(f"❌ Return failed: {result}")
                root.after(0, lambda: show_error_popup(result))

        threading.Thread(target=run_return, daemon=True).start()

    def show_return_success(user_id, result_data):
        _, suc_acts = pages["success"]
        extra = result_data.get("data", {})
        suc_acts["set_data"](user_id, None, mode="return", extra_data=extra)
        show_page("success")
        suc_acts["start_countdown"]()

    def show_error_popup(message):
        if isinstance(message, dict):
            message = message.get("message", "เกิดข้อผิดพลาด")
        dialog = ctk.CTkToplevel(root)
        dialog.title("เกิดข้อผิดพลาด")
        dialog.geometry("400x200")
        dialog.transient(root)
        dialog.grab_set()

        ctk.CTkLabel(
            dialog, text=f"❌ เกิดข้อผิดพลาด:\n{message}", wraplength=350
        ).pack(expand=True, padx=20, pady=20)

        ctk.CTkButton(dialog, text="ตกลง", command=dialog.destroy).pack(pady=20)

    def on_scan_received(user_id):
        logger.info(f"👤 Scan received: User ID = {user_id}")
        if state["current_page"] != "scan_waiting":
            logger.warning(
                f"⚠️ Scan ignored (Not in waiting state). Current page: {state['current_page']}"
            )
            return

        state["scanned_student_id"] = user_id

        # Stop ADMS — scan received, no longer needed
        stop_adms_after_scan()

        _, scan_acts = pages["scan_waiting"]
        if scan_acts["get_mode"]() == "return":
            root.after(0, lambda: handle_return_scan(user_id))
        else:
            root.after(0, show_confirm_identity)

    def show_confirm_identity():
        _, scan_acts = pages["scan_waiting"]
        scan_acts["stop_animation"]()

        _, conf_acts = pages["confirm_identity"]
        conf_acts["set_data"](state["scanned_student_id"], state["selected_key"])
        show_page("confirm_identity")

    # ------------------------------------------------------------------
    # Create pages (order matters: they all stack in the same grid cell)
    # ------------------------------------------------------------------
    home_frame, home_acts = create_home_page(container, show_page)
    home_frame.grid(row=0, column=0, sticky="nsew")
    pages["home"] = (home_frame, home_acts)

    kl_frame, kl_acts = create_key_list_page(container, show_page, on_key_selected)
    kl_frame.grid(row=0, column=0, sticky="nsew")
    pages["key_list"] = (kl_frame, kl_acts)

    sw_frame, sw_acts = create_scan_waiting_page(container, show_page)
    sw_frame.grid(row=0, column=0, sticky="nsew")
    pages["scan_waiting"] = (sw_frame, sw_acts)

    ci_frame, ci_acts = create_confirm_identity_page(container, show_page)
    ci_frame.grid(row=0, column=0, sticky="nsew")
    pages["confirm_identity"] = (ci_frame, ci_acts)

    suc_frame, suc_acts = create_success_page(container, show_page)
    suc_frame.grid(row=0, column=0, sticky="nsew")
    pages["success"] = (suc_frame, suc_acts)

    rsn_frame, rsn_acts = create_reason_page(container, show_page, on_reason_confirm)
    rsn_frame.grid(row=0, column=0, sticky="nsew")
    pages["reason"] = (rsn_frame, rsn_acts)

    # ------------------------------------------------------------------
    # Show home (ADMS NOT started yet — starts on key selection or return)
    # ------------------------------------------------------------------
    show_page("home")

    def on_close():
        stop_adms_after_scan()
        gpio_controller.cleanup_gpio()
        root.destroy()

    root.protocol("WM_DELETE_WINDOW", on_close)

    # Attach for test-scan button compatibility
    root._on_scan_received = on_scan_received

    root.mainloop()


if __name__ == "__main__":
    main()
