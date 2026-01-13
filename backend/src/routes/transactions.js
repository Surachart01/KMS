import express from 'express';
import { requireStaff } from '../middleware/middleware.js';
import * as transactionController from '../controllers/transactions.js';

const router = express.Router();

// GET all transactions (History)
router.get('/', transactionController.getTransactions);

// POST borrow key (Staff action)
router.post('/borrow', requireStaff, transactionController.borrowKey);

// POST return key (Staff action)
router.post('/return', requireStaff, transactionController.returnKey);

export default router;
