import express from 'express';
import { requireStaff } from '../middleware/middleware.js';
import * as scheduleController from '../controllers/scheduleController.js';

const router = express.Router();

// Public routes
router.get('/', scheduleController.getAllSchedules);
router.get('/:id', scheduleController.getScheduleById);

// Protected routes - staff only
router.post('/batch-import', requireStaff, scheduleController.batchImportSchedules);
router.post('/import-repclasslist', requireStaff, scheduleController.importRepclasslist);
router.delete('/delete-all', requireStaff, scheduleController.deleteAllSchedules);
router.post('/', requireStaff, scheduleController.createSchedule);
router.put('/:id', requireStaff, scheduleController.updateSchedule);
router.delete('/:id', requireStaff, scheduleController.deleteSchedule);

export default router;

