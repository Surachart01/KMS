import express from 'express';
import { requireStaff } from '../middleware/middleware.js';
import * as roomController from '../controllers/rooms.js';

const router = express.Router();

// Public routes
router.get('/', roomController.getAllRooms);
router.get('/:id', roomController.getRoomById);

// Protected routes - staff only
router.post('/', requireStaff, roomController.createRoom);
router.put('/:id', requireStaff, roomController.updateRoom);
router.delete('/:id', requireStaff, roomController.deleteRoom);

export default router;
