import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Penalty Controller - API endpoints สำหรับจัดการ Penalty
 */

// ==================== Helper Functions ====================

/**
 * คำนวณ penalty จากเวลาคืน
 */
export const calculatePenalty = async (borrowAt, dueAt, returnAt) => {
    const config = await prisma.penaltyConfig.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
    });

    const graceMinutes = config?.graceMinutes || 30;
    const scorePerInterval = config?.scorePerInterval || 5;
    const intervalMinutes = config?.intervalMinutes || 15;

    const diffMs = new Date(returnAt).getTime() - new Date(dueAt).getTime();
    const lateMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));

    if (lateMinutes <= graceMinutes) {
        return { lateMinutes: 0, penaltyScore: 0, isLate: false };
    }

    const actualLateMinutes = lateMinutes - graceMinutes;
    const intervals = Math.ceil(actualLateMinutes / intervalMinutes);
    const penaltyScore = intervals * scorePerInterval;

    return { lateMinutes: actualLateMinutes, penaltyScore, isLate: true };
};

/**
 * Apply penalty ให้ผู้ใช้
 */
export const applyPenalty = async (userId, bookingId, lateMinutes, penaltyScore, reason) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) throw new Error('ไม่พบผู้ใช้');

    const newScore = Math.max(0, user.score - penaltyScore);
    const shouldBan = newScore <= 0;

    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { score: newScore, isBanned: shouldBan }
    });

    const penaltyLog = await prisma.penaltyLog.create({
        data: {
            userId,
            bookingId,
            type: 'LATE_RETURN',
            scoreCut: penaltyScore,
            reason: reason || `คืนกุญแจช้า ${lateMinutes} นาที`
        },
        include: { user: true, booking: true }
    });

    return { user: updatedUser, penaltyLog, isBanned: shouldBan, previousScore: user.score, newScore };
};

// ==================== Controller Functions ====================

/**
 * GET /api/penalty/config
 */
export const getConfig = async (req, res) => {
    try {
        const config = await prisma.penaltyConfig.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
        });

        if (!config) {
            return res.status(404).json({ success: false, message: 'ไม่พบ config กรุณาสร้างใหม่' });
        }

        return res.status(200).json({ success: true, message: 'ดึง config สำเร็จ', data: config });
    } catch (error) {
        console.error('Error in getConfig:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
};

/**
 * POST /api/penalty/config
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

        // Deactivate old configs
        await prisma.penaltyConfig.updateMany({
            where: { isActive: true },
            data: { isActive: false }
        });

        const config = await prisma.penaltyConfig.create({
            data: {
                graceMinutes: parseInt(graceMinutes),
                scorePerInterval: parseInt(scorePerInterval),
                intervalMinutes: parseInt(intervalMinutes),
                restoreDays: restoreDays ? parseInt(restoreDays) : 7,
                isActive: true
            }
        });

        return res.status(201).json({ success: true, message: 'สร้าง config สำเร็จ', data: config });
    } catch (error) {
        console.error('Error in createConfig:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสร้าง config' });
    }
};

/**
 * PUT /api/penalty/config/:id
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

        const config = await prisma.penaltyConfig.update({ where: { id }, data });

        return res.status(200).json({ success: true, message: 'อัพเดต config สำเร็จ', data: config });
    } catch (error) {
        console.error('Error in updateConfig:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัพเดต config' });
    }
};

/**
 * POST /api/penalty/manual
 */
export const manualPenalty = async (req, res) => {
    try {
        const { userId, scoreCut, reason } = req.body;

        if (!userId || !scoreCut || !reason) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุ userId, scoreCut และ reason' });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('ไม่พบผู้ใช้');
        if (user.role !== 'STUDENT') throw new Error('สามารถหักคะแนนได้เฉพาะนักศึกษาเท่านั้น');

        const newScore = Math.max(0, user.score - parseInt(scoreCut));
        const shouldBan = newScore <= 0;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { score: newScore, isBanned: shouldBan }
        });

        const penaltyLog = await prisma.penaltyLog.create({
            data: { userId, bookingId: null, type: 'MANUAL', scoreCut: parseInt(scoreCut), reason },
            include: { user: true, booking: true }
        });

        return res.status(201).json({
            success: true,
            message: shouldBan
                ? `หักคะแนนสำเร็จ - ผู้ใช้ถูกแบน (คะแนน: ${newScore})`
                : `หักคะแนนสำเร็จ (${user.score} → ${newScore})`,
            data: { user: updatedUser, penaltyLog, isBanned: shouldBan, previousScore: user.score, newScore }
        });
    } catch (error) {
        console.error('Error in manualPenalty:', error);
        return res.status(500).json({ success: false, message: error.message || 'เกิดข้อผิดพลาดในการหักคะแนน' });
    }
};

