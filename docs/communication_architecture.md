# KMS Communication Architecture

This diagram details the real-time communication flows between the Hardware, Backend, and Frontend of the Key Management System.

```mermaid
flowchart TB
    subgraph HARDWARE ["Hardware Service (RPi)"]
        H[hardware.js]
        I[startNfcPolling]
        G[startKeyPullCheck]
    end

    subgraph BACKEND ["Backend Server (Node.js)"]
        C[Socket.io Hub]
        D[hardwareController.js]
        E["Database (Prisma)"]
    end

    subgraph KIOSK ["Kiosk UI (ViteJS + React)"]
        A[App.jsx - State Machine]
        B[WaitForKeyReturnPage]
    end

    subgraph ADMIN ["Admin Dashboard (Next.js)"]
        L[Admin Pages]
        M[Real-time Monitoring]
    end

    subgraph ESP ["ESP8266 Boards"]
        J["Board 1 (Slots 1-4)"]
        K["Board 2 (Slots 5-7)"]
    end

    %% Kiosk Flows
    I -- nfc:tag --> C
    C -- nfc:tag --> B
    B -- "returnKey(userId)" --> C
    
    %% Admin Flows
    L -- "REST API (CRUD)" --> C
    C -- "Socket Events" --> M
    
    %% Physical Layer
    A -- "borrowKey / returnKey" --> C
    C -- "gpio:unlock" --> H
    H -- "Serial JSON" --> J
    H -- "Serial JSON" --> K
    H --> G
    
    %% Flow: Pull Feedback
    G -- key:pulled --> C
    G -- borrow:cancelled --> C
    C -- "key:pulled / borrow:cancelled" --> A
    
    %% Backend internal
    C --> D
    D --> E
```

## Communication Summary

1.  **Frontend → Backend**: 
    -   React pages (`App.jsx`, `WaitForKeyReturnPage`) use **REST** and **Sockets** to trigger actions (`borrowKey`, `returnKey`).
2.  **Backend → Hardware**: 
    -   The `Socket.io Hub` sends `gpio:unlock` events to the RPi service (`hardware.js`).
3.  **Hardware → ESP8266**: 
    -   The RPi service uses **Serial JSON** to communicate with the multiple ESP8266 boards controlling the slots.
4.  **Hardware Feedback → Frontend**: 
    -   Real-time events like `nfc:tag`, `key:pulled`, and `borrow:cancelled` traverse from the hardware through the backend sockets back to the React UI for immediate state changes.
