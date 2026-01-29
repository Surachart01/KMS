import * as scheduleRepository from '../repositories/scheduleRepository.js';
import * as userRepository from '../repositories/userRepository.js';
import prisma from '../repositories/index.js';

/**
 * Schedule Service - Business logic สำหรับจัดการตารางสอน
 */

/**
 * ตรวจสอบสิทธิ์ตามตารางสอน
 * - ถ้ามีตารางสอน → ตรวจสอบว่านักศึกษาอยู่ใน section หรือไม่
 * - ถ้าไม่มีตารางสอน → อนุญาตให้เบิกได้
 * 
 * @param {string} studentCode - รหัสนักศึกษา
 * @param {string} roomCode - รหัสห้อง
 * @param {Date} currentTime - เวลาปัจจุบัน
 * @returns {Promise<{ hasSchedule: boolean, isInSection: boolean, schedule: object|null, canBorrow: boolean }>}
 */
export const checkSchedulePermission = async (studentCode, roomCode, currentTime = new Date()) => {
    const now = currentTime;
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();

    // หาตารางสอนในห้องและเวลานี้
    const schedule = await scheduleRepository.findScheduleForTime(roomCode, dayOfWeek, now);

    // ถ้าไม่มีตารางสอน → อนุญาตให้เบิกได้
    if (!schedule) {
        return {
            hasSchedule: false,
            isInSection: false,
            schedule: null,
            canBorrow: true,
            message: 'ไม่มีตารางสอนในเวลานี้ สามารถเบิกกุญแจได้'
        };
    }

    // มีตารางสอน - รวบรวมข้อมูล
    const scheduleInfo = {
        id: schedule.id,
        subjectCode: schedule.subject?.code,
        subjectName: schedule.subject?.name,
        section: schedule.section,
        teacherId: schedule.teacherId,
        teacherName: schedule.teacher ? `${schedule.teacher.firstName} ${schedule.teacher.lastName}` : null,
        startTime: schedule.startTime,
        endTime: schedule.endTime
    };

    // ตรวจสอบว่านักศึกษาอยู่ใน section หรือไม่
    // (ในที่นี้เราไม่มีข้อมูล section ของนักศึกษาโดยตรง อาจต้องเพิ่มตารางในอนาคต)
    // ตอนนี้อนุญาตให้เบิกได้ถ้าห้องมีตารางสอน

    return {
        hasSchedule: true,
        isInSection: true, // TODO: ตรวจสอบ section ของนักศึกษาจริงๆ
        schedule: scheduleInfo,
        canBorrow: true,
        message: `มีคาบเรียนวิชา ${schedule.subject?.name || 'ไม่ระบุ'}`
    };
};

/**
 * สลับห้องเรียนระหว่าง 2 ตารางสอน
 * @param {string} scheduleId1 - Schedule ID ที่ 1
 * @param {string} scheduleId2 - Schedule ID ที่ 2
 * @returns {Promise<{ success: boolean, schedule1?: object, schedule2?: object, error?: string }>}
 */
export const swapRooms = async (scheduleId1, scheduleId2) => {
    try {
        // ตรวจสอบว่าทั้ง 2 ตารางมีอยู่จริง
        const [s1, s2] = await Promise.all([
            scheduleRepository.findById(scheduleId1),
            scheduleRepository.findById(scheduleId2)
        ]);

        if (!s1) {
            return { success: false, error: `ไม่พบตารางสอน ID: ${scheduleId1}` };
        }
        if (!s2) {
            return { success: false, error: `ไม่พบตารางสอน ID: ${scheduleId2}` };
        }

        // ตรวจสอบว่าอยู่ในวันเดียวกันและเวลาเดียวกัน (optional validation)
        if (s1.dayOfWeek !== s2.dayOfWeek) {
            return {
                success: false,
                error: 'ไม่สามารถสลับห้องระหว่างคาบที่อยู่คนละวันได้'
            };
        }

        // ทำการสลับ
        const result = await scheduleRepository.swapRooms(scheduleId1, scheduleId2);

        return {
            success: true,
            schedule1: result.schedule1,
            schedule2: result.schedule2,
            message: `สลับห้องเรียนสำเร็จ: ${result.schedule1.roomCode} ↔ ${result.schedule2.roomCode}`
        };

    } catch (error) {
        console.error('Error in swapRooms:', error);
        return {
            success: false,
            error: error.message || 'เกิดข้อผิดพลาดในการสลับห้องเรียน'
        };
    }
};

/**
 * ย้ายห้องเรียน
 * @param {string} scheduleId - Schedule ID
 * @param {string} newRoomCode - รหัสห้องใหม่
 * @returns {Promise<{ success: boolean, schedule?: object, error?: string }>}
 */
