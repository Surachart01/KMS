import prisma from './index.js';

/**
 * Key Repository - Data access layer สำหรับ Key
 */

/**
 * หากุญแจว่างในห้อง
 * @param {string} roomCode - รหัสห้อง
 * @returns {Promise<Key|null>}
 */
export const findAvailableKeyByRoom = async (roomCode) => {
    // หากุญแจที่ยังไม่ถูกเบิก (ไม่มี active booking)
    return prisma.key.findFirst({
        where: {
            roomCode,
            isActive: true,
            bookings: {
                none: {
                    status: 'BORROWED'
                }
            }
        }
    });
};

/**
 * หากุญแจจากหมายเลขช่อง
 * @param {number} slotNumber - หมายเลขช่องในตู้
 * @returns {Promise<Key|null>}
 */
export const findBySlotNumber = async (slotNumber) => {
    return prisma.key.findFirst({
        where: { slotNumber }
    });
};

/**
 * หากุญแจจาก ID
 * @param {string} id - Key ID
 * @returns {Promise<Key|null>}
 */
export const findById = async (id) => {
    return prisma.key.findUnique({
        where: { id }
    });
};

/**
 * หากุญแจพร้อม active booking
 * @param {string} id - Key ID
 * @returns {Promise<Key|null>}
 */
export const findByIdWithActiveBooking = async (id) => {
    return prisma.key.findUnique({
        where: { id },
        include: {
            bookings: {
                where: { status: 'BORROWED' },
                take: 1,
                include: { user: true }
            }
        }
    });
};

/**
 * ดึงรายการกุญแจทั้งหมดพร้อม filter
 * @param {object} filters - { roomCode, isActive }
 * @returns {Promise<Key[]>}
 */
export const getAllKeys = async (filters = {}) => {
    const where = {};

    if (filters.roomCode) {
        where.roomCode = filters.roomCode;
    }

    if (typeof filters.isActive === 'boolean') {
        where.isActive = filters.isActive;
    }

    return prisma.key.findMany({
        where,
        include: {
            bookings: {
                where: { status: 'BORROWED' },
                take: 1,
                include: {
                    user: {
                        select: { id: true, studentCode: true, firstName: true, lastName: true }
                    }
                }
            }
        },
        orderBy: [
            { roomCode: 'asc' },
            { slotNumber: 'asc' }
        ]
    });
};

/**
 * ดึงรายการห้องที่มีกุญแจว่าง
 * @returns {Promise<{ roomCode: string, availableCount: number }[]>}
 */
export const getAvailableRooms = async () => {
    const rooms = await prisma.key.groupBy({
        by: ['roomCode'],
        where: {
            isActive: true,
            bookings: {
                none: {
                    status: 'BORROWED'
                }
            }
        },
        _count: {
            id: true
        }
    });

    return rooms.map(r => ({
        roomCode: r.roomCode,
        availableCount: r._count.id
    }));
};

/**
 * ดึงรายการห้องทั้งหมดพร้อมสถานะกุญแจ
 * @returns {Promise<{ roomCode: string, totalKeys: number, availableKeys: number }[]>}
 */
export const getRoomKeyStatus = async () => {
    const allKeys = await prisma.key.findMany({
        where: { isActive: true },
        include: {
            bookings: {
                where: { status: 'BORROWED' }
            }
        }
    });

    const roomMap = new Map();

    for (const key of allKeys) {
        if (!roomMap.has(key.roomCode)) {
            roomMap.set(key.roomCode, { total: 0, available: 0 });
        }
        const room = roomMap.get(key.roomCode);
        room.total++;
        if (key.bookings.length === 0) {
            room.available++;
        }
    }

    return Array.from(roomMap.entries()).map(([roomCode, data]) => ({
        roomCode,
        totalKeys: data.total,
        availableKeys: data.available
    }));
};

/**
 * สร้างกุญแจใหม่
 * @param {object} data - { roomCode, slotNumber }
 * @returns {Promise<Key>}
 */
export const createKey = async (data) => {
    return prisma.key.create({ data });
};

/**
 * อัพเดตกุญแจ
 * @param {string} id - Key ID
 * @param {object} data - ข้อมูลที่อัพเดต
 * @returns {Promise<Key>}
 */
export const updateKey = async (id, data) => {
    return prisma.key.update({
        where: { id },
        data
    });
};

/**
 * ลบกุญแจ
 * @param {string} id - Key ID
 * @returns {Promise<Key>}
 */
export const deleteKey = async (id) => {
    return prisma.key.delete({
        where: { id }
    });
};
