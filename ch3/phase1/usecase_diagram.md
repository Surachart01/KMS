# Use Case Diagram — ระบบจัดการกุญแจ (KMS)

> ไฟล์นี้ใช้อ้างอิงใน `text.md` ของ Phase 1 ส่วน Use Case Diagram

## Use Case Diagram (ภาพรวม)

```mermaid
flowchart LR
    subgraph ACTORS ["ผู้เกี่ยวข้อง (Actors)"]
        Student["🎓 นักศึกษา"]
        Staff["👨‍🏫 อาจารย์ / เจ้าหน้าที่"]
        Admin["⚙️ ผู้ดูแลระบบ (Admin)"]
    end

    subgraph KIOSK ["ระบบตู้กุญแจ (Kiosk)"]
        UC1("เบิกกุญแจ")
        UC2("คืนกุญแจ")
        UC3("สลับสิทธิ์กุญแจ")
        UC4("โอนสิทธิ์กุญแจ")
    end

    subgraph WEB ["ระบบเว็บแอปพลิเคชัน (Web)"]
        UC5("ดูประวัติการเบิก-คืน")
        UC6("จัดการกุญแจและช่องเก็บ")
        UC7("จัดการตารางเรียน")
        UC8("จัดการข้อมูลผู้ใช้")
        UC9("อนุมัติการเบิกกรณีพิเศษ")
        UC10("ดู System Log")
    end

    Student --> UC1
    Student --> UC2
    Student --> UC3
    Student --> UC5

    Staff --> UC1
    Staff --> UC2
    Staff --> UC4
    Staff --> UC5
    Staff --> UC9

    Admin --> UC1
    Admin --> UC2
    Admin --> UC3
    Admin --> UC4
    Admin --> UC5
    Admin --> UC6
    Admin --> UC7
    Admin --> UC8
    Admin --> UC9
    Admin --> UC10
```

## ตารางสรุปสิทธิ์การใช้งาน

| ฟังก์ชัน | นักศึกษา | อาจารย์ | เจ้าหน้าที่/Admin |
|---|:---:|:---:|:---:|
| เบิกกุญแจ (ตามตาราง) | ✅ | ✅ | ✅ |
| เบิกกุญแจ (นอกตาราง ต้องใส่เหตุผล) | ✅ | ✅ (ไม่ต้องใส่เหตุผล) | ✅ (ไม่ต้องใส่เหตุผล) |
| คืนกุญแจ | ✅ | ✅ | ✅ |
| สลับสิทธิ์กุญแจ (Swap) | ✅ | ❌ | ✅ |
| โอนสิทธิ์กุญแจ (Transfer) | ❌ | ✅ | ✅ |
| จัดการตารางเรียน | ❌ | ✅ (เฉพาะวิชาตัวเอง) | ✅ |
| จัดการข้อมูลผู้ใช้ | ❌ | ❌ | ✅ |
| ดู System Log | ❌ | ❌ | ✅ |
