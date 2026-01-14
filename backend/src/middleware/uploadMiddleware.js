import multer from 'multer';

/**
 * ========================================================================
 * Multer Configuration สำหรับ Upload Excel
 * ========================================================================
 */

// กำหนดการจัดเก็บไฟล์ใน memory (ไม่บันทึกลง disk)
const storage = multer.memoryStorage();

// กำหนด file filter - รับเฉพาะไฟล์ Excel
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'application/vnd.ms-excel', // .xls
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/octet-stream' // fallback
    ];

    const allowedExtensions = ['.xls', '.xlsx'];
    const fileExtension = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));

    if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
        cb(null, true);
    } else {
        cb(new Error('รองรับเฉพาะไฟล์ Excel (.xls, .xlsx) เท่านั้น'), false);
    }
};

// สร้าง multer instance
export const uploadExcel = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // จำกัดขนาดไฟล์ 5MB
    }
});

// Middleware สำหรับจัดการ error จาก multer
export const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'ไฟล์มีขนาดใหญ่เกินไป (ขนาดสูงสุด 5MB)'
            });
        }
        return res.status(400).json({
            success: false,
            message: `ข้อผิดพลาดในการอัปโหลด: ${err.message}`
        });
    } else if (err) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    next();
};
