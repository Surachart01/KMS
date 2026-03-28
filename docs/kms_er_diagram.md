# KMS Entity Relationship Diagram (ERD)

This diagram represents the database structure of the Key Management System (KMS), supporting key borrowing, schedule-aware authorizations, and penalty tracking.

```mermaid
erDiagram
    USER ||--o{ BOOKING : borrows
    USER ||--o{ SYSTEM_LOG : "has logs"
    USER ||--o{ SUBJECT_TEACHER : teaches
    USER }o--o{ SCHEDULE : enrolled_in
    USER ||--o{ PENALTY_LOG : penalized
    USER ||--o{ DAILY_AUTHORIZATION : authorized
    USER }o--|| SECTION : belongs_to

    MAJOR ||--o{ SECTION : contains

    SUBJECT ||--o{ SUBJECT_TEACHER : is_taught_in
    SUBJECT ||--o{ SCHEDULE : occurs_in
    SUBJECT ||--o{ BOOKING : linked_to
    SUBJECT ||--o{ DAILY_AUTHORIZATION : valid_for

    KEY ||--o{ BOOKING : "is borrowed in"
    KEY ||--o{ SCHEDULE : "used for"

    SCHEDULE ||--o{ DAILY_AUTHORIZATION : "generates"

    BOOKING ||--o{ PENALTY_LOG : "triggers"

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

    SCHEDULE {
        string id PK
        string subjectId FK
        string roomCode FK
        int dayOfWeek
        datetime startTime
        datetime endTime
    }

    SUBJECT {
        string id PK
        string code UK
        string name
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

## Key Relationships
- **User & Booking**: A user can have multiple bookings (borrow logs), but each booking belongs to one user.
- **Key & Schedule**: A physical key is associated with a roomCode, which is used in schedules to identify where classes occur.
- **DailyAuthorization**: This table is the "Source of Truth" for who can borrow what key at what time. It is populated either automatically from `Schedule` or manually by staff.
- **Penalty Logic**: When a `Booking` is returned late, a `PenaltyLog` is created, and the `User.score` is updated based on `PenaltyConfig`.
