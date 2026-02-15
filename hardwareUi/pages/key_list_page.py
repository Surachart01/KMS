"""
Key List Page - Display keys fetched from backend API
"""

import customtkinter as ctk
from utils.theme import COLORS, FONTS, SPACING
from utils.api_client import api_client
import threading


class KeyCircle(ctk.CTkFrame):
    """Circular key item with room code and status"""
    
    def __init__(self, parent, key_data, on_click=None, **kwargs):
        super().__init__(parent, fg_color="transparent", **kwargs)
        
        self.key_data = key_data
        self.on_click = on_click
        self._create_widgets()
    
    def _create_widgets(self):
        # Get data
        slot_number = self.key_data.get("slotNumber", "?")
        room_code = self.key_data.get("roomCode", "Unknown")
        is_active = self.key_data.get("isAvailable", False)
        
        # Circle color based on status
        circle_color = COLORS["accent_success"] if is_active else COLORS["accent_danger"]
        border_color = COLORS["btn_teal_hover"] if is_active else COLORS["accent_danger"]
        
        # Circle container
        circle_size = 100
        self.circle = ctk.CTkFrame(
            self,
            width=circle_size,
            height=circle_size,
            corner_radius=circle_size // 2,
            fg_color=circle_color,
            border_width=3,
            border_color=border_color
        )
        self.circle.pack()
        self.circle.pack_propagate(False)
        
        # Inner content frame
        inner_frame = ctk.CTkFrame(self.circle, fg_color="transparent")
        inner_frame.place(relx=0.5, rely=0.5, anchor="center")
        
        # Slot number
        slot_label = ctk.CTkLabel(
            inner_frame,
            text=f"#{slot_number}",
            font=("Helvetica", 24, "bold"),
            text_color=COLORS["text_primary"]
        )
        slot_label.pack()
        
        # Room code below circle
        room_label = ctk.CTkLabel(
            self,
            text=room_code,
            font=FONTS["body_bold"],
            text_color=COLORS["text_primary"]
        )
        room_label.pack(pady=(SPACING["xs"], 0))
        
        # Status text
        status_text = "พร้อมใช้" if is_active else "ไม่พร้อม"
        status_label = ctk.CTkLabel(
            self,
            text=status_text,
            font=FONTS["small"],
            text_color=circle_color
        )
        status_label.pack()
        
        # Bind hover and click events
        self.circle.bind("<Enter>", self._on_enter)
        self.circle.bind("<Leave>", self._on_leave)
        self.circle.bind("<Button-1>", self._on_click)
        inner_frame.bind("<Button-1>", self._on_click)
        slot_label.bind("<Button-1>", self._on_click)
    
    def _on_enter(self, event):
        self.circle.configure(border_width=5)
        self.configure(cursor="hand2")
    
    def _on_leave(self, event):
        self.circle.configure(border_width=3)
        self.configure(cursor="")
    
    def _on_click(self, event):
        if self.on_click:
            self.on_click(self.key_data)


