import * as userRepository from '../repositories/userRepository.js';
import * as penaltyLogRepository from '../repositories/penaltyLogRepository.js';
import * as bookingRepository from '../repositories/bookingRepository.js';
import prisma from '../repositories/index.js';

/**
 * User Service - Business logic สำหรับจัดการผู้ใช้
 */

/**
 * ดึงรายการผู้ใช้ทั้งหมดพร้อม filter และ pagination
 * @param {object} filters - { role, isBanned, search }
 * @param {object} pagination - { page, limit }
 * @returns {Promise<{ users: User[], total: number, page: number, totalPages: number }>}
 */
export const getUsers = async (filters = {}, pagination = { page: 1, limit: 20 }) => {
    const result = await userRepository.getAllUsers(filters, pagination);

    const totalPages = Math.ceil(result.total / pagination.limit);

    return {
        users: result.users,
        total: result.total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages
    };
};

/**
 * ดึงข้อมูลผู้ใช้ตาม ID
 * @param {string} id - User ID
 * @returns {Promise<User|null>}
 */
export const getUserById = async (id) => {
    return userRepository.findById(id);
};

/**
 * ดึงข้อมูลผู้ใช้ตามรหัสนักศึกษา
 * @param {string} studentCode - รหัสนักศึกษา
 * @returns {Promise<User|null>}
 */
export const getUserByStudentCode = async (studentCode) => {
    return userRepository.findByStudentCode(studentCode);
};

/**
 * สร้างผู้ใช้ใหม่
 * @param {object} data - { studentCode, firstName, lastName, role }
 * @returns {Promise<{ success: boolean, user?: User, error?: string }>}
 */
export const createUser = async (data) => {
    try {
        // ตรวจสอบว่า studentCode ซ้ำหรือไม่
        const existing = await userRepository.findByStudentCode(data.studentCode);
        if (existing) {
            return {
                success: false,
                error: `รหัส ${data.studentCode} มีในระบบแล้ว`
            };
        }

        const user = await userRepository.createUser({
            studentCode: data.studentCode,
            firstName: data.firstName,
            lastName: data.lastName,
            role: data.role || 'STUDENT',
            score: 100,
            isBanned: false
        });

        return { success: true, user };

    } catch (error) {
        console.error('Error in createUser:', error);
        return {
            success: false,
            error: error.message || 'เกิดข้อผิดพลาดในการสร้างผู้ใช้'
        };
    }
};

/**
 * อัพเดตข้อมูลผู้ใช้
 * @param {string} id - User ID
 * @param {object} data - ข้อมูลที่อัพเดต
 * @returns {Promise<{ success: boolean, user?: User, error?: string }>}
 */
export const updateUser = async (id, data) => {
    try {
        // ตรวจสอบว่ามีผู้ใช้หรือไม่
        const existing = await userRepository.findById(id);
        if (!existing) {
            return { success: false, error: 'ไม่พบผู้ใช้' };
        }

        // ถ้าเปลี่ยน studentCode ตรวจสอบว่าซ้ำหรือไม่
        if (data.studentCode && data.studentCode !== existing.studentCode) {
            const duplicate = await userRepository.findByStudentCode(data.studentCode);
            if (duplicate) {
                return {
                    success: false,
                    error: `รหัส ${data.studentCode} มีในระบบแล้ว`
                };
            }
        }

        const user = await userRepository.updateUser(id, data);

        return { success: true, user };

    } catch (error) {
        console.error('Error in updateUser:', error);
        return {
            success: false,
            error: error.message || 'เกิดข้อผิดพลาดในการแก้ไขผู้ใช้'
        };
    }
};

