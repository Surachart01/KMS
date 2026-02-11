import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Bookings Controller - API endpoints สำหรับจัดการ Booking
 */

// ==================== Helper Functions ====================

/**
 * ดึงสถิติการจอง
 */
const getBookingStatsHelper = async (startDate, endDate) => {
    const where = {};

    if (startDate && endDate) {
        where.borrowAt = { gte: startDate, lte: endDate };
    }

    const [total, borrowed, returned, late] = await Promise.all([
        prisma.booking.count({ where }),
        prisma.booking.count({ where: { ...where, status: 'BORROWED' } }),
        prisma.booking.count({ where: { ...where, status: 'RETURNED' } }),
        prisma.booking.count({ where: { ...where, status: 'LATE' } })
    ]);

    const lateBookings = await prisma.booking.aggregate({
        where: { ...where, lateMinutes: { gt: 0 } },
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

// ==================== Controller Functions ====================

/**
 * GET /api/bookings
 * ดึงประวัติการจองพร้อม filter และ pagination
 */
export const getBookings = async (req, res) => {
    try {
        const { status, userId, roomCode, startDate, endDate, search, page = 1, limit = 20 } = req.query;

        const where = {};
        if (status) where.status = status;
        if (userId) where.userId = userId;
        if (roomCode) where.key = { roomCode };
        if (startDate && endDate) {
            where.borrowAt = { gte: new Date(startDate), lte: new Date(endDate) };
        }
        if (search) {
            where.OR = [
                {
                    user: {
                        OR: [
                            { studentCode: { contains: search, mode: 'insensitive' } },
                            { firstName: { contains: search, mode: 'insensitive' } },
                            { lastName: { contains: search, mode: 'insensitive' } }
                        ]
                    }
                },
                { key: { roomCode: { contains: search, mode: 'insensitive' } } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [bookings, total] = await Promise.all([
            prisma.booking.findMany({
                where,
                skip,
                take: parseInt(limit),
                include: { user: true, key: true, subject: true },
                orderBy: { borrowAt: 'desc' }
            }),
            prisma.booking.count({ where })
        ]);

        const totalPages = Math.ceil(total / parseInt(limit));

        return res.status(200).json({
            success: true,
            message: 'ดึงประวัติการจองสำเร็จ',
            data: bookings,
            pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages }
        });
    } catch (error) {
        console.error('Error in getBookings:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
};

/**
 * GET /api/bookings/active
 */
export const getActiveBookings = async (req, res) => {
    try {
        const bookings = await prisma.booking.findMany({
            where: { status: 'BORROWED' },
            include: { user: true, key: true, subject: true },
            orderBy: { borrowAt: 'asc' }
        });

        return res.status(200).json({
            success: true,
            message: 'ดึงการจองที่ยังไม่คืนสำเร็จ',
            data: bookings,
            count: bookings.length
        });
    } catch (error) {
        console.error('Error in getActiveBookings:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
};

/**
 * GET /api/bookings/overdue
 */
export const getOverdueBookings = async (req, res) => {
    try {
        const bookings = await prisma.booking.findMany({
            where: { status: 'BORROWED', dueAt: { lt: new Date() } },
            include: { user: true, key: true },
            orderBy: { dueAt: 'asc' }
        });

        return res.status(200).json({
            success: true,
            message: 'ดึงการจองที่เลยกำหนดคืนสำเร็จ',
            data: bookings,
            count: bookings.length
        });
    } catch (error) {
        console.error('Error in getOverdueBookings:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
};

/**
 * GET /api/bookings/:id
 */
export const getBookingById = async (req, res) => {
    try {
        const { id } = req.params;

        const booking = await prisma.booking.findUnique({
            where: { id },
            include: { user: true, key: true, subject: true, penaltyLogs: true }
        });

        if (!booking) {
            return res.status(404).json({ success: false, message: 'ไม่พบการจอง' });
        }

        return res.status(200).json({ success: true, message: 'ดึงรายละเอียดการจองสำเร็จ', data: booking });
    } catch (error) {
        console.error('Error in getBookingById:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
};

/**
 * GET /api/bookings/stats
 */
export const getBookingStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        const stats = await getBookingStatsHelper(start, end);

        return res.status(200).json({ success: true, message: 'ดึงสถิติการจองสำเร็จ', data: stats });
    } catch (error) {
        console.error('Error in getBookingStats:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
};

/**
 * GET /api/bookings/stats/daily
 */
export const getDailyStats = async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date ? new Date(date) : new Date();

        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        const stats = await getBookingStatsHelper(startOfDay, endOfDay);

        return res.status(200).json({
            success: true,
            message: 'ดึงสถิติประจำวันสำเร็จ',
            data: stats,
            date: targetDate.toISOString().split('T')[0]
        });
    } catch (error) {
        console.error('Error in getDailyStats:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
};

/**
 * GET /api/bookings/stats/weekly
 */
export const getWeeklyStats = async (req, res) => {
    try {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        const stats = await getBookingStatsHelper(startOfWeek, endOfWeek);

        return res.status(200).json({ success: true, message: 'ดึงสถิติประจำสัปดาห์สำเร็จ', data: stats });
    } catch (error) {
        console.error('Error in getWeeklyStats:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
};

/**
 * GET /api/bookings/stats/monthly
 */
export const getMonthlyStats = async (req, res) => {
    try {
        const now = new Date();
        const { month = now.getMonth() + 1, year = now.getFullYear() } = req.query;

        const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endOfMonth = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);

        const stats = await getBookingStatsHelper(startOfMonth, endOfMonth);

        return res.status(200).json({
            success: true,
            message: 'ดึงสถิติประจำเดือนสำเร็จ',
            data: stats,
            month: parseInt(month),
            year: parseInt(year)
        });
    } catch (error) {
        console.error('Error in getMonthlyStats:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
};

/**
 * POST /api/bookings/generate
 * สร้าง Bookings รายวันจาก Schedule
 */
export const generateDailyBookings = async (req, res) => {
    try {
        const { date } = req.body;
        if (!date) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุวันที่' });
        }

        const targetDate = new Date(date);
        const dayOfWeek = targetDate.getDay();
        const dateStr = targetDate.toISOString().split('T')[0];

        // Fetch schedules for this day
        const schedules = await prisma.schedule.findMany({
            where: { dayOfWeek },
            include: { subject: true, teacher: true }
        });

        let count = 0;
        const createdBookings = [];

        for (const schedule of schedules) {
            // Find Key for the room
            const key = await prisma.key.findFirst({
                where: { roomCode: schedule.roomCode, isActive: true }
            });

            if (!key) {
                console.warn(`Skipping schedule ${schedule.id}: No active key for room ${schedule.roomCode}`);
                continue;
            }

            // Calculate times
            const startDateTime = new Date(dateStr);
            startDateTime.setHours(schedule.startTime.getHours(), schedule.startTime.getMinutes(), 0, 0);

            const endDateTime = new Date(dateStr);
            endDateTime.setHours(schedule.endTime.getHours(), schedule.endTime.getMinutes(), 0, 0);

            // Check existing booking to prevent duplicates
            const existingBooking = await prisma.booking.findFirst({
                where: {
                    keyId: key.id,
                    borrowAt: { lt: endDateTime },
                    dueAt: { gt: startDateTime },
                    status: { not: 'RETURNED' }
                }
            });

            if (existingBooking) continue;

            // Create Booking
            const newBooking = await prisma.booking.create({
                data: {
                    userId: schedule.teacherId,
                    keyId: key.id,
                    subjectId: schedule.subjectId,
                    borrowAt: startDateTime,
                    dueAt: endDateTime,
                    status: 'RESERVED',
                    returnAt: null
                }
            });

            createdBookings.push(newBooking);
            count++;
        }

        return res.status(200).json({
            success: true,
            message: `สร้างรายการจองสำเร็จ ${count} รายการ`,
            data: createdBookings
        });
    } catch (error) {
        console.error('Error in generateDailyBookings:', error);
        return res.status(500).json({ success: false, message: error.message || 'เกิดข้อผิดพลาดในการสร้างรายการจอง' });
    }
};
