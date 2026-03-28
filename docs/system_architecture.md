# KMS System Architecture Overview

This diagram shows the communication flow between the Frontend, Backend, Kiosk Hardware, and Database.

```mermaid
flowchart TB
    %% Users
    UserStudent[("🎓 Student / User")]
    UserStaff[("👨‍💻 Staff / Admin")]

    subgraph CLIENTS ["Presentation Layer"]
        KioskFront["🖥️ Kiosk UI (Raspberry Pi Screen)<br/>React / Vite"]
        WebAdmin["🌐 Web Admin Dashboard<br/>React / Vite"]
    end

    subgraph SERVER ["Application Layer"]
        Backend["🚀 Backend Server (Node.js / Express)"]
        SocketHub["📡 Socket.io Hub<br/>(Real-time Communication)"]
        Prisma["🛠️ Prisma ORM"]
    end

    subgraph STORAGE ["Data Layer"]
        Db[("🐘 PostgreSQL Database")]
    end

    subgraph HARDWARE ["Physical / Hardware Layer"]
        RPiBridge["🍓 RPi Hardware Bridge (Node.js)<br/>GPIO & Serial Control"]
        ESP8266_1["📟 ESP8266 Board 1<br/>Slots 1 to 4"]
        ESP8266_2["📟 ESP8266 Board 2<br/>Slots 5 to 7"]
        Solenoids["🔒 Solenoid Locks<br/>Relays Control"]
        NFC_Readers["📡 MFRC522<br/>NFC Scanners"]
    end

    %% Interaction
    UserStudent -- "Interacts" --> KioskFront
    UserStaff -- "Manages" --> WebAdmin

    %% Flows
    WebAdmin -- "REST API" --> Backend
    KioskFront -- "REST API" --> Backend
    KioskFront -- "Socket.io" <--> SocketHub

    Backend -- "Events" <--> SocketHub
    Backend -- "Query" --> Prisma
    Prisma -- "Save/Load" --> Db

    SocketHub -- "gpio:unlock" --> RPiBridge
    RPiBridge -- "Hardware Events" --> SocketHub

    RPiBridge -- "Serial JSON" --> ESP8266_1
    RPiBridge -- "Serial JSON" --> ESP8266_2
    RPiBridge -- "GPIO" --> Solenoids
    ESP8266_1 -- "SPI" --> NFC_Readers
    ESP8266_2 -- "SPI" --> NFC_Readers
```

## Communication Protocols
1.  **REST API (HTTP)**: Used for major transactions like authentication, fetching key lists, and submitting borrow reasons.
2.  **Socket.io (WebSockets)**: Provides instantaneous feedback between the physical cabinet and the UI.
3.  **Serial (UART)**: Protocol between the Raspberry Pi and ESP8266 controllers.
4.  **Prisma (TCP/SQL)**: Database communication for persistence.
