import prisma from './index.js';

/**
 * PenaltyLog Repository - Data access layer สำหรับ PenaltyLog
 */

/**
 * สร้าง penalty log
 * @param {object} data - { userId, bookingId?, type, scoreCut, reason }
 * @returns {Promise<PenaltyLog>}
 */
export const createLog = async (data) => {
    return prisma.penaltyLog.create({
        data,
        include: {
            user: true,
            booking: true
        }
    });
};

/**
 * ดึงประวัติ penalty ของผู้ใช้
 * @param {string} userId - User ID
 * @returns {Promise<PenaltyLog[]>}
 */
export const findByUser = async (userId) => {
    return prisma.penaltyLog.findMany({
        where: { userId },
        include: {
            booking: {
                include: { key: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
};

/**
 * ดึงประวัติ penalty ทั้งหมดพร้อม filter
 * @param {object} filters - { userId, type, startDate, endDate }
 * @param {object} pagination - { page, limit }
 * @returns {Promise<{ logs: PenaltyLog[], total: number }>}
 */
export const getAllLogs = async (filters = {}, pagination = { page: 1, limit: 20 }) => {
    const where = {};

    if (filters.userId) {
        where.userId = filters.userId;
    }

    if (filters.type) {
        where.type = filters.type;
    }

    if (filters.startDate && filters.endDate) {
        where.createdAt = {
            gte: new Date(filters.startDate),
            lte: new Date(filters.endDate)
        };
    }

    const skip = (pagination.page - 1) * pagination.limit;

    const [logs, total] = await Promise.all([
        prisma.penaltyLog.findMany({
            where,
            skip,
            take: pagination.limit,
            include: {
                user: true,
                booking: {
                    include: { key: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        }),
        prisma.penaltyLog.count({ where })
    ]);

    return { logs, total };
};

/**
 * ดึงสถิติ penalty
 * @param {Date} startDate - เริ่มต้น
 * @param {Date} endDate - สิ้นสุด
 * @returns {Promise<object>}
 */
export const getPenaltyStats = async (startDate, endDate) => {
    const where = {};

    if (startDate && endDate) {
        where.createdAt = {
            gte: startDate,
            lte: endDate
        };
    }

    const [totalLogs, lateReturnLogs, manualLogs, totalScoreCut] = await Promise.all([
        prisma.penaltyLog.count({ where }),
        prisma.penaltyLog.count({ where: { ...where, type: 'LATE_RETURN' } }),
        prisma.penaltyLog.count({ where: { ...where, type: 'MANUAL' } }),
        prisma.penaltyLog.aggregate({
            where,
            _sum: { scoreCut: true }
        })
    ]);

    return {
        totalLogs,
        lateReturnLogs,
        manualLogs,
        totalScoreCut: totalScoreCut._sum.scoreCut || 0
    };
};
