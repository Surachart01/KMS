"""
Reason Page - Select reason when borrowing without authorization
Optimized for 7-inch touchscreen (800x480)
"""

import customtkinter as ctk
from utils.theme import COLORS, FONTS, SPACING


def create_reason_page(parent, navigate, on_confirm=None):
    frame = ctk.CTkFrame(parent, fg_color=COLORS["bg_primary"])

    state = {"selected_reason": None}

    reasons = [
        "ลืมกุญแจ",
        "มาทำงานนอกเวลา",
        "ติดต่ออาจารย์",
        "ทำความสะอาด",
        "ซ่อมบำรุง",
        "อื่นๆ",
    ]

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

    ctk.CTkLabel(
        header_inner, text="📝 ระบุเหตุผลการเบิก",
        font=FONTS["subtitle"], text_color=COLORS["text_white"],
    ).pack(side="left", padx=SPACING["md"])

    ctk.CTkFrame(frame, height=2, fg_color=COLORS["accent_success"], corner_radius=1).pack(fill="x")

    # --- Body ---
    ctk.CTkLabel(
        frame, text="คุณไม่มีตารางเรียนในขณะนี้ กรุณาระบุเหตุผล",
        font=FONTS["body"], text_color=COLORS["text_secondary"],
    ).pack(pady=(SPACING["lg"], SPACING["md"]))

    # Reason grid
    grid = ctk.CTkFrame(frame, fg_color="transparent")
    grid.pack(padx=30, pady=SPACING["sm"])

    # Custom input
    other_container = ctk.CTkFrame(frame, fg_color="transparent")
    other_container.pack(pady=SPACING["sm"], fill="x", padx=80)

    other_entry = ctk.CTkEntry(
        other_container, placeholder_text="ระบุเหตุผลอื่นๆ...",
        font=FONTS["body"], height=36,
        fg_color=COLORS["bg_card"], text_color=COLORS["text_primary"],
        border_color=COLORS["border"],
    )
    other_entry.pack(fill="x")
    other_entry.pack_forget()

    confirm_other_btn_holder = [None]

    def submit():
        if on_confirm and state["selected_reason"]:
            on_confirm(state["selected_reason"])

    def confirm_other():
        text = other_entry.get().strip()
        if text:
            state["selected_reason"] = text
            submit()

    def on_reason_select(reason):
        if reason == "อื่นๆ":
            state["selected_reason"] = None
            other_entry.pack(fill="x", pady=SPACING["sm"])
            other_entry.focus()
            if confirm_other_btn_holder[0] is None:
                btn = ctk.CTkButton(
                    other_container, text="ยืนยันเหตุผล", font=FONTS["body_bold"],
                    fg_color=COLORS["accent_primary"], hover_color=COLORS["btn_green_hover"],
                    text_color=COLORS["text_white"], height=36, command=confirm_other,
                )
                btn.pack(pady=SPACING["sm"])
                confirm_other_btn_holder[0] = btn
            else:
                confirm_other_btn_holder[0].pack(pady=SPACING["sm"])
        else:
            other_entry.pack_forget()
            if confirm_other_btn_holder[0]:
                confirm_other_btn_holder[0].pack_forget()
            state["selected_reason"] = reason
            submit()

    for i, reason in enumerate(reasons):
        row, col = divmod(i, 3)
        ctk.CTkButton(
            grid, text=reason, font=FONTS["body_bold"],
            fg_color=COLORS["bg_card"], text_color=COLORS["text_primary"],
            hover_color=COLORS["bg_hover"],
            border_width=1, border_color=COLORS["border"],
            width=200, height=45, corner_radius=10,
            command=lambda r=reason: on_reason_select(r),
        ).grid(row=row, column=col, padx=SPACING["sm"], pady=SPACING["sm"])

    def on_cancel():
        other_entry.delete(0, "end")
        other_entry.pack_forget()
        navigate("home")

    return frame, {}
