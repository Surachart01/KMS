import prisma from './index.js';

/**
 * Schedule Repository - Data access layer สำหรับ Schedule
 */

/**
 * หาตารางสอนในห้องและเวลาที่ระบุ
 * @param {string} roomCode - รหัสห้อง
 * @param {number} dayOfWeek - วันในสัปดาห์ (1-7, Mon-Sun)
 * @param {Date} time - เวลาที่ต้องการตรวจสอบ
 * @returns {Promise<Schedule|null>}
 */
export const findScheduleForTime = async (roomCode, dayOfWeek, time) => {
    // แปลงเป็น time-only เพื่อเปรียบเทียบ
    const timeOnly = new Date(time);

    const schedules = await prisma.schedule.findMany({
        where: {
            roomCode,
            dayOfWeek
        },
        include: {
            subject: true,
            teacher: true
        }
    });

    // เปรียบเทียบเวลา (startTime และ endTime เก็บเป็น DateTime แต่เราเปรียบเทียบเฉพาะ time)
    for (const schedule of schedules) {
        const startHour = schedule.startTime.getHours();
        const startMin = schedule.startTime.getMinutes();
        const endHour = schedule.endTime.getHours();
        const endMin = schedule.endTime.getMinutes();

        const currentHour = timeOnly.getHours();
        const currentMin = timeOnly.getMinutes();

        const currentMins = currentHour * 60 + currentMin;
        const startMins = startHour * 60 + startMin;
        const endMins = endHour * 60 + endMin;

        if (currentMins >= startMins && currentMins < endMins) {
            return schedule;
        }
    }

    return null;
};

/**
 * หาตารางสอนของอาจารย์
 * @param {string} teacherId - Teacher ID
 * @returns {Promise<Schedule[]>}
 */
export const findByTeacher = async (teacherId) => {
    return prisma.schedule.findMany({
        where: { teacherId },
        include: {
            subject: true,
            teacher: true
        },
        orderBy: [
            { dayOfWeek: 'asc' },
            { startTime: 'asc' }
        ]
    });
};

/**
 * หาตารางสอนของห้อง
 * @param {string} roomCode - รหัสห้อง
 * @returns {Promise<Schedule[]>}
 */
export const findByRoom = async (roomCode) => {
    return prisma.schedule.findMany({
        where: { roomCode },
        include: {
            subject: true,
            teacher: true
        },
        orderBy: [
            { dayOfWeek: 'asc' },
            { startTime: 'asc' }
        ]
    });
};

/**
 * หาตารางสอนของกลุ่มเรียน
 * @param {string} section - กลุ่มเรียน
 * @returns {Promise<Schedule[]>}
 */
export const findBySection = async (section) => {
    return prisma.schedule.findMany({
        where: { section },
        include: {
            subject: true,
            teacher: true
        },
        orderBy: [
            { dayOfWeek: 'asc' },
            { startTime: 'asc' }
        ]
    });
};

/**
 * หาตารางสอนจาก ID
 * @param {string} id - Schedule ID
 * @returns {Promise<Schedule|null>}
 */
export const findById = async (id) => {
    return prisma.schedule.findUnique({
        where: { id },
        include: {
            subject: true,
            teacher: true,
            students: true
        }
    });
};

/**
 * ดึงรายการตารางสอนทั้งหมดพร้อม filter
 * @param {object} filters - { roomCode, teacherId, section, dayOfWeek, subjectId }
 * @returns {Promise<Schedule[]>}
 */
export const getAllSchedules = async (filters = {}) => {
    const where = {};

    if (filters.roomCode) {
        where.roomCode = filters.roomCode;
    }
    if (filters.teacherId) {
        where.teacherId = filters.teacherId;
    }
    if (filters.section) {
        where.section = filters.section;
    }
    if (filters.dayOfWeek) {
        where.dayOfWeek = parseInt(filters.dayOfWeek);
    }
    if (filters.subjectId) {
        where.subjectId = filters.subjectId;
    }

    return prisma.schedule.findMany({
        where,
        include: {
            subject: true,
            teacher: true,
            students: true
        },
        orderBy: [
            { dayOfWeek: 'asc' },
            { startTime: 'asc' }
        ]
    });
};

