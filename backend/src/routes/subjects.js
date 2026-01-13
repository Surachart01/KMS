import express from 'express';
import { requireStaff } from '../middleware/middleware.js';
import * as subjectController from '../controllers/subjects.js';

const router = express.Router();

// Public routes
router.get('/', subjectController.getAllSubjects);
router.get('/:code', subjectController.getSubjectByCode);

// Protected routes - staff only
router.post('/', requireStaff, subjectController.createSubject);
router.put('/:code', requireStaff, subjectController.updateSubject);
router.delete('/:code', requireStaff, subjectController.deleteSubject);

export default router;
