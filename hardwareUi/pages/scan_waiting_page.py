"""
Scan Waiting Page - Wait for ZKTeco face scan
"""

import customtkinter as ctk
from utils.theme import COLORS, FONTS, SPACING


class ScanWaitingPage(ctk.CTkFrame):
    """Page that waits for face scan from ZKTeco device"""
    
    def __init__(self, parent, navigate_callback, **kwargs):
        super().__init__(parent, fg_color=COLORS["bg_primary"], **kwargs)
        
        self.navigate = navigate_callback
        self.selected_key = None
        self.mode = "borrow"
        self.animation_index = 0
        self.animation_running = False
        
        self._create_widgets()
    
    def _create_widgets(self):
        # Header
        header_frame = ctk.CTkFrame(self, fg_color=COLORS["bg_secondary"], corner_radius=0)
        header_frame.pack(fill="x")
        
        header_inner = ctk.CTkFrame(header_frame, fg_color="transparent")
        header_inner.pack(fill="x", padx=SPACING["lg"], pady=SPACING["md"])
        
        # Back button
        back_btn = ctk.CTkButton(
            header_inner,
            text="← ยกเลิก",
            font=FONTS["button"],
            fg_color=COLORS["accent_danger"],
            hover_color="#ff6b6b",
            text_color=COLORS["text_primary"],
            width=100,
            command=self._on_cancel
        )
        back_btn.pack(side="left")
        
        # Title
        self.title_label = ctk.CTkLabel(
            header_inner,
            text="🔐 ยืนยันตัวตน",
            font=FONTS["subtitle"],
            text_color=COLORS["text_primary"]
        )
        self.title_label.pack(side="left", padx=SPACING["lg"])
        
        # Content area
        content = ctk.CTkFrame(self, fg_color="transparent")
        content.pack(expand=True, fill="both")
        
        # Center container
        center = ctk.CTkFrame(content, fg_color="transparent")
        center.place(relx=0.5, rely=0.45, anchor="center")
        
        # Selected room info
        self.room_label = ctk.CTkLabel(
            center,
            text="",
            font=FONTS["heading"],
            text_color=COLORS["text_secondary"]
        )
        self.room_label.pack(pady=(0, SPACING["xl"]))
        
        # Scan animation circle
        self.scan_circle = ctk.CTkFrame(
            center,
            width=180,
            height=180,
            corner_radius=90,
            fg_color=COLORS["accent_primary"],
            border_width=4,
            border_color=COLORS["btn_blue_hover"]
        )
        self.scan_circle.pack(pady=SPACING["lg"])
        self.scan_circle.pack_propagate(False)
        
        # Icon inside circle
        self.scan_icon = ctk.CTkLabel(
            self.scan_circle,
            text="👤",
            font=("Helvetica", 64)
        )
        self.scan_icon.place(relx=0.5, rely=0.5, anchor="center")
        
        # Instruction text
        self.instruction_label = ctk.CTkLabel(
            center,
            text="กรุณาสแกนใบหน้าที่เครื่อง ZKTeco",
            font=FONTS["heading"],
            text_color=COLORS["text_primary"]
        )
        self.instruction_label.pack(pady=SPACING["lg"])
        
        # Loading animation text
        self.loading_label = ctk.CTkLabel(
            center,
            text="⏳ กำลังรอข้อมูล...",
            font=FONTS["body"],
            text_color=COLORS["text_secondary"]
        )
        self.loading_label.pack()
        
        # Footer info
        footer = ctk.CTkFrame(self, fg_color="transparent")
        footer.pack(side="bottom", fill="x", pady=SPACING["lg"])
        
        footer_label = ctk.CTkLabel(
            footer,
            text="เมื่อสแกนสำเร็จ ระบบจะแสดงข้อมูลนักศึกษาเพื่อยืนยัน",
            font=FONTS["small"],
            text_color=COLORS["text_muted"]
        )
        footer_label.pack()
        
        # Test scan button (for development/testing)
        self.test_btn = ctk.CTkButton(
            footer,
            text="🧪 Test Scan (Dev)",
            font=FONTS["small"],
            fg_color=COLORS["accent_success"],
            hover_color=COLORS["btn_teal_hover"],
            text_color=COLORS["text_primary"],
            width=150,
            command=self._on_test_scan
        )
        self.test_btn.pack(pady=SPACING["md"])
    
    def _on_test_scan(self):
        """Simulate a scan for testing"""
        # Import here to avoid circular imports
        import logging
        logger = logging.getLogger(__name__)
        
        # Simulate receiving a scan with test user ID
        test_user_id = "67130500426"
        logger.info(f"🧪 TEST SCAN: Simulating user {test_user_id}")
        
        # Get the main app and trigger the callback
        app = self.winfo_toplevel()
        if hasattr(app, '_on_scan_received'):
            app._on_scan_received(test_user_id)
    
    def set_selected_key(self, key_data):
        """Set the selected key data"""
        self.selected_key = key_data
        room_code = key_data.get("roomCode", "Unknown")
        self.room_label.configure(text=f"🚪 ห้องที่เลือก: {room_code}")
    
    def set_mode(self, mode="borrow"):
        """Set the scanning mode (borrow or return)"""
        self.mode = mode
        if mode == "return":
            self.title_label.configure(text="↩️ คืนกุญแจ")
            self.instruction_label.configure(text="กรุณาสแกนใบหน้าเพื่อคืนกุญแจ")
            self.room_label.configure(text="") # Hide room label for return mode
            self.test_btn.configure(fg_color=COLORS["accent_danger"], hover_color="#ff6b6b")
        else:
            self.title_label.configure(text="🔐 ยืนยันตัวตน")
            self.instruction_label.configure(text="กรุณาสแกนใบหน้าที่เครื่อง ZKTeco")
            self.test_btn.configure(fg_color=COLORS["accent_success"], hover_color=COLORS["btn_teal_hover"])
    
    def start_animation(self):
        """Start the waiting animation"""
        self.animation_running = True
        self._animate()
    
    def stop_animation(self):
        """Stop the waiting animation"""
        self.animation_running = False
    
    def _animate(self):
        """Animate the loading indicator"""
        if not self.animation_running:
            return
        
        dots = ["⏳ กำลังรอข้อมูล", "⏳ กำลังรอข้อมูล.", "⏳ กำลังรอข้อมูล..", "⏳ กำลังรอข้อมูล..."]
        self.animation_index = (self.animation_index + 1) % len(dots)
        self.loading_label.configure(text=dots[self.animation_index])
        
        # Pulse the circle
        colors = [COLORS["accent_primary"], COLORS["btn_blue_hover"]]
        self.scan_circle.configure(fg_color=colors[self.animation_index % 2])
        
        self.after(500, self._animate)
    
    def _on_cancel(self):
        """Handle cancel button click"""
        self.stop_animation()
        self.navigate("home")