/**
 * ลบผู้ใช้
 * @param {string} id - User ID
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export const deleteUser = async (id) => {
    try {
        // ตรวจสอบว่ามี active booking หรือไม่
        const activeBooking = await bookingRepository.findActiveBookingByUser(id);
        if (activeBooking) {
            return {
                success: false,
                error: 'ไม่สามารถลบผู้ใช้ที่กำลังยืมกุญแจอยู่'
            };
        }

        await userRepository.deleteUser(id);
        return { success: true };

    } catch (error) {
        console.error('Error in deleteUser:', error);
        return {
            success: false,
            error: error.message || 'เกิดข้อผิดพลาดในการลบผู้ใช้'
        };
    }
};

/**
 * รีเซ็ตคะแนนผู้ใช้
 * @param {string} userId - User ID
 * @param {number} score - คะแนนใหม่ (default 100)
 * @returns {Promise<{ success: boolean, user?: User, error?: string }>}
 */
export const resetUserScore = async (userId, score = 100) => {
    try {
        const user = await userRepository.resetScore(userId, score);
        return { success: true, user };
    } catch (error) {
        console.error('Error in resetUserScore:', error);
        return {
            success: false,
            error: error.message || 'เกิดข้อผิดพลาดในการรีเซ็ตคะแนน'
        };
    }
};

/**
 * Ban ผู้ใช้
 * @param {string} userId - User ID
 * @param {string} reason - เหตุผล
 * @returns {Promise<{ success: boolean, user?: User, error?: string }>}
 */
export const banUser = async (userId, reason) => {
    try {
        const user = await userRepository.banUser(userId);

        // บันทึก log (ถ้าต้องการ)
        await prisma.systemLog.create({
            data: {
                userId,
                action: 'USER_BANNED',
                details: JSON.stringify({ reason })
            }
        });

        return { success: true, user };
    } catch (error) {
        console.error('Error in banUser:', error);
        return {
            success: false,
            error: error.message || 'เกิดข้อผิดพลาดในการ ban ผู้ใช้'
        };
    }
};

/**
 * Unban ผู้ใช้
 * @param {string} userId - User ID
 * @returns {Promise<{ success: boolean, user?: User, error?: string }>}
 */
export const unbanUser = async (userId) => {
    try {
        const user = await userRepository.unbanUser(userId);

        // บันทึก log
        await prisma.systemLog.create({
            data: {
                userId,
                action: 'USER_UNBANNED',
                details: null
            }
        });

        return { success: true, user };
    } catch (error) {
        console.error('Error in unbanUser:', error);
        return {
            success: false,
            error: error.message || 'เกิดข้อผิดพลาดในการ unban ผู้ใช้'
        };
    }
};

/**
 * ดึงประวัติ penalty ของผู้ใช้
 * @param {string} userId - User ID
 * @returns {Promise<PenaltyLog[]>}
 */
export const getUserPenaltyHistory = async (userId) => {
    return penaltyLogRepository.findByUser(userId);
};

/**
 * ดึงข้อมูลผู้ใช้พร้อมสถิติ
 * @param {string} userId - User ID
 * @returns {Promise<object>}
 */
export const getUserWithStats = async (userId) => {
    const user = await userRepository.findById(userId);

    if (!user) {
        return null;
    }

    // ดึงสถิติ
    const [bookingStats, penaltyLogs] = await Promise.all([
        bookingRepository.getBookingHistory({ userId }, { page: 1, limit: 1000 }),
        penaltyLogRepository.findByUser(userId)
    ]);

    const totalBookings = bookingStats.total;
    const lateBookings = bookingStats.bookings.filter(b => b.status === 'LATE').length;
    const totalPenalty = penaltyLogs.reduce((sum, log) => sum + log.scoreCut, 0);

    return {
        ...user,
        stats: {
            totalBookings,
            lateBookings,
            onTimeRate: totalBookings > 0 ? ((totalBookings - lateBookings) / totalBookings * 100).toFixed(1) : 100,
            totalPenalty,
            penaltyCount: penaltyLogs.length
        }
    };
};

/**
 * ดึงรายการผู้ใช้ที่ถูก ban
 * @returns {Promise<User[]>}
 */
export const getBannedUsers = async () => {
    const result = await userRepository.getAllUsers({ isBanned: true }, { page: 1, limit: 1000 });
    return result.users;
};
