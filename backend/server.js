// ================================
// Key Management System - Backend Server
// ================================
// Restart trigger 28

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRouter from './src/routes/auth.js';
import usersRouter from './src/routes/users.js';
import majorRouter from './src/routes/major.js';
import sectionsRouter from './src/routes/sections.js';
import subjectsRouter from './src/routes/subjects.js';
import schedulesRouter from './src/routes/schedules.js';
import statisticsRouter from './src/routes/statistics.js';
import keyRouter from './src/routes/key.js';
import transactionsRouter from './src/routes/transactions.js';
import studentImportRouter from './src/routes/studentImport.js';

// New routes for Key Borrow-Return System
import kioskRouter from './src/routes/kiosk.js';
import penaltyRouter from './src/routes/penalty.js';
import bookingsRouter from './src/routes/bookings.js';
import scheduleRoutesRouter from './src/routes/scheduleRoutes.js';
import authorizationsRouter from './src/routes/authorizations.js';
import hardwareRoutesRouter from './src/routes/hardwareRoutes.js';

// initialize express app and prisma client
const app = express();

const prisma = new PrismaClient();
const port = process.env.PORT || 3000;
app.use(cors({
  origin: '*'
}));
app.use(express.json());
dotenv.config();

// ================================
// API ROUTES DOCUMENTATION
// ================================

/**
 * ========================================================================
 * /api/auth - Authentication Routes
 * ========================================================================
 * GET  /api/auth/decode-token    - ถอดรหัส JWT Token
 * POST /api/auth/login           - เข้าสู่ระบบ
 * POST /api/auth/reset-password  - ส่งอีเมลรีเซ็ตรหัสผ่าน
 * POST /api/auth/verify-otp      - ยืนยัน OTP
 */
app.use("/api/auth", authRouter);

/**
 * ========================================================================
 * /api/users - User Management Routes
 * ========================================================================
 * GET    /api/users                - ดึงรายชื่อผู้ใช้ทั้งหมด         [Authenticated]
 * GET    /api/users/teachers       - ดึงรายชื่อ Teacher ทั้งหมด     [Authenticated]
 * POST   /api/users/batch-import   - นำเข้าผู้ใช้แบบ Batch          [Staff]
 * GET    /api/users/:id            - ดึงข้อมูลผู้ใช้ตาม ID          [Authenticated]
 * POST   /api/users                - สร้างผู้ใช้ใหม่                [Staff]
 * PUT    /api/users/:id            - แก้ไขข้อมูลผู้ใช้              [Staff]
 * DELETE /api/users/:id            - ลบผู้ใช้                       [Staff]
 * POST   /api/users/reset-password - รีเซ็ตรหัสผ่าน                 [Public]
 */
app.use("/api/users", usersRouter);

/**
 * ========================================================================
 * /api/majors - Major (สาขาวิชา) Management Routes
 * ========================================================================
 * GET    /api/majors      - ดึงรายชื่อสาขาทั้งหมด    [Public]
 * GET    /api/majors/:id  - ดึงข้อมูลสาขาตาม ID     [Public]
 * POST   /api/majors      - สร้างสาขาใหม่           [Staff]
 * PUT    /api/majors/:id  - แก้ไขข้อมูลสาขา         [Staff]
 * DELETE /api/majors/:id  - ลบสาขา                  [Staff]
 */
app.use("/api/majors", majorRouter);

/**
 * ========================================================================
 * /api/sections - Section (กลุ่มเรียน) Management Routes
 * ========================================================================
 * GET    /api/sections      - ดึงรายชื่อกลุ่มเรียนทั้งหมด    [Public]
 * GET    /api/sections/:id  - ดึงข้อมูลกลุ่มเรียนตาม ID     [Public]
 * POST   /api/sections      - สร้างกลุ่มเรียนใหม่           [Staff]
 * PUT    /api/sections/:id  - แก้ไขข้อมูลกลุ่มเรียน         [Staff]
 * DELETE /api/sections/:id  - ลบกลุ่มเรียน                  [Staff]
 */
app.use("/api/sections", sectionsRouter);

/**
 * ========================================================================
 * /api/subjects - Subject (รายวิชา) Management Routes
 * ========================================================================
 * GET    /api/subjects        - ดึงรายชื่อรายวิชาทั้งหมด    [Public]
 * GET    /api/subjects/:code  - ดึงข้อมูลรายวิชาตามรหัส    [Public]
 * POST   /api/subjects        - สร้างรายวิชาใหม่           [Staff]
 * PUT    /api/subjects/:code  - แก้ไขข้อมูลรายวิชา         [Staff]
 * DELETE /api/subjects/:code  - ลบรายวิชา                  [Staff]
 */
