import express from 'express';
import { requireTeacher } from '../middleware/middleware.js';
import * as teacherController from '../controllers/teacherController.js';

const router = express.Router();

// ทุก route ต้องเป็น TEACHER เท่านั้น
router.get('/me', requireTeacher, teacherController.getMe);
router.get('/my-subjects', requireTeacher, teacherController.getMySubjects);
router.get('/my-schedules', requireTeacher, teacherController.getMySchedules);
router.post('/schedules', requireTeacher, teacherController.createMySchedule);
router.put('/schedules/:id', requireTeacher, teacherController.updateMySchedule);
router.delete('/schedules/:id', requireTeacher, teacherController.deleteMySchedule);
router.post('/schedules/import-repclasslist', requireTeacher, teacherController.importMyRepclasslist);

export default router;
