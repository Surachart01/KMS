## 5. ฐานข้อมูล PostgreSQL และ Redis

### 5.1 ภาพรวมฐานข้อมูล

ระบบ KMS ใช้ฐานข้อมูล 2 ประเภท ดังนี้

PostgreSQL เวอร์ชัน 15 Alpine ทำหน้าที่เป็นฐานข้อมูลหลักสำหรับเก็บข้อมูลถาวรทั้งหมด ได้แก่ ข้อมูลผู้ใช้งาน ข้อมูลกุญแจ ตารางเรียน สิทธิ์การเบิก ประวัติการทำรายการ และบทลงโทษ รันบน port 34669 และจัดการผ่าน Docker Volume ชื่อ postgres_data

Redis Alpine ทำหน้าที่เป็น In-Memory Cache และ Session Store สำหรับเพิ่มประสิทธิภาพการตอบสนองของระบบ รันบน port 63797 ผ่านการตั้งค่ารหัสผ่าน ข้อมูลใน Redis เป็นข้อมูลชั่วคราวที่สามารถสร้างใหม่ได้จาก PostgreSQL

### 5.2 การเข้าถึงฐานข้อมูลผ่าน pgAdmin

ระบบ KMS ติดตั้ง pgAdmin 4 ไว้สำหรับจัดการฐานข้อมูลผ่าน Web UI เข้าถึงได้ที่ port 8080 ของ Server หลัก

ขั้นที่ 1 เปิดเว็บเบราว์เซอร์และพิมพ์ http://IP_SERVER:8080

ขั้นที่ 2 ล็อกอินด้วยอีเมลและรหัสผ่านที่ตั้งค่าไว้ใน Environment Variable PGADMIN_DEFAULT_EMAIL และ PGADMIN_DEFAULT_PASSWORD

ขั้นที่ 3 เชื่อมต่อกับ Server PostgreSQL โดยใช้ชื่อ Host postgres ซึ่งเป็นชื่อ Service ภายใน Docker Network port 5432 ผู้ใช้และรหัสผ่านตามที่กำหนดใน Environment Variable

ขั้นที่ 4 เลือกฐานข้อมูลที่ต้องการจัดการจาก Browser ทางซ้าย

### 5.3 การสำรองฐานข้อมูล PostgreSQL

การสำรองฐานข้อมูลเป็นขั้นตอนที่สำคัญที่สุดในการบำรุงรักษาระบบ ควรดำเนินการอย่างสม่ำเสมอ

การสำรองด้วย pg_dump ผ่าน Docker ใช้คำสั่งดังนี้

docker exec KMS-postgresdb pg_dump -U ชื่อผู้ใช้ ชื่อฐานข้อมูล > backup_YYYYMMDD.sql

แทน ชื่อผู้ใช้ ด้วยค่า POSTGRES_USER จาก Environment Variable และแทน ชื่อฐานข้อมูล ด้วยค่า POSTGRES_DB และแทน YYYYMMDD ด้วยวันที่ปัจจุบัน เช่น backup_20260428.sql

การสำรองฐานข้อมูลแบบบีบอัด เพื่อประหยัดพื้นที่จัดเก็บ ให้เพิ่ม Pipe ไปยัง gzip ดังนี้

docker exec KMS-postgresdb pg_dump -U ชื่อผู้ใช้ ชื่อฐานข้อมูล | gzip > backup_YYYYMMDD.sql.gz

กำหนดการสำรองข้อมูลที่แนะนำ ดังนี้

รายวัน ควรสำรองข้อมูลทุกคืนเวลา 23:00 น. โดยตั้ง Cron Job อัตโนมัติบน Server

รายสัปดาห์ ควรนำไฟล์ Backup ไปเก็บในที่จัดเก็บภายนอก เช่น External HDD หรือ Network Attached Storage

รายเดือน ควรทดสอบการ Restore จาก Backup เพื่อยืนยันว่าไฟล์ Backup ใช้งานได้จริง

### 5.4 การตั้งค่า Cron Job สำหรับสำรองข้อมูลอัตโนมัติ

