import express from 'express';
import * as authorizationController from '../controllers/authorizationController.js';
import { authenticate } from '../middleware/middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Add manual authorization
router.post('/', authorizationController.addAuthorization);

// Get all authorizations
router.get('/', authorizationController.getAllAuthorizations);

// Get authorized users for a specific room
router.get('/room/:roomCode', authorizationController.getAuthorizedUsersForRoom);

// Check if user is authorized
router.get('/check', authorizationController.checkAuthorization);

// Sync from schedule
router.post('/sync-schedule', authorizationController.syncSchedule);

// Delete authorization
router.delete('/:id', authorizationController.deleteAuthorization);

export default router;
