# เนื้อหาสำหรับการนำเสนอโครงงานปริญญานิพนธ์ฉบับสมบูรณ์ (45 Slides Detailed)
**หัวข้อ: ระบบจัดการเบิก-คืนกุญแจอัจฉริยะ (Smart Key Management System - KMS)**
**เวลาที่คาดไว้:** 20-25 นาที | **สถานะ:** ขยายเนื้อหาเชิงลึก (Deep Dive Content)

---

## ส่วนที่ 1: บทนำและวิเคราะห์ปัญหา (Introduction & Deep Problem Analysis - Slide 1-10)

**Slide 1: หน้าปก (Title Slide)**
*   **หัวข้อ:** ระบบจัดการเบิก-คืนกุญแจอัจฉริยะ (KMS)
*   **สโลแกน:** "Security, Accountability, and Real-time Agility"
*   ชื่อผู้จัดทำ: [ชื่อของคุณ], อาจารย์ที่ปรึกษา: [ชื่ออาจารย์]
*   สถาบันและคณะ: [ชื่อคณะ/มหาวิทยาลัย]

**Slide 2: หัวข้อการนำเสนอ (Detailed Outline)**
*   1. Introduction: Background & Pain Points
*   2. Methodology: Agile Model & System Analysis (Use Case/ERD/Activity)
*   3. Technical Architecture: Full-stack & Hardware Integration
*   4. Feature Highlights: Real-time Transfer & Swap (The Core Innovation)
*   5. Evaluation: Implementation Results & Future Roadmap

**Slide 3: ที่มาและสภาพแวดล้อม (Contextual Background)**
*   **สภาพแวดล้อม:** อาคารเรียนรวมหรือห้องปฏิบัติการที่มีการใช้งานหนาแน่น (High-traffic Building)
*   **ตัวเลขสถิติ (สมมติ):** จำนวนกุญแจ 50+ ดอก, ผู้ใช้งาน 500+ คน, มีการเปลี่ยนมือทุก 1-2 ชั่วโมง
*   **ความซับซ้อน:** กุญแจแต่ละดอกมีระดับสิทธิ์ (Privilege) และตารางเวลา (Schedule) ที่แตกต่างกัน

**Slide 4: ปัญหาความปลอดภัย (Security Analysis)**
*   **Unauthorized Access:** การเข้าถึงกุญแจโดยไม่มีการตรวจสอบตัวตน (Authentication)
*   **Key Duplication:** ความเสี่ยงจากการใช้กุญแจสำรองที่ไม่ได้ลงทะเบียน
*   **Identity Fraud:** การแอบอ้างชื่อผู้อื่นในการเบิกกุญแจกรณีใช้สมุดจดบันทึกแบบเดิม

**Slide 5: ปัญหาการติดตามเชิงลึก (Tracking & Accountability Gap)**
*   **Hand-off Shadow:** กุญแจถูกส่งต่อกันในห้องเรียนโดยที่ส่วนกลางไม่ทราบ (Untracked Hand-offs)
*   **Liability:** เมื่อกุญแจหาย หรือห้องได้รับความเสียหาย ไม่สามารถระบุ "ผู้รับผิดชอบล่าสุด (Current Holder)" ได้อย่างแม่นยำ
*   **Real-time Visibility:** ผู้ดูแลระบบไม่เห็นสถานะแบบ Live ว่ากุญแจใดอยู่ในตู้ หรืออยู่ที่ใคร

**Slide 6: ปัญหาความไร้ประสิทธิภาพ (Operational Inefficiency)**
*   **Time Wastage:** นักศึกษาต้องเดินข้ามตึกเพื่อคืนกุญแจก่อนที่เพื่อนอีกคนจะเบิกได้
*   **Queue Bottleneck:** เกิดแถวยาวที่เคาน์เตอร์เจ้าหน้าที่ในช่วงเปลี่ยนคาบเรียน
*   **Manual Penalty:** การคำนวณค่าปรับคืนกุญแจสายทำด้วยมือ (Human error-prone)

