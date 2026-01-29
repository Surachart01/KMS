import prisma from './index.js';

/**
 * PenaltyConfig Repository - Data access layer สำหรับ PenaltyConfig
 */

/**
 * ดึง config ที่ใช้งานอยู่
 * @returns {Promise<PenaltyConfig|null>}
 */
export const getActiveConfig = async () => {
    return prisma.penaltyConfig.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
    });
};

/**
 * ดึง config ทั้งหมด
 * @returns {Promise<PenaltyConfig[]>}
 */
export const getAllConfigs = async () => {
    return prisma.penaltyConfig.findMany({
        orderBy: { createdAt: 'desc' }
    });
};

/**
 * สร้าง config ใหม่
 * @param {object} data - { graceMinutes, scorePerInterval, intervalMinutes }
 * @returns {Promise<PenaltyConfig>}
 */
export const createConfig = async (data) => {
    // ปิด config เก่าทั้งหมดก่อน
    await prisma.penaltyConfig.updateMany({
        where: { isActive: true },
        data: { isActive: false }
    });

    return prisma.penaltyConfig.create({
        data: {
            ...data,
            isActive: true
        }
    });
};

/**
 * อัพเดต config
 * @param {string} id - Config ID
 * @param {object} data - ข้อมูลที่อัพเดต
 * @returns {Promise<PenaltyConfig>}
 */
export const updateConfig = async (id, data) => {
    return prisma.penaltyConfig.update({
        where: { id },
        data
    });
};

/**
 * ตั้ง config เป็น active
 * @param {string} id - Config ID
 * @returns {Promise<PenaltyConfig>}
 */
export const setActiveConfig = async (id) => {
    // ปิด config อื่นทั้งหมด
    await prisma.penaltyConfig.updateMany({
        where: { isActive: true },
        data: { isActive: false }
    });

    return prisma.penaltyConfig.update({
        where: { id },
        data: { isActive: true }
    });
};
