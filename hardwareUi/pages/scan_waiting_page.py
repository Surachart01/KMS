"""
Scan Waiting Page - Wait for ZKTeco face scan
Optimized for 7-inch touchscreen (800x480)
"""

import customtkinter as ctk
from utils.theme import COLORS, FONTS, SPACING


def create_scan_waiting_page(parent, navigate):
    frame = ctk.CTkFrame(parent, fg_color=COLORS["bg_primary"])

    state = {
        "mode": "borrow",
        "selected_key": None,
        "animation_index": 0,
        "animation_running": False,
    }

    # --- Header (slim) ---
    header = ctk.CTkFrame(frame, fg_color=COLORS["header_bg"], corner_radius=0)
    header.pack(fill="x")
    header_inner = ctk.CTkFrame(header, fg_color="transparent")
    header_inner.pack(fill="x", padx=SPACING["md"], pady=SPACING["sm"])

    ctk.CTkButton(
        header_inner, text="← ยกเลิก", font=FONTS["button"],
        fg_color=COLORS["accent_danger"], hover_color="#ef5350",
        text_color=COLORS["text_white"], width=80, height=28,
        command=lambda: on_cancel(),
    ).pack(side="left")

    title_label = ctk.CTkLabel(
        header_inner, text="🔐 ยืนยันตัวตน",
        font=FONTS["subtitle"], text_color=COLORS["text_white"],
    )
    title_label.pack(side="left", padx=SPACING["md"])

    ctk.CTkFrame(frame, height=2, fg_color=COLORS["accent_success"], corner_radius=1).pack(fill="x")

    # --- Content ---
    content = ctk.CTkFrame(frame, fg_color="transparent")
    content.pack(expand=True, fill="both")

    center = ctk.CTkFrame(content, fg_color="transparent")
    center.place(relx=0.5, rely=0.4, anchor="center")

    room_label = ctk.CTkLabel(
        center, text="", font=FONTS["heading"], text_color=COLORS["text_secondary"],
    )
    room_label.pack(pady=(0, SPACING["md"]))

    scan_circle = ctk.CTkFrame(
        center, width=120, height=120, corner_radius=60,
        fg_color=COLORS["accent_primary"],
        border_width=3, border_color=COLORS["btn_green_hover"],
    )
    scan_circle.pack(pady=SPACING["md"])
    scan_circle.pack_propagate(False)

    ctk.CTkLabel(scan_circle, text="👤", font=("Helvetica", 48)).place(
        relx=0.5, rely=0.5, anchor="center"
    )

    instruction_label = ctk.CTkLabel(
        center, text="กรุณาสแกนใบหน้าที่เครื่อง ZKTeco",
        font=FONTS["heading"], text_color=COLORS["text_primary"],
    )
    instruction_label.pack(pady=SPACING["md"])

    loading_label = ctk.CTkLabel(
        center, text="⏳ กำลังรอข้อมูล...",
        font=FONTS["body"], text_color=COLORS["text_secondary"],
    )
    loading_label.pack()

    # --- Footer with test buttons ---
    footer = ctk.CTkFrame(frame, fg_color="transparent")
    footer.pack(side="bottom", fill="x", pady=SPACING["sm"])

    def on_test_scan():
        import logging
        lg = logging.getLogger(__name__)
        test_user_id = "6702041510164"
        lg.info(f"🧪 TEST SCAN: Simulating user {test_user_id}")
        app = frame.winfo_toplevel()
        if hasattr(app, "_on_scan_received"):
            app._on_scan_received(test_user_id)

    def on_test_scan_2():
        import logging
        lg = logging.getLogger(__name__)
        test_user_id = "6702041510181"
        lg.info(f"🧪 TEST SCAN: Simulating user {test_user_id}")
        app = frame.winfo_toplevel()
        if hasattr(app, "_on_scan_received"):
            app._on_scan_received(test_user_id)

    test_row = ctk.CTkFrame(footer, fg_color="transparent")
    test_row.pack()

    ctk.CTkButton(
        test_row, text="🧪 6702041510164", font=FONTS["small"],
        fg_color=COLORS["accent_primary"], hover_color=COLORS["btn_green_hover"],
        text_color=COLORS["text_white"], width=150, height=26,
        command=on_test_scan,
    ).pack(side="left", padx=SPACING["sm"])

    ctk.CTkButton(
        test_row, text="🧪 6702041510181", font=FONTS["small"],
        fg_color=COLORS["btn_teal"], hover_color=COLORS["btn_teal_hover"],
        text_color=COLORS["text_white"], width=150, height=26,
        command=on_test_scan_2,
    ).pack(side="left", padx=SPACING["sm"])

    # --- Actions ---
    def set_mode(mode="borrow"):
        state["mode"] = mode
        if mode == "return":
            title_label.configure(text="↩️ คืนกุญแจ")
            instruction_label.configure(text="กรุณาสแกนใบหน้าเพื่อคืนกุญแจ")
            room_label.configure(text="")
        else:
            title_label.configure(text="🔐 ยืนยันตัวตน")
            instruction_label.configure(text="กรุณาสแกนใบหน้าที่เครื่อง ZKTeco")

    def set_key(key_data):
        state["selected_key"] = key_data
        room_label.configure(text=f"🚪 ห้อง: {key_data.get('roomCode', '?')}")

    def animate():
        if not state["animation_running"]:
            return
        dots = ["⏳ รอข้อมูล", "⏳ รอข้อมูล.", "⏳ รอข้อมูล..", "⏳ รอข้อมูล..."]
        state["animation_index"] = (state["animation_index"] + 1) % len(dots)
        loading_label.configure(text=dots[state["animation_index"]])
        colors = [COLORS["accent_primary"], COLORS["btn_green_hover"]]
        scan_circle.configure(fg_color=colors[state["animation_index"] % 2])
        frame.after(500, animate)

    def start_animation():
        state["animation_running"] = True
        animate()

    def stop_animation():
        state["animation_running"] = False

    def get_mode():
        return state["mode"]

    def on_cancel():
        stop_animation()
        navigate("home")

    return frame, {
        "set_mode": set_mode,
        "set_key": set_key,
        "start_animation": start_animation,
        "stop_animation": stop_animation,
        "get_mode": get_mode,
    }