export const moveScheduleToRoom = async (scheduleId, newRoomCode) => {
    try {
        // ตรวจสอบว่าตารางมีอยู่จริง
        const schedule = await scheduleRepository.findById(scheduleId);

        if (!schedule) {
            return { success: false, error: `ไม่พบตารางสอน ID: ${scheduleId}` };
        }

        // ตรวจสอบว่าห้องใหม่ว่างหรือไม่ในช่วงเวลานั้น
        const isAvailable = await scheduleRepository.isRoomAvailable(
            newRoomCode,
            schedule.dayOfWeek,
            schedule.startTime,
            schedule.endTime,
            scheduleId
        );

        if (!isAvailable) {
            return {
                success: false,
                error: `ห้อง ${newRoomCode} ไม่ว่างในช่วงเวลานี้`
            };
        }

        // ทำการย้าย
        const updatedSchedule = await scheduleRepository.moveToRoom(scheduleId, newRoomCode);

        return {
            success: true,
            schedule: updatedSchedule,
            previousRoomCode: schedule.roomCode,
            message: `ย้ายห้องเรียนสำเร็จ: ${schedule.roomCode} → ${newRoomCode}`
        };

    } catch (error) {
        console.error('Error in moveScheduleToRoom:', error);
        return {
            success: false,
            error: error.message || 'เกิดข้อผิดพลาดในการย้ายห้องเรียน'
        };
    }
};

/**
 * ดึงตารางสอนจาก ID
 * @param {string} id - Schedule ID
 * @returns {Promise<object|null>}
 */
export const getScheduleById = async (id) => {
    return scheduleRepository.findById(id);
};

/**
 * ดึงตารางสอนของอาจารย์
 * @param {string} teacherId - Teacher ID
 * @returns {Promise<Schedule[]>}
 */
export const getSchedulesByTeacher = async (teacherId) => {
    return scheduleRepository.findByTeacher(teacherId);
};

/**
 * ดึงตารางสอนของห้อง
 * @param {string} roomCode - รหัสห้อง
 * @returns {Promise<Schedule[]>}
 */
export const getSchedulesByRoom = async (roomCode) => {
    return scheduleRepository.findByRoom(roomCode);
};

/**
 * ดึงตารางสอนของกลุ่มเรียน
 * @param {string} section - กลุ่มเรียน
 * @returns {Promise<Schedule[]>}
 */
export const getSchedulesBySection = async (section) => {
    return scheduleRepository.findBySection(section);
};

/**
 * ดึงตารางสอนทั้งหมดพร้อม filter
 * @param {object} filters - { roomCode, teacherId, section, dayOfWeek, subjectId }
 * @returns {Promise<Schedule[]>}
 */
export const getAllSchedules = async (filters = {}) => {
    return scheduleRepository.getAllSchedules(filters);
};

/**
 * สร้างตารางสอนใหม่
 * @param {object} data - ข้อมูลตารางสอน
 * @returns {Promise<{ success: boolean, schedule?: object, error?: string }>}
 */
export const createSchedule = async (data) => {
    try {
        // ตรวจสอบว่าห้องว่างหรือไม่
        const isAvailable = await scheduleRepository.isRoomAvailable(
            data.roomCode,
            data.dayOfWeek,
            new Date(data.startTime),
            new Date(data.endTime)
        );

        if (!isAvailable) {
            return {
                success: false,
                error: `ห้อง ${data.roomCode} ไม่ว่างในช่วงเวลานี้`
            };
        }

        const schedule = await scheduleRepository.createSchedule(data);

        return {
            success: true,
            schedule
        };

    } catch (error) {
        console.error('Error in createSchedule:', error);
        return {
            success: false,
            error: error.message || 'เกิดข้อผิดพลาดในการสร้างตารางสอน'
        };
    }
};

/**
 * อัพเดตตารางสอน
 * @param {string} id - Schedule ID
 * @param {object} data - ข้อมูลที่อัพเดต
 * @returns {Promise<{ success: boolean, schedule?: object, error?: string }>}
 */
