"""
Success Page - Key borrowing success confirmation
"""

import customtkinter as ctk
from utils.theme import COLORS, FONTS, SPACING


class SuccessPage(ctk.CTkFrame):
    """Page showing successful key borrowing"""
    
    def __init__(self, parent, navigate_callback, **kwargs):
        super().__init__(parent, fg_color=COLORS["bg_primary"], **kwargs)
        
        self.navigate = navigate_callback
        self.student_id = None
        self.selected_key = None
        
        self._create_widgets()
    
    def _create_widgets(self):
        # Content area
        content = ctk.CTkFrame(self, fg_color="transparent")
        content.pack(expand=True, fill="both")
        
        # Center container
        center = ctk.CTkFrame(content, fg_color="transparent")
        center.place(relx=0.5, rely=0.45, anchor="center")
        
        # Success icon with animation
        self.success_circle = ctk.CTkFrame(
            center,
            width=150,
            height=150,
            corner_radius=75,
            fg_color=COLORS["accent_success"]
        )
        self.success_circle.pack()
        self.success_circle.pack_propagate(False)
        
        success_icon = ctk.CTkLabel(
            self.success_circle,
            text="✓",
            font=("Helvetica", 80, "bold"),
            text_color=COLORS["text_primary"]
        )
        success_icon.place(relx=0.5, rely=0.5, anchor="center")
        
        # Title
        self.title_label = ctk.CTkLabel(
            center,
            text="เบิกกุญแจสำเร็จ!",
            font=("Helvetica", 32, "bold"),
            text_color=COLORS["accent_success"]
        )
        self.title_label.pack(pady=SPACING["lg"])
        
        # Info card
        info_card = ctk.CTkFrame(
            center,
            fg_color=COLORS["bg_card"],
            corner_radius=16
        )
        info_card.pack(pady=SPACING["md"])
        
        info_inner = ctk.CTkFrame(info_card, fg_color="transparent")
        info_inner.pack(padx=SPACING["xxl"], pady=SPACING["lg"])
        
        # Student ID
        self.student_label = ctk.CTkLabel(
            info_inner,
            text="นักศึกษา: --",
            font=FONTS["heading"],
            text_color=COLORS["text_primary"]
        )
        self.student_label.pack()
        
        # Room
        self.room_label = ctk.CTkLabel(
            info_inner,
            text="ห้อง: --",
            font=FONTS["body"],
            text_color=COLORS["text_secondary"]
        )
        self.room_label.pack(pady=SPACING["xs"])
        
        # Instruction
        self.instruction_label = ctk.CTkLabel(
            center,
            text="กรุณาหยิบกุญแจจากช่องที่ระบุ",
            font=FONTS["body"],
            text_color=COLORS["text_muted"]
        )
        self.instruction_label.pack(pady=SPACING["lg"])
        
        # Home button
        home_btn = ctk.CTkButton(
            center,
            text="🏠 กลับหน้าหลัก",
            font=FONTS["button"],
            fg_color=COLORS["accent_primary"],
            hover_color=COLORS["btn_blue_hover"],
            width=200,
            height=50,
            command=self._on_home
        )
        home_btn.pack(pady=SPACING["lg"])
        
        # Auto redirect countdown
        self.countdown_label = ctk.CTkLabel(
            center,
            text="จะกลับหน้าหลักอัตโนมัติใน 10 วินาที",
            font=FONTS["small"],
            text_color=COLORS["text_muted"]
        )
        self.countdown_label.pack()
        
        self.countdown = 10
    
    def set_data(self, student_id, key_data, mode="borrow", extra_data=None):
        """Set success data"""
        self.student_id = student_id
        self.selected_key = key_data
        
        self.student_label.configure(text=f"นักศึกษา: {student_id}")
        
        if mode == "return":
            self.title_label.configure(text="คืนกุญแจสำเร็จ!", text_color=COLORS["accent_success"])
            self.instruction_label.configure(text="ขอบคุณที่คืนกุญแจตรงเวลา")
            
            # Show penalty info if any
            if extra_data and extra_data.get("lateMinutes", 0) > 0:
                late = extra_data.get("lateMinutes", 0)
                score = extra_data.get("penaltyScore", 0)
                self.instruction_label.configure(
                    text=f"⚠️ คืนล่าช้า {late} นาที (หัก {score} คะแนน)",
                    text_color=COLORS["accent_danger"]
                )
            self.room_label.configure(text="")
        else:
            self.title_label.configure(text="เบิกกุญแจสำเร็จ!", text_color=COLORS["accent_success"])
            self.instruction_label.configure(text="กรุณาหยิบกุญแจจากช่องที่ระบุ", text_color=COLORS["text_muted"])
            
            if key_data:
                room_code = key_data.get("roomCode", "Unknown")
                slot = key_data.get("slotNumber", "?")
                self.room_label.configure(text=f"ห้อง: {room_code} (ช่อง #{slot})")
    
    def start_countdown(self):
        """Start auto-redirect countdown"""
        self.countdown = 10
        self._countdown_tick()
    
    def _countdown_tick(self):
        """Countdown tick"""
        if self.countdown > 0:
            self.countdown_label.configure(
                text=f"จะกลับหน้าหลักอัตโนมัติใน {self.countdown} วินาที"
            )
            self.countdown -= 1
            self.after(1000, self._countdown_tick)
        else:
            self._on_home()
    
    def _on_home(self):
        """Go back to home"""
        self.countdown = 0
        self.navigate("home")