ขั้นที่ 1 เข้าสู่ Server หลักและเปิดตัวแก้ไข Crontab ด้วยคำสั่ง crontab -e

ขั้นที่ 2 เพิ่มบรรทัดต่อไปนี้เพื่อตั้งค่าการ Backup ทุกคืนเวลา 23:00 น.

0 23 * * * docker exec KMS-postgresdb pg_dump -U postgres kmsdb | gzip > /backup/kms_backup_$(date +\%Y\%m\%d).sql.gz

ขั้นที่ 3 เพิ่มบรรทัดสำหรับลบ Backup ที่เก่ากว่า 30 วันเพื่อป้องกันพื้นที่ดิสก์เต็ม

0 0 * * * find /backup -name "kms_backup_*.sql.gz" -mtime +30 -delete

ขั้นที่ 4 บันทึกและตรวจสอบด้วยคำสั่ง crontab -l เพื่อยืนยันว่า Cron Job ถูกตั้งค่าถูกต้อง

### 5.5 การ Restore ฐานข้อมูลจาก Backup

ใช้คำสั่งต่อไปนี้เพื่อ Restore ข้อมูลจากไฟล์ Backup

สำหรับไฟล์ .sql ธรรมดา ให้ใช้คำสั่ง

docker exec -i KMS-postgresdb psql -U ชื่อผู้ใช้ ชื่อฐานข้อมูล < backup_YYYYMMDD.sql

สำหรับไฟล์ .sql.gz ที่บีบอัดแล้ว ให้ใช้คำสั่ง

gunzip -c backup_YYYYMMDD.sql.gz | docker exec -i KMS-postgresdb psql -U ชื่อผู้ใช้ ชื่อฐานข้อมูล

ก่อน Restore ควรหยุด Container backend ก่อนด้วยคำสั่ง docker stop KMS-backend เพื่อป้องกัน Data Corruption ระหว่างกระบวนการ Restore และเปิดใหม่หลัง Restore เสร็จด้วย docker start KMS-backend

### 5.6 การตรวจสอบสุขภาพฐานข้อมูล

ตรวจสอบขนาดฐานข้อมูลด้วยคำสั่งต่อไปนี้ผ่าน SQL

SELECT pg_size_pretty(pg_database_size('ชื่อฐานข้อมูล'));

ตรวจสอบตารางที่ใหญ่ที่สุด

SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 10;

ทำ VACUUM เพื่อคืนพื้นที่และปรับ Performance ทุกเดือน

VACUUM ANALYZE;

### 5.7 การตรวจสอบ Redis

ตรวจสอบสถานะ Redis ด้วยคำสั่ง

docker exec KMS-redis redis-cli -a รหัสผ่าน ping

ถ้าได้รับ PONG แสดงว่า Redis ทำงานปกติ

ตรวจสอบสถิติ Redis ด้วยคำสั่ง

docker exec KMS-redis redis-cli -a รหัสผ่าน info server

ดูจำนวน Key ที่มีอยู่

docker exec KMS-redis redis-cli -a รหัสผ่าน dbsize

หาก Redis ทำงานช้าผิดปกติ สามารถล้าง Cache ทั้งหมดด้วยคำสั่ง

docker exec KMS-redis redis-cli -a รหัสผ่าน flushall

ข้อควรระวัง การ Flush ข้อมูล Redis จะทำให้ Session ของผู้ใช้ทุกคนถูกล้างและต้องล็อกอินใหม่

---

## 6. ความปลอดภัยของระบบ

### 6.1 หลักการด้านความปลอดภัย

ระบบ KMS เก็บข้อมูลสำคัญหลายประเภท ได้แก่ ข้อมูลส่วนตัวของนักศึกษาและบุคลากร ข้อมูลใบหน้าซึ่งเป็นข้อมูลชีวมิติ ประวัติการเข้าถึงพื้นที่ต่าง ๆ และข้อมูลที่เกี่ยวข้องกับทรัพย์สินสถาบัน

ดังนั้นการรักษาความปลอดภัยจึงมีความสำคัญสูงมาก ผู้ดูแลระบบต้องปฏิบัติตามแนวทางด้านความปลอดภัยอย่างเคร่งครัด

