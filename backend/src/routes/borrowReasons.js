import { Router } from 'express';
import * as borrowReasonController from '../controllers/borrowReasonController.js';
import { authenticate } from '../middleware/middleware.js';

const router = Router();

// GET — ดึงรายการเหตุผลทั้งหมด (ไม่ต้อง login สำหรับ kiosk)
router.get('/', borrowReasonController.getAll);

// POST — เพิ่มเหตุผลใหม่ (ต้อง login)
router.post('/', authenticate, borrowReasonController.create);

// PUT — แก้ไขเหตุผล (ต้อง login)
router.put('/:id', authenticate, borrowReasonController.update);

// DELETE — ลบเหตุผล (ต้อง login)
router.delete('/:id', authenticate, borrowReasonController.remove);

export default router;
