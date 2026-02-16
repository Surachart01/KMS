"""
Home Page - Main menu with 3 circular navigation buttons
Optimized for 7-inch touchscreen (800x480)
"""

import customtkinter as ctk
from utils.theme import COLORS, FONTS, SPACING, CIRCLE_BUTTON


def create_circle_button(parent, icon, label, color, hover_color, command=None):
    """Create a custom circular button with icon and label."""
    frame = ctk.CTkFrame(parent, fg_color="transparent")

    circle = ctk.CTkFrame(
        frame,
        width=CIRCLE_BUTTON["size"],
        height=CIRCLE_BUTTON["size"],
        corner_radius=CIRCLE_BUTTON["size"] // 2,
        fg_color=color,
        border_width=CIRCLE_BUTTON["border_width"],
        border_color=hover_color,
    )
    circle.pack(pady=(0, SPACING["sm"]))
    circle.pack_propagate(False)

    icon_label = ctk.CTkLabel(
        circle, text=icon,
        font=("Helvetica", CIRCLE_BUTTON["icon_size"]),
        text_color=COLORS["text_white"],
    )
    icon_label.place(relx=0.5, rely=0.5, anchor="center")

    text_label = ctk.CTkLabel(
        frame, text=label,
        font=FONTS["heading"],
        text_color=COLORS["text_primary"],
    )
    text_label.pack()

    def on_enter(_e):
        circle.configure(fg_color=hover_color)
        frame.configure(cursor="hand2")

    def on_leave(_e):
        circle.configure(fg_color=color)
        frame.configure(cursor="")

    def on_click(_e):
        if command:
            command()

    for w in (circle, icon_label):
        w.bind("<Enter>", on_enter)
        w.bind("<Leave>", on_leave)
        w.bind("<Button-1>", on_click)

    return frame


def create_home_page(parent, navigate):
    frame = ctk.CTkFrame(parent, fg_color=COLORS["bg_primary"])

    # --- Header (slim) ---
    header = ctk.CTkFrame(frame, fg_color=COLORS["header_bg"], corner_radius=0)
    header.pack(fill="x")

    ctk.CTkLabel(
        header, text="🔑 ระบบเบิกกุญแจ",
        font=FONTS["title"], text_color=COLORS["text_white"],
    ).pack(pady=SPACING["md"])

    ctk.CTkFrame(frame, height=2, fg_color=COLORS["accent_success"], corner_radius=1).pack(fill="x")

    # --- Buttons ---
    buttons_frame = ctk.CTkFrame(frame, fg_color="transparent")
    buttons_frame.pack(expand=True, fill="both")

    buttons_inner = ctk.CTkFrame(buttons_frame, fg_color="transparent")
    buttons_inner.place(relx=0.5, rely=0.45, anchor="center")

    def show_coming_soon(name):
        d = ctk.CTkToplevel(frame)
        d.title("Coming Soon")
        d.geometry("300x140")
        d.resizable(False, False)
        d.configure(fg_color=COLORS["bg_secondary"])
        d.transient(frame.winfo_toplevel())
        d.grab_set()
        ctk.CTkLabel(d, text=f"🚧 {name}\nกำลังพัฒนา...",
                     font=FONTS["body"], text_color=COLORS["text_secondary"],
                     justify="center").pack(expand=True, pady=SPACING["lg"])
        ctk.CTkButton(d, text="ปิด", font=FONTS["button"],
                      fg_color=COLORS["accent_primary"], hover_color=COLORS["btn_green_hover"],
                      text_color=COLORS["text_white"], command=d.destroy,
                      width=80).pack(pady=SPACING["md"])

    cfgs = [
        ("🚪", "เลือกห้อง", COLORS["circle_1"], COLORS["btn_green_hover"],
         lambda: navigate("key_list")),
        ("↩️", "คืนกุญแจ", COLORS["circle_2"], COLORS["btn_teal_hover"],
         lambda: navigate("scan_waiting_return")),
        ("🔄", "สลับสิทธิ์กุญแจ", COLORS["circle_3"], "#689f38",
         lambda: show_coming_soon("สลับสิทธิ์กุญแจ")),
    ]

    for i, (icon, label, color, hover, cmd) in enumerate(cfgs):
        btn = create_circle_button(buttons_inner, icon, label, color, hover, cmd)
        btn.grid(row=0, column=i, padx=SPACING["xxl"])

    # --- Footer ---
    ctk.CTkLabel(
        frame, text="Hardware Key Management v1.0",
        font=FONTS["small"], text_color=COLORS["text_muted"],
    ).pack(side="bottom", pady=SPACING["sm"])

    return frame, {}