class KeyListPage(ctk.CTkFrame):
    """Page to display list of keys from the backend"""
    
    def __init__(self, parent, navigate_callback, on_key_selected=None, **kwargs):
        super().__init__(parent, fg_color=COLORS["bg_primary"], **kwargs)
        
        self.navigate = navigate_callback
        self.on_key_selected = on_key_selected
        self.keys_data = []
        
        self._create_widgets()
        self._load_keys()
    
    def _create_widgets(self):
        # Header with back button
        header_frame = ctk.CTkFrame(self, fg_color=COLORS["bg_secondary"], corner_radius=0)
        header_frame.pack(fill="x")
        
        header_inner = ctk.CTkFrame(header_frame, fg_color="transparent")
        header_inner.pack(fill="x", padx=SPACING["lg"], pady=SPACING["md"])
        
        # Back button
        back_btn = ctk.CTkButton(
            header_inner,
            text="← กลับ",
            font=FONTS["button"],
            fg_color="transparent",
            hover_color=COLORS["bg_hover"],
            text_color=COLORS["text_primary"],
            width=80,
            command=lambda: self.navigate("home")
        )
        back_btn.pack(side="left")
        
        # Title
        title_label = ctk.CTkLabel(
            header_inner,
            text="🔑 รายการกุญแจ",
            font=FONTS["subtitle"],
            text_color=COLORS["text_primary"]
        )
        title_label.pack(side="left", padx=SPACING["lg"])
        
        # Refresh button
        refresh_btn = ctk.CTkButton(
            header_inner,
            text="🔄 รีเฟรช",
            font=FONTS["button"],
            fg_color=COLORS["accent_primary"],
            hover_color=COLORS["btn_blue_hover"],
            width=100,
            command=self._load_keys
        )
        refresh_btn.pack(side="right")
        
        # Content area
        self.content_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.content_frame.pack(fill="both", expand=True, padx=SPACING["lg"], pady=SPACING["lg"])
        
        # Loading indicator (initially visible)
        self.loading_frame = ctk.CTkFrame(self.content_frame, fg_color="transparent")
        self.loading_frame.pack(expand=True)
        
        self.loading_label = ctk.CTkLabel(
            self.loading_frame,
            text="⏳ กำลังโหลดข้อมูล...",
            font=FONTS["heading"],
            text_color=COLORS["text_secondary"]
        )
        self.loading_label.pack()
        
        # Grid frame for keys (initially hidden)
        self.grid_frame = ctk.CTkFrame(self.content_frame, fg_color="transparent")
        
        # Error frame (initially hidden)
        self.error_frame = ctk.CTkFrame(self.content_frame, fg_color="transparent")
        
        self.error_icon = ctk.CTkLabel(
            self.error_frame,
            text="⚠️",
            font=("Helvetica", 48)
        )
        self.error_icon.pack(pady=SPACING["md"])
        
        self.error_label = ctk.CTkLabel(
            self.error_frame,
            text="",
            font=FONTS["body"],
            text_color=COLORS["accent_danger"],
            wraplength=400
        )
        self.error_label.pack()
        
        self.retry_btn = ctk.CTkButton(
            self.error_frame,
            text="ลองใหม่",
            font=FONTS["button"],
            fg_color=COLORS["accent_primary"],
            hover_color=COLORS["btn_blue_hover"],
            command=self._load_keys
        )
        self.retry_btn.pack(pady=SPACING["lg"])
    
    def _load_keys(self):
        """Load keys from API in a background thread"""
        self._show_loading()
        
        # Check if API is configured
        if not api_client.is_configured():
            self._show_error("กรุณากำหนดค่า API_TOKEN ในไฟล์ .env")
            return
        
        # Load in background thread
        thread = threading.Thread(target=self._fetch_keys)
        thread.daemon = True
        thread.start()
    
    def _fetch_keys(self):
        """Fetch keys from API (runs in background thread)"""
        success, result = api_client.get_keys()
        
        # Update UI in main thread
        self.after(0, lambda: self._handle_response(success, result))
    
    def _handle_response(self, success, result):
        """Handle API response"""
        if success:
            self.keys_data = result if isinstance(result, list) else result.get("data", [])
            self._show_keys()
        else:
            self._show_error(result)
    
    def _show_loading(self):
        """Show loading state"""
        self.error_frame.pack_forget()
        self.grid_frame.pack_forget()
        self.loading_frame.pack(expand=True)
    
    def _show_error(self, message):
        """Show error state"""
        self.loading_frame.pack_forget()
        self.grid_frame.pack_forget()
        self.error_label.configure(text=message)
        self.error_frame.pack(expand=True)
    
    def _show_keys(self):
        """Display the keys as circles in a grid (5 per row, 2 rows)"""
        self.loading_frame.pack_forget()
        self.error_frame.pack_forget()
        
        # Clear existing circles
        for widget in self.grid_frame.winfo_children():
            widget.destroy()
        
        if not self.keys_data:
            # Show empty state
            empty_label = ctk.CTkLabel(
                self.grid_frame,
                text="📭 ไม่พบข้อมูลกุญแจ",
                font=FONTS["heading"],
                text_color=COLORS["text_secondary"]
            )
            empty_label.pack(expand=True, pady=SPACING["xxl"])
        else:
            # Configure grid - 5 columns
            for col in range(5):
                self.grid_frame.columnconfigure(col, weight=1)
            
            # Create key circles in grid (5 per row)
            for idx, key in enumerate(self.keys_data):
                row = idx // 5  # 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, ...
                col = idx % 5   # 0, 1, 2, 3, 4, 0, 1, 2, 3, 4, ...
                
                circle = KeyCircle(self.grid_frame, key, on_click=self._on_key_click)
                circle.grid(
                    row=row, 
                    column=col, 
                    padx=SPACING["md"], 
                    pady=SPACING["lg"]
                )
        
        self.grid_frame.pack(expand=True)
    
    def _on_key_click(self, key_data):
        """Handle key circle click"""
        if self.on_key_selected:
            self.on_key_selected(key_data)
