# SKMS - Smart Key Management System

ระบบเบิกคืนกุญแจอัตโนมัติพร้อม NFC และการจัดการตารางเรียน

## 🎯 Features

### Backend (Express + Prisma + PostgreSQL)
- ✅ JWT Authentication
- ✅ Role-based Access Control (student / teacher / staff)
- ✅ CRUD APIs สำหรับข้อมูลหลักทั้งหมด
- ✅ การจัดการกุญแจพร้อม NFC UID
- ✅ ระบบเบิก-คืนกุญแจ
- ✅ สถิติและรายงาน

### Frontend (Next.js 14 + Ant Design)
- ✅ Login Page (รองรับ email ทุกรูปแบบ - ไม่จำกัด pattern)
- ✅ Staff Layout พร้อม Sidebar Navigation
- ✅ Staff Dashboard พร้อมสถิติ
- ✅ หน้าจัดการข้อมูลหลัก (สำหรับ staff เท่านั้น):
  - ✅ Majors (สาขาวิชา)
  - ✅ Sections (กลุ่มเรียน)
  - ✅ Rooms (ห้องเรียน)
  - ✅ Subjects (รายวิชา)
  - ✅ Schedules (ตารางเรียน)
  - ✅ Keys (กุญแจ + NFC)
  - ✅ Users (ผู้ใช้งาน)
  - ✅ Borrow Reasons (เหตุผลการเบิก)
- ✅ Transactions History (ประวัติการเบิกคืน)
- ✅ Responsive Design

---

## 📦 Installation

### 1. Backend Setup

```bash
cd backend

# ติดตั้ง dependencies
npm install

# ตั้งค่า environment variables
cp .env.example .env
# แก้ไขไฟล์ .env ให้ถูกต้อง

# รัน migration
npm run migrate

# หมายเหตุ: migration จะรัน automatically
# หากต้องการรัน manually:
npx prisma migrate dev --name init_skms_system

# สร้างข้อมูลเริ่มต้น (seed)
npm run db-seed

# เริ่มต้น server
npm run dev
```

**Default Users หลัง Seed:**
| Role | Email | Password |
|------|-------|----------|
| Staff | admin@kmutnb.ac.th | admin123 |
| Teacher | teacher@kmutnb.ac.th | teacher123 |
| Student | student@email.kmutnb.ac.th | student123 |

---

### 2. Frontend Setup

```bash
cd skms-frontend

# ติดตั้ง dependencies
npm install

# ตั้งค่า environment
cp .env.local.example .env.local
# แก้ไข NEXT_PUBLIC_API_URL=http://localhost:4556

# เริ่มต้น development server
npm run dev
```

เปิด browser ที่ `http://localhost:3000`

---

## 🗂️ Project Structure

### Backend
```
backend/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.js           # Seed data
├── src/
│   ├── controllers/       # Business logic
│   │   ├── auth.js
│   │   ├── major.js
│   │   ├── sections.js
│   │   ├── rooms.js
│   │   ├── subjects.js
│   │   ├── key.js
│   │   └── users.js
│   ├── middleware/
│   │   ├── middleware.js  # Auth middleware
│   │   └── roleAuth.js    # Role-based middleware
│   └── routes/            # API routes
└── server.js              # Entry point
```

### Frontend
```
skms-frontend/
├── src/
│   ├── app/
│   │   ├── login/         # Login page
│   │   └── staff/         # Staff pages (จะสร้างต่อ)
│   ├── service/
│   │   ├── auth.jsx       # Auth service
│   │   ├── users.jsx      # Users service
│   │   └── api.js         # API service layer
│   └── components/        # Reusable components
```

---

## 🔐 Authentication & Authorization

### การ Login
```javascript
POST /api/auth/login
{
  "email": "admin@kmutnb.ac.th",
  "password": "admin123",
  "remember": true  // optional
}
```

**Response:**
```javascript
{
  "message": "เข้าสู่ระบบสำเร็จ",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": "uuid",
    "user_no": "STAFF001",
    "first_name": "Admin",
    "last_name": "System",
    "email": "admin@kmutnb.ac.th",
    "role": "staff",
    "status": "active"
  },
  "role": "staff"
}
```

### Role-based Routes

#### Public Routes (ไม่ต้อง login)
- GET `/api/majors` - ดูสาขาวิชา
- GET `/api/sections` - ดูกลุ่มเรียน
- GET `/api/rooms` - ดูห้องเรียน
- GET `/api/subjects` - ดูรายวิชา

#### Protected Routes (ต้อง login)
- GET `/api/keys` - ดูกุญแจทั้งหมด

