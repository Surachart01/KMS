import express from 'express';
import { requireStaff, authenticate } from '../middleware/middleware.js';
import * as keyController from '../controllers/key.js';

const router = express.Router();

// Protected routes - ต้อง login
router.get('/', authenticate, keyController.getAllKeys);
router.get('/:id', authenticate, keyController.getKeyById);

// Staff only routes
router.post('/', requireStaff, keyController.createKey);
router.put('/:id', requireStaff, keyController.updateKey);
router.delete('/:id', requireStaff, keyController.deleteKey);

export default router;