app.use("/api/subjects", subjectsRouter);

/**
 * ========================================================================
 * /api/schedules - Schedule (ตารางสอน) Management Routes
 * ========================================================================
 * GET    /api/schedules                    - ดึงตารางสอนทั้งหมด          [Public]
 * GET    /api/schedules/:id                - ดึงตารางสอนตาม ID          [Public]
 * POST   /api/schedules/batch-import       - นำเข้าตารางสอนแบบ Batch    [Staff]
 * POST   /api/schedules/import-repclasslist - นำเข้าจาก REP Classlist   [Staff]
 * DELETE /api/schedules/delete-all         - ลบตารางสอนทั้งหมด          [Staff]
 * POST   /api/schedules                    - สร้างตารางสอนใหม่          [Staff]
 * PUT    /api/schedules/:id                - แก้ไขตารางสอน              [Staff]
 * DELETE /api/schedules/:id                - ลบตารางสอน                 [Staff]
 */
app.use("/api/schedules", schedulesRouter);

/**
 * ========================================================================
 * /api/statistics - Statistics (สถิติ) Routes
 * ========================================================================
 * GET /api/statistics/dashboard  - ดึงสถิติสำหรับ Dashboard     [Public]
 * GET /api/statistics/recent     - ดึง Transactions ล่าสุด     [Public]
 * GET /api/statistics/top-rooms  - ดึงห้องที่ใช้งานบ่อย        [Public]
 * GET /api/statistics/today      - ดึงสถิติวันนี้              [Public]
 */
app.use("/api/statistics", statisticsRouter);

/**
 * ========================================================================
 * /api/keys - Key (กุญแจ) Management Routes
 * ========================================================================
 * GET    /api/keys      - ดึงรายการกุญแจทั้งหมด    [Authenticated]
 * GET    /api/keys/:id  - ดึงข้อมูลกุญแจตาม ID    [Authenticated]
 * POST   /api/keys      - สร้างกุญแจใหม่          [Staff]
 * PUT    /api/keys/:id  - แก้ไขข้อมูลกุญแจ        [Staff]
 * DELETE /api/keys/:id  - ลบกุญแจ                 [Staff]
 */
app.use("/api/keys", keyRouter);

/**
 * ========================================================================
 * /api/transactions - Transaction (รายการเบิก-คืน) Routes
 * ========================================================================
 * GET  /api/transactions         - ดึงประวัติ Transactions ทั้งหมด    [Public]
 * POST /api/transactions/borrow  - เบิกกุญแจ                          [Staff]
 * POST /api/transactions/return  - คืนกุญแจ                           [Staff]
 */
app.use("/api/transactions", transactionsRouter);

/**
 * ========================================================================
 * /api/students/import - Student Import Routes
 * ========================================================================
 * GET  /api/students/import/template  - ดาวน์โหลด Excel Template         [Public]
 * GET  /api/students/import/majors    - ดึงรายชื่อสาขาและกลุ่มเรียน     [Public]
 * POST /api/students/import/preview   - Preview ข้อมูลก่อน Import       [Staff]
 * POST /api/students/import/confirm   - ยืนยันและ Import ข้อมูล         [Staff]
 */
app.use("/api/students/import", studentImportRouter);

// ================================
// NEW ROUTES - Key Borrow-Return System
// ================================

/**
 * ========================================================================
 * /api/kiosk - Kiosk API สำหรับ Raspberry Pi / ตู้กุญแจ
 * ========================================================================
 * ไม่ต้อง authenticate ด้วย JWT เพราะใช้ studentCode จาก ZKTEco
 * ------------------------------------------------------------------------
 * POST /api/kiosk/verify-borrow  - ตรวจสอบสิทธิ์เบิกกุญแจ     [Public/ZKTEco]
 * POST /api/kiosk/borrow         - ทำการเบิกกุญแจ             [Public/ZKTEco]
 * POST /api/kiosk/verify-return  - ตรวจสอบสิทธิ์คืนกุญแจ      [Public/ZKTEco]
 * POST /api/kiosk/return         - ทำการคืนกุญแจ              [Public/ZKTEco]
 * GET  /api/kiosk/rooms          - ดึงรายการห้องที่มีกุญแจว่าง [Public]
 * GET  /api/kiosk/rooms/status   - ดึงสถานะกุญแจทุกห้อง       [Public]
 */
app.use("/api/kiosk", kioskRouter);

