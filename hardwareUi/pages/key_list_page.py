"""
Key List Page - Display keys fetched from backend API
Optimized for 7-inch touchscreen (800x480)
"""

import customtkinter as ctk
from utils.theme import COLORS, FONTS, SPACING
from utils import api_client
import threading


def _create_key_circle(parent, key_data, on_click=None):
    """Create a compact circular key item."""
    frame = ctk.CTkFrame(parent, fg_color="transparent")

    is_available = key_data.get("isAvailable", False)
    room_code = key_data.get("roomCode", "???")
    slot = key_data.get("slotNumber", "?")

    color = COLORS["accent_primary"] if is_available else COLORS["accent_danger"]
    hover_color = COLORS["btn_green_hover"] if is_available else "#ef5350"
    status_text = "ว่าง" if is_available else "ถูกเบิก"

    # Small circle
    circle = ctk.CTkFrame(
        frame, width=70, height=70, corner_radius=35,
        fg_color=color, border_width=2, border_color=hover_color,
    )
    circle.pack(pady=(0, 2))
    circle.pack_propagate(False)

    room_label = ctk.CTkLabel(
        circle, text=room_code, font=FONTS["body_bold"],
        text_color=COLORS["text_white"],
    )
    room_label.place(relx=0.5, rely=0.38, anchor="center")

    ctk.CTkLabel(
        circle, text=f"#{slot}", font=("Helvetica", 9),
        text_color="#e0e0e0",
    ).place(relx=0.5, rely=0.7, anchor="center")

    # Status
    status_color = COLORS["accent_primary"] if is_available else COLORS["accent_danger"]
    ctk.CTkLabel(
        frame, text=status_text, font=("Helvetica", 9), text_color=status_color,
    ).pack()

    # Borrower
    borrower = key_data.get("currentBorrower")
    if borrower:
        ctk.CTkLabel(
            frame, text=f"{borrower.get('studentCode', '?')[:10]}",
            font=("Helvetica", 8), text_color=COLORS["text_muted"],
        ).pack()

    # Hover / click
    def on_enter(_e):
        if is_available:
            circle.configure(fg_color=hover_color)
            frame.configure(cursor="hand2")

    def on_leave(_e):
        if is_available:
            circle.configure(fg_color=color)
            frame.configure(cursor="")

    def handle_click(_e):
        if is_available and on_click:
            on_click(key_data)

    for w in (circle, room_label):
        w.bind("<Enter>", on_enter)
        w.bind("<Leave>", on_leave)
        w.bind("<Button-1>", handle_click)

    return frame


def create_key_list_page(parent, navigate, on_key_selected=None):
    frame = ctk.CTkFrame(parent, fg_color=COLORS["bg_primary"])
    keys_data = []

    # --- Header (slim) ---
    header = ctk.CTkFrame(frame, fg_color=COLORS["header_bg"], corner_radius=0)
    header.pack(fill="x")
    header_inner = ctk.CTkFrame(header, fg_color="transparent")
    header_inner.pack(fill="x", padx=SPACING["md"], pady=SPACING["sm"])

    ctk.CTkButton(
        header_inner, text="← กลับ", font=FONTS["button"],
        fg_color=COLORS["accent_danger"], hover_color="#ef5350",
        text_color=COLORS["text_white"], width=70, height=28,
        command=lambda: navigate("home"),
    ).pack(side="left")

    ctk.CTkLabel(
        header_inner, text="🚪 เลือกห้อง", font=FONTS["subtitle"],
        text_color=COLORS["text_white"],
    ).pack(side="left", padx=SPACING["md"])

    ctk.CTkButton(
        header_inner, text="🔄 รีเฟรช", font=FONTS["small"],
        fg_color="#4caf50", hover_color="#66bb6a",
        text_color=COLORS["text_white"],
        width=70, height=28, command=lambda: load_keys(),
    ).pack(side="right")

    ctk.CTkFrame(frame, height=2, fg_color=COLORS["accent_success"], corner_radius=1).pack(fill="x")

    # --- Content ---
    content = ctk.CTkFrame(frame, fg_color="transparent")
    content.pack(expand=True, fill="both", padx=SPACING["md"], pady=SPACING["sm"])

    status_label = ctk.CTkLabel(
        content, text="", font=FONTS["small"], text_color=COLORS["text_muted"],
    )
    status_label.pack(pady=SPACING["xs"])

    keys_container = ctk.CTkFrame(content, fg_color="transparent")
    keys_container.pack(expand=True, fill="both")

    # --- Footer ---
    ctk.CTkLabel(
        frame, text="กดที่วงกลมเพื่อเลือกห้อง (เฉพาะห้องที่ว่างเท่านั้น)",
        font=FONTS["small"], text_color=COLORS["text_muted"],
    ).pack(side="bottom", pady=SPACING["xs"])

    # --- Helpers ---
    def show_loading():
        for w in keys_container.winfo_children():
            w.destroy()
        status_label.configure(text="⏳ กำลังโหลด...")

    def show_error(msg):
        for w in keys_container.winfo_children():
            w.destroy()
        status_label.configure(text=f"❌ {msg}")

    def show_keys():
        for w in keys_container.winfo_children():
            w.destroy()

        data = keys_data[0] if keys_data else {}
        items = data.get("data", []) if isinstance(data, dict) else data
        if not items:
            status_label.configure(text="ไม่พบกุญแจในระบบ")
            return

        total = len(items)
        available = sum(1 for k in items if k.get("isAvailable"))
        status_label.configure(text=f"กุญแจทั้งหมด: {total} | ว่าง: {available}")

        grid = ctk.CTkFrame(keys_container, fg_color="transparent")
        grid.place(relx=0.5, rely=0.5, anchor="center")

        for i, kd in enumerate(items):
            row, col = divmod(i, 5)
            kc = _create_key_circle(grid, kd, on_click=on_key_click)
            kc.grid(row=row, column=col, padx=SPACING["md"], pady=SPACING["sm"])

    def on_key_click(key_data_item):
        if key_data_item.get("isAvailable") and on_key_selected:
            on_key_selected(key_data_item)

    def fetch_keys():
        success, result = api_client.get_keys()
        frame.after(0, lambda: handle_response(success, result))

    def handle_response(success, result):
        if success:
            keys_data.clear()
            keys_data.append(result)
            show_keys()
        else:
            show_error(str(result))

    def load_keys():
        show_loading()
        threading.Thread(target=fetch_keys, daemon=True).start()

    return frame, {"load_keys": load_keys}
