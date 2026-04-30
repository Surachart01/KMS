# ER Diagram — ระบบจัดการกุญแจ (KMS)

> ไฟล์นี้ใช้อ้างอิงใน `text.md` ของ Phase 1 ส่วน Entity Relationship Diagram

```mermaid
erDiagram
    %% -------------------------------------------------------------
    %% จัดกลุ่มความสัมพันธ์ใหม่ให้เรียงยอดจากบนลงล่าง ลดการทับซ้อนของเส้น
    %% -------------------------------------------------------------
    
    %% 1. ข้อมูลพื้นฐาน (Master Data)
    MAJOR ||--o{ SECTION : "contains"
    SECTION ||--o{ USER : "belongs_to"
    
    %% 2. จัดการตารางเรียนและรายวิชา
    SUBJECT ||--o{ SCHEDULE : "occurs_in"
    KEY ||--o{ SCHEDULE : "used_for"
    USER }o--o{ SCHEDULE : "enrolled_in"

    %% 3. การให้สิทธิ์ประจำวัน (Daily Auth)
    SCHEDULE ||--o{ DAILY_AUTHORIZATION : "generates"
    SUBJECT ||--o{ DAILY_AUTHORIZATION : "valid_for"
    USER ||--o{ DAILY_AUTHORIZATION : "authorized"

    %% 4. ระบบเบิกคืนกุญแจหลัก (Core Booking)
    USER ||--o{ BOOKING : "borrows"
    KEY ||--o{ BOOKING : "is_borrowed_in"
    SUBJECT ||--o{ BOOKING : "linked_to"
    
    %% 5. ระบบติดตามและบทลงโทษ (Logs & Penalty)
    BOOKING ||--o{ PENALTY_LOG : "triggers"
    USER ||--o{ PENALTY_LOG : "penalized"
    USER ||--o{ SYSTEM_LOG : "has_logs"

    %% -------------------------------------------------------------
    %% ข้อมูลตาราง (Entities) 
    %% -------------------------------------------------------------
    USER {
        string id PK
        string studentCode UK
        string email UK
        string password
        string firstName
        string lastName
        enum role
        int score
        boolean isBanned
        string sectionId FK
        datetime createdAt
    }

    KEY {
        string id PK
        string roomCode UK
        int slotNumber
        string nfcUid UK
        boolean isActive
    }

    SUBJECT {
        string id PK
        string code UK
        string name
    }

    SCHEDULE {
        string id PK
        string subjectId FK
        string roomCode FK
        int dayOfWeek
        datetime startTime
        datetime endTime
    }

    DAILY_AUTHORIZATION {
        string id PK
        string userId FK
        string roomCode
        date date
        datetime startTime
        datetime endTime
        enum source
        string scheduleId FK
        string subjectId FK
    }

    BOOKING {
        string id PK
        string userId FK
        string keyId FK
        string subjectId FK
        datetime borrowAt
        datetime dueAt
        datetime returnAt
        enum status
        string reason
        int lateMinutes
        int penaltyScore
    }

    PENALTY_LOG {
        string id PK
        string userId FK
        string bookingId FK
        enum type
        int scoreCut
        string reason
    }

    SYSTEM_LOG {
        string id PK
        string userId FK
        string action
        string details
        string ipAddress
    }

    SECTION {
        string id PK
        string name
        string majorId FK
    }

    MAJOR {
        string id PK
        string code UK
        string name
    }

    BORROW_REASON {
        string id PK
        string label UK
        int durationMinutes
        boolean isActive
    }

    PENALTY_CONFIG {
        string id PK
        int graceMinutes
        int scorePerInterval
        int intervalMinutes
        int restoreDays
    }


```

## ความสัมพันธ์สำคัญ

| ความสัมพันธ์ | คำอธิบาย |
|---|---|
| User → Booking | ผู้ใช้หนึ่งคนสามารถมีรายการเบิกได้หลายรายการ แต่การเบิกแต่ละครั้งเป็นของผู้ใช้คนเดียว |
| Key → Booking | กุญแจหนึ่งดอกสามารถถูกเบิกได้หลายครั้ง (ต่างเวลากัน) |
| Schedule → DailyAuthorization | ตารางสอนประจำสัปดาห์จะถูกแปลงเป็น DailyAuthorization ทุกวัน |
| Booking → PenaltyLog | เมื่อคืนกุญแจช้า ระบบจะสร้างบันทึกการหักคะแนนโดยอัตโนมัติ |
| DailyAuthorization | ตาราง "ต้นฉบับความจริง" ที่ระบบใช้ตรวจสอบสิทธิ์เบิกกุญแจในแต่ละวัน |