/**
 * สร้างตารางสอนใหม่
 * @param {object} data - ข้อมูลตารางสอน
 * @returns {Promise<Schedule>}
 */
export const createSchedule = async (data) => {
    return prisma.schedule.create({
        data,
        include: {
            subject: true,
            teacher: true,
            students: true
        }
    });
};

/**
 * อัพเดตตารางสอน
 * @param {string} id - Schedule ID
 * @param {object} data - ข้อมูลที่อัพเดต
 * @returns {Promise<Schedule>}
 */
export const updateSchedule = async (id, data) => {
    return prisma.schedule.update({
        where: { id },
        data,
        include: {
            subject: true,
            teacher: true,
            students: true
        }
    });
};

/**
 * ลบตารางสอน
 * @param {string} id - Schedule ID
 * @returns {Promise<Schedule>}
 */
export const deleteSchedule = async (id) => {
    return prisma.schedule.delete({
        where: { id }
    });
};

/**
 * สลับห้องเรียนระหว่าง 2 ตารางสอน
 * @param {string} scheduleId1 - Schedule ID 1
 * @param {string} scheduleId2 - Schedule ID 2
 * @returns {Promise<{ schedule1: Schedule, schedule2: Schedule }>}
 */
export const swapRooms = async (scheduleId1, scheduleId2) => {
    return prisma.$transaction(async (tx) => {
        const [s1, s2] = await Promise.all([
            tx.schedule.findUnique({ where: { id: scheduleId1 } }),
            tx.schedule.findUnique({ where: { id: scheduleId2 } })
        ]);

        if (!s1 || !s2) {
            throw new Error('ไม่พบตารางสอนที่ระบุ');
        }

        const [schedule1, schedule2] = await Promise.all([
            tx.schedule.update({
                where: { id: scheduleId1 },
                data: { roomCode: s2.roomCode },
                include: { subject: true, teacher: true }
            }),
            tx.schedule.update({
                where: { id: scheduleId2 },
                data: { roomCode: s1.roomCode },
                include: { subject: true, teacher: true }
            })
        ]);

        return { schedule1, schedule2 };
    });
};

/**
 * ย้ายห้องเรียน
 * @param {string} scheduleId - Schedule ID
 * @param {string} newRoomCode - รหัสห้องใหม่
 * @returns {Promise<Schedule>}
 */
export const moveToRoom = async (scheduleId, newRoomCode) => {
    return prisma.schedule.update({
        where: { id: scheduleId },
        data: { roomCode: newRoomCode },
        include: {
            subject: true,
            teacher: true
        }
    });
};

/**
 * ตรวจสอบว่าห้องว่างในช่วงเวลาที่ระบุหรือไม่
 * @param {string} roomCode - รหัสห้อง
 * @param {number} dayOfWeek - วันในสัปดาห์
 * @param {Date} startTime - เวลาเริ่ม
 * @param {Date} endTime - เวลาสิ้นสุด
 * @param {string} excludeId - Schedule ID ที่ต้องการยกเว้น (สำหรับ update)
 * @returns {Promise<boolean>}
 */
export const isRoomAvailable = async (roomCode, dayOfWeek, startTime, endTime, excludeId = null) => {
    const schedules = await prisma.schedule.findMany({
        where: {
            roomCode,
            dayOfWeek,
            id: excludeId ? { not: excludeId } : undefined
        }
    });

    const newStartMins = startTime.getHours() * 60 + startTime.getMinutes();
    const newEndMins = endTime.getHours() * 60 + endTime.getMinutes();

    for (const schedule of schedules) {
        const existStartMins = schedule.startTime.getHours() * 60 + schedule.startTime.getMinutes();
        const existEndMins = schedule.endTime.getHours() * 60 + schedule.endTime.getMinutes();

        // ตรวจสอบการซ้อนทับ
        if (newStartMins < existEndMins && newEndMins > existStartMins) {
            return false;
        }
    }

    return true;
};