export const updateSchedule = async (id, data) => {
    try {
        // ถ้าเปลี่ยนห้อง ตรวจสอบว่าห้องใหม่ว่างหรือไม่
        if (data.roomCode) {
            const existingSchedule = await scheduleRepository.findById(id);
            if (!existingSchedule) {
                return { success: false, error: 'ไม่พบตารางสอน' };
            }

            const isAvailable = await scheduleRepository.isRoomAvailable(
                data.roomCode,
                data.dayOfWeek || existingSchedule.dayOfWeek,
                new Date(data.startTime || existingSchedule.startTime),
                new Date(data.endTime || existingSchedule.endTime),
                id
            );

            if (!isAvailable) {
                return {
                    success: false,
                    error: `ห้อง ${data.roomCode} ไม่ว่างในช่วงเวลานี้`
                };
            }
        }

        // Handle students update if provided
        if (data.students && Array.isArray(data.students)) {
            const studentIds = [];
            for (const s of data.students) {
                if (!s.studentCode) continue;

                let user = await prisma.user.findUnique({ where: { studentCode: s.studentCode } });

                if (!user) {
                    let email = null;
                    const digits = s.studentCode.replace(/\D/g, '');
                    if (digits.length > 0) email = `s${digits}@email.kmutnb.ac.th`;

                    user = await prisma.user.create({
                        data: {
                            studentCode: s.studentCode,
                            email,
                            firstName: s.firstName || 'ไม่ระบุ',
                            lastName: s.lastName || '',
                            role: 'STUDENT'
                        }
                    });
                }
                studentIds.push(user.id);
            }

            // Transform to Prisma relation update (reset list)
            data.students = {
                set: studentIds.map(id => ({ id }))
            };
        }

        const schedule = await scheduleRepository.updateSchedule(id, data);

        return {
            success: true,
            schedule
        };

    } catch (error) {
        console.error('Error in updateSchedule:', error);
        return {
            success: false,
            error: error.message || 'เกิดข้อผิดพลาดในการแก้ไขตารางสอน'
        };
    }
};

/**
 * ลบตารางสอน
 * @param {string} id - Schedule ID
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export const deleteSchedule = async (id) => {
    try {
        await scheduleRepository.deleteSchedule(id);
        return { success: true };
    } catch (error) {
        console.error('Error in deleteSchedule:', error);
        // ... existing code ...
        return {
            success: false,
            error: error.message || 'เกิดข้อผิดพลาดในการลบตารางสอน'
        };
    }
};

/**
 * ลบตารางสอนทั้งหมด
 * @returns {Promise<{ success: boolean, message?: string, error?: string }>}
 */
export const deleteAllSchedules = async () => {
    try {
        await prisma.schedule.deleteMany({});
        return { success: true, message: "ลบตารางเรียนทั้งหมดสำเร็จ" };
    } catch (error) {
        console.error("Error deleting all schedules:", error);
        return { success: false, error: "เกิดข้อผิดพลาดในการลบข้อมูล" };
    }
};

/**
 * นำเข้าข้อมูลตารางเรียนจาก Excel (Batch)
 * @param {Array} schedules - Array of schedule objects
 * @returns {Promise<{ success: boolean, message: string, errors?: Array, error?: string }>}
 */
export const batchImportSchedules = async (schedules) => {
    try {
        if (!Array.isArray(schedules) || schedules.length === 0) {
            return { success: false, error: "ไม่มีข้อมูลนำเข้า" };
        }

        let successCount = 0;
        let failCount = 0;
        const errors = [];

        for (const item of schedules) {
            try {
                if (!item.subjectId || !item.roomCode || item.dayOfWeek === undefined) {
                    throw new Error("Missing required fields");
                }

                await prisma.schedule.create({
                    data: {
                        subjectId: item.subjectId,
                        roomCode: item.roomCode,
                        section: item.section || 'default',
                        teacherId: item.teacherId,
                        dayOfWeek: parseInt(item.dayOfWeek),
                        startTime: new Date(item.startTime),
                        endTime: new Date(item.endTime)
                    }
                });
                successCount++;
            } catch (err) {
                failCount++;
                errors.push({ item, error: err.message });
            }
        }

        return {
            success: true,
            message: `นำเข้าเสร็จสิ้น: สำเร็จ ${successCount}, ล้มเหลว ${failCount}`,
            errors: errors.length > 0 ? errors : undefined
        };
    } catch (error) {
        console.error("Error importing schedules:", error);
        return { success: false, error: "เกิดข้อผิดพลาดในการนำเข้าข้อมูล" };
    }
};

