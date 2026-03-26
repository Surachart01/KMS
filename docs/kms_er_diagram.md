# KMS — Entity Relationship Diagram

> Database schema for the Key Management System (PostgreSQL + Prisma)

---

## ER Diagram

```mermaid
erDiagram
    User {
        string id PK
        string studentCode UK
        string email
        string firstName
        string lastName
        string role
        int score
        boolean isBanned
        string sectionId FK
    }

    Major {
        string id PK
        string code UK
        string name
    }

    Section {
        string id PK
        string name
        string majorId FK
    }

    Subject {
        string id PK
        string code UK
        string name
    }

    SubjectTeacher {
        string id PK
        string subjectId FK
        string teacherId FK
    }

    Schedule {
        string id PK
        string subjectId FK
        string roomCode FK
        int dayOfWeek
        string startTime
        string endTime
    }

    Key {
        string id PK
        string roomCode UK
        int slotNumber
        string nfcUid UK
        boolean isActive
    }

    Booking {
        string id PK
        string userId FK
        string keyId FK
        string subjectId FK
        string borrowAt
        string dueAt
        string returnAt
        string status
        string reason
        int lateMinutes
        int penaltyScore
    }

    DailyAuthorization {
        string id PK
        string roomCode
        string date
        string startTime
        string endTime
        string userId FK
        string source
        string scheduleId FK
        string subjectId FK
    }

    PenaltyConfig {
        string id PK
        int graceMinutes
        int scorePerInterval
        int intervalMinutes
        int restoreDays
        boolean isActive
    }

    PenaltyLog {
        string id PK
        string userId FK
        string bookingId FK
        string type
        int scoreCut
        string reason
    }

    BorrowReason {
        string id PK
        string label UK
        int durationMinutes
        boolean isActive
        int sortOrder
    }

    SystemLog {
        string id PK
        string userId FK
        string action
        string details
        string ipAddress
    }

    Major ||--o{ Section : has
    Section ||--o{ User : contains
    Subject ||--o{ SubjectTeacher : has
    User ||--o{ SubjectTeacher : teaches
    Subject ||--o{ Schedule : has
    Key ||--o{ Schedule : usedIn
    User ||--o{ Booking : makes
    Key ||--o{ Booking : bookedAs
    Subject ||--o{ Booking : relatedTo
    User ||--o{ DailyAuthorization : authorized
    Schedule ||--o{ DailyAuthorization : generates
    Subject ||--o{ DailyAuthorization : forSubject
    User ||--o{ PenaltyLog : receives
    Booking ||--o{ PenaltyLog : causes
    User ||--o{ SystemLog : logs
```

---

## Relationships

| From | To | Type | Description |
|---|---|---|---|
| Major | Section | 1:N | Major has many sections |
| Section | User | 1:N | Section contains many users |
| Subject | SubjectTeacher | 1:N | Subject taught by teachers |
| User | SubjectTeacher | 1:N | Teacher teaches subjects |
| Subject | Schedule | 1:N | Subject has schedules |
| Key | Schedule | 1:N | Key room used in schedules |
| User | Booking | 1:N | User makes bookings |
| Key | Booking | 1:N | Key booked in bookings |
| Subject | Booking | 1:N | Booking related to subject |
| User | DailyAuthorization | 1:N | User has daily authorizations |
| Schedule | DailyAuthorization | 1:N | Schedule generates authorizations |
| User | PenaltyLog | 1:N | User receives penalties |
| Booking | PenaltyLog | 1:N | Booking causes penalties |
| User | SystemLog | 1:N | User actions logged |

---

## Enums

| Enum | Values | Description |
|---|---|---|
| Role | STUDENT, TEACHER, STAFF, ADMIN | User roles |
| BookingStatus | BORROWED, RETURNED, LATE, RESERVED | Booking lifecycle |
| PenaltyType | LATE_RETURN, MANUAL | Penalty categories |
| AuthSource | SCHEDULE, MANUAL | Authorization origin |
