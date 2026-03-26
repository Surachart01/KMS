# KMS — Flow Diagrams (Borrow & Return)

> Borrow and Return key flow diagrams for the Key Management System.

---

## 1. Borrow Flow (ระบบเบิกกุญแจ)

### 1.1 UI State Machine

```mermaid
stateDiagram-v2
    direction TB

    [*] --> HomePage
    HomePage --> KeyListPage : Press Borrow Key

    KeyListPage --> ScanWaitingPage : Select Room

    state ScanWaitingPage : Waiting for face scan

    ScanWaitingPage --> ConfirmIdentityPage : Scan Success

    ConfirmIdentityPage --> SuccessPage : Confirm + Authorized
    ConfirmIdentityPage --> ReasonPage : No schedule found
    ConfirmIdentityPage --> ErrorPopup : Not authorized

    ReasonPage --> SuccessPage : Submit reason

    SuccessPage --> HomePage : Auto redirect 5s
    ErrorPopup --> HomePage : Close
```

### 1.2 System Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as Kiosk UI
    participant BE as Backend
    participant HW as Hardware Svc
    participant ESP as ESP8266

    User->>UI: Press Borrow Key
    UI->>BE: getKeys()
    BE-->>UI: Room list + status
    UI->>User: Show KeyListPage

    User->>UI: Select room
    UI->>User: Show ScanWaitingPage

    User->>UI: Face scan
    BE-->>UI: User data
    UI->>User: Show ConfirmIdentityPage

    User->>UI: Confirm
    UI->>BE: borrowKey(userId, roomCode)
    BE->>BE: Check permission + Create booking
    BE-->>UI: success + bookingId + slotNumber

    BE->>HW: gpio unlock (slot, bookingId)

    Note over HW,ESP: Hardware Phase

    HW->>HW: unlockSlot + set isUnlocking=true
    HW-->>BE: slot unlocked
    BE-->>UI: slot unlocked
    UI->>User: Show SuccessPage

    loop Every 1s for max 10s
        HW->>ESP: readNfcAtSlot(slot)
        ESP-->>HW: uid or null
    end

    alt Key pulled out (miss 3x)
        HW->>HW: lockSlot
        HW->>BE: key pulled
        BE->>BE: Log to SystemLog
        BE-->>UI: key pulled
    else Timeout - key not pulled
        HW->>HW: lockSlot + Final Verify
        alt Key still present
            HW->>BE: borrow cancelled
            BE->>BE: Delete booking
            BE-->>UI: borrow cancelled
            UI->>User: Show Error
        else Key gone
            HW->>BE: key pulled
        end
    end

    HW->>HW: isUnlocking=false (finally)
```

---

## 2. Return Flow (ระบบคืนกุญแจ)

### 2.1 UI State Machine

```mermaid
stateDiagram-v2
    direction TB

    [*] --> HomePage
    HomePage --> ScanWaitingPage : Press Return Key

    ScanWaitingPage --> ConfirmIdentityPage : Scan OK + Found booking
    ScanWaitingPage --> ErrorPopup : No active booking

    ConfirmIdentityPage --> WaitForKeyReturnPage : Confirm

    state WaitForKeyReturnPage : Waiting for NFC detection (60s timeout)

    WaitForKeyReturnPage --> SuccessPage : Key inserted OK
    WaitForKeyReturnPage --> HomePage : Timeout 60s

    SuccessPage --> HomePage : Auto redirect 5s
    ErrorPopup --> HomePage : Close
```

### 2.2 System Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as Kiosk UI
    participant BE as Backend
    participant HW as Hardware Svc
    participant ESP as ESP8266

    User->>UI: Press Return Key
    UI->>User: Show ScanWaitingPage

    User->>UI: Face scan
    UI->>BE: identifyUser(userId)
    BE->>BE: Find activeBooking
    BE-->>UI: activeBooking (room, slot)
    UI->>User: Show ConfirmIdentityPage

    User->>UI: Confirm
    UI->>User: Show WaitForKeyReturnPage

    Note over UI,HW: Waiting for physical key return

    par UI Countdown
        UI->>UI: Start 60s countdown
    and NFC Polling
        loop Every 500ms
            HW->>ESP: readNfcAtSlot(slot)
            ESP-->>HW: uid detected
        end
    end

    HW->>BE: nfc tag (slot, uid)
    BE-->>UI: nfc tag (slot, uid)

    UI->>UI: Verify slot matches booking

    alt Correct slot
        UI->>BE: returnKey(userId)
        BE->>BE: Update booking + Check penalty
        BE-->>UI: success
        UI->>User: Show SuccessPage
    else Timeout 60s
        UI->>User: Redirect to HomePage
    end
```

---

## 3. Communication Architecture

```mermaid
flowchart TB
    subgraph KIOSK[Kiosk UI - ViteJS React]
        A[App.jsx State Machine]
        B[WaitForKeyReturnPage]
    end

    subgraph BACKEND[Backend Server - NodeJS]
        C[Socket.io Hub]
        D[hardwareController.js]
        E[Database - Prisma]
    end

    subgraph HARDWARE[Hardware Service - RPi]
        F[hardware.js]
        G[startKeyPullCheck]
        H[startNfcPolling]
    end

    subgraph ESP[ESP8266 Boards]
        I[Board 1 - Slots 1 to 4]
        J[Board 2 - Slots 5 to 7]
    end

    A -- borrowKey / returnKey --> C
    C -- gpio unlock --> F
    F --> G
    G -- Serial JSON --> I
    G -- Serial JSON --> J
    H -- nfc tag --> C
    C -- nfc tag --> B
    B -- returnKey --> C
    C --> D
    D --> E
    G -- key pulled --> C
    C -- key pulled --> A
```

---

## 4. Socket Events

| Event | Direction | Description |
|---|---|---|
| `gpio:unlock` | Backend to HW | Unlock solenoid |
| `slot:unlocked` | HW to Backend to UI | Confirm unlocked |
| `key:pulled` | HW to Backend to UI | Key removed successfully |
| `borrow:cancelled` | HW to Backend to UI | Timeout, borrow cancelled |
| `nfc:tag` | HW to Backend to UI | NFC tag detected at slot |
| `scan:received` | Backend to UI | Face scan result |
| `key:return` | UI to Backend | Return key command |
| `key:transfer` | UI to Backend | Transfer authorization |
| `key:swap` | UI to Backend | Swap authorization |
| `key:move` | UI to Backend | Move room |