### 6.2 การจัดการ Environment Variables

ตัวแปรสำคัญทั้งหมดของระบบถูกเก็บในไฟล์ .env ที่รากของโปรเจกต์ ตัวแปรเหล่านี้รวมถึงรหัสผ่านฐานข้อมูล Secret Key สำหรับ JWT และรหัสผ่านอื่น ๆ

ข้อกำหนดในการจัดการไฟล์ .env มีดังนี้

ข้อกำหนดที่ 1 ห้ามนำไฟล์ .env ขึ้น Git Repository โดยเด็ดขาด ควรตรวจสอบว่า .env อยู่ใน .gitignore แล้ว

ข้อกำหนดที่ 2 เปลี่ยนรหัสผ่านทั้งหมดจากค่า Default เป็นรหัสผ่านที่ซับซ้อนและยากต่อการคาดเดา

ข้อกำหนดที่ 3 จัดเก็บสำเนาของ .env ในที่ปลอดภัย เช่น Password Manager ของสถาบัน เนื่องจากหากไฟล์สูญหายจะไม่สามารถเริ่มระบบได้

ข้อกำหนดที่ 4 ทบทวนและเปลี่ยนค่า JWT_SECRET ทุก 6 เดือน หรือเมื่อสงสัยว่ามีการรั่วไหล

### 6.3 การจัดการ Port และ Firewall

Firewall ของ Server ควรกำหนดให้เปิดเฉพาะ Port ที่จำเป็นเท่านั้น

Port 80 เปิดสำหรับ HTTP ที่จำเป็นสำหรับ Web Dashboard

Port 22 เปิดสำหรับ SSH เฉพาะ IP ที่กำหนดไว้เท่านั้น ไม่ควรเปิด SSH แบบ Public

Port 4556 ควรเปิดเฉพาะสำหรับ IP ภายในเครือข่ายเพื่อให้ Raspberry Pi เชื่อมต่อได้

Port 34669 สำหรับ PostgreSQL ไม่ควรเปิดสู่ภายนอก ควรเข้าถึงได้เฉพาะภายใน Docker Network

Port 63797 สำหรับ Redis ไม่ควรเปิดสู่ภายนอก เช่นเดียวกัน

Port 8080 สำหรับ pgAdmin ควรเปิดเฉพาะ IP ของผู้ดูแลระบบ

### 6.4 การจัดการบัญชีผู้ใช้งานในระบบ

ทุกสิ้นภาคการศึกษา เจ้าหน้าที่ควรดำเนินการจัดการบัญชีผู้ใช้ดังนี้

ขั้นที่ 1 ส่งออกรายชื่อนักศึกษาที่จบการศึกษาจากระบบทะเบียนของสถาบัน

ขั้นที่ 2 ค้นหาและลบบัญชีของนักศึกษาที่จบแล้วออกจากระบบ KMS

ขั้นที่ 3 ตรวจสอบรายชื่ออาจารย์และเจ้าหน้าที่ที่ลาออกหรือย้ายงานและดำเนินการลบบัญชีด้วย

ขั้นที่ 4 ลบข้อมูลใบหน้าของบุคคลที่ออกจากสถาบันออกจากเครื่อง ZKTeco ด้วย

ขั้นที่ 5 บันทึกจำนวนบัญชีที่ลบในสมุดบันทึกการบำรุงรักษา

### 6.5 การตรวจสอบ Log ด้านความปลอดภัย

ผู้ดูแลระบบควรตรวจสอบ Log ของระบบสัปดาห์ละครั้งเพื่อหาพฤติกรรมที่ผิดปกติ

สัญญาณที่ต้องสังเกต ได้แก่ การล็อกอินผิดพลาดซ้ำหลายครั้งจาก IP เดียวกัน การเข้าถึง API จาก IP ที่ไม่คุ้นเคย ข้อมูลที่เพิ่มหรือลดมากผิดปกติ และความพยายามเข้าถึง Port ที่ปกติไม่ได้ใช้

