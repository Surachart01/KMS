"""
Home Page - Main menu with 3 circular navigation buttons
"""

import customtkinter as ctk
from utils.theme import COLORS, FONTS, SPACING, CIRCLE_BUTTON


class CircleButton(ctk.CTkFrame):
    """Custom circular button with icon and label"""
    
    def __init__(self, parent, icon, label, color, hover_color, command=None, **kwargs):
        super().__init__(parent, fg_color="transparent", **kwargs)
        
        self.command = command
        self.color = color
        self.hover_color = hover_color
        self.is_hovered = False
        
        # Container for the circle
        self.circle_frame = ctk.CTkFrame(
            self,
            width=CIRCLE_BUTTON["size"],
            height=CIRCLE_BUTTON["size"],
            corner_radius=CIRCLE_BUTTON["size"] // 2,
            fg_color=color,
            border_width=CIRCLE_BUTTON["border_width"],
            border_color=hover_color
        )
        self.circle_frame.pack(pady=(0, SPACING["md"]))
        self.circle_frame.pack_propagate(False)
        
        # Icon inside the circle
        self.icon_label = ctk.CTkLabel(
            self.circle_frame,
            text=icon,
            font=("Helvetica", CIRCLE_BUTTON["icon_size"]),
            text_color=COLORS["text_primary"]
        )
        self.icon_label.place(relx=0.5, rely=0.5, anchor="center")
        
        # Label below the circle
        self.text_label = ctk.CTkLabel(
            self,
            text=label,
            font=FONTS["subtitle"],
            text_color=COLORS["text_primary"]
        )
        self.text_label.pack()
        
        # Bind hover events
        self._bind_hover_events(self.circle_frame)
        self._bind_hover_events(self.icon_label)
        
        # Bind click events
        self.circle_frame.bind("<Button-1>", self._on_click)
        self.icon_label.bind("<Button-1>", self._on_click)
    
    def _bind_hover_events(self, widget):
        widget.bind("<Enter>", self._on_enter)
        widget.bind("<Leave>", self._on_leave)
    
    def _on_enter(self, event):
        self.is_hovered = True
        self.circle_frame.configure(fg_color=self.hover_color)
        self.configure(cursor="hand2")
    
    def _on_leave(self, event):
        self.is_hovered = False
        self.circle_frame.configure(fg_color=self.color)
        self.configure(cursor="")
    
    def _on_click(self, event):
        if self.command:
            self.command()


class HomePage(ctk.CTkFrame):
    """Home page with 3 circular navigation buttons"""
    
    def __init__(self, parent, navigate_callback, **kwargs):
        super().__init__(parent, fg_color=COLORS["bg_primary"], **kwargs)
        
        self.navigate = navigate_callback
        
        self._create_widgets()
    
    def _create_widgets(self):
        # Header
        header_frame = ctk.CTkFrame(self, fg_color="transparent")
        header_frame.pack(fill="x", pady=(SPACING["xxl"], SPACING["lg"]))
        
        # Title with icon
        title_label = ctk.CTkLabel(
            header_frame,
            text="🔑 ระบบเบิกกุญแจ",
            font=FONTS["title"],
            text_color=COLORS["text_primary"]
        )
        title_label.pack()
        
        # Subtitle
        subtitle_label = ctk.CTkLabel(
            header_frame,
            text="Key Management System",
            font=FONTS["body"],
            text_color=COLORS["text_secondary"]
        )
        subtitle_label.pack(pady=(SPACING["xs"], 0))
        
        # Decorative line
        line_frame = ctk.CTkFrame(
            self,
            height=2,
            fg_color=COLORS["accent_primary"],
            corner_radius=1
        )
        line_frame.pack(fill="x", padx=SPACING["xxl"] * 3, pady=SPACING["lg"])
        
        # Buttons container
        buttons_frame = ctk.CTkFrame(self, fg_color="transparent")
        buttons_frame.pack(expand=True, fill="both", pady=SPACING["xl"])
        
        # Center the buttons
        buttons_inner = ctk.CTkFrame(buttons_frame, fg_color="transparent")
        buttons_inner.place(relx=0.5, rely=0.4, anchor="center")
        
        # Button configurations
        buttons = [
            {
                "icon": "🚪",
                "label": "เลือกห้อง",
                "color": COLORS["circle_1"],
                "hover_color": COLORS["btn_blue_hover"],
                "command": lambda: self.navigate("key_list")
            },
            {
                "icon": "↩️",
                "label": "คืนกุญแจ",
                "color": COLORS["circle_2"],
                "hover_color": COLORS["btn_purple_hover"],
                "command": lambda: self._on_return_click()
            },
            {
                "icon": "🔄",
                "label": "สลับสิทธิ์กุญแจ",
                "color": COLORS["circle_3"],
                "hover_color": COLORS["btn_teal_hover"],
                "command": lambda: self._show_coming_soon("สลับสิทธิ์กุญแจ")
            }
        ]
        
        # Create buttons in a row
        for i, btn_config in enumerate(buttons):
            btn = CircleButton(
                buttons_inner,
                icon=btn_config["icon"],
                label=btn_config["label"],
                color=btn_config["color"],
                hover_color=btn_config["hover_color"],
                command=btn_config["command"]
            )
            btn.grid(row=0, column=i, padx=SPACING["xl"])
        
        # Footer
        footer_frame = ctk.CTkFrame(self, fg_color="transparent")
        footer_frame.pack(side="bottom", fill="x", pady=SPACING["lg"])
        
        footer_label = ctk.CTkLabel(
            footer_frame,
            text="Hardware Key Management v1.0",
            font=FONTS["small"],
            text_color=COLORS["text_muted"]
        )
        footer_label.pack()
    
    def _show_coming_soon(self, feature_name):
        """Show coming soon message for features not yet implemented"""
        dialog = ctk.CTkToplevel(self)
        dialog.title("Coming Soon")
        dialog.geometry("350x180")
        dialog.resizable(False, False)
        dialog.configure(fg_color=COLORS["bg_secondary"])
        
        # Center the dialog
        dialog.transient(self.winfo_toplevel())
        dialog.grab_set()
        
        # Content
        icon_label = ctk.CTkLabel(
            dialog,
            text="🚧",
            font=("Helvetica", 48)
        )
        icon_label.pack(pady=(SPACING["lg"], SPACING["sm"]))
        
        msg_label = ctk.CTkLabel(
            dialog,
            text=f"{feature_name}\nกำลังพัฒนา...",
            font=FONTS["body"],
            text_color=COLORS["text_secondary"],
            justify="center"
        )
        msg_label.pack(pady=SPACING["sm"])
        
        close_btn = ctk.CTkButton(
            dialog,
            text="ปิด",
            font=FONTS["button"],
            fg_color=COLORS["accent_primary"],
            hover_color=COLORS["btn_blue_hover"],
            command=dialog.destroy,
            width=100
        )
        close_btn.pack(pady=SPACING["md"])
    
    def _on_return_click(self):
        """Handle return key button click"""
        # Navigate to scan waiting page with return mode
        # We need to pass mode via a method on the main app or page
        self.navigate("scan_waiting_return") 