/**
 * GET /api/penalty/logs
 */
export const getPenaltyLogs = async (req, res) => {
    try {
        const { userId, type, startDate, endDate, page = 1, limit = 20 } = req.query;

        const where = {};
        if (userId) where.userId = userId;
        if (type) where.type = type;
        if (startDate && endDate) {
            where.createdAt = { gte: new Date(startDate), lte: new Date(endDate) };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [logs, total] = await Promise.all([
            prisma.penaltyLog.findMany({
                where,
                skip,
                take: parseInt(limit),
                include: { user: true, booking: { include: { key: true } } },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.penaltyLog.count({ where })
        ]);

        return res.status(200).json({
            success: true,
            message: 'ดึงประวัติ penalty สำเร็จ',
            data: logs,
            pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) }
        });
    } catch (error) {
        console.error('Error in getPenaltyLogs:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
};

/**
 * GET /api/penalty/logs/:userId
 */
export const getUserPenaltyLogs = async (req, res) => {
    try {
        const { userId } = req.params;

        const logs = await prisma.penaltyLog.findMany({
            where: { userId },
            include: { booking: { include: { key: true } } },
            orderBy: { createdAt: 'desc' }
        });

        return res.status(200).json({ success: true, message: 'ดึงประวัติ penalty ของผู้ใช้สำเร็จ', data: logs });
    } catch (error) {
        console.error('Error in getUserPenaltyLogs:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
};

/**
 * GET /api/penalty/stats
 */
export const getPenaltyStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const where = {};
        if (startDate && endDate) {
            where.createdAt = { gte: new Date(startDate), lte: new Date(endDate) };
        }

        const [totalLogs, lateReturnLogs, manualLogs, totalScoreCut] = await Promise.all([
            prisma.penaltyLog.count({ where }),
            prisma.penaltyLog.count({ where: { ...where, type: 'LATE_RETURN' } }),
            prisma.penaltyLog.count({ where: { ...where, type: 'MANUAL' } }),
            prisma.penaltyLog.aggregate({ where, _sum: { scoreCut: true } })
        ]);

        return res.status(200).json({
            success: true,
            message: 'ดึงสถิติ penalty สำเร็จ',
            data: { totalLogs, lateReturnLogs, manualLogs, totalScoreCut: totalScoreCut._sum.scoreCut || 0 }
        });
    } catch (error) {
        console.error('Error in getPenaltyStats:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
};

/**
 * GET /api/penalty/scores - ดึงคะแนนนักศึกษาทุกคน
 */
export const getAllScores = async (req, res) => {
    try {
        const students = await prisma.user.findMany({
            where: { role: 'STUDENT' },
            select: {
                id: true,
                studentCode: true,
                firstName: true,
                lastName: true,
                score: true,
                isBanned: true,
                section: {
                    include: { major: true }
                }
            },
            orderBy: { studentCode: 'asc' }
        });

        return res.status(200).json({
            success: true,
            message: 'ดึงข้อมูลคะแนนสำเร็จ',
            data: students
        });
    } catch (error) {
        console.error('Error in getAllScores:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
};

/**
 * PUT /api/penalty/scores/:userId - แก้ไขคะแนนนักศึกษา
 */
export const updateScore = async (req, res) => {
    try {
        const { userId } = req.params;
        const { score, isBanned, reason } = req.body;

        if (score === undefined || score === null) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุคะแนน' });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
        }

        const previousScore = user.score;
        const newScore = Math.max(0, Math.min(100, parseInt(score)));
        const scoreDiff = newScore - previousScore;

        // Update user score and ban status
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                score: newScore,
                isBanned: isBanned !== undefined ? isBanned : (newScore <= 0)
            }
        });

        // Create a penalty log for this change
        if (scoreDiff !== 0) {
            await prisma.penaltyLog.create({
                data: {
                    userId,
                    bookingId: null,
                    type: 'MANUAL',
                    scoreCut: scoreDiff < 0 ? Math.abs(scoreDiff) : -scoreDiff, // positive = deducted, negative = restored
                    reason: reason || `Admin แก้ไขคะแนน: ${previousScore} → ${newScore}`
                }
            });
        }

        return res.status(200).json({
            success: true,
            message: `แก้ไขคะแนนสำเร็จ (${previousScore} → ${newScore})`,
            data: {
                user: updatedUser,
                previousScore,
                newScore,
                scoreDiff
            }
        });
    } catch (error) {
        console.error('Error in updateScore:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการแก้ไขคะแนน' });
    }
};

