import * as bookingRepository from '../repositories/bookingRepository.js';
import prisma from '../repositories/index.js'; // Import prisma for direct access in complex logic

/**
 * Booking Service - Business logic สำหรับจัดการ Booking
 */

/**
 * ดึงประวัติการจองพร้อม filter และ pagination
 * @param {object} filters - { status, userId, roomCode, startDate, endDate, search }
 * @param {object} pagination - { page, limit }
 * @returns {Promise<{ bookings: Booking[], total: number, page: number, totalPages: number }>}
 */
export const getBookingHistory = async (filters = {}, pagination = { page: 1, limit: 20 }) => {
    const result = await bookingRepository.getBookingHistory(filters, pagination);

    const totalPages = Math.ceil(result.total / pagination.limit);

    return {
        bookings: result.bookings,
        total: result.total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages
    };
};

/**
 * ดึงการจองที่ยังไม่คืน (active bookings)
 * @returns {Promise<Booking[]>}
 */
export const getActiveBookings = async () => {
    return bookingRepository.getActiveBookings();
};

/**
 * ดึงการจองที่เลยกำหนดคืน (overdue)
 * @returns {Promise<Booking[]>}
 */
export const getOverdueBookings = async () => {
    return bookingRepository.getOverdueBookings();
};

/**
 * ดึงรายละเอียดการจอง
 * @param {string} id - Booking ID
 * @returns {Promise<Booking|null>}
 */
export const getBookingById = async (id) => {
    return bookingRepository.findById(id);
};

/**
 * ดึงสถิติการจอง
 * @param {Date} startDate - เริ่มต้น
 * @param {Date} endDate - สิ้นสุด
 * @returns {Promise<object>}
 */
export const getBookingStats = async (startDate, endDate) => {
    return bookingRepository.getBookingStats(startDate, endDate);
};

/**
 * ดึงสถิติการจองประจำวัน
 * @param {Date} date - วันที่ต้องการ (default: วันนี้)
 * @returns {Promise<object>}
 */
export const getDailyStats = async (date = new Date()) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return bookingRepository.getBookingStats(startOfDay, endOfDay);
};

/**
 * ดึงสถิติการจองประจำสัปดาห์
 * @returns {Promise<object>}
 */
export const getWeeklyStats = async () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
    endOfWeek.setHours(23, 59, 59, 999);

    return bookingRepository.getBookingStats(startOfWeek, endOfWeek);
};

/**
 * ดึงสถิติการจองประจำเดือน
 * @param {number} month - เดือน (1-12)
 * @param {number} year - ปี
 * @returns {Promise<object>}
 */
export const getMonthlyStats = async (month, year) => {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    return bookingRepository.getBookingStats(startOfMonth, endOfMonth);
};
/**
 * สร้าง Bookings รายวันจาก Schedule
 * @param {Date} date - วันที่ต้องการ
 * @returns {Promise<{ count: number, bookings: Booking[] }>}
 */
/**
 * สร้าง Bookings รายวันจาก Schedule
 * @param {Date} date - วันที่ต้องการ
 * @returns {Promise<{ count: number, bookings: Booking[] }>}
 */
export const generateDailyBookings = async (date) => {
    // 1. Determine day of week (0-6)
    const dayOfWeek = date.getDay();
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

    // 2. Fetch active schedules for this day
    const schedules = await prisma.schedule.findMany({
        where: {
            dayOfWeek: dayOfWeek
        },
        include: {
            subject: true,
            teacher: true
        }
    });

    let count = 0;
    const createdBookings = [];

    // 3. Loop and create bookings
    for (const schedule of schedules) {
        // 3.1 Find Key for the room
        const key = await prisma.key.findFirst({
            where: {
                roomCode: schedule.roomCode,
                isActive: true
            }
        });

        if (!key) {
            console.warn(`Skipping schedule ${schedule.id}: No active key found for room ${schedule.roomCode}`);
            continue;
        }

        // 3.2 Calculate times
        // schedule.startTime is a Date object on 1970-01-01 (or some base date), we just want the time
        const startDateTime = new Date(dateStr);
        startDateTime.setHours(schedule.startTime.getHours(), schedule.startTime.getMinutes(), 0, 0);

        const endDateTime = new Date(dateStr);
        endDateTime.setHours(schedule.endTime.getHours(), schedule.endTime.getMinutes(), 0, 0);

        // 3.3 Check existing booking to prevent duplicates
        // Check if there is a booking for this user, room, and time range
        const existingBooking = await prisma.booking.findFirst({
            where: {
                keyId: key.id,
                // Overlap check
                borrowAt: {
                    lt: endDateTime
                },
                dueAt: {
                    gt: startDateTime
                },
                status: {
                    not: 'RETURNED' // Ignore returned, but maybe we should block duplicate reserves?
                    // Let's assume if there is ANY overlap that is not returned, we skip.
                    // Actually, if it's RESERVED, we skip.
                }
            }
        });

        if (existingBooking) {
            // console.log(`Skipping schedule ${schedule.id}: Booking exists`);
            continue;
        }

        // 3.4 Create Booking
        const newBooking = await prisma.booking.create({
            data: {
                userId: schedule.teacherId,
                keyId: key.id,
                subjectId: schedule.subjectId,
                borrowAt: startDateTime,
                dueAt: endDateTime,
                status: 'RESERVED', // New status
                returnAt: null
            }
        });

        createdBookings.push(newBooking);
        count++;
    }

    return { count, bookings: createdBookings };
};
// Replaced by actual implementation in next step after viewing repository
