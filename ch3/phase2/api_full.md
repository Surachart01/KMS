**3.2.3.2 เส้นทางการเชื่อมต่อรับส่งข้อมูล (API Routes เต็มรูปแบบ)**

เพื่อให้โปรแกรมย่อยแต่ละส่วนทำงานร่วมกันได้อย่างครบถ้วน ระบบ Backend ได้เปิดช่องทางการเชื่อมต่อ API ครอบคลุมทุกระบบงาน ดังรายละเอียดในตารางที่ 3-1 ถึง 3-5

**ตารางที่ 3-1** API Routes สำหรับระบบ Kiosk และ Hardware (ส่วนที่ต้องใช้ HARDWARE_TOKEN)

| Method | Route | หน้าที่การทำงาน |
|:---:|---|---|
| GET | /api/hardware/keys | ดึงรายชื่อกุญแจทั้งหมดพร้อมสถานะปัจจุบัน |
| GET | /api/hardware/room-status | ดึงสถานะกุญแจ (ว่าง/ยืม) แยกตามรายห้อง |
| GET | /api/hardware/user/:studentCode/status | ดูสถานะและสิทธิ์การเบิกกุญแจของผู้ใช้แต่ละคน |
| POST | /api/hardware/identify | รับ NFC UID หรือ รหัสพนักงาน จากเครื่อง ZKTeco เพื่ออ้างอิงตัวตน |
| POST | /api/hardware/borrow | สร้างรายการเบิกกุญแจ ตรวจสอบสิทธิ์ และสั่งปลดล็อก Solenoid |
| POST | /api/hardware/return | ปิดรายการเบิก ตรวจนับเวลาเกิน และคำนวณหักคะแนนอัตโนมัติ |
| POST | /api/hardware/swap | ทำการสลับสิทธิ์ผู้ถือกุญแจระหว่าง 2 คน |
| POST | /api/hardware/check-swap-eligibility | ตรวจสอบความเป็นไปได้ก่อนสลับสิทธิ์ว่าติดตารางเรียนหรือไม่ |
| POST | /api/hardware/transfer | ทำการโอนสิทธิ์กุญแจไปให้อีกคน |
| POST | /api/hardware/check-transfer-eligibility | ตรวจสอบความเป็นไปได้ก่อนโอนสิทธิ์กุญแจ |
| POST | /api/hardware/move | แอดมินใช้สำหรับย้ายกุญแจจากช่องหนึ่งไปอีกช่องหนึ่ง |
| GET | /api/kiosk/rooms/status | อ่านสถานะห้องทั้งหมดว่ากุญแจถูกเบิกไปแล้วกี่ดอก ว่างกี่ดอก |
| GET | /api/kiosk/room-schedule/:roomCode | อ่านตารางเรียนของห้องนั้นๆ เพื่อนำไปแสดงผลบนหน้าจอ Kiosk |

**ตารางที่ 3-2** API Routes สำหรับเชื่อมต่อ ZKTeco SmartAC1 (ADMS Protocol)

| Method | Route | หน้าที่การทำงาน |
|:---:|---|---|
| ALL | /adms/cdata | ส่งข้อมูล Attendance (สแกนหน้า/บัตร) กลับเข้าเซิร์ฟเวอร์ |
| POST | /adms/registry | ลงทะเบียนบอร์ด ZKTeco ครั้งแรกเข้ากับระบบ |
| GET | /adms/getrequest | อุปกรณ์ ZKTeco ส่ง Request ขอคำสั่งรอบถัดไปจาก Server (Polling) |

**ตารางที่ 3-3** API Routes สำหรับการยืนยันตัวตน (Authentication)

| Method | Route | หน้าที่การทำงาน |
|:---:|---|---|
| POST | /api/auth/login | เข้าสู่ระบบสำหรับ Staff, Admin และ Teacher |
| GET | /api/auth/decode-token | ถอดรหัสและตรวจสอบอายุของ JWT Token |
| POST | /api/auth/reset-password | ส่งคำขอ Reset รหัสผ่านไปยัง Email |
| POST | /api/auth/verify-otp | ตรวจสอบรหัส OTP สำหรับการกู้คืนรหัสผ่าน |

**ตารางที่ 3-4** API Routes สำหรับสถิติและประวัติ (Statistics & Reporting)

| Method | Route | หน้าที่การทำงาน |
|:---:|---|---|
| GET | /api/statistics/dashboard | ดึงภาพรวมสถิติไปโชว์ที่ Web Dashboard (กล่องสรุป) |
| GET | /api/statistics/recent | ดูรายการเบิกคืนกุญแจล่าสุด 5 รายการ |
| GET | /api/statistics/top-rooms | ดูอันดับห้องที่มีการใช้งานมากที่สุด |
| GET | /api/statistics/today | สรุปรายงานการเบิกห้องในวันปัจจุบัน |
| GET | /api/bookings | ดูประวัติ Log ทุกรายการเบิก-คืน |
| GET | /api/transactions | ดูประวัติระบบเชิงลึก (System Logs) เช่น การโอน/สลับ/ผิดพลาด |

**ตารางที่ 3-5** API Routes สำหรับจัดการข้อมูลหลักผ่าน Web Dashboard (CRUD)

| Method | Route | หน้าที่การทำงาน |
|:---:|---|---|
| CRUD | /api/users, /api/users/:id | เพิ่ม ลบ แก้ไข ผู้ใช้งาน (แอดมิน, อาจารย์, นักศึกษา) |
| GET/POST | /api/users/teachers, /api/users/batch-import | เรียกดูเฉพาะอาจารย์ และ นำเข้าข้อมูลผู้ใช้ผ่าน Excel |
| CRUD | /api/keys, /api/keys/:id | จัดการช่องกุญแจและผูกรหัส NFC UID |
| CRUD | /api/schedules, /api/subjects | จัดการตารางสอน, เวลาเรียน และเทอมที่ใช้เรียน |
| POST | /api/schedules/batch-import | นำเข้าตารางสอนหลายรายการพร้อมกัน |
| POST | /api/schedules/import-repclasslist | นำเข้าตารางสอนจากไฟล์ RepClassList ของมหาลัย |
| CRUD | /api/major, /api/sections | ตั้งค่าคณะ/สาขา และกลุ่มเรียน (Section) ในระบบ |
| CRUD | /api/authorizations | จัดการการผูกสิทธิ์ประจำวันแบบพิเศษที่ไม่ผ่านตารางสอน |
| POST | /api/authorizations/sync-today | บังคับดึงตารางสอนมาออกสิทธิ์ให้สำหรับวันนี้ทันที |
| GET/PUT | /api/penalty/config | ตั้งค่าเกณฑ์การหักคะแนนความประพฤติ |
| GET/POST | /api/penalty/manual, /api/penalty/logs | สั่งลงโทษแบบกำหนดเอง และดูบันทึกการหักคะแนนผู้ใช้ |
| CRUD | /api/teacher/schedules | ให้อาจารย์จัดการตารางสอนของตัวเอง (เฉพาะ Teacher) |
