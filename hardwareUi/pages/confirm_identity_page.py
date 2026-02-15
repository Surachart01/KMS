"""
Confirm Identity Page - Show student ID for confirmation
"""

import customtkinter as ctk
from utils.theme import COLORS, FONTS, SPACING
from utils.api_client import api_client
from utils.gpio_controller import gpio_controller
import threading


class ConfirmIdentityPage(ctk.CTkFrame):
    """Page to confirm student identity before key borrowing"""
    
    def __init__(self, parent, navigate_callback, **kwargs):
        super().__init__(parent, fg_color=COLORS["bg_primary"], **kwargs)
        
        self.navigate = navigate_callback
        self.student_id = None
        self.selected_key = None
        
        self._create_widgets()
    
    def _create_widgets(self):
        # Header
        header_frame = ctk.CTkFrame(self, fg_color=COLORS["bg_secondary"], corner_radius=0)
        header_frame.pack(fill="x")
        
        header_inner = ctk.CTkFrame(header_frame, fg_color="transparent")
        header_inner.pack(fill="x", padx=SPACING["lg"], pady=SPACING["md"])
        
        title_label = ctk.CTkLabel(
            header_inner,
            text="✅ ยืนยันตัวตน",
            font=FONTS["subtitle"],
            text_color=COLORS["text_primary"]
        )
        title_label.pack()
        
        # Content area
        content = ctk.CTkFrame(self, fg_color="transparent")
        content.pack(expand=True, fill="both")
        
        # Center container
        center = ctk.CTkFrame(content, fg_color="transparent")
        center.place(relx=0.5, rely=0.45, anchor="center")
        
        # Success icon
        success_icon = ctk.CTkLabel(
            center,
            text="✅",
            font=("Helvetica", 72)
        )
        success_icon.pack()
        
        # Message
        msg_label = ctk.CTkLabel(
            center,
            text="สแกนใบหน้าสำเร็จ",
            font=FONTS["heading"],
            text_color=COLORS["accent_success"]
        )
        msg_label.pack(pady=SPACING["md"])
        
        # Student info card
        info_card = ctk.CTkFrame(
            center,
            fg_color=COLORS["bg_card"],
            corner_radius=16,
            border_width=2,
            border_color=COLORS["accent_primary"]
        )
        info_card.pack(pady=SPACING["lg"], padx=SPACING["xl"])
        
        info_inner = ctk.CTkFrame(info_card, fg_color="transparent")
        info_inner.pack(padx=SPACING["xxl"], pady=SPACING["xl"])
        
        # Student ID label
        id_title = ctk.CTkLabel(
            info_inner,
            text="รหัสนักศึกษา",
            font=FONTS["body"],
            text_color=COLORS["text_secondary"]
        )
        id_title.pack()
        
        # Student ID value (dynamic)
        self.student_id_label = ctk.CTkLabel(
            info_inner,
            text="----------",
            font=("Helvetica", 36, "bold"),
            text_color=COLORS["text_primary"]
        )
        self.student_id_label.pack(pady=SPACING["sm"])
        
        # Room info
        room_title = ctk.CTkLabel(
            info_inner,
            text="ห้องที่ต้องการเบิกกุญแจ",
            font=FONTS["body"],
            text_color=COLORS["text_secondary"]
        )
        room_title.pack(pady=(SPACING["md"], 0))
        
        self.room_label = ctk.CTkLabel(
            info_inner,
            text="--",
            font=FONTS["subtitle"],
            text_color=COLORS["accent_primary"]
        )
        self.room_label.pack()
        
        # Buttons frame
        buttons_frame = ctk.CTkFrame(center, fg_color="transparent")
        buttons_frame.pack(pady=SPACING["xl"])
        
        # Cancel button
        cancel_btn = ctk.CTkButton(
            buttons_frame,
            text="❌ ยกเลิก",
            font=FONTS["button"],
            fg_color=COLORS["accent_danger"],
            hover_color="#ff6b6b",
            width=150,
            height=50,
            command=self._on_cancel
        )
        cancel_btn.pack(side="left", padx=SPACING["md"])
        
        # Confirm button
        confirm_btn = ctk.CTkButton(
            buttons_frame,
            text="✅ ยืนยัน",
            font=FONTS["button"],
            fg_color=COLORS["accent_success"],
            hover_color=COLORS["btn_teal_hover"],
            width=150,
            height=50,
            command=self._on_confirm
        )
        confirm_btn.pack(side="left", padx=SPACING["md"])
    
    def set_data(self, student_id, key_data):
        """Set the student ID and key data"""
        self.student_id = student_id
        self.selected_key = key_data
        
        self.student_id_label.configure(text=student_id)
        
        if key_data:
            room_code = key_data.get("roomCode", "Unknown")
            self.room_label.configure(text=f"🚪 {room_code}")
    
    def _on_cancel(self):
        """Handle cancel button click"""
        self.navigate("home")
    
    def _on_confirm(self):
        """Handle confirm button click"""
        # Disable button to prevent double click
        self._set_loading(True)
        
        # Run in background thread
        thread = threading.Thread(target=self._process_borrow)
        thread.daemon = True
        thread.start()
    
    def _process_borrow(self):
        """Process key borrowing in background"""
        room_code = self.selected_key.get("roomCode") if self.selected_key else ""
        
        if not room_code or not self.student_id:
            self.after(0, lambda: self._show_error("ข้อมูลไม่ครบถ้วน"))
            return
            
        # 1. Call API to borrow key
        success, result = api_client.borrow_key(self.student_id, room_code)
        
        if success:
            # 2. If success, trigger GPIO High
            gpio_controller.set_high()
            
            # 3. Navigate to success page
            self.after(0, self.navigate, "success")
        else:
            # Check if need reason
            if isinstance(result, dict) and result.get("error_code") == "REQUIRE_REASON":
                self.after(0, self.navigate, "reason")
            else:
                # Show error
                error_msg = result.get("message", "เกิดข้อผิดพลาด") if isinstance(result, dict) else str(result)
                self.after(0, lambda: self._show_error(error_msg))
    
    def process_borrow_with_reason(self, reason):
        """Retry borrowing with reason"""
        self._set_loading(True)
        
        # Run in background thread
        thread = threading.Thread(target=self._process_borrow_retry, args=(reason,))
        thread.daemon = True
        thread.start()
        
    def _process_borrow_retry(self, reason):
        """Retry borrowing logic"""
        room_code = self.selected_key.get("roomCode") if self.selected_key else ""
        
        # Call API again with reason
        success, result = api_client.borrow_key(self.student_id, room_code, reason=reason)
        
        if success:
            gpio_controller.set_high()
            self.after(0, self.navigate, "success")
        else:
             error_msg = result.get("message", "เกิดข้อผิดพลาด") if isinstance(result, dict) else str(result)
             self.after(0, lambda: self._show_error(error_msg))
            
    def _set_loading(self, is_loading):
        """Set loading state for UI"""
        # TODO: Add specific loading UI if needed
        # For now just changing cursor is enough or disabling buttons
        pass

    def _show_error(self, message):
        """Show error dialog"""
        self._set_loading(False)
        
        # Simple error popup
        dialog = ctk.CTkToplevel(self)
        dialog.title("Error")
        dialog.geometry("400x200")
        dialog.transient(self.winfo_toplevel())
        dialog.grab_set()
        
        label = ctk.CTkLabel(
            dialog, 
            text=f"❌ {message}", 
            font=FONTS["body"],
            text_color=COLORS["accent_danger"],
            wraplength=350
        )
        label.pack(expand=True)
        
        btn = ctk.CTkButton(
            dialog,
            text="ตกลง",
            command=dialog.destroy
        )
        btn.pack(pady=SPACING["lg"])