คำสั่งดู Log Backend เพื่อหา Error และ Unauthorized Access

docker logs KMS-backend --since 7d | grep -i "error\|unauthorized\|forbidden\|failed"

---

## 7. การบำรุงรักษาซอฟต์แวร์ Kiosk บน Raspberry Pi

### 7.1 ภาพรวมซอฟต์แวร์ Kiosk

ซอฟต์แวร์ Kiosk พัฒนาด้วย React และ Vite ทำงานบน Raspberry Pi โดยรันในโหมด Kiosk ผ่านเว็บเบราว์เซอร์ Chromium ที่ถูกตั้งค่าให้แสดงแบบ Full Screen และไม่แสดง Address Bar

ซอฟต์แวร์เชื่อมต่อกับ Backend ผ่าน HTTP API และ Socket.IO เพื่อรับคำสั่งควบคุมรีเลย์แบบ Real-time

### 7.2 การตรวจสอบสถานะ Kiosk ประจำวัน

ขั้นที่ 1 ตรวจสอบที่หน้าจอเครื่อง Kiosk ว่าแสดงหน้าเมนูหลักของระบบหรือไม่ หากหน้าจอแสดงข้อผิดพลาดหรือหน้าจอดำ ให้ดำเนินการแก้ไข

ขั้นที่ 2 SSH เข้า Raspberry Pi แล้วตรวจสอบว่า Service ของ Kiosk ยังทำงานอยู่ด้วยคำสั่ง systemctl status kms-hardware

ขั้นที่ 3 ตรวจสอบการเชื่อมต่อ Network ด้วยคำสั่ง ping IP_BACKEND เพื่อยืนยันว่า Raspberry Pi ยังเชื่อมต่อกับ Backend Server ได้

### 7.3 การรีสตาร์ท Kiosk

กรณีที่ Kiosk หยุดทำงานหรือแสดงผลผิดปกติ สามารถรีสตาร์ทได้ดังนี้

วิธีที่ 1 รีสตาร์ทผ่าน SSH โดยใช้คำสั่ง sudo systemctl restart kms-hardware หรือหากต้องการรีสตาร์ทระบบทั้งหมด ใช้คำสั่ง sudo reboot

วิธีที่ 2 รีสตาร์ทด้วยตนเองโดยกดปุ่ม Reset ที่ตัว Raspberry Pi หรือตัดและต่อไฟฟ้าใหม่ วิธีนี้ควรใช้เฉพาะกรณีที่ไม่สามารถ SSH เข้าได้เท่านั้น

ขั้นตอนหลังรีสตาร์ท ให้ตรวจสอบว่าหน้าจอ Kiosk แสดงผลปกติ และทดสอบสแกนใบหน้าเพื่อยืนยันการเชื่อมต่อกับ Backend

### 7.4 การอัปเดตซอฟต์แวร์ Kiosk

ขั้นที่ 1 SSH เข้า Raspberry Pi

ขั้นที่ 2 หยุด Service Kiosk ด้วยคำสั่ง sudo systemctl stop kms-hardware

ขั้นที่ 3 เข้าไปยังโฟลเดอร์โปรเจกต์ Kiosk แล้วดึงโค้ดเวอร์ชันใหม่ด้วย git pull

ขั้นที่ 4 ติดตั้ง Dependencies ใหม่ด้วยคำสั่ง npm install

ขั้นที่ 5 Build โปรเจกต์ใหม่ด้วยคำสั่ง npm run build

ขั้นที่ 6 เริ่ม Service ใหม่ด้วยคำสั่ง sudo systemctl start kms-hardware

ขั้นที่ 7 ตรวจสอบหน้าจอ Kiosk ว่าแสดงผลถูกต้อง

### 7.5 การแก้ปัญหา Kiosk หน้าจอดำหรือค้าง

กรณีหน้าจอ Kiosk ดำและไม่มีการตอบสนอง ให้ดำเนินการดังนี้

ขั้นที่ 1 ตรวจสอบสาย HDMI หรือสาย Display ว่ายังเชื่อมต่ออยู่แน่นดี

