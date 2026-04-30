flowchart LR
    %% ตกแต่งสีสันให้แยกแยะแต่ละส่วนได้ง่ายขึ้น
    classDef actor fill:#fef9e7,stroke:#f39c12,stroke-width:2px;
    classDef kiosk fill:#eaf2f8,stroke:#2980b9,stroke-width:2px;
    classDef web fill:#e9f7ef,stroke:#27ae60,stroke-width:2px;

    subgraph WEB ["💻 ระบบเว็บแอปพลิเคชัน (Web)"]
        direction TB
        UC5("ดูประวัติการเบิก-คืน"):::web
        UC9("อนุมัติการเบิกกรณีพิเศษ"):::web
        UC6("จัดการกุญแจและช่องเก็บ"):::web
        UC7("จัดการตารางเรียน"):::web
        UC8("จัดการข้อมูลผู้ใช้"):::web
        UC10("ดู System Log"):::web
    end

    subgraph ACTORS ["👥 ผู้เกี่ยวข้อง (Actors)"]
        direction TB
        Student["🎓 นักศึกษา"]:::actor
        Staff["👨‍🏫 อาจารย์ / เจ้าหน้าที่"]:::actor
        Admin["⚙️ ผู้ดูแลระบบ (Admin)"]:::actor
    end

    subgraph KIOSK ["🏨 ระบบตู้กุญแจ (Kiosk)"]
        direction TB
        UC1("เบิกกุญแจ"):::kiosk
        UC2("คืนกุญแจ"):::kiosk
        UC3("สลับสิทธิ์กุญแจ"):::kiosk
        UC4("โอนสิทธิ์กุญแจ"):::kiosk
    end

    %% การเชื่อมต่อของนักศึกษา (Student)
    UC5 <--- Student
    Student ---> UC1
    Student ---> UC2
    Student ---> UC3

    %% การเชื่อมต่อของอาจารย์/เจ้าหน้าที่ (Staff)
    UC5 <--- Staff
    UC9 <--- Staff
    Staff ---> UC1
    Staff ---> UC2
    Staff ---> UC4

    %% การเชื่อมต่อของผู้ดูแลระบบ (Admin)
    UC5 <--- Admin
    UC9 <--- Admin
    UC6 <--- Admin
    UC7 <--- Admin
    UC8 <--- Admin
    UC10 <--- Admin
    
    Admin ---> UC1
    Admin ---> UC2
    Admin ---> UC3
    Admin ---> UC4

    %% บังคับลำดับให้สวยงาม โยงเส้นหลอกเพื่อจัดระเบียบ
    UC5 ~~~ UC9 ~~~ UC6 ~~~ UC7 ~~~ UC8 ~~~ UC10
    Student ~~~ Staff ~~~ Admin
    UC1 ~~~ UC2 ~~~ UC3 ~~~ UC4
