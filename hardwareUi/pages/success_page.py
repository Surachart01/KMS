"""
Success Page - Key borrowing/returning success confirmation
Optimized for 7-inch touchscreen (800x480)
"""

import customtkinter as ctk
from utils.theme import COLORS, FONTS, SPACING


def create_success_page(parent, navigate):
    frame = ctk.CTkFrame(parent, fg_color=COLORS["bg_primary"])

    state = {"countdown": 10}

    # --- Content ---
    content = ctk.CTkFrame(frame, fg_color="transparent")
    content.pack(expand=True, fill="both")

    center = ctk.CTkFrame(content, fg_color="transparent")
    center.place(relx=0.5, rely=0.42, anchor="center")

    # Success icon
    success_circle = ctk.CTkFrame(
        center, width=100, height=100, corner_radius=50,
        fg_color=COLORS["accent_primary"],
    )
    success_circle.pack()
    success_circle.pack_propagate(False)

    ctk.CTkLabel(
        success_circle, text="✓",
        font=("Helvetica", 56, "bold"), text_color=COLORS["text_white"],
    ).place(relx=0.5, rely=0.5, anchor="center")

    title_label = ctk.CTkLabel(
        center, text="เบิกกุญแจสำเร็จ!",
        font=("Helvetica", 24, "bold"), text_color=COLORS["accent_primary"],
    )
    title_label.pack(pady=SPACING["md"])

    # Info card
    info_card = ctk.CTkFrame(
        center, fg_color=COLORS["bg_card"], corner_radius=12,
        border_width=1, border_color=COLORS["border"],
    )
    info_card.pack(pady=SPACING["sm"])
    info_inner = ctk.CTkFrame(info_card, fg_color="transparent")
    info_inner.pack(padx=SPACING["xxl"], pady=SPACING["md"])

    student_label = ctk.CTkLabel(
        info_inner, text="นักศึกษา: --",
        font=FONTS["heading"], text_color=COLORS["text_primary"],
    )
    student_label.pack()

    room_label = ctk.CTkLabel(
        info_inner, text="ห้อง: --",
        font=FONTS["body"], text_color=COLORS["text_secondary"],
    )
    room_label.pack(pady=SPACING["xs"])

    instruction_label = ctk.CTkLabel(
        center, text="กรุณาหยิบกุญแจจากช่องที่ระบุ",
        font=FONTS["body"], text_color=COLORS["text_muted"],
    )
    instruction_label.pack(pady=SPACING["md"])

    def on_home():
        state["countdown"] = 0
        navigate("home")

    ctk.CTkButton(
        center, text="🏠 กลับหน้าหลัก", font=FONTS["button"],
        fg_color=COLORS["accent_primary"], hover_color=COLORS["btn_green_hover"],
        text_color=COLORS["text_white"],
        width=160, height=36, command=on_home,
    ).pack(pady=SPACING["sm"])

    countdown_label = ctk.CTkLabel(
        center, text="จะกลับหน้าหลักอัตโนมัติใน 10 วินาที",
        font=FONTS["small"], text_color=COLORS["text_muted"],
    )
    countdown_label.pack()

    # --- Actions ---
    def set_data(student_id, key_data, mode="borrow", extra_data=None):
        student_label.configure(text=f"นักศึกษา: {student_id}")

        if mode == "return":
            title_label.configure(text="คืนกุญแจสำเร็จ!", text_color=COLORS["accent_primary"])
            instruction_label.configure(text="ขอบคุณที่คืนกุญแจตรงเวลา",
                                        text_color=COLORS["text_secondary"])
            if extra_data and extra_data.get("lateMinutes", 0) > 0:
                late = extra_data.get("lateMinutes", 0)
                score = extra_data.get("penaltyScore", 0)
                instruction_label.configure(
                    text=f"⚠️ คืนล่าช้า {late} นาที (หัก {score} คะแนน)",
                    text_color=COLORS["accent_danger"])
            room_label.configure(text="")
        else:
            title_label.configure(text="เบิกกุญแจสำเร็จ!", text_color=COLORS["accent_primary"])
            instruction_label.configure(text="กรุณาหยิบกุญแจจากช่องที่ระบุ",
                                        text_color=COLORS["text_secondary"])
            if key_data:
                room_code = key_data.get("roomCode", "?")
                slot = key_data.get("slotNumber", "?")
                room_label.configure(text=f"ห้อง: {room_code} (ช่อง #{slot})")

    def countdown_tick():
        if state["countdown"] > 0:
            countdown_label.configure(
                text=f"จะกลับหน้าหลักอัตโนมัติใน {state['countdown']} วินาที")
            state["countdown"] -= 1
            frame.after(1000, countdown_tick)
        else:
            on_home()

    def start_countdown():
        state["countdown"] = 10
        countdown_tick()

    return frame, {
        "set_data": set_data,
        "start_countdown": start_countdown,
    }
