import prisma from './index.js';

/**
 * User Repository - Data access layer สำหรับ User
 */

/**
 * หาผู้ใช้จากรหัสนักศึกษา/บุคลากร
 * @param {string} studentCode - รหัสนักศึกษาหรือบุคลากร
 * @returns {Promise<User|null>}
 */
export const findByStudentCode = async (studentCode) => {
    return prisma.user.findUnique({
        where: { studentCode }
    });
};

/**
 * หาผู้ใช้จาก ID
 * @param {string} id - User ID (UUID)
 * @returns {Promise<User|null>}
 */
export const findById = async (id) => {
    return prisma.user.findUnique({
        where: { id }
    });
};

/**
 * หาผู้ใช้พร้อม relations
 * @param {string} id - User ID
 * @param {object} include - Prisma include object
 * @returns {Promise<User|null>}
 */
export const findByIdWithRelations = async (id, include = {}) => {
    return prisma.user.findUnique({
        where: { id },
        include
    });
};

/**
 * อัพเดตคะแนนและสถานะแบนของผู้ใช้
 * @param {string} userId - User ID
 * @param {number} newScore - คะแนนใหม่
 * @param {boolean} isBanned - สถานะแบน
 * @returns {Promise<User>}
 */
export const updateScore = async (userId, newScore, isBanned = false) => {
    return prisma.user.update({
        where: { id: userId },
        data: {
            score: newScore,
            isBanned
        }
    });
};

/**
 * ลดคะแนนผู้ใช้
 * @param {string} userId - User ID
 * @param {number} scoreCut - คะแนนที่ต้องหัก
 * @returns {Promise<User>}
 */
export const deductScore = async (userId, scoreCut) => {
    return prisma.user.update({
        where: { id: userId },
        data: {
            score: { decrement: scoreCut }
        }
    });
};

/**
 * ดึงรายการผู้ใช้ทั้งหมดพร้อม filter
 * @param {object} filters - { role, isBanned, search }
 * @param {object} pagination - { page, limit }
 * @returns {Promise<{ users: User[], total: number }>}
 */
export const getAllUsers = async (filters = {}, pagination = { page: 1, limit: 20 }) => {
    const where = {};

    if (filters.role) {
        where.role = filters.role;
    }

    if (typeof filters.isBanned === 'boolean') {
        where.isBanned = filters.isBanned;
    }

    if (filters.search) {
        where.OR = [
            { studentCode: { contains: filters.search, mode: 'insensitive' } },
            { firstName: { contains: filters.search, mode: 'insensitive' } },
            { lastName: { contains: filters.search, mode: 'insensitive' } }
        ];
    }

    const skip = (pagination.page - 1) * pagination.limit;

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            skip,
            take: pagination.limit,
            orderBy: { createdAt: 'desc' },
            include: {
                section: {
                    include: {
                        major: true
                    }
                }
            }
        }),
        prisma.user.count({ where })
    ]);

    return { users, total };
};

/**
 * สร้างผู้ใช้ใหม่
 * @param {object} data - ข้อมูลผู้ใช้
 * @returns {Promise<User>}
 */
export const createUser = async (data) => {
    return prisma.user.create({ data });
};

/**
 * อัพเดตข้อมูลผู้ใช้
 * @param {string} id - User ID
 * @param {object} data - ข้อมูลที่ต้องการอัพเดต
 * @returns {Promise<User>}
 */
export const updateUser = async (id, data) => {
    return prisma.user.update({
        where: { id },
        data
    });
};

/**
 * ลบผู้ใช้
 * @param {string} id - User ID
 * @returns {Promise<User>}
 */
export const deleteUser = async (id) => {
    return prisma.user.delete({
        where: { id }
    });
};

/**
 * Ban ผู้ใช้
 * @param {string} userId - User ID
 * @returns {Promise<User>}
 */
export const banUser = async (userId) => {
    return prisma.user.update({
        where: { id: userId },
        data: { isBanned: true }
    });
};

/**
 * Unban ผู้ใช้
 * @param {string} userId - User ID
 * @returns {Promise<User>}
 */
export const unbanUser = async (userId) => {
    return prisma.user.update({
        where: { id: userId },
        data: { isBanned: false }
    });
};

/**
 * รีเซ็ตคะแนนผู้ใช้
 * @param {string} userId - User ID
 * @param {number} score - คะแนนใหม่ (default 100)
 * @returns {Promise<User>}
 */
export const resetScore = async (userId, score = 100) => {
    return prisma.user.update({
        where: { id: userId },
        data: {
            score,
            isBanned: false
        }
    });
};
