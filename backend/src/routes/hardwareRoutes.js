import express from "express";
import * as hardwareController from "../controllers/hardwareController.js";
import { hardwareMiddleware } from "../middleware/middleware.js";

const router = express.Router();

// ==================== Hardware API Routes ====================
// ทุก route ใช้ hardwareMiddleware (ตรวจสอบ HARDWARE_TOKEN)
// สำหรับเครื่องสแกนหน้า ZKTeco / Raspberry Pi

// --- กุญแจ ---
router.get("/keys", hardwareMiddleware, hardwareController.getAllKey);                    // ดึงรายชื่อกุญแจทั้งหมด
router.get("/room-status", hardwareMiddleware, hardwareController.getRoomStatus);         // สถานะกุญแจรายห้อง

// --- ผู้ใช้ ---
router.post("/identify", hardwareMiddleware, hardwareController.identifyUser);            // ระบุตัวตนจากสแกนหน้า
router.get("/user/:studentCode/status", hardwareMiddleware, hardwareController.getUserStatus); // สถานะผู้ใช้

// --- ยืม-คืน ---
router.post("/borrow", hardwareMiddleware, hardwareController.borrowKey);                  // ยืมกุญแจ (เบิก)
router.post("/return", hardwareMiddleware, hardwareController.returnKey);                   // คืนกุญแจ

// --- สลับ-ย้ายสิทธิ์ ---
router.post("/swap", hardwareMiddleware, hardwareController.swapAuthorization);             // สลับสิทธิ์กุญแจ 2 คน
router.post("/move", hardwareMiddleware, hardwareController.moveAuthorization);             // ย้ายสิทธิ์กุญแจ (คนเดียว)

export default router;