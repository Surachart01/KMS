"""
Confirm Identity Page - Show student ID for confirmation before borrowing
Optimized for 7-inch touchscreen (800x480)
"""

import customtkinter as ctk
from utils.theme import COLORS, FONTS, SPACING
from utils import api_client
from utils import gpio_controller
import threading
import logging

logger = logging.getLogger(__name__)


def create_confirm_identity_page(parent, navigate):
    frame = ctk.CTkFrame(parent, fg_color=COLORS["bg_primary"])

    state = {"student_id": None, "selected_key": None}

    # --- Header (slim) ---
    header = ctk.CTkFrame(frame, fg_color=COLORS["header_bg"], corner_radius=0)
    header.pack(fill="x")
    header_inner = ctk.CTkFrame(header, fg_color="transparent")
    header_inner.pack(fill="x", padx=SPACING["md"], pady=SPACING["sm"])

    ctk.CTkButton(
        header_inner, text="← ยกเลิก", font=FONTS["button"],
        fg_color=COLORS["accent_danger"], hover_color="#ef5350",
        text_color=COLORS["text_white"], width=80, height=28,
        command=lambda: navigate("home"),
    ).pack(side="left")

    ctk.CTkLabel(
        header_inner, text="👤 ยืนยันตัวตน",
        font=FONTS["subtitle"], text_color=COLORS["text_white"],
    ).pack(side="left", padx=SPACING["md"])

    ctk.CTkFrame(frame, height=2, fg_color=COLORS["accent_success"], corner_radius=1).pack(fill="x")

    # --- Content ---
    content = ctk.CTkFrame(frame, fg_color="transparent")
    content.pack(expand=True, fill="both")

    center = ctk.CTkFrame(content, fg_color="transparent")
    center.place(relx=0.5, rely=0.42, anchor="center")

    # Avatar
    avatar = ctk.CTkFrame(center, width=80, height=80, corner_radius=40,
                          fg_color=COLORS["accent_primary"])
    avatar.pack()
    avatar.pack_propagate(False)
    ctk.CTkLabel(avatar, text="👤", font=("Helvetica", 36)).place(
        relx=0.5, rely=0.5, anchor="center")

    # Info card
    info_card = ctk.CTkFrame(center, fg_color=COLORS["bg_card"], corner_radius=12,
                             border_width=1, border_color=COLORS["border"])
    info_card.pack(pady=SPACING["md"])
    info_inner = ctk.CTkFrame(info_card, fg_color="transparent")
    info_inner.pack(padx=SPACING["xxl"], pady=SPACING["md"])

    ctk.CTkLabel(info_inner, text="รหัสนักศึกษา",
                 font=FONTS["body"], text_color=COLORS["text_secondary"]).pack()

    student_id_label = ctk.CTkLabel(info_inner, text="--",
                                     font=FONTS["title"], text_color=COLORS["accent_primary"])
    student_id_label.pack()

    ctk.CTkLabel(info_inner, text="ห้องที่เลือก",
                 font=FONTS["body"], text_color=COLORS["text_secondary"]).pack(pady=(SPACING["sm"], 0))

    room_label = ctk.CTkLabel(info_inner, text="--",
                               font=FONTS["subtitle"], text_color=COLORS["accent_primary"])
    room_label.pack()

    # Buttons
    btns = ctk.CTkFrame(center, fg_color="transparent")
    btns.pack(pady=SPACING["lg"])

    cancel_btn = ctk.CTkButton(
        btns, text="❌ ยกเลิก", font=FONTS["button"],
        fg_color=COLORS["accent_danger"], hover_color="#ef5350",
        text_color=COLORS["text_white"], width=120, height=40,
        command=lambda: navigate("home"),
    )
    cancel_btn.pack(side="left", padx=SPACING["md"])

    confirm_btn = ctk.CTkButton(
        btns, text="✅ ยืนยัน", font=FONTS["button"],
        fg_color=COLORS["accent_primary"], hover_color=COLORS["btn_green_hover"],
        text_color=COLORS["text_white"], width=120, height=40,
        command=lambda: on_confirm(),
    )
    confirm_btn.pack(side="left", padx=SPACING["md"])

    # --- Helpers ---
    def set_loading(loading):
        s = "disabled" if loading else "normal"
        confirm_btn.configure(state=s)
        cancel_btn.configure(state=s)

    def show_error(msg):
        d = ctk.CTkToplevel(frame)
        d.title("ข้อผิดพลาด")
        d.geometry("350x150")
        d.configure(fg_color=COLORS["bg_secondary"])
        d.transient(frame.winfo_toplevel())
        d.grab_set()
        ctk.CTkLabel(d, text=f"❌ {msg}", wraplength=310,
                     text_color=COLORS["text_primary"]).pack(expand=True, padx=15, pady=15)
        ctk.CTkButton(d, text="ตกลง", fg_color=COLORS["accent_primary"],
                      hover_color=COLORS["btn_green_hover"],
                      text_color=COLORS["text_white"], command=d.destroy).pack(pady=8)
        set_loading(False)

    def _handle_borrow_success(result):
        data = result.get("data", {})
        slot_number = data.get("keySlotNumber")
        if slot_number:
            logger.info(f"🔓 Unlocking solenoid slot {slot_number}")
            gpio_controller.unlock_slot(slot_number)
        else:
            logger.warning("⚠️ No keySlotNumber in response")
        navigate("success")

    def process_borrow():
        room_code = state["selected_key"].get("roomCode") if state["selected_key"] else ""
        student_code = state["student_id"] or ""
        success, result = api_client.borrow_key(student_code, room_code)
        if success:
            frame.after(0, lambda: _handle_borrow_success(result))
        else:
            if isinstance(result, dict) and result.get("error_code") == "REQUIRE_REASON":
                frame.after(0, navigate, "reason")
            else:
                msg = result.get("message", "เกิดข้อผิดพลาด") if isinstance(result, dict) else str(result)
                frame.after(0, lambda: show_error(msg))

    def process_borrow_retry(reason):
        room_code = state["selected_key"].get("roomCode") if state["selected_key"] else ""
        student_code = state["student_id"] or ""
        success, result = api_client.borrow_key(student_code, room_code, reason=reason)
        if success:
            frame.after(0, lambda: _handle_borrow_success(result))
        else:
            msg = result.get("message", "เกิดข้อผิดพลาด") if isinstance(result, dict) else str(result)
            frame.after(0, lambda: show_error(msg))

    def on_confirm():
        set_loading(True)
        threading.Thread(target=process_borrow, daemon=True).start()

    def set_data(student_id, key_data):
        state["student_id"] = student_id
        state["selected_key"] = key_data
        student_id_label.configure(text=student_id)
        if key_data:
            room_label.configure(text=f"🚪 {key_data.get('roomCode', '?')}")

    def process_borrow_with_reason(reason):
        set_loading(True)
        threading.Thread(target=lambda: process_borrow_retry(reason), daemon=True).start()

    return frame, {
        "set_data": set_data,
        "process_borrow_with_reason": process_borrow_with_reason,
    }
