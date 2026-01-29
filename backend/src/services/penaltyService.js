import * as penaltyConfigRepository from '../repositories/penaltyConfigRepository.js';
import * as penaltyLogRepository from '../repositories/penaltyLogRepository.js';
import * as userRepository from '../repositories/userRepository.js';

/**
 * Penalty Service - Business logic สำหรับคำนวณและจัดการ Penalty
 */

/**
 * คำนวณ penalty จากเวลาคืน
 * Formula:
 * 1. ถ้าคืนภายใน graceMinutes → ไม่ตัดคะแนน
 * 2. ถ้าสาย → ตัด scorePerInterval ทุก intervalMinutes
 * 
 * @param {Date} borrowAt - เวลาเบิก
 * @param {Date} dueAt - เวลาที่ต้องคืน
 * @param {Date} returnAt - เวลาที่คืนจริง
 * @returns {Promise<{ lateMinutes: number, penaltyScore: number, isLate: boolean }>}
 */
export const calculatePenalty = async (borrowAt, dueAt, returnAt) => {
    // ดึง config
    const config = await penaltyConfigRepository.getActiveConfig();

    // ถ้าไม่มี config ใช้ค่า default
    const graceMinutes = config?.graceMinutes || 30;
    const scorePerInterval = config?.scorePerInterval || 5;
    const intervalMinutes = config?.intervalMinutes || 15;
    const restoreDays = config?.restoreDays || 7;

    // คำนวณเวลาที่สาย (นาที)
    const dueTime = new Date(dueAt).getTime();
    const returnTime = new Date(returnAt).getTime();

    const diffMs = returnTime - dueTime;
    const lateMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));

    // ถ้าคืนทันเวลาหรือภายใน grace period
    if (lateMinutes <= graceMinutes) {
        return {
            lateMinutes: 0,
            penaltyScore: 0,
            isLate: false
        };
    }

    // คำนวณเวลาสายที่เกิน grace period
    const actualLateMinutes = lateMinutes - graceMinutes;

    // คำนวณจำนวน interval ที่สาย
    const intervals = Math.ceil(actualLateMinutes / intervalMinutes);

    // คำนวณคะแนนที่ต้องหัก
    const penaltyScore = intervals * scorePerInterval;

    return {
        lateMinutes: actualLateMinutes,
        penaltyScore,
        isLate: true
    };
};

/**
 * Apply penalty ให้ผู้ใช้ (อัพเดตคะแนนและบันทึก log)
 * @param {string} userId - User ID
 * @param {string} bookingId - Booking ID (optional)
 * @param {number} lateMinutes - นาทีที่สาย
 * @param {number} penaltyScore - คะแนนที่ต้องหัก
 * @param {string} reason - เหตุผล
 * @returns {Promise<{ user: object, penaltyLog: object, isBanned: boolean }>}
 */
export const applyPenalty = async (userId, bookingId, lateMinutes, penaltyScore, reason) => {
    // ดึงข้อมูลผู้ใช้
    const user = await userRepository.findById(userId);

    if (!user) {
        throw new Error('ไม่พบผู้ใช้');
    }

    // คำนวณคะแนนใหม่
    const newScore = Math.max(0, user.score - penaltyScore);
    const shouldBan = newScore <= 0;

    // อัพเดตคะแนน
    const updatedUser = await userRepository.updateScore(userId, newScore, shouldBan);

    // สร้าง Penalty Log
    const penaltyLog = await penaltyLogRepository.createLog({
        userId,
        bookingId,
        type: 'LATE_RETURN',
        scoreCut: penaltyScore,
        reason: reason || `คืนกุญแจช้า ${lateMinutes} นาที`
    });

    return {
        user: updatedUser,
        penaltyLog,
        isBanned: shouldBan,
        previousScore: user.score,
        newScore
    };
};

/**
 * เพิ่ม penalty แบบ manual โดย staff
 * @param {string} userId - User ID
 * @param {number} scoreCut - คะแนนที่ต้องหัก
 * @param {string} reason - เหตุผล
 * @returns {Promise<{ user: object, penaltyLog: object }>}
 */
export const manualPenalty = async (userId, scoreCut, reason) => {
    // ดึงข้อมูลผู้ใช้
    const user = await userRepository.findById(userId);

    if (!user) {
        throw new Error('ไม่พบผู้ใช้');
    }

    if (user.role !== 'STUDENT') {
        throw new Error('สามารถหักคะแนนได้เฉพาะนักศึกษาเท่านั้น');
    }

    // คำนวณคะแนนใหม่
    const newScore = Math.max(0, user.score - scoreCut);
    const shouldBan = newScore <= 0;

    // อัพเดตคะแนน
    const updatedUser = await userRepository.updateScore(userId, newScore, shouldBan);

    // สร้าง Penalty Log
    const penaltyLog = await penaltyLogRepository.createLog({
        userId,
        bookingId: null,
        type: 'MANUAL',
        scoreCut,
        reason
    });

    return {
        user: updatedUser,
        penaltyLog,
        isBanned: shouldBan,
        previousScore: user.score,
        newScore
    };
};

/**
 * ดึง config ที่ใช้งานอยู่
 * @returns {Promise<PenaltyConfig|null>}
 */
export const getActiveConfig = async () => {
    return penaltyConfigRepository.getActiveConfig();
};

/**
 * สร้าง config ใหม่
 * @param {object} data - { graceMinutes, scorePerInterval, intervalMinutes }
 * @returns {Promise<PenaltyConfig>}
 */
export const createConfig = async (data) => {
    return penaltyConfigRepository.createConfig(data);
};

/**
 * อัพเดต config
 * @param {string} id - Config ID
 * @param {object} data - ข้อมูลที่อัพเดต
 * @returns {Promise<PenaltyConfig>}
 */
export const updateConfig = async (id, data) => {
    return penaltyConfigRepository.updateConfig(id, data);
};

/**
 * ดึงประวัติ penalty ทั้งหมด
 * @param {object} filters - { userId, type, startDate, endDate }
 * @param {object} pagination - { page, limit }
 * @returns {Promise<{ logs: PenaltyLog[], total: number }>}
 */
export const getPenaltyLogs = async (filters, pagination) => {
    return penaltyLogRepository.getAllLogs(filters, pagination);
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
 * ดึงสถิติ penalty
 * @param {Date} startDate - เริ่มต้น
 * @param {Date} endDate - สิ้นสุด
 * @returns {Promise<object>}
 */
export const getPenaltyStats = async (startDate, endDate) => {
    return penaltyLogRepository.getPenaltyStats(startDate, endDate);
};
