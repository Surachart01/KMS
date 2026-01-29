import * as bookingService from '../services/bookingService.js';

/**
 * Bookings Controller - API endpoints สำหรับจัดการ Booking
 */

/**
 * GET /api/bookings
 * ดึงประวัติการจองพร้อม filter และ pagination
 * Query: { status?, userId?, roomCode?, startDate?, endDate?, search?, page?, limit? }
 */
export const getBookings = async (req, res) => {
    try {
        const { status, userId, roomCode, startDate, endDate, search, page = 1, limit = 20 } = req.query;

        const filters = {};
        if (status) filters.status = status;
        if (userId) filters.userId = userId;
        if (roomCode) filters.roomCode = roomCode;
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        if (search) filters.search = search;

        const result = await bookingService.getBookingHistory(filters, {
            page: parseInt(page),
            limit: parseInt(limit)
        });

        return res.status(200).json({
            success: true,
            message: 'ดึงประวัติการจองสำเร็จ',
            data: result.bookings,
            pagination: {
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: result.totalPages
            }
        });

    } catch (error) {
        console.error('Error in getBookings:', error);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
        });
    }
};

/**
 * GET /api/bookings/active
 * ดึงการจองที่ยังไม่คืน
 */
export const getActiveBookings = async (req, res) => {
    try {
        const bookings = await bookingService.getActiveBookings();

        return res.status(200).json({
            success: true,
            message: 'ดึงการจองที่ยังไม่คืนสำเร็จ',
            data: bookings,
            count: bookings.length
        });

    } catch (error) {
        console.error('Error in getActiveBookings:', error);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
        });
    }
};

/**
 * GET /api/bookings/overdue
 * ดึงการจองที่เลยกำหนดคืน
 */
export const getOverdueBookings = async (req, res) => {
    try {
        const bookings = await bookingService.getOverdueBookings();

        return res.status(200).json({
            success: true,
            message: 'ดึงการจองที่เลยกำหนดคืนสำเร็จ',
            data: bookings,
            count: bookings.length
        });

    } catch (error) {
        console.error('Error in getOverdueBookings:', error);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
        });
    }
};

/**
 * GET /api/bookings/:id
 * ดึงรายละเอียดการจอง
 */
export const getBookingById = async (req, res) => {
    try {
        const { id } = req.params;

        const booking = await bookingService.getBookingById(id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบการจอง'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'ดึงรายละเอียดการจองสำเร็จ',
            data: booking
        });

    } catch (error) {
        console.error('Error in getBookingById:', error);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
        });
    }
};

/**
 * GET /api/bookings/stats
 * ดึงสถิติการจอง
 * Query: { startDate?, endDate? }
 */
export const getBookingStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        const stats = await bookingService.getBookingStats(start, end);

        return res.status(200).json({
            success: true,
            message: 'ดึงสถิติการจองสำเร็จ',
            data: stats
        });

    } catch (error) {
        console.error('Error in getBookingStats:', error);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
        });
    }
};

/**
 * GET /api/bookings/stats/daily
 * ดึงสถิติการจองประจำวัน
 * Query: { date? }
 */
export const getDailyStats = async (req, res) => {
    try {
        const { date } = req.query;

        const targetDate = date ? new Date(date) : new Date();
        const stats = await bookingService.getDailyStats(targetDate);

        return res.status(200).json({
            success: true,
            message: 'ดึงสถิติประจำวันสำเร็จ',
            data: stats,
            date: targetDate.toISOString().split('T')[0]
        });

    } catch (error) {
        console.error('Error in getDailyStats:', error);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
        });
    }
};

/**
 * GET /api/bookings/stats/weekly
 * ดึงสถิติการจองประจำสัปดาห์
 */
export const getWeeklyStats = async (req, res) => {
    try {
        const stats = await bookingService.getWeeklyStats();

        return res.status(200).json({
            success: true,
            message: 'ดึงสถิติประจำสัปดาห์สำเร็จ',
            data: stats
        });

    } catch (error) {
        console.error('Error in getWeeklyStats:', error);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
        });
    }
};

/**
 * GET /api/bookings/stats/monthly
 * ดึงสถิติการจองประจำเดือน
 * Query: { month?, year? }
 */
export const getMonthlyStats = async (req, res) => {
    try {
        const now = new Date();
        const { month = now.getMonth() + 1, year = now.getFullYear() } = req.query;

        const stats = await bookingService.getMonthlyStats(parseInt(month), parseInt(year));

        return res.status(200).json({
            success: true,
            message: 'ดึงสถิติประจำเดือนสำเร็จ',
            data: stats,
            month: parseInt(month),
            year: parseInt(year)
        });

    } catch (error) {
        console.error('Error in getMonthlyStats:', error);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
        });
    }
};
/**
 * POST /api/bookings/generate
 * สร้าง Bookings รายวันจาก Schedule
 * Body: { date }
 */
export const generateDailyBookings = async (req, res) => {
    try {
        const { date } = req.body;
        if (!date) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาระบุวันที่'
            });
        }

        const targetDate = new Date(date);
        const result = await bookingService.generateDailyBookings(targetDate);

        return res.status(200).json({
            success: true,
            message: `สร้างรายการจองสำเร็จ ${result.count} รายการ`,
            data: result.bookings
        });

    } catch (error) {
        console.error('Error in generateDailyBookings:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการสร้างรายการจอง'
        });
    }
};
