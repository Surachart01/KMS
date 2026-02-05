import express from 'express';
import * as kioskController from '../controllers/kioskController.js';

const router = express.Router();

/**
 * Kiosk Routes - สำหรับ Raspberry Pi / ตู้กุญแจ
 * ไม่ต้อง authenticate ด้วย JWT เพราะใช้ studentCode จาก ZKTEco
 */



// ตรวจสอบสิทธิ์เบิก
router.post('/verify-borrow', kioskController.verifyBorrow);

// ทำการเบิกกุญแจ
router.post('/borrow', kioskController.borrowKey);

// ตรวจสอบสิทธิ์คืน
router.post('/verify-return', kioskController.verifyReturn);

// ทำการคืนกุญแจ
router.post('/return', kioskController.returnKey);

// ดึงรายการห้องที่มีกุญแจว่าง
router.get('/rooms', kioskController.getAvailableRooms);

// ดึงสถานะกุญแจทุกห้อง
router.get('/rooms/status', kioskController.getRoomKeyStatus);

export default router;
