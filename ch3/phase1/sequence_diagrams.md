# Sequence Diagrams — ระบบจัดการกุญแจ (KMS)

> ไฟล์นี้ใช้อ้างอิงใน `text.md` ของ Phase 1 ส่วน Sequence Diagrams

---

## 1. ลำดับการทำงาน: การเบิกกุญแจ (Borrow Key)

```mermaid
sequenceDiagram
    autonumber
    actor User as ผู้ใช้งาน
    participant UI as Kiosk UI (React)
    participant BE as Backend (Node.js)
    participant HW as Hardware Service (RPi)
    participant ESP as ESP8266 Boards

    User->>UI: กดปุ่ม "เบิกกุญแจ"
    UI->>BE: GET /api/hardware/keys
    BE-->>UI: รายชื่อห้องและสถานะกุญแจ
    UI->>User: แสดงหน้าเลือกห้อง (KeyListPage)

    User->>UI: เลือกห้องที่ต้องการ
    UI->>User: แสดงหน้ารอสแกนใบหน้า (ScanWaitingPage)

    User->>UI: วางบัตร/สแกนใบหน้าที่เครื่อง ZKTeco
    BE-->>UI: ส่งข้อมูลผู้ใช้ผ่าน Socket (scan:received)
    UI->>User: แสดงหน้ายืนยันตัวตน (ConfirmIdentityPage)

    User->>UI: กดยืนยัน
    UI->>BE: POST /api/hardware/borrow
    BE->>BE: ตรวจสอบสิทธิ์ + สร้างรายการเบิก (Booking)

    alt มีสิทธิ์ตามตาราง
        BE-->>UI: สำเร็จ + slotNumber
    else ไม่มีสิทธิ์ (ต้องใส่เหตุผล)
        BE-->>UI: REQUIRE_REASON
        UI->>User: แสดงหน้ากรอกเหตุผล (ReasonPage)
        User->>UI: กรอกเหตุผล + เวลาคืน
        UI->>BE: POST /api/hardware/borrow (พร้อม reason)
        BE-->>UI: สำเร็จ + slotNumber
    end

    BE->>HW: gpio:unlock (slotNumber, bookingId) ผ่าน Socket
    HW->>HW: ปลดล็อก Solenoid + ตั้งค่า isUnlocking=true
    HW-->>BE: slot:unlocked
    BE-->>UI: slot:unlocked

    loop ตรวจสอบทุก 1 วินาที (สูงสุด 10 ครั้ง)
        HW->>ESP: อ่าน NFC ที่ช่อง (readNfcAtSlot)
        ESP-->>HW: พบ UID หรือ null
    end

    alt กุญแจถูกดึงออก (NFC หายไป 3 ครั้งติดกัน)
        HW->>HW: ล็อก Solenoid กลับ
        HW->>BE: key:pulled
        BE-->>UI: key:pulled
        UI->>User: แสดงหน้าสำเร็จ (SuccessPage)
    else หมดเวลา 10 วินาที (กุญแจยังอยู่)
        HW->>HW: ล็อก Solenoid + ตรวจสอบซ้ำ
        HW->>BE: borrow:cancelled
        BE->>BE: ลบ Booking ออก
        BE-->>UI: borrow:cancelled
        UI->>User: แสดงข้อผิดพลาด
    end
```

---

## 2. ลำดับการทำงาน: การคืนกุญแจ (Return Key)

```mermaid
sequenceDiagram
    autonumber
    actor User as ผู้ใช้งาน
    participant UI as Kiosk UI (React)
    participant BE as Backend (Node.js)
    participant HW as Hardware Service (RPi)
    participant ESP as ESP8266 Boards

    User->>UI: กดปุ่ม "คืนกุญแจ"
    UI->>User: แสดงหน้ารอสแกนใบหน้า (ScanWaitingPage)

    User->>UI: วางบัตร/สแกนใบหน้าที่เครื่อง ZKTeco
    UI->>BE: POST /api/hardware/identify
    BE->>BE: ค้นหารายการเบิกที่ค้างอยู่ (Active Booking)

    alt พบรายการเบิกค้างอยู่
        BE-->>UI: ข้อมูลการเบิก (ห้อง, ช่อง, เวลา)
        UI->>User: แสดงหน้ายืนยันตัวตน (ConfirmIdentityPage)
        User->>UI: กดยืนยัน
        UI->>User: แสดงหน้ารอเสียบกุญแจ (WaitForKeyReturnPage)

        par นับถอยหลัง 60 วินาที
            UI->>UI: เริ่มนับถอยหลัง
        and ตรวจจับ NFC
            loop ตรวจทุก 500ms
                HW->>ESP: อ่าน NFC ที่ช่องกุญแจ
                ESP-->>HW: พบ UID
                HW->>BE: nfc:tag (slot, uid)
                BE-->>UI: nfc:tag (slot, uid)
            end
        end

        UI->>UI: ตรวจสอบว่าช่องตรงกับรายการเบิกหรือไม่

        alt ช่องถูกต้อง
            UI->>BE: POST /api/hardware/return
            BE->>BE: อัปเดต Booking + คำนวณ penalty
            BE-->>UI: สำเร็จ
            UI->>User: แสดงหน้าสำเร็จ (SuccessPage)
        else ช่องไม่ถูกต้อง
            UI->>User: แสดงคำเตือน "กรุณาเสียบช่อง X"
        else หมดเวลา 60 วินาที
            UI->>User: กลับสู่หน้าหลัก
        end
    else ไม่พบรายการเบิกค้างอยู่
        BE-->>UI: ไม่พบรายการเบิก
        UI->>User: แสดงข้อผิดพลาด
    end
```

