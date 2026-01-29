import prisma from './index.js';

/**
 * SystemLog Repository - Data access layer สำหรับ SystemLog
 */

/**
 * สร้าง system log
 * @param {object} data - { userId, action, details?, ipAddress? }
 * @returns {Promise<SystemLog>}
 */
export const createLog = async (data) => {
    return prisma.systemLog.create({
        data,
        include: { user: true }
    });
};

/**
 * ดึงประวัติ log ของผู้ใช้
 * @param {string} userId - User ID
 * @param {number} limit - จำนวนที่ต้องการ
 * @returns {Promise<SystemLog[]>}
 */
export const findByUser = async (userId, limit = 50) => {
    return prisma.systemLog.findMany({
        where: { userId },
        take: limit,
        orderBy: { createdAt: 'desc' }
    });
};

/**
 * ดึง log ทั้งหมดพร้อม filter
 * @param {object} filters - { userId, action, startDate, endDate }
 * @param {object} pagination - { page, limit }
 * @returns {Promise<{ logs: SystemLog[], total: number }>}
 */
export const getAllLogs = async (filters = {}, pagination = { page: 1, limit: 50 }) => {
    const where = {};

    if (filters.userId) {
        where.userId = filters.userId;
    }

    if (filters.action) {
        where.action = { contains: filters.action, mode: 'insensitive' };
    }

    if (filters.startDate && filters.endDate) {
        where.createdAt = {
            gte: new Date(filters.startDate),
            lte: new Date(filters.endDate)
        };
    }

    const skip = (pagination.page - 1) * pagination.limit;

    const [logs, total] = await Promise.all([
        prisma.systemLog.findMany({
            where,
            skip,
            take: pagination.limit,
            include: {
                user: {
                    select: { id: true, studentCode: true, firstName: true, lastName: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        }),
        prisma.systemLog.count({ where })
    ]);

    return { logs, total };
};
