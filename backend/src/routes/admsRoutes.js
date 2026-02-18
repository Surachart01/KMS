import express from 'express';
import { handleCdata, handleRegistry, handleGetRequest } from '../controllers/admsController.js';

/**
 * ADMS Routes — รับข้อมูลจาก ZKTeco device
 * ไม่ต้อง authenticate เพราะ ZKTeco ส่งมาแบบ HTTP ตรงๆ
 * 
 * ต้องเรียก createAdmsRoutes(io) เพื่อ inject Socket.IO instance
 */
export function createAdmsRoutes(io) {
    const router = express.Router();

    // ZKTeco ส่ง raw text ไม่ใช่ JSON
    router.use(express.text({ type: '*/*' }));

    // Main endpoint สำหรับ attendance data
    router.all('/cdata', handleCdata(io));

    // Device registration
    router.post('/registry', handleRegistry);

    // Device polling
    router.get('/getrequest', handleGetRequest);

    return router;
}

export default createAdmsRoutes;