/**
 * ========================================================================
 * /api/penalty - Penalty (ตัดคะแนน) Management Routes
 * ========================================================================
 * GET  /api/penalty/config        - ดึงการตั้งค่า Penalty          [Authenticated]
 * GET  /api/penalty/stats         - ดึงสถิติ Penalty               [Authenticated]
 * GET  /api/penalty/logs/:userId  - ดึงประวัติ Penalty ของผู้ใช้   [Authenticated]
 * POST /api/penalty/config        - สร้างการตั้งค่า Penalty        [Staff]
 * PUT  /api/penalty/config/:id    - แก้ไขการตั้งค่า Penalty        [Staff]
 * POST /api/penalty/manual        - ตัดคะแนนด้วยมือ                [Staff]
 * GET  /api/penalty/logs          - ดึงประวัติ Penalty ทั้งหมด     [Staff]
 */
app.use("/api/penalty", penaltyRouter);

/**
 * ========================================================================
 * /api/bookings - Booking (การจอง/ประวัติเบิก-คืน) Routes
 * ========================================================================
 * GET  /api/bookings               - ดึงประวัติ Bookings ทั้งหมด       [Authenticated]
 * GET  /api/bookings/active        - ดึง Bookings ที่กำลังเบิกอยู่     [Authenticated]
 * GET  /api/bookings/overdue       - ดึง Bookings ที่เกินกำหนด        [Authenticated]
 * GET  /api/bookings/stats         - ดึงสถิติ Bookings               [Authenticated]
 * GET  /api/bookings/stats/daily   - ดึงสถิติรายวัน                  [Authenticated]
 * GET  /api/bookings/stats/weekly  - ดึงสถิติรายสัปดาห์              [Authenticated]
 * GET  /api/bookings/stats/monthly - ดึงสถิติรายเดือน                [Authenticated]
 * POST /api/bookings/generate      - สร้าง Daily Bookings            [Authenticated]
 * GET  /api/bookings/:id           - ดึง Booking ตาม ID              [Authenticated]
 */
app.use("/api/bookings", bookingsRouter);

/**
 * ========================================================================
 * /api/authorizations - Daily Authorization (สิทธิ์เบิกกุญแจรายวัน) Routes
 * ========================================================================
 * All routes require authentication
 * ------------------------------------------------------------------------
 * POST   /api/authorizations              - เพิ่มสิทธิ์ด้วยมือ              [Authenticated]
 * GET    /api/authorizations              - ดึงสิทธิ์ทั้งหมด                [Authenticated]
 * GET    /api/authorizations/room/:roomCode - ดึงผู้ใช้ที่มีสิทธิ์ตามห้อง   [Authenticated]
 * GET    /api/authorizations/check        - ตรวจสอบสิทธิ์ผู้ใช้             [Authenticated]
 * POST   /api/authorizations/sync-schedule - Sync สิทธิ์จากตารางสอน         [Authenticated]
 * DELETE /api/authorizations/:id          - ลบสิทธิ์                        [Authenticated]
 */
app.use("/api/authorizations", authorizationsRouter);

app.use("/api/hardware", hardwareRoutesRouter);


/**
 * ========================================================================
 * /api/v2/schedules - New Schedule API with Room Swap/Move
 * ========================================================================
 * GET  /api/v2/schedules                       - ดึงตารางสอนทั้งหมด                 [Public]
 * GET  /api/v2/schedules/room/:roomCode        - ดึงตารางสอนตามห้อง                [Public]
 * GET  /api/v2/schedules/teacher/:teacherId    - ดึงตารางสอนตามอาจารย์             [Public]
 * GET  /api/v2/schedules/section/:section      - ดึงตารางสอนตามกลุ่มเรียน          [Public]
 * POST /api/v2/schedules/check-permission      - ตรวจสอบสิทธิ์ (สำหรับ Kiosk)      [Public]
 * POST /api/v2/schedules                       - สร้างตารางสอนใหม่                 [Staff]
 * PUT  /api/v2/schedules/:id                   - แก้ไขตารางสอน                     [Staff]
 * DELETE /api/v2/schedules/:id                 - ลบตารางสอน                        [Staff]
 * POST /api/v2/schedules/swap-rooms            - สลับห้องระหว่างสองตารางสอน        [Staff]
 * POST /api/v2/schedules/:id/move-room         - ย้ายห้องของตารางสอน               [Staff]
 */

app.use("/api/v2/schedules", scheduleRoutesRouter);

// ================================
// ROOT ENDPOINT
// ================================

/**
 * GET / - ทดสอบการเชื่อมต่อ API และ Database
 */
app.get("/", async (req, res) => {
  try {
    // ทดสอบการเชื่อมต่อกับ DB
    await prisma.$connect();
    res.json({ message: "API is running!" });
  } catch (error) {
    res.status(500).json({ error: "Database connection failed" });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${port} and LAN`);
});