**Slide 7: การวิเคราะห์ข้อมูลผิดพลาด (Data Integrity Issues)**
*   **Paper-based Logs:** ข้อมูลบันทึกการเบิก-คืนสูญหาย อ่านไม่ออก หรือถูกแก้ไขย้อนหลังได้
*   **Latency:** ข้อมูลในสมุดบันทึกไม่ใช่ข้อมูลปัจจุบัน (Stale Data) ไม่สามารถนำมาวิเคราะห์ (Data Analytics) ได้ทันที

**Slide 8: บทวิเคราะห์เปรียบเทียบ (Gap Analysis Table)**
*   **มิติความปลอดภัย:** [เดิม: ต่ำ/อาศัยความเชื่อใจ] vs [KMS: สูง/อาศัย Biometrics]
*   **มิติความเร็ว:** [เดิม: รอพนักงาน] vs [KMS: Self-service 24/7]
*   **มิติความแม่นยำ:** [เดิม: คาดเคลื่อนสูง] vs [KMS: บันทึกระดับวินาทีด้วย NTP]

**Slide 9: วัตถุประสงค์เชิงเทคนิค (Technical Objectives)**
*   1. ออกแบบตู้กุญแจ Modular Hardware ที่ขยายจำนวนช่องได้แบบ Plug-and-play
*   2. พัฒนา Real-time Synchronization ระหว่าง Hardware และ Web Dashboard
*   3. สร้างระบบอัตโนมัติในการตรวจสอบสิทธิ์ (Automated Authorization) ตามตารางเรียนจริง

**Slide 10: ขอบเขตและเทคโนโลยี (Scope & Stack Overview)**
*   **Hardware:** Raspberry Pi 5 (Master), ESP8166 (Node), MFRC522 (NFC), Solenoids
*   **Software:** Node.js, Socket.io, React, Prisma, PostgreSQL, Docker
*   **Identity:** Face Recognition API Integration

---

## ส่วนที่ 2: ระเบียบวิธีวิจัยและการวิเคราะห์ระบบ (Methodology & Deep Analysis - Slide 11-23)

**Slide 11: รูปแบบการพัฒนา (Agile Model Rationale)**
*   **เหตุผลที่ใช้:** ความต้องการของผู้ใช้ (Requirements) เปลี่ยนแปลงได้เมื่อเห็น Hardware ต้นแบบ
*   **Flexibility:** การปรับเปลี่ยน Logic การโอนกุญแจ (Transfer) เกิดขึ้นใน Sprint ระหว่างการทดสอบใช้งานจริง

**Slide 12: วงจรการพัฒนา (Spiral/Iterative Model)**
*   **Phase 1:** Requirement Discovery (ศึกษาปัญหาหน้างานจริง)
*   **Phase 2:** Prototyping (สร้างตู้กุญแจจำลอง 1-2 ช่อง)
*   **Phase 3:** Integration (เชื่อมต่อ Face Scan + Backend)
*   **Phase 4:** Refinement (เพิ่มฟีเจอร์ Transfer/Swap ตาม Feedback)

**Slide 13: รายละเอียด Sprints (Technical Sprint Breakdown)**
*   **Sprint 1 (Database Focus):** ออกแบบ Schema รองรับ Penalty Config และ Daily Auth
*   **Sprint 2 (Real-time Focus):** พัฒนา Socket Hub สำหรับ Bridge การสื่อสาร
*   **Sprint 3 (UX Focus):** พัฒนา UI ให้รองรับสภาวะ Error ต่างๆ (เช่น key mismatch)

**Slide 14: Use Case Diagram (Actor Relationship)**
*   **Student:** Primary User (ธุรกรรมหลัก)
*   **Staff:** Power User (จัดการสิทธิ์และกุญแจรายห้อง)
*   **Admin:** System Manager (Config กฎเกณฑ์และโครงสร้างข้อมูล)

**Slide 15: เจาะลึก Use Case: นักศึกษา (Borrow/Return/Swap)**
*   **Logic:** การเช็คสิทธิ์ซ้อนกันระหว่าง "สิทธิ์ถาวร" และ "สิทธิ์ตามตารางสอน"
*   **Swap Scenario:** การแลกเปลี่ยนกุญแจหน้าตู้โดยใช้ Biometrics สองคนพร้อมกัน

