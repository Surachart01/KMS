import express from 'express';
import { requireStaff, authenticate } from '../middleware/middleware.js';
import * as penaltyController from '../controllers/penaltyController.js';

const router = express.Router();

/**
 * Penalty Routes - จัดการ Penalty Config และ Logs
 */

// Public routes (ต้อง authenticate)
router.get('/config', authenticate, penaltyController.getConfig);
router.get('/stats', authenticate, penaltyController.getPenaltyStats);

// User-specific route
router.get('/logs/:userId', authenticate, penaltyController.getUserPenaltyLogs);

// Protected routes - staff only
router.post('/config', requireStaff, penaltyController.createConfig);
router.put('/config/:id', requireStaff, penaltyController.updateConfig);
router.post('/manual', requireStaff, penaltyController.manualPenalty);
router.get('/logs', requireStaff, penaltyController.getPenaltyLogs);
router.get('/scores', requireStaff, penaltyController.getAllScores);
router.put('/scores/:userId', requireStaff, penaltyController.updateScore);

export default router;