/**
 * นำเข้าข้อมูลจากไฟล์ repclasslist.xlsx
 * @param {object} data - Parsed data from frontend
 * @param {string} teacherId - Optional teacher ID override
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export const importRepclasslist = async (data, teacherId) => {
    try {
        if (!data) return { success: false, error: "ไม่พบข้อมูลนำเข้า" };

        const { subjectCode, subjectName, section, dayOfWeek, startTime, endTime, roomCode, students } = data;

        if (!subjectCode || !subjectName) {
            return { success: false, error: "ไม่พบรหัสวิชาหรือชื่อวิชา" };
        }

        // 1. สร้างหรือหารายวิชา
        let subject = await prisma.subject.upsert({
            where: { code: subjectCode },
            update: {},
            create: { code: subjectCode, name: subjectName }
        });

        // 2. หาหรือใช้ default teacher
        let teacher = null;
        if (teacherId) {
            teacher = await prisma.user.findUnique({ where: { id: teacherId } });
        }
        if (!teacher) {
            teacher = await prisma.user.findFirst({ where: { role: 'TEACHER' } });
        }
        if (!teacher) {
            teacher = await prisma.user.findFirst({ where: { role: 'STAFF' } });
        }
        if (!teacher) {
            return { success: false, error: "ไม่พบอาจารย์ในระบบ กรุณาเพิ่มอาจารย์ก่อน" };
        }

        // 3. Section Resolving
        let resolvedSectionId = null;
        let cleanSectionName = section || "default";

        if (section) {
            const parts = section.split(/\s+/);
            const mainPart = parts[0];
            cleanSectionName = mainPart;

            const majors = await prisma.major.findMany();
            let matchedMajor = null;
            for (const m of majors) {
                if (mainPart.startsWith(m.code + '-')) {
                    matchedMajor = m;
                    break;
                }
            }

            let sectionNameOnly = mainPart;
            if (matchedMajor) {
                sectionNameOnly = mainPart.substring(matchedMajor.code.length + 1);
            } else if (majors.length > 0) {
                matchedMajor = majors[0];
            }

            if (matchedMajor && sectionNameOnly) {
                let dbSection = await prisma.section.findFirst({
                    where: { name: sectionNameOnly, majorId: matchedMajor.id }
                });
                if (!dbSection) {
                    dbSection = await prisma.section.create({
                        data: { name: sectionNameOnly, majorId: matchedMajor.id }
                    });
                }
                resolvedSectionId = dbSection.id;
            }
        }

        // 4. Create Schedule
        let schedule = null;
        if (dayOfWeek !== undefined && startTime && endTime && roomCode) {
            const existing = await prisma.schedule.findFirst({
                where: {
                    subjectId: subject.id,
                    section: cleanSectionName,
                    dayOfWeek: parseInt(dayOfWeek),
                    roomCode: roomCode
                }
            });

            if (!existing) {
                schedule = await prisma.schedule.create({
                    data: {
                        subjectId: subject.id,
                        roomCode,
                        section: cleanSectionName,
                        teacherId: teacher.id,
                        dayOfWeek: parseInt(dayOfWeek),
                        startTime: new Date(startTime),
                        endTime: new Date(endTime)
                    }
                });
            } else {
                schedule = existing;
            }
        }

        // 5. Create/Update Students and link
        let createdStudents = 0;
        let existingStudents = 0;
        const studentIds = [];

        if (students && Array.isArray(students)) {
            for (const s of students) {
                if (!s.studentCode) continue;

                let user = await prisma.user.findUnique({ where: { studentCode: s.studentCode } });

                if (!user) {
                    let email = null;
                    const digits = s.studentCode.replace(/\D/g, '');
                    if (digits.length > 0) email = `s${digits}@email.kmutnb.ac.th`;

                    user = await prisma.user.create({
                        data: {
                            studentCode: s.studentCode,
                            email,
                            firstName: s.firstName || 'ไม่ระบุ',
                            lastName: s.lastName || '',
                            role: 'STUDENT',
                            sectionId: resolvedSectionId
                        }
                    });
                    createdStudents++;
                } else {
                    existingStudents++;
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { sectionId: resolvedSectionId || user.sectionId }
                    });
                }
                studentIds.push(user.id);
            }
        }

        if (schedule && studentIds.length > 0) {
            await prisma.schedule.update({
                where: { id: schedule.id },
                data: {
                    students: {
                        connect: studentIds.map(id => ({ id }))
                    }
                }
            });
        }

        // 6. Create Key
        if (roomCode) {
            const existKey = await prisma.key.findFirst({ where: { roomCode } });
            if (!existKey) {
                const lastKey = await prisma.key.findFirst({ orderBy: { slotNumber: 'desc' } });
                await prisma.key.create({
                    data: { roomCode, slotNumber: (lastKey?.slotNumber || 0) + 1 }
                });
            }
        }

        return {
            success: true,
            data: {
                subject,
                schedule,
                studentsCreated: createdStudents,
                studentsExisted: existingStudents,
                roomCode
            }
        };

    } catch (error) {
        console.error("Error importing repclasslist:", error);
        return { success: false, error: "เกิดข้อผิดพลาด: " + error.message };
    }
};
