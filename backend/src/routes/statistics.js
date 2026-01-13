import express from 'express';
import {
    getDashboardStats,
    getRecentTransactions,
    getTopRooms,
    getTodayStats
} from '../controllers/statistics.js';

const router = express.Router();

router.get('/dashboard', getDashboardStats);
router.get('/recent', getRecentTransactions);
router.get('/top-rooms', getTopRooms);
router.get('/today', getTodayStats);

export default router;