---

## 3. ลำดับการทำงาน: การสลับสิทธิ์กุญแจ (Swap Authorization)

```mermaid
sequenceDiagram
    autonumber
    actor UserA as ผู้ใช้ ก
    actor UserB as ผู้ใช้ ข
    participant UI as Kiosk UI
    participant BE as Backend

    UserA->>UI: กดเมนู "สลับสิทธิ์"
    UI->>UserA: แสดงหน้ารอสแกนผู้ใช้คนที่ 1 (ScanWaitingPage)
    UserA->>UI: สแกนใบหน้า / บัตร
    BE-->>UI: ข้อมูลผู้ใช้ ก + ห้องที่ถืออยู่

    UI->>UserB: แสดงหน้ารอสแกนผู้ใช้คนที่ 2
    UserB->>UI: สแกนใบหน้า / บัตร
    BE-->>UI: ข้อมูลผู้ใช้ ข + ห้องที่ถืออยู่

    UI->>UI: แสดงหน้ายืนยัน (SwapConfirmPage)
    UserA->>UI: กดยืนยันสลับสิทธิ์

    UI->>BE: POST /api/hardware/swap
    BE->>BE: ตรวจสอบสิทธิ์ + ตรวจ Schedule ทับซ้อน
    BE->>BE: สลับชื่อผู้รับผิดชอบกุญแจ + บันทึก SystemLog

    BE-->>UI: สลับสิทธิ์สำเร็จ
    UI->>UserA: แสดงหน้าสำเร็จ
    UI->>UserB: แสดงหน้าสำเร็จ
```

---

## 4. ลำดับการทำงาน: การโอนสิทธิ์กุญแจ (Transfer Authorization)

```mermaid
sequenceDiagram
    autonumber
    actor UserA as ผู้โอน (ผู้มีกุญแจ)
    actor UserB as ผู้รับโอน
    participant UI as Kiosk UI
    participant BE as Backend

    UserA->>UI: กดเมนู "โอนสิทธิ์"
    UI->>UserA: แสดงหน้ารอสแกนผู้โอน
    UserA->>UI: สแกนใบหน้า / บัตร
    BE-->>UI: ข้อมูลผู้โอน + รายการเบิกที่ค้าง

    UI->>UserB: แสดงหน้ารอสแกนผู้รับโอน
    UserB->>UI: สแกนใบหน้า / บัตร
    BE-->>UI: ข้อมูลผู้รับโอน

    UI->>UI: แสดงหน้ายืนยัน (TransferConfirmPage)
    UserA->>UI: กดยืนยันโอนสิทธิ์

    UI->>BE: POST /api/hardware/transfer
    BE->>BE: ตรวจสอบสถานะกุญแจของผู้โอน
    BE->>BE: เปลี่ยนชื่อผู้รับผิดชอบเป็นผู้รับโอน + บันทึก SystemLog

    BE-->>UI: โอนสิทธิ์สำเร็จ
    UI->>UserA: แสดงหน้าสำเร็จ
```

---

## 5. ลำดับการทำงาน: เจ้าหน้าที่/อาจารย์ (Staff/Teacher Web System)

```mermaid
sequenceDiagram
    autonumber
    actor Staff as เจ้าหน้าที่ / อาจารย์
    participant WEB as Web Application (Next.js)
    participant BE as Backend API

    Staff->>WEB: เข้าสู่ระบบ (Login)
    WEB->>BE: POST /api/auth/login
    BE-->>WEB: JWT Token + Role

    alt บทบาท: อาจารย์ (TEACHER)
        Staff->>WEB: ดูตารางสอนของตนเอง
        WEB->>BE: GET /api/teacher/schedules
        BE-->>WEB: ตารางสอน
        Staff->>WEB: จัดการตารางเรียนของตนเอง
        WEB->>BE: PUT /api/teacher/schedules/:id
    end

    alt บทบาท: เจ้าหน้าที่ (STAFF) / Admin
        Staff->>WEB: จัดการข้อมูลผู้ใช้
        WEB->>BE: GET /api/users
        Staff->>WEB: จัดการกุญแจ
        WEB->>BE: GET /api/keys
        Staff->>WEB: ดู Booking ประวัติทั้งหมด
        WEB->>BE: GET /api/bookings
        Staff->>WEB: ดู System Log
        WEB->>BE: GET /api/logs
    end
```