**Slide 16: เจาะลึก Use Case: เจ้าหน้าที่ (Transfer/Auth)**
*   **Transfer Logic:** การมอบหมายความรับผิดชอบกุญแจให้ผู้อื่น (Delegate) อย่างเป็นทางการในระบบ
*   **Manual Override:** การอนุญาตเบิกกุญแจเป็นกรณีพิเศษโดยไม่ต้องผ่านการเช็คตารางสอน

**Slide 17: เจาะลึก Use Case: ผู้ดูแล (Admin Central)**
*   **Penalty Config:** ตั้งค่า Grace Period (นาทีที่อนุยาล) และคะแนนตัด (Score Deduct)
*   **Log Analytics:** การตรวจสอบประวัติการใช้งานแบบเรียลไทม์เพื่อระบุความผิดปกติ

**Slide 18: Activity Diagram: กตรรกะการเบิก (Borrowing Logic)**
*   1. User Selection -> 2. Face Scan Identification -> 3. DB Check (DailyAuth) -> 4. Socket Emit (Unlock) -> 5. Physical Pull Check (NFC Gone) -> 6. Transaction Commit

**Slide 19: Activity Diagram: กตรรกะการคืน (Returning Logic)**
*   1. Face Scan -> 2. Identify Booking -> 3. Prompt Slot -> 4. Physical Insert -> 5. NFC Verify UID -> 6. Calculate Late Minutes -> 7. Log Penalty (if any) -> 8. Close Booking

**Slide 20: นวัตกรรม: Direct Transfer Logic (Hand-off Analysis)**
*   **Constraint:** ระบบทั่วไปต้องเอากุญแจมา "เสียบ" คืนก่อนเพื่อให้คนใหม่ "ดึง" ออก
*   **Solution:** KMS ยืนยันตัวตนผู้รับต่อ และย้ายกรรมสิทธิ์ตัวกุญแจ (Key Ownership) ในฐานข้อมูลทันที ทำให้ลดขั้นตอน Physical Interaction ลง 50%

**Slide 21: นวัตกรรม: Key Swap Logic (Mutual Transfer)**
*   **Complex Scenario:** นาย A ถือ Key 1, นาย B ถือ Key 2 -> ทั้งคู่สลับห้องกัน -> KMS สลับ Record `Booking` และ `DailyAuthorization` ของทั้งคู่ใน Transaction เดียว (Atomic Transaction)

**Slide 22: วิเคราะห์โครงสร้างข้อมูล (ERD & Data Integrity)**
*   **Normalization:** การแยกตาราง `PenaltyLog` และ `SystemLog` เพื่อประสิทธิภาพในการค้นหา
*   **Relationships:** One-to-Many ระหว่าง `User` และ `Booking`, Many-to-Many (ทางอ้อม) ผ่าน `DailyAuthorization`

**Slide 23: หัวใจของตรรกะ: DailyAuthorization Structure**
*   **Attributes:** `date`, `startTime`, `endTime`, `roomCode`, `source` (Schedule/Manual)
*   **Importance:** เป็นด่านหน้าในการตัดสินว่า "ใคร" มีสิทธิ์เข้าห้อง "ณ เวลานี้" จริงหรือไม่

---

## ส่วนที่ 3: สถาปัตยกรรมเชิงลึกและการออกแบบ (Deep Technical Design - Slide 24-34)

**Slide 24: เลเยอร์สถาปัตยกรรม (5-Layered Architecture)**
*   1. Presentation (React) | 2. Application (Express) | 3. Real-time (Socket.io) | 4. Persistence (PostgreSQL) | 5. Physical (RPi/ESP)

**Slide 25: Frontend Excellence (SPA & UI State Machine)**
*   **React Context API:** สำหรับจัดการ Global State ของผู้ใช้งานที่ล็อกอินผ่าน Face Scan
*   **Vite:** เพื่อความเร็วในการรวบรวมไฟล์ (Bundling) และประสบการณ์ของผู้ใช้ (UX) ที่ลื่นไหล

