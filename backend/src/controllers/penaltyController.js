import * as penaltyService from '../services/penaltyService.js';

/**
 * Penalty Controller - API endpoints สำหรับจัดการ Penalty
 */

/**
 * GET /api/penalty/config
 * ดึง config ที่ใช้งานอยู่
 */
export const getConfig = async (req, res) => {
    try {
        const config = await penaltyService.getActiveConfig();

        if (!config) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบ config กรุณาสร้างใหม่'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'ดึง config สำเร็จ',
            data: config
        });

    } catch (error) {
        console.error('Error in getConfig:', error);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
        });
    }
};

/**
 * POST /api/penalty/config
 * สร้าง config ใหม่ (Staff Only)
 * Body: { graceMinutes, scorePerInterval, intervalMinutes }
 */
export const createConfig = async (req, res) => {
    try {
        const { graceMinutes, scorePerInterval, intervalMinutes, restoreDays } = req.body;

        if (graceMinutes === undefined || scorePerInterval === undefined || intervalMinutes === undefined) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาระบุ graceMinutes, scorePerInterval และ intervalMinutes'
            });
        }

        const config = await penaltyService.createConfig({
            graceMinutes: parseInt(graceMinutes),
            scorePerInterval: parseInt(scorePerInterval),
            intervalMinutes: parseInt(intervalMinutes),
            restoreDays: restoreDays ? parseInt(restoreDays) : 7
        });

        return res.status(201).json({
            success: true,
            message: 'สร้าง config สำเร็จ',
            data: config
        });

    } catch (error) {
        console.error('Error in createConfig:', error);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการสร้าง config'
        });
    }
};

/**
 * PUT /api/penalty/config/:id
 * อัพเดต config (Staff Only)
 */
export const updateConfig = async (req, res) => {
    try {
        const { id } = req.params;
        const { graceMinutes, scorePerInterval, intervalMinutes, restoreDays } = req.body;

        const data = {};
        if (graceMinutes !== undefined) data.graceMinutes = parseInt(graceMinutes);
        if (scorePerInterval !== undefined) data.scorePerInterval = parseInt(scorePerInterval);
        if (intervalMinutes !== undefined) data.intervalMinutes = parseInt(intervalMinutes);
        if (restoreDays !== undefined) data.restoreDays = parseInt(restoreDays);

        const config = await penaltyService.updateConfig(id, data);

        return res.status(200).json({
            success: true,
            message: 'อัพเดต config สำเร็จ',
            data: config
        });

    } catch (error) {
        console.error('Error in updateConfig:', error);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการอัพเดต config'
        });
    }
};

/**
 * POST /api/penalty/manual
 * เพิ่ม penalty แบบ manual (Staff Only)
 * Body: { userId, scoreCut, reason }
 */
export const manualPenalty = async (req, res) => {
    try {
        const { userId, scoreCut, reason } = req.body;

        if (!userId || !scoreCut || !reason) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาระบุ userId, scoreCut และ reason'
            });
        }

        const result = await penaltyService.manualPenalty(userId, parseInt(scoreCut), reason);

        return res.status(201).json({
            success: true,
            message: result.isBanned
                ? `หักคะแนนสำเร็จ - ผู้ใช้ถูกแบน (คะแนน: ${result.newScore})`
                : `หักคะแนนสำเร็จ (${result.previousScore} → ${result.newScore})`,
            data: result
        });

    } catch (error) {
        console.error('Error in manualPenalty:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการหักคะแนน'
        });
    }
};

/**
 * GET /api/penalty/logs
 * ดึงประวัติ penalty ทั้งหมด (Staff Only)
 * Query: { userId?, type?, startDate?, endDate?, page?, limit? }
 */
export const getPenaltyLogs = async (req, res) => {
    try {
        const { userId, type, startDate, endDate, page = 1, limit = 20 } = req.query;

        const filters = {};
        if (userId) filters.userId = userId;
        if (type) filters.type = type;
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;

        const result = await penaltyService.getPenaltyLogs(filters, {
            page: parseInt(page),
            limit: parseInt(limit)
        });

        return res.status(200).json({
            success: true,
            message: 'ดึงประวัติ penalty สำเร็จ',
            data: result.logs,
            pagination: {
                total: result.total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(result.total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Error in getPenaltyLogs:', error);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
        });
    }
};

/**
 * GET /api/penalty/logs/:userId
 * ดึงประวัติ penalty ของผู้ใช้
 */
export const getUserPenaltyLogs = async (req, res) => {
    try {
        const { userId } = req.params;

        const logs = await penaltyService.getUserPenaltyHistory(userId);

        return res.status(200).json({
            success: true,
            message: 'ดึงประวัติ penalty ของผู้ใช้สำเร็จ',
            data: logs
        });

    } catch (error) {
        console.error('Error in getUserPenaltyLogs:', error);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
        });
    }
};

/**
 * GET /api/penalty/stats
 * ดึงสถิติ penalty (Staff Only)
 * Query: { startDate?, endDate? }
 */
export const getPenaltyStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        const stats = await penaltyService.getPenaltyStats(start, end);

        return res.status(200).json({
            success: true,
            message: 'ดึงสถิติ penalty สำเร็จ',
            data: stats
        });

    } catch (error) {
        console.error('Error in getPenaltyStats:', error);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
        });
    }
};
