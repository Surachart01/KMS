# SKMS Backend API Documentation

ระบบเบิกคืนกุญแจอัตโนมัติ (Smart Key Management System)

## Base URL
```
http://localhost:4556
```

## Table of Contents
- [Authentication APIs](#authentication-apis)
- [Environment Variables](#environment-variables)
- [Response Format](#response-format)

---

## Authentication APIs

### 1. Login
ล็อกอินเข้าสู่ระบบด้วย email และ password

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "string (required) - รูปแบบ: xxxxxxxxxxxxxx@email.kmutnb.ac.th",
  "password": "string (required) - รหัสผ่าน",
  "remember": "boolean (optional) - จดจำการเข้าสู่ระบบ (default: false)"
}
```

**Example Request:**
```bash
curl -X POST http://localhost:4556/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "s6702041510164@email.kmutnb.ac.th",
    "password": "mypassword123",
    "remember": true
  }'
```

**Success Response (200):**
```json
{
  "message": "เข้าสู่ระบบสำเร็จ",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_no": "1",
    "prefix": "นาย",
    "firstname": "สมชาย",
    "lastname": "ใจดี",
    "email": "s6702041510164@email.kmutnb.ac.th",
    "year_study": "3",
    "position": "student",
    "status": "Active",
    "is_reset_password": false
  },
  "position": "student"
}
```

**Error Response (401):**
```json
{
  "message": "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
}
```

**Token Expiration:**
- `remember: true` → Token หมดอายุใน 7 วัน
- `remember: false` → Token หมดอายุใน 1 วัน

---

### 2. Decode Token
ตรวจสอบและ decode JWT token

**Endpoint:** `GET /api/auth/decode-token`

**Headers:**
```
Authorization: Bearer <your-jwt-token>
```

**Example Request:**
```bash
curl -X GET http://localhost:4556/api/auth/decode-token \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Success Response (200):**
```json
{
  "message": "Token is valid",
  "user": {
    "user_no": "1",
    "email": "s6702041510164@email.kmutnb.ac.th",
    "position": "student",
    "status": "Active",
    "iat": 1702041234,
    "exp": 1702127634
  }
}
```

**Error Response (401):**
```json
{
  "message": "Token is invalid"
}
```

---

### 3. Send Reset Password Email
ส่ง OTP เพื่อรีเซ็ตรหัสผ่านไปยังอีเมล

**Endpoint:** `POST /api/auth/reset-password`

**Request Body:**
```json
{
  "email": "string (required) - อีเมลที่ต้องการรีเซ็ตรหัสผ่าน"
}
```

**Example Request:**
```bash
curl -X POST http://localhost:4556/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "s6702041510164@email.kmutnb.ac.th"
  }'
```

**Success Response (200):**
```json
{
  "message": "Email sent successfully"
}
```

**Error Response (500):**
```json
{
  "message": "Error sending reset password email"
}
```

**หมายเหตุ:**
- OTP จะหมดอายุใน 60 วินาที
- OTP เป็นตัวเลข 6 หลัก
- OTP ถูกเก็บใน Redis ด้วย key: `otp:{email}`

---

### 4. Verify OTP
ตรวจสอบความถูกต้องของ OTP

**Endpoint:** `POST /api/auth/verify-otp`

**Request Body:**
```json
{
  "email": "string (required) - อีเมลที่ขอรีเซ็ตรหัสผ่าน",
  "OTP": "string (required) - รหัส OTP 6 หลัก"
}
```

**Example Request:**
```bash
curl -X POST http://localhost:4556/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "s6702041510164@email.kmutnb.ac.th",
    "OTP": "123456"
  }'
```

**Success Response (200):**
```json
{
  "message": "OTP verified successfully"
}
```

**Error Response (401):**
```json
{
  "message": "Invalid OTP"
}
```

---

## Environment Variables

ตั้งค่า environment variables ในไฟล์ `.env`:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# JWT Secret
JWT_SECRET="your-secret-key-here"

# Email Configuration (Nodemailer + Gmail SMTP)
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-16-digit-app-password

# Server Port
PORT=4556

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
```

### สร้าง Gmail App Password:
1. ไปที่ [Google Account Security](https://myaccount.google.com/security)
2. เปิด 2-Step Verification
3. ไปที่ [App Passwords](https://myaccount.google.com/apppasswords)
4. สร้าง App Password สำหรับ "Mail"
5. คัดลอก 16-digit password มาใส่ใน `EMAIL_PASS`

---

## Response Format

### Success Response
```json
{
  "message": "string - ข้อความสำเร็จ",
  "data": {} // optional - ข้อมูลที่ส่งกลับ
}
```

### Error Response
```json
{
  "message": "string - ข้อความ error"
}
```

### Common HTTP Status Codes
- `200` - Success
- `401` - Unauthorized (login failed, invalid token, invalid OTP)
- `404` - Not Found
- `500` - Internal Server Error

---

## Testing

### ทดสอบ API ด้วย curl

**Login:**
```bash
curl -X POST http://localhost:4556/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"s6702041510164@email.kmutnb.ac.th","password":"test123","remember":true}'
```

**Decode Token:**
```bash
TOKEN="<your-token-here>"
curl -X GET http://localhost:4556/api/auth/decode-token \
  -H "Authorization: Bearer $TOKEN"
```

**Reset Password:**
```bash
curl -X POST http://localhost:4556/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"email":"s6702041510164@email.kmutnb.ac.th"}'
```

**Verify OTP:**
```bash
curl -X POST http://localhost:4556/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"s6702041510164@email.kmutnb.ac.th","OTP":"123456"}'
```

---

## Tech Stack

- **Framework:** Express.js
- **Database:** PostgreSQL + Prisma ORM
- **Cache:** Redis
- **Email:** Nodemailer (Gmail SMTP)
- **Authentication:** JWT (jsonwebtoken)
- **Password Hashing:** bcrypt

---

## Email Template

อีเมล OTP รีเซ็ตรหัสผ่านจะมีรูปแบบ:
- หัวเรื่อง: "Reset Password - OTP Verification"
- ข้อมูล: รหัส OTP 6 หลัก, ลิงก์รีเซ็ต (optional), เวลาหมดอายุ
- สีธีม: เขียว (#16a34a)

---

## Notes

- ✅ Email ต้องเป็นรูปแบบ `xxxxxxxxxxxxxx@email.kmutnb.ac.th` (14 ตัวอักษร + @email.kmutnb.ac.th)
- ✅ Password จะถูก hash ด้วย bcrypt ก่อนเก็บลง database
- ✅ OTP จะถูกลบอัตโนมัติจาก Redis หลังหมดอายุ 60 วินาที
- ✅ Token มี expiration time และต้องส่งใน Authorization header

---

## License

© 2025 SKMS. All rights reserved.