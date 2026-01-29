import * as kioskService from '../services/kioskService.js';

/**
 * Kiosk Controller - API endpoints สำหรับ Raspberry Pi / ตู้กุญแจ
 * ไม่ต้อง authenticate ด้วย JWT เพราะใช้ studentCode จาก ZKTEco
 */

/**
 * POST /api/kiosk/verify-borrow
 * ตรวจสอบสิทธิ์เบิกกุญแจ
 * Body: { studentCode, roomCode }
 */
export const verifyBorrow = async (req, res) => {
    try {
        const { studentCode, roomCode } = req.body;

        if (!studentCode || !roomCode) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาระบุรหัสนักศึกษาและรหัสห้อง'
            });
        }

        const result = await kioskService.verifyBorrowEligibility(studentCode, roomCode);

        return res.status(200).json({
            success: result.canBorrow,
            message: result.canBorrow ? 'สามารถเบิกกุญแจได้' : result.reason,
            data: result
        });

    } catch (error) {
        console.error('Error in verifyBorrow:', error);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์'
        });
    }
};

/**
 * POST /api/kiosk/borrow
 * ทำการเบิกกุญแจ
 * Body: { studentCode, roomCode }
 */
export const borrowKey = async (req, res) => {
    try {
        const { studentCode, roomCode } = req.body;

        if (!studentCode || !roomCode) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาระบุรหัสนักศึกษาและรหัสห้อง'
            });
        }

        // ดึง IP address จาก request
        const ipAddress = req.ip || req.connection?.remoteAddress || null;

        const result = await kioskService.borrowKey(studentCode, roomCode, ipAddress);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error
            });
        }

        return res.status(201).json({
            success: true,
            message: 'เบิกกุญแจสำเร็จ',
            data: result
        });

    } catch (error) {
        console.error('Error in borrowKey:', error);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการเบิกกุญแจ'
        });
    }
};

/**
 * POST /api/kiosk/verify-return
 * ตรวจสอบสิทธิ์คืนกุญแจ
 * Body: { studentCode }
 */
export const verifyReturn = async (req, res) => {
    try {
        const { studentCode } = req.body;

        if (!studentCode) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาระบุรหัสนักศึกษา'
            });
        }

        const result = await kioskService.verifyReturnEligibility(studentCode);

        return res.status(200).json({
            success: result.canReturn,
            message: result.canReturn ? 'พร้อมคืนกุญแจ' : result.reason,
            data: result
        });

    } catch (error) {
        console.error('Error in verifyReturn:', error);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการตรวจสอบ'
        });
    }
};

/**
 * POST /api/kiosk/return
 * ทำการคืนกุญแจ
 * Body: { studentCode }
 */
export const returnKey = async (req, res) => {
    try {
        const { studentCode } = req.body;

        if (!studentCode) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาระบุรหัสนักศึกษา'
            });
        }

        // ดึง IP address
        const ipAddress = req.ip || req.connection?.remoteAddress || null;

        const result = await kioskService.returnKey(studentCode, ipAddress);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error
            });
        }

        // แจ้งเตือนถ้าสาย
        let message = 'คืนกุญแจสำเร็จ';
        if (result.isLate) {
            message = `คืนกุญแจสำเร็จ (สาย ${result.lateMinutes} นาที, หักคะแนน ${result.penaltyScore} คะแนน)`;
        }

        return res.status(200).json({
            success: true,
            message,
            data: result
        });

    } catch (error) {
        console.error('Error in returnKey:', error);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการคืนกุญแจ'
        });
    }
};

/**
 * GET /api/kiosk/rooms
 * ดึงรายการห้องที่มีกุญแจว่าง
 */
export const getAvailableRooms = async (req, res) => {
    try {
        const rooms = await kioskService.getAvailableRooms();

        return res.status(200).json({
            success: true,
            message: 'ดึงรายการห้องสำเร็จ',
            data: rooms
        });

    } catch (error) {
        console.error('Error in getAvailableRooms:', error);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
        });
    }
};

/**
 * GET /api/kiosk/rooms/status
 * ดึงสถานะกุญแจทุกห้อง
 */
export const getRoomKeyStatus = async (req, res) => {
    try {
        const status = await kioskService.getRoomKeyStatus();

        return res.status(200).json({
            success: true,
            message: 'ดึงสถานะห้องสำเร็จ',
            data: status
        });

    } catch (error) {
        console.error('Error in getRoomKeyStatus:', error);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
        });
    }
};
