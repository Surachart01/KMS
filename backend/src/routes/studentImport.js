import express from 'express';
import {
    downloadTemplate,
    previewImport,
    confirmImport,
    getMajors
} from '../controllers/studentImport.js';
import { uploadExcel, handleMulterError } from '../middleware/uploadMiddleware.js';

const router = express.Router();

/**
 * ========================================================================
 * Student Import Routes
 * ========================================================================
 */

/**
 * @route   GET /api/students/import/template
 * @desc    ดาวน์โหลด Excel Template
 * @access  Admin, Staff
 */
router.get('/template', downloadTemplate);

/**
 * @route   GET /api/students/import/majors
 * @desc    ดึงรายชื่อสาขาวิชาและกลุ่มเรียน
 * @access  Admin, Staff
 */
router.get('/majors', getMajors);

/**
 * @route   POST /api/students/import/preview
 * @desc    Preview และ Validate ข้อมูลก่อน Import
 * @access  Admin, Staff
 */
router.post(
    '/preview',
    uploadExcel.single('file'),
    handleMulterError,
    previewImport
);

/**
 * @route   POST /api/students/import/confirm
 * @desc    ยืนยันและ Import ข้อมูลเข้าระบบ
 * @access  Admin, Staff
 */
router.post(
    '/confirm',
    uploadExcel.single('file'),
    handleMulterError,
    confirmImport
);

export default router;