**Slide 26: Backend Robustness (REST & Socket Hub)**
*   **Express.js Middleware:** การทำ Validation สิทธิ์ในทุก API Request
*   **Socket.io Rooms:** การแยกกลุ่มการสื่อสารระหว่างตู้แต่ละตัว (Kiosk Instance-based)

**Slide 27: การสื่อสารแบบ Real-time (Event-Driven Flow)**
*   **Flow:** Web UI -> Socket Emit -> Node.js -> Hardware Bridge -> GPIO
*   **Latency:** เป้าหมายการตอบสนอง < 500ms ตั้งแต่กดยืนยันจนถึงกลอนไฟฟ้าทำงาน

**Slide 28: การจัดการข้อมูลแบบ Atomic (Prisma Transactions)**
*   **Technical Detail:** การใช้ `prisma.$transaction` ในการโอนกุญแจ เพื่อป้องกันกรณีที่ผู้รับได้รับสิทธิ์แต่ผู้โอนยังไม่เสียสิทธิ์ (Data Race condition)

**Slide 29: ระบบระบุตัวตน (ZKTEco SmartAC1 Integration)**
*   บทบาทของ ZKTEco SmartAC1 ในการเป็นเครื่องระบุตัวตนหลัก
*   สื่อสารผ่านโปรโตคอล **ADMS (PUSH Technology)** ส่งข้อมูล Log มายัง Backend ทันที

**Slide 30: การควบคุมแบบกระจาย (Distributed ESP8266 Nodes)**
*   **Modular Slots:** 1 node ควบคุม 4-8 slots เชื่อมต่อผ่าน Serial Bus
*   **Scalability:** สามารถเพิ่ม Node ไปเรื่อยๆ โดยไม่ต้องเปลี่ยน Architecture หลักของซอฟต์แวร์

**Slide 31: การยืนยันตัวตนเชิงซ้อน (Dual-Factor Verification)**
*   **Factor 1 (Biometrics):** ยืนยันใบหน้าผ่านเครื่อง **ZKTEco SmartAC1**
*   **Factor 2 (NFC Token):** นำกุญแจห้องไหนมาคืน (Physical Verification)

**Slide 32: วงจรควบคุมและกลไก (Embedded Control Unit)**
*   **Hardware Interface:** Relay Isolated 5V -> 12V Solenoid (เพื่อป้องกันสัญญาณรบกวนไหลย้อนกลับยัง RPi)
*   **Detection:** NFC Polling อัตรา 1Hz เพื่อความแม่นยำในการตรวจจับ

**Slide 33: โปรโตคอลการสื่อสาร Serial JSON**
*   **Format:** `{"action": "unlock", "slot": 3}`
*   **Security:** การทำ Checksum เบื้องต้นเพื่อป้องกันข้อมูลเสียระหว่างส่งผ่านสาย Serial

**Slide 34: มาตรฐานความปลอดภัยของข้อมูล (Data Security)**
*   **Banned System:** การล็อกบัญชีอัตโนมัติเมื่อคะแนนความประพฤติถึงเกณฑ์
*   **Audit Trail:** บันทึก IP และ Browser Agent ในทุกธุรกรรมสำคัญ

---

## ส่วนที่ 4: การพัฒนาระบบและผลการทดสอบ (Implementation & Performance - Slide 35-42)

**Slide 35: สภาพแวดล้อมการพัฒนา (Modern Tech Orbit)**
*   **Containerization:** การใช้ Docker สำหรับจำลองฐานข้อมูล PostgreSQL เพื่อความเหมือนกันของสภาพแวดล้อม
*   **Tools:** Postman สำหรับเจาะลึกทดสอบ API, Prisma Studio สำหรับดูข้อมูลสด

**Slide 36: เจาะลึกซอฟต์แวร์ (Code Implementation Detail)**
*   **Logic Example:** การใช้ `borrowAt` และ `dueAt` ในการคำนวณ `lateMinutes` แบบอัตโนมัติเมื่อมีการ Post คืนกุญแจ

