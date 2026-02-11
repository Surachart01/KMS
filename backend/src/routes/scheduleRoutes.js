import express from 'express';
import { requireStaff, authenticate } from '../middleware/middleware.js';
import * as scheduleController from '../controllers/scheduleController.js';

const router = express.Router();

/**
 * Schedule Routes - จัดการตารางสอน (ใช้ schema ใหม่)
 */

// Public routes
router.get('/', scheduleController.getAllSchedules);
router.get('/room/:roomCode', scheduleController.getSchedulesByRoom);
router.get('/teacher/:teacherId', scheduleController.getSchedulesByTeacher);


// Check permission (for kiosk use)
router.post('/check-permission', scheduleController.checkSchedulePermission);

// Protected routes - staff only
router.post('/', requireStaff, scheduleController.createSchedule);
router.put('/:id', requireStaff, scheduleController.updateSchedule);
router.delete('/:id', requireStaff, scheduleController.deleteSchedule);

// Room swap/move - staff only
router.post('/swap-rooms', requireStaff, scheduleController.swapRooms);
router.post('/:id/move-room', requireStaff, scheduleController.moveRoom);

export default router;