ขั้นที่ 2 SSH เข้า Raspberry Pi เพื่อตรวจสอบว่าระบบยังทำงานอยู่ หาก SSH ไม่ได้เลยอาจแสดงว่า Raspberry Pi แฮงค์ทั้งเครื่อง ให้ตัดและต่อไฟใหม่

ขั้นที่ 3 หลัง SSH ได้แล้ว ตรวจสอบ Log ของ Kiosk Service ด้วยคำสั่ง journalctl -u kms-hardware -n 50

ขั้นที่ 4 ตรวจสอบว่า Chromium กำลัง Process อยู่ด้วยคำสั่ง ps aux | grep chromium หากไม่พบ ให้รีสตาร์ท Service

---

## 8. การตรวจสอบและบำรุงรักษาเครือข่าย

### 8.1 สถาปัตยกรรมเครือข่ายของระบบ KMS

อุปกรณ์ทั้งหมดในระบบ KMS ต้องอยู่ในเครือข่ายเดียวกัน ดังนี้

Server หลักมีที่อยู่ IP แบบ Static ไม่ควรใช้ IP แบบ Dynamic (DHCP) เนื่องจาก Raspberry Pi และ ZKTeco ต้องการ IP ที่คงที่ของ Server ในการเชื่อมต่อ

Raspberry Pi แต่ละตัวควรกำหนด IP แบบ Static หรือ DHCP Reservation เพื่อให้ IP ไม่เปลี่ยนแปลง

ZKTeco ต้องกำหนด ADMS Server URL ชี้ไปยัง IP และ Port ของ Backend Server

### 8.2 การตรวจสอบการเชื่อมต่อเครือข่ายประจำสัปดาห์

ขั้นที่ 1 จาก Server หลัก ทดสอบการ Ping ไปยัง Raspberry Pi แต่ละตัวด้วยคำสั่ง ping IP_RASPBERRY_PI

ขั้นที่ 2 จาก Server หลัก ทดสอบการ Ping ไปยัง ZKTeco ด้วยคำสั่ง ping IP_ZKTECO

ขั้นที่ 3 ตรวจสอบว่า Backend รับ Connection จาก Raspberry Pi ผ่าน Socket.IO โดยดูจาก Log ของ Backend

ขั้นที่ 4 ตรวจสอบ Log ของ Backend เพื่อยืนยันว่า ZKTeco ส่งข้อมูลการสแกนใบหน้าเข้ามาอย่างสม่ำเสมอ

### 8.3 การแก้ปัญหาเครือข่ายเบื้องต้น

กรณีที่ Raspberry Pi ติดต่อ Backend ไม่ได้ ให้ตรวจสอบตามลำดับดังนี้

ขั้นที่ 1 ตรวจสอบว่า Raspberry Pi มีการเชื่อมต่อเครือข่ายอยู่ด้วยคำสั่ง ip addr หรือ ifconfig

ขั้นที่ 2 Ping จาก Raspberry Pi ไปยัง IP ของ Server เพื่อตรวจสอบ Connectivity

ขั้นที่ 3 ตรวจสอบว่า Port 4556 ของ Server ยังเปิดอยู่ด้วยคำสั่ง curl http://IP_SERVER:4556/health

ขั้นที่ 4 ตรวจสอบ Firewall ของ Server ว่าไม่ได้บล็อก IP ของ Raspberry Pi

ขั้นที่ 5 ตรวจสอบว่า Docker Container backend ยังทำงานอยู่ด้วยคำสั่ง docker compose ps

กรณีที่ ZKTeco ติดต่อ Backend ไม่ได้ ให้ตรวจสอบตามลำดับดังนี้

ขั้นที่ 1 เข้าหน้าตั้งค่าของ ZKTeco และตรวจสอบว่า ADMS Server URL ตั้งค่าถูกต้อง

ขั้นที่ 2 ตรวจสอบว่า ZKTeco มี IP และสามารถ Ping ไปยัง Server ได้

ขั้นที่ 3 ตรวจสอบใน Log ของ Backend ว่ามี Request จาก ZKTeco เข้ามาหรือไม่

