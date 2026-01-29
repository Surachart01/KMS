import prisma from './index.js';

/**
 * Booking Repository - Data access layer สำหรับ Booking
 */

/**
 * สร้างการจองใหม่
 * @param {object} data - { userId, keyId, subjectId?, dueAt }
 * @returns {Promise<Booking>}
 */
export const createBooking = async (data) => {
    return prisma.booking.create({
        data,
        include: {
            user: true,
            key: true,
            subject: true
        }
    });
};

/**
 * หาการจองที่ยังไม่คืนของผู้ใช้
 * @param {string} userId - User ID
 * @returns {Promise<Booking|null>}
 */
export const findActiveBookingByUser = async (userId) => {
    return prisma.booking.findFirst({
        where: {
            userId,
            status: 'BORROWED'
        },
        include: {
            key: true,
            subject: true
        }
    });
};

/**
 * หาการจองที่ยังไม่คืนของกุญแจ
 * @param {string} keyId - Key ID
 * @returns {Promise<Booking|null>}
 */
export const findActiveBookingByKey = async (keyId) => {
    return prisma.booking.findFirst({
        where: {
            keyId,
            status: 'BORROWED'
        },
        include: {
            user: true,
            key: true
        }
    });
};

/**
 * หาการจองจาก ID
 * @param {string} id - Booking ID
 * @returns {Promise<Booking|null>}
 */
export const findById = async (id) => {
    return prisma.booking.findUnique({
        where: { id },
        include: {
            user: true,
            key: true,
            subject: true,
            penaltyLogs: true
        }
    });
};

/**
 * อัพเดตการจอง
 * @param {string} id - Booking ID
 * @param {object} data - ข้อมูลที่อัพเดต
 * @returns {Promise<Booking>}
 */
export const updateBooking = async (id, data) => {
    return prisma.booking.update({
        where: { id },
        data,
        include: {
            user: true,
            key: true,
            subject: true
        }
    });
};

/**
 * ดึงประวัติการจองพร้อม filter และ pagination
 * @param {object} filters - { status, userId, roomCode, startDate, endDate }
 * @param {object} pagination - { page, limit }
 * @returns {Promise<{ bookings: Booking[], total: number }>}
 */
export const getBookingHistory = async (filters = {}, pagination = { page: 1, limit: 20 }) => {
    const where = {};

    if (filters.status) {
        where.status = filters.status;
    }

    if (filters.userId) {
        where.userId = filters.userId;
    }

    if (filters.roomCode) {
        where.key = {
            roomCode: filters.roomCode
        };
    }

    if (filters.startDate && filters.endDate) {
        where.borrowAt = {
            gte: new Date(filters.startDate),
            lte: new Date(filters.endDate)
        };
    }

    if (filters.search) {
        where.OR = [
            {
                user: {
                    OR: [
                        { studentCode: { contains: filters.search, mode: 'insensitive' } },
                        { firstName: { contains: filters.search, mode: 'insensitive' } },
                        { lastName: { contains: filters.search, mode: 'insensitive' } }
                    ]
                }
            },
            {
                key: {
                    roomCode: { contains: filters.search, mode: 'insensitive' }
                }
            }
        ];
    }

    const skip = (pagination.page - 1) * pagination.limit;

    const [bookings, total] = await Promise.all([
        prisma.booking.findMany({
            where,
            skip,
            take: pagination.limit,
            include: {
                user: true,
                key: true,
                subject: true
            },
            orderBy: { borrowAt: 'desc' }
        }),
        prisma.booking.count({ where })
    ]);

    return { bookings, total };
};

/**
 * ดึงการจองที่ยังไม่คืนทั้งหมด
 * @returns {Promise<Booking[]>}
 */
export const getActiveBookings = async () => {
    return prisma.booking.findMany({
        where: {
            status: 'BORROWED'
        },
        include: {
            user: true,
            key: true,
            subject: true
        },
        orderBy: { borrowAt: 'asc' }
    });
};

/**
 * ดึงสถิติการจอง
 * @param {Date} startDate - เริ่มต้น
 * @param {Date} endDate - สิ้นสุด
 * @returns {Promise<object>}
 */
export const getBookingStats = async (startDate, endDate) => {
    const where = {};

    if (startDate && endDate) {
        where.borrowAt = {
            gte: startDate,
            lte: endDate
        };
    }

    const [total, borrowed, returned, late] = await Promise.all([
        prisma.booking.count({ where }),
        prisma.booking.count({ where: { ...where, status: 'BORROWED' } }),
        prisma.booking.count({ where: { ...where, status: 'RETURNED' } }),
        prisma.booking.count({ where: { ...where, status: 'LATE' } })
    ]);

    // คำนวณ average late minutes
    const lateBookings = await prisma.booking.aggregate({
        where: {
            ...where,
            lateMinutes: { gt: 0 }
        },
        _avg: { lateMinutes: true },
        _sum: { penaltyScore: true }
    });

    return {
        total,
        borrowed,
        returned,
        late,
        averageLateMinutes: lateBookings._avg.lateMinutes || 0,
        totalPenaltyScore: lateBookings._sum.penaltyScore || 0
    };
};

/**
 * ดึงการจองที่เลยกำหนดคืน
 * @returns {Promise<Booking[]>}
 */
export const getOverdueBookings = async () => {
    return prisma.booking.findMany({
        where: {
            status: 'BORROWED',
            dueAt: { lt: new Date() }
        },
        include: {
            user: true,
            key: true
        },
        orderBy: { dueAt: 'asc' }
    });
};
