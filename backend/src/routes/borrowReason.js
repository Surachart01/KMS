import express from 'express';
import { requireStaff } from '../middleware/middleware.js';
import * as borrowReasonController from '../controllers/borrowReason.js';

const router = express.Router();

// Public routes
router.get('/', borrowReasonController.getAllBorrowReasons);
router.get('/:id', borrowReasonController.getBorrowReasonById);

// Protected routes - staff only
router.post('/', requireStaff, borrowReasonController.createBorrowReason);
router.put('/:id', requireStaff, borrowReasonController.updateBorrowReason);
router.delete('/:id', requireStaff, borrowReasonController.deleteBorrowReason);

export default router;
