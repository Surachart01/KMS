"""
Key Management Desktop Application
Main entry point with ZKTeco pyzk integration
"""

import customtkinter as ctk
import logging
import sys
import os
from dotenv import load_dotenv
from utils.theme import COLORS, WINDOW
from utils.adms_server import AdmsServer
from pages.home_page import HomePage
from pages.key_list_page import KeyListPage
from pages.scan_waiting_page import ScanWaitingPage
from pages.confirm_identity_page import ConfirmIdentityPage
from pages.success_page import SuccessPage
from pages.reason_page import ReasonPage

# Load environment variables
load_dotenv()

# Configure logging - force output to stdout with flush
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    stream=sys.stdout,
    force=True  # Force reconfigure even if already configured
)

# Ensure all loggers use this configuration
logging.getLogger('utils.adms_server').setLevel(logging.DEBUG)
logger = logging.getLogger(__name__)


class KeyManagementApp(ctk.CTk):
    """Main application window"""
    
    def __init__(self):
        super().__init__()
        
        # Configure window
        self.title("🔑 ระบบเบิกกุญแจ - Key Management System")
        self.geometry(f"{WINDOW['width']}x{WINDOW['height']}")
        self.minsize(WINDOW["min_width"], WINDOW["min_height"])
        
        # Set appearance
        ctk.set_appearance_mode("dark")
        ctk.set_default_color_theme("blue")
        
        # Configure background
        self.configure(fg_color=COLORS["bg_primary"])
        
        # State
        self.selected_key = None
        self.scanned_student_id = None
        self.adms_server = None
        
        # Container for pages
        self.container = ctk.CTkFrame(self, fg_color=COLORS["bg_primary"])
        self.container.pack(fill="both", expand=True)
        self.container.grid_rowconfigure(0, weight=1)
        self.container.grid_columnconfigure(0, weight=1)
        
        # Pages dictionary
        self.pages = {}
        
        # Initialize pages
        self._init_pages()
        
        # Connect to ZKTeco
        self._connect_zkteco()
        
        # Show home page initially
        self.show_page("home")
        self.current_page_name = "home"
        
        # Handle window close
        self.protocol("WM_DELETE_WINDOW", self._on_close)
    
    def _init_pages(self):
        """Initialize all pages"""
        # Home page
        home_page = HomePage(
            self.container,
            navigate_callback=self.show_page
        )
        home_page.grid(row=0, column=0, sticky="nsew")
        self.pages["home"] = home_page
        
        # Key list page
        key_list_page = KeyListPage(
            self.container,
            navigate_callback=self.show_page,
            on_key_selected=self._on_key_selected
        )
        key_list_page.grid(row=0, column=0, sticky="nsew")
        self.pages["key_list"] = key_list_page
        
        # Scan waiting page
        scan_waiting_page = ScanWaitingPage(
            self.container,
            navigate_callback=self.show_page
        )
        scan_waiting_page.grid(row=0, column=0, sticky="nsew")
        self.pages["scan_waiting"] = scan_waiting_page
        
        # Confirm identity page
        confirm_identity_page = ConfirmIdentityPage(
            self.container,
            navigate_callback=self.show_page
        )
        confirm_identity_page.grid(row=0, column=0, sticky="nsew")
        self.pages["confirm_identity"] = confirm_identity_page
        
        # Success page
        success_page = SuccessPage(
            self.container,
            navigate_callback=self.show_page
        )
        success_page.grid(row=0, column=0, sticky="nsew")
        self.pages["success"] = success_page

        # Reason page
        reason_page = ReasonPage(
            self.container,
            navigate_callback=self.show_page,
            on_confirm_callback=self._on_reason_confirm
        )
        reason_page.grid(row=0, column=0, sticky="nsew")
        self.pages["reason"] = reason_page
    
    def _on_reason_confirm(self, reason):
        """Handle reason confirmation"""
        logger.info(f"📝 Reason provided: {reason}")
        
        # Pass reason back to confirm page to retry borrowing
        confirm_page = self.pages["confirm_identity"]
        confirm_page.process_borrow_with_reason(reason)
    
    def _handle_return_scan(self, user_id):
        """Handle scan for returning key"""
        logger.info(f"🔄 Processing return for user: {user_id}")
        
        # Stop animation
        self.pages["scan_waiting"].stop_animation()
        
        # Call API
        # We need to run this in background to avoid freezing UI
        import threading
        from utils.api_client import api_client
        
        def run_return():
            success, result = api_client.return_key(user_id)
            
            if success:
                logger.info(f"✅ Return success: {result}")
                # Show success page
                self.after(0, lambda: self._show_return_success(user_id, result))
            else:
                logger.error(f"❌ Return failed: {result}")
                # Show error (reuse scan waiting page to show error or go back)
                # For now, let's just log and maybe show a popup or go back to home
                # Or better, show error on scan page?
                # Simple implementation: Show error popup
                self.after(0, lambda: self._show_error_popup(result))
        
        threading.Thread(target=run_return, daemon=True).start()

    def _show_return_success(self, user_id, result_data):
        """Show success page for return"""
        success_page = self.pages["success"]
        
        # Extract data from result
        # result_data might contain 'data': {'lateMinutes': 0, ...}
        extra_data = result_data.get("data", {})
        
        success_page.set_data(user_id, None, mode="return", extra_data=extra_data)
        self.show_page("success")
        success_page.start_countdown()

    def _show_error_popup(self, message):
        """Show error popup"""
        # Extract message from dict if needed
        if isinstance(message, dict):
            message = message.get("message", "เกิดข้อผิดพลาด")
        
        dialog = ctk.CTkToplevel(self)
        dialog.title("เกิดข้อผิดพลาด")
        dialog.geometry("400x200")
        dialog.transient(self)
        dialog.grab_set()
        
        label = ctk.CTkLabel(dialog, text=f"❌ เกิดข้อผิดพลาด:\n{message}", wraplength=350)
        label.pack(expand=True, padx=20, pady=20)
        
        btn = ctk.CTkButton(dialog, text="ตกลง", command=dialog.destroy)
        btn.pack(pady=20)
    
    def _connect_zkteco(self):
        """Start ADMS Server for ZKTeco"""
        port = int(os.getenv("ADMS_PORT", "8089"))
        
        self.adms_server = AdmsServer(port=port, callback=self._on_scan_received)
        if self.adms_server.start():
            logger.info("✅ ADMS Server started")
        else:
            logger.error("❌ Failed to start ADMS Server")
    
    def _on_key_selected(self, key_data):
        """Handle key selection from key list"""
        logger.info(f"🔑 Key selected: {key_data}")
        self.selected_key = key_data
        
        # Go to scan waiting page (reset mode to borrow)
        scan_page = self.pages["scan_waiting"]
        scan_page.set_mode("borrow")
        scan_page.set_selected_key(key_data)
        self.show_page("scan_waiting")
        scan_page.start_animation()
    
    def _on_scan_received(self, user_id):
        """Handle scan data received from ZKTeco"""
        logger.info(f"👤 Scan received: User ID = {user_id}")
        
        # Check if we are in scanning state
        if self.current_page_name != "scan_waiting":
            logger.warning(f"⚠️ Scan ignored (Not in waiting state). Current page: {self.current_page_name}")
            return

        self.scanned_student_id = user_id
        
        # Check mode from scan waiting page
        scan_page = self.pages["scan_waiting"]
        if scan_page.mode == "return":
            # Handle return scan
            self.after(0, lambda: self._handle_return_scan(user_id))
        else:
            # Handle borrow scan
            # Update UI in main thread
            self.after(0, self._show_confirm_identity)
    
    def _show_confirm_identity(self):
        """Show confirm identity page with scanned data"""
        # Stop waiting animation
        self.pages["scan_waiting"].stop_animation()
        
        # Set data on confirm page
        confirm_page = self.pages["confirm_identity"]
        confirm_page.set_data(self.scanned_student_id, self.selected_key)
        
        # Show confirm page
        self.show_page("confirm_identity")
    
    def show_page(self, page_name):
        """Show the specified page"""
        
        # Handle special virtual pages
        if page_name == "scan_waiting_return":
            page = self.pages["scan_waiting"]
            page.set_mode("return")
            page.start_animation()
            page.tkraise()
            self.current_page_name = "scan_waiting"
            return
            
        if page_name in self.pages:
            self.current_page_name = page_name
            page = self.pages[page_name]
            page.tkraise()
            
            # Page-specific actions
            if page_name == "key_list":
                page._load_keys()
            elif page_name == "success":
                # Set success data and start countdown
                page.set_data(self.scanned_student_id, self.selected_key)
                page.start_countdown()
            elif page_name == "home":
                # Reset state
                self.selected_key = None
                self.scanned_student_id = None
    
    def _on_close(self):
        """Handle window close"""
        if self.adms_server:
            self.adms_server.stop()
        self.destroy()


def main():
    """Main entry point"""
    app = KeyManagementApp()
    app.mainloop()


if __name__ == "__main__":
    main()
