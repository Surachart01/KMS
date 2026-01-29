import express from 'express';
import { requireStaff, authenticate } from '../middleware/middleware.js';
import * as bookingsController from '../controllers/bookingsController.js';

const router = express.Router();

/**
 * Bookings Routes - จัดการ Booking / ประวัติการเบิก-คืน
 */

// Public routes (ต้อง authenticate)
router.get('/', authenticate, bookingsController.getBookings);
router.get('/active', authenticate, bookingsController.getActiveBookings);
router.get('/overdue', authenticate, bookingsController.getOverdueBookings);
router.get('/stats', authenticate, bookingsController.getBookingStats);
router.get('/stats/daily', authenticate, bookingsController.getDailyStats);
router.get('/stats/weekly', authenticate, bookingsController.getWeeklyStats);
router.get('/stats/monthly', authenticate, bookingsController.getMonthlyStats);
router.post('/generate', authenticate, bookingsController.generateDailyBookings);
router.get('/:id', authenticate, bookingsController.getBookingById);

export default router;
