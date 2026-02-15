
import customtkinter as ctk
from utils.theme import COLORS, FONTS, SPACING

class ReasonPage(ctk.CTkFrame):
    """Page for selecting reason when borrowing without authorization"""
    
    def __init__(self, parent, navigate_callback=None, on_confirm_callback=None):
        super().__init__(parent, fg_color=COLORS["bg_primary"])
        self.navigate = navigate_callback
        self.on_confirm = on_confirm_callback # Callback to actually borrow
        
        self.selected_reason = None
        self.custom_reason_entry = None
        
        # Predefined reasons
        self.reasons = [
            "ลืมกุญแจ",
            "มาทำงานนอกเวลา",
            "ติดต่ออาจารย์",
            "ทำความสะอาด",
            "ซ่อมบำรุง",
            "อื่นๆ"
        ]
        
        self._create_widgets()

    def _create_widgets(self):
        # Header
        header = ctk.CTkLabel(
            self,
            text="ระบุเหตุผลการเบิก",
            font=FONTS["heading"],
            text_color=COLORS["text_primary"]
        )
        header.pack(pady=(SPACING["xxl"], SPACING["xl"]))
        
        # Subheader
        subheader = ctk.CTkLabel(
            self,
            text="เนื่องจากคุณไม่มีตารางเรียนในขณะนี้ กรุณาระบุเหตุผล",
            font=FONTS["body"],
            text_color=COLORS["text_secondary"]
        )
        subheader.pack(pady=(0, SPACING["xl"]))
        
        # Grid for buttons
        self.grid_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.grid_frame.pack(padx=50, pady=20)
        
        for i, reason in enumerate(self.reasons):
            row = i // 2
            col = i % 2
            
            btn = ctk.CTkButton(
                self.grid_frame,
                text=reason,
                font=FONTS["body_bold"],
                fg_color=COLORS["bg_card"],
                text_color=COLORS["text_primary"],
                hover_color=COLORS["btn_blue"],
                width=250,
                height=60,
                corner_radius=15,
                command=lambda r=reason: self._on_reason_select(r)
            )
            btn.grid(row=row, column=col, padx=10, pady=10)
            
        # Custom reason input (Hidden/Disabled initially)
        self.other_input_container = ctk.CTkFrame(self, fg_color="transparent")
        self.other_input_container.pack(pady=20, fill="x", padx=100)
        
        self.other_entry = ctk.CTkEntry(
            self.other_input_container,
            placeholder_text="ระบุเหตุผลอื่นๆ...",
            font=FONTS["body"],
            height=50
        )
        self.other_entry.pack(fill="x")
        self.other_entry.pack_forget() # Hide initially
        
        # Action Buttons
        actions_frame = ctk.CTkFrame(self, fg_color="transparent")
        actions_frame.pack(side="bottom", pady=SPACING["xxl"], fill="x")
        
        cancel_btn = ctk.CTkButton(
            actions_frame,
            text="ยกเลิก",
            font=FONTS["body_bold"],
            fg_color=COLORS["accent_danger"],
            hover_color=COLORS["accent_danger"],
            height=50,
            width=200,
            command=self._on_cancel
        )
        cancel_btn.pack(side="bottom")
        
    def _on_reason_select(self, reason):
        if reason == "อื่นๆ":
            # Show input
            self.selected_reason = None # Wait for input
            self.other_entry.pack(fill="x", pady=10)
            self.other_entry.focus()
            
            # Change confirm button logic
            # For simplicity, create a confirm button for "Other" if typed
            if hasattr(self, 'confirm_other_btn'):
                self.confirm_other_btn.pack(pady=10)
            else:
                self.confirm_other_btn = ctk.CTkButton(
                    self.other_input_container,
                    text="ยืนยันเหตุผล",
                    font=FONTS["body_bold"],
                    height=50,
                    command=self._confirm_other
                )
                self.confirm_other_btn.pack(pady=10)
        else:
            # Hide input if previously shown
            self.other_entry.pack_forget()
            if hasattr(self, 'confirm_other_btn'):
                self.confirm_other_btn.pack_forget()
                
            self.selected_reason = reason
            self._submit()
            
    def _confirm_other(self):
        text = self.other_entry.get().strip()
        if text:
            self.selected_reason = text
            self._submit()
            
    def _submit(self):
        if self.on_confirm and self.selected_reason:
            self.on_confirm(self.selected_reason)
            
    def _on_cancel(self):
        # Clear fields
        self.other_entry.delete(0, "end")
        self.other_entry.pack_forget()
        self.navigate("home")
