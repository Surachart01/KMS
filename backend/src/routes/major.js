import express from 'express';
import { requireStaff } from '../middleware/middleware.js';
import * as majorController from '../controllers/major.js';

const router = express.Router();

// Public routes - ทุกคนสามารถดูได้
router.get('/', majorController.getAllMajors);
router.get('/:id', majorController.getMajorById);

// Protected routes - เฉพาะ staff เท่านั้น
router.post('/', requireStaff, majorController.createMajor);
router.put('/:id', requireStaff, majorController.updateMajor);
router.delete('/:id', requireStaff, majorController.deleteMajor);

export default router;