#### Staff Only Routes
- POST, PUT, DELETE `/api/majors/:id`
- POST, PUT, DELETE `/api/sections/:id`
- POST, PUT, DELETE `/api/rooms/:id`
- POST, PUT, DELETE `/api/subjects/:code`
- POST, PUT, DELETE `/api/keys/:id`
- ALL `/api/users/*`

---

## 📡 API Endpoints

### Major (สาขาวิชา)
```
GET    /api/majors           # ดูทั้งหมด
GET    /api/majors/:id       # ดูตาม ID
POST   /api/majors           # เพิ่ม (staff only)
PUT    /api/majors/:id       # แก้ไข (staff only)
DELETE /api/majors/:id       # ลบ (staff only)
```

### Section (กลุ่มเรียน)
```
GET    /api/sections         # ดูทั้งหมด
GET    /api/sections/:id     # ดูตาม ID
POST   /api/sections         # เพิ่ม (staff only)
PUT    /api/sections/:id     # แก้ไข (staff only)
DELETE /api/sections/:id     # ลบ (staff only)
```

### Room (ห้องเรียน)
```
GET    /api/rooms            # ดูทั้งหมด
GET    /api/rooms/:id        # ดูตาม ID
POST   /api/rooms            # เพิ่ม (staff only)
PUT    /api/rooms/:id        # แก้ไข (staff only)
DELETE /api/rooms/:id        # ลบ (staff only)
```

### Subject (รายวิชา)
```
GET    /api/subjects         # ดูทั้งหมด
GET    /api/subjects/:code   # ดูตามรหัสวิชา
POST   /api/subjects         # เพิ่ม (staff only)
PUT    /api/subjects/:code   # แก้ไข (staff only)
DELETE /api/subjects/:code   # ลบ (staff only)
```

### Key (กุญแจ)
```
GET    /api/keys             # ดูทั้งหมด (ต้อง login)
GET    /api/keys/:id         # ดูตาม ID (ต้อง login)
POST   /api/keys             # เพิ่ม (staff only)
PUT    /api/keys/:id         # แก้ไข (staff only)
DELETE /api/keys/:id         # ลบ (staff only)
```

---

## 🔧 Environment Variables

### Backend (.env)
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/skms"

# JWT
JWT_SECRET="your-secret-key-here"

# Email (Nodemailer)
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-16-digit-app-password

# Server
PORT=4556

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:4556
```

---

## 🚀 Quick Start

1. **Clone repository**
2. **Setup Backend:**
   ```bash
   cd backend
   npm install
   # แก้ไข .env
   npm run migrate
   npm run db-seed
   npm run dev
   ```

3. **Setup Frontend:**
   ```bash
   cd skms-frontend
   npm install
   # แก้ไข .env.local
   npm run dev
   ```

4. **Login:**
   - เปิด `http://localhost:3000`
   - Login ด้วย `admin@kmutnb.ac.th` / `admin123`

---

## 📝 สิ่งที่เปลี่ยนแปลง

### ✅ ที่ทำแล้ว
1. ลบ pattern validation ออกจากหน้า login
2. อัพเดต Prisma Schema สำหรับระบบเบิกคืนกุญแจ
3. สร้าง CRUD Controllers และ Routes สำหรับ:
   - Major (สาขาวิชา)
   - Section (กลุ่มเรียน)
   - Room (ห้องเรียน)
   - Subject (รายวิชา)
   - Key (กุญแจ + NFC)
4. สร้าง Role-based Authorization Middleware
5. สร้าง Seed Data พร้อม default users
6. สร้าง API Service Layer สำหรับ Frontend

### 🔄 ที่ต้องทำต่อ
1. สร้างหน้า Staff Dashboard
2. สร้างหน้าจัดการข้อมูลหลัก (Majors, Sections, Rooms, ฯลฯ)
3. สร้างระบบเบิก-คืนกุญแจ
4. เพิ่ม ClassSchedule CRUD
5. สร้างหน้า Statistics & Reports

---

## 🐛 Troubleshooting

### Database Connection Error
```bash
# ตรวจสอบ PostgreSQL running
# ตรวจสอบ DATABASE_URL ใน .env
npx prisma studio  # เปิด Prisma Studio เพื่อดู DB
```

### Migration Error
```bash
# Reset database (⚠️ ลบข้อมูลทั้งหมด)
npx prisma migrate reset

# หรือ push schema โดยไม่ทำ migration
npx prisma db push
```

### Port Already in Use
```bash
# เปลี่ยน PORT ใน backend/.env
# เปลี่ยน NEXT_PUBLIC_API_URL ใน frontend/.env.local
```

---

## 📄 License

© 2026 SKMS. All rights reserved.
