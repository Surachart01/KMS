import express from 'express';
import { requireStaff } from '../middleware/middleware.js';
import * as sectionController from '../controllers/sections.js';

const router = express.Router();

// Public routes
router.get('/', sectionController.getAllSections);
router.get('/:id', sectionController.getSectionById);

// Protected routes - staff only
router.post('/', requireStaff, sectionController.createSection);
router.put('/:id', requireStaff, sectionController.updateSection);
router.delete('/:id', requireStaff, sectionController.deleteSection);

export default router;