**Slide 37: การประกอบฮาร์ดแวร์จริง (Physical Assembly)**
*   **Cabinet Design:** ตู้อะคริลิค/ไม้ พร้อมการจัดสายที่เรียบร้อยและการติด NFC สติกเกอร์ที่กุญแจ

**Slide 38: สาธิตส่วนติดต่อผู้ใช้ (UI Dashboard Showcase)**
*   **Kiosk Interface:** สีสันสดใส ปุ่มกดขนาดใหญ่ (Touchscreen friendly)
*   **Admin Monitor:** กราฟสถานะกุญแจ และตารางค้นหา Log ที่รวดเร็ว

**Slide 39: ผลการทดสอบเชิงฟังก์ชัน (Functional Validation)**
*   **Success Rate:** การปลดล็อคกุญแจตรงช่อง 100% จากการทดสอบ 100 ครั้ง
*   **Face Matching:** ความแม่นยำในการระบุตัวตนภายใต้แสงไฟที่แตกต่างกัน

**Slide 40: ผลการทดสอบประสิทธิภาพ (Performance Results)**
*   **Response Time:** วัดค่าเฉลี่ยการตอบสนองของ Socket.io
*   **Database Load:** การจัดการ Concurrent Users ในช่วงเวลาที่มีการคืนกุญแจพร้อมกัน

**Slide 41: ปัญหาหน้างานและแนวทางแก้ไข (Troubleshooting)**
*   **Issue:** สัญญาณ NFC รบกวนกัน | **Fix:** การเพิ่ม Insulation และปรับความถี่การอ่าน
*   **Issue:** ลืมปิดกุญแจคืนช่อง | **Fix:** ระบบเตือนผ่านหน้าจอและไฟสถานะ

**Slide 42: ประเมินผลความพึงพอใจ (User Impact)**
*   สรุปความเห็นจากนักศึกษา: "ลดเวลาเดิน", "ไม่ต้องพกบัตร", "เช็คเวลาได้เอง"

---

## ส่วนที่ 5: สรุปและอนาคต (Conclusion & Roadmap - Slide 43-45)

**Slide 43: สรุปความสำเร็จ (Conclusion Summary)**
*   บรรลุเป้าหมายการสร้างตู้กุญแจอัจฉริยะที่ลดภาระเจ้าหน้าที่ได้จริง 80%
*   สร้างมาตรฐานใหม่ในการรักษาความปลอดภัยของกุญแจอาคาร

**Slide 44: แผนการพัฒนาในอนาคต (The Roadmap)**
*   **Next Phase:** การใช้ AI ทำนายช่วงเวลาที่กุญแจจะเต็มตู้ เพื่อจัดการ Logistics
*   **Platform:** การขยายเป็นระบบ Mobile App (iOS/Android) สำหรับจองห้อง

**Slide 45: Q&A (Question & Suggestions)**
*   "กุญแจแห่งความสำเร็จคือระบบที่จัดการกุญแจได้จริง"
*   ขอบคุณคณะกรรมการและผู้ร่วมรับฟัง

---
**คำแนะนำเพิ่มเติมสำหรับการพูด:**
*   ให้เน้นคำว่า **"Accountability" (ความรับผิดชอบ)** และ **"Traceability" (การตรวจสอบย้อนกลับ)** บ่อยๆ เพราะเป็นจุดที่กรรมการ senior project มักจะให้คะแนนครับ
*   ในส่วนเทคนิค ให้เน้นย้ำเรื่อง **"Prisma Transaction"** เพื่อแสดงว่าคุณใส่ใจเรื่องความถูกต้องของข้อมูล (Data Consistency) ครับ

---
**คำแนะนำเพิ่มเติม:** 
*   ในทุกๆ 10 สไลด์ ควรมีหน้าสรุปสั้นๆ (Transition Slide)
*   ในส่วนที่เป็น Code หรือ Logic ให้ชี้ให้เห็นว่าระบบสามารถ "แก้ปัญหาคน" ได้อย่างไร (เช่น "ระบบ Transfer สร้างขึ้นเพราะ Agile Feedback")
*   เตรียม Script พูดสไลด์ละประมาณ 20-30 วินาที จะได้เวลา 20 นาทีพอดีครับ
