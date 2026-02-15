import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Schedule Controller - API endpoints สำหรับจัดการตารางสอน
 */

// ==================== Helper Functions ====================

/**
 * หาตารางสอนในห้องและเวลาที่ระบุ
 */
const findScheduleForTime = async (roomCode, dayOfWeek, time) => {
    const timeOnly = new Date(time);

    const schedules = await prisma.schedule.findMany({
        where: { roomCode, dayOfWeek },
        include: { subject: true, teacher: true }
    });

    for (const schedule of schedules) {
        const startMins = schedule.startTime.getHours() * 60 + schedule.startTime.getMinutes();
        const endMins = schedule.endTime.getHours() * 60 + schedule.endTime.getMinutes();
        const currentMins = timeOnly.getHours() * 60 + timeOnly.getMinutes();

        if (currentMins >= startMins && currentMins < endMins) {
            return schedule;
        }
    }
    return null;
};

/**
 * ตรวจสอบว่าห้องว่างในช่วงเวลาที่ระบุหรือไม่
 */
const isRoomAvailable = async (roomCode, dayOfWeek, startTime, endTime, excludeId = null) => {
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

        if (newStartMins < existEndMins && newEndMins > existStartMins) {
            return false;
        }
    }
    return true;
};

/**
 * Update DailyAuthorization records when a schedule's room changes
 */
const updateDailyAuthorizationsOnRoomChange = async (scheduleId, newRoomCode) => {
    try {
        const result = await prisma.dailyAuthorization.updateMany({
            where: { scheduleId },
            data: { roomCode: newRoomCode }
        });
        return result.count;
    } catch (error) {
        console.error('Error updating daily authorizations:', error);
        return 0;
    }
};

// ==================== Controller Functions ====================

/**
 * GET /api/schedules
 * ดึงรายการตารางสอนทั้งหมด
 */
export const getAllSchedules = async (req, res) => {
    try {
        const { roomCode, teacherId, dayOfWeek, subjectId } = req.query;

        const where = {};
        if (roomCode) where.roomCode = roomCode;
        if (teacherId) where.subject = { teachers: { some: { teacherId: teacherId } } };
        if (dayOfWeek) where.dayOfWeek = parseInt(dayOfWeek);
        if (subjectId) where.subjectId = subjectId;

        const schedules = await prisma.schedule.findMany({
            where,
            include: {
                subject: {
                    include: {
                        teachers: { include: { teacher: true } }
                    }
                },
                students: {
                    include: {
                        section: {
                            include: { major: true }
                        }
                    }
                }
            },
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
        });

        return res.status(200).json({
            success: true,
            message: 'ดึงตารางสอนสำเร็จ',
            data: schedules,
            count: schedules.length
        });
    } catch (error) {
        console.error('Error in getAllSchedules:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
};

/**
 * GET /api/schedules/:id
 */
export const getScheduleById = async (req, res) => {
    try {
        const { id } = req.params;
        const schedule = await prisma.schedule.findUnique({
            where: { id },
            include: {
                subject: {
                    include: {
                        teachers: { include: { teacher: true } }
                    }
                },
                students: {
                    include: {
                        section: {
                            include: { major: true }
                        }
                    }
                }
            }
        });

        if (!schedule) {
            return res.status(404).json({ success: false, message: 'ไม่พบตารางสอน' });
        }

        return res.status(200).json({ success: true, message: 'ดึงข้อมูลสำเร็จ', data: schedule });
    } catch (error) {
        console.error('Error in getScheduleById:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
};

/**
 * GET /api/schedules/room/:roomCode
 */
export const getSchedulesByRoom = async (req, res) => {
    try {
        const { roomCode } = req.params;
        const schedules = await prisma.schedule.findMany({
            where: { roomCode },
            include: {
                subject: {
                    include: {
                        teachers: { include: { teacher: true } }
                    }
                }
            },
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
        });

        return res.status(200).json({
            success: true,
            message: `ดึงตารางสอนห้อง ${roomCode} สำเร็จ`,
            data: schedules,
            count: schedules.length
        });
    } catch (error) {
        console.error('Error in getSchedulesByRoom:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
};

/**
 * GET /api/schedules/teacher/:teacherId
 */
export const getSchedulesByTeacher = async (req, res) => {
    try {
        const { teacherId } = req.params;
        const schedules = await prisma.schedule.findMany({
            where: { subject: { teachers: { some: { teacherId: teacherId } } } },
            include: {
                subject: {
                    include: {
                        teachers: { include: { teacher: true } }
                    }
                }
            },
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
        });

        return res.status(200).json({
            success: true,
            message: 'ดึงตารางสอนอาจารย์สำเร็จ',
            data: schedules,
            count: schedules.length
        });
    } catch (error) {
        console.error('Error in getSchedulesByTeacher:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
};



/**
 * POST /api/schedules
 */
export const createSchedule = async (req, res) => {
    try {
        console.log('API Request: createSchedule', req.body);
        const { subjectId, roomCode, dayOfWeek, startTime, endTime } = req.body;

        if (!subjectId || !roomCode || dayOfWeek === undefined || dayOfWeek === null || !startTime || !endTime) {
            console.log('Missing required fields:', { subjectId, roomCode, dayOfWeek, startTime, endTime });
            return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
        }

        const available = await isRoomAvailable(roomCode, parseInt(dayOfWeek), new Date(startTime), new Date(endTime));
        if (!available) {
            console.log(`Room ${roomCode} is not available`);
            return res.status(400).json({ success: false, message: `ห้อง ${roomCode} ไม่ว่างในช่วงเวลานี้` });
        }

        const schedule = await prisma.schedule.create({
            data: {
                subjectId,
                roomCode,
                dayOfWeek: parseInt(dayOfWeek),
                startTime: new Date(startTime),
                endTime: new Date(endTime)
            },
            include: {
                subject: {
                    include: {
                        teachers: { include: { teacher: true } }
                    }
                },
                students: {
                    include: {
                        section: {
                            include: { major: true }
                        }
                    }
                }
            }
        });

        return res.status(201).json({ success: true, message: 'สร้างตารางสอนสำเร็จ', data: schedule });
    } catch (error) {
        console.error('Error in createSchedule:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสร้างตารางสอน' });
    }
};

/**
 * PUT /api/schedules/:id
 */
export const updateSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        const { subjectId, roomCode, dayOfWeek, startTime, endTime, students } = req.body;

        const existingSchedule = await prisma.schedule.findUnique({ where: { id } });
        if (!existingSchedule) {
            return res.status(404).json({ success: false, message: 'ไม่พบตารางสอน' });
        }

        // Check room availability if changing room
        if (roomCode && roomCode !== existingSchedule.roomCode) {
            const available = await isRoomAvailable(
                roomCode,
                dayOfWeek ? parseInt(dayOfWeek) : existingSchedule.dayOfWeek,
                new Date(startTime || existingSchedule.startTime),
                new Date(endTime || existingSchedule.endTime),
                id
            );
            if (!available) {
                return res.status(400).json({ success: false, message: `ห้อง ${roomCode} ไม่ว่างในช่วงเวลานี้` });
            }
        }

        const data = {};
        if (subjectId) data.subjectId = subjectId;
        if (roomCode) data.roomCode = roomCode;
        if (dayOfWeek !== undefined && dayOfWeek !== null) data.dayOfWeek = parseInt(dayOfWeek);
        if (startTime) data.startTime = new Date(startTime);
        if (endTime) data.endTime = new Date(endTime);

        // Handle students update
        if (students && Array.isArray(students)) {
            const studentIds = [];
            for (const s of students) {
                if (!s.studentCode) continue;

                let user = await prisma.user.findUnique({ where: { studentCode: s.studentCode } });
                if (!user) {
                    const digits = s.studentCode.replace(/\D/g, '');
                    const email = digits.length > 0 ? `s${digits}@email.kmutnb.ac.th` : null;
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
            data.students = { set: studentIds.map(id => ({ id })) };
        }

        const schedule = await prisma.schedule.update({
            where: { id },
            data,
            include: {
                subject: {
                    include: {
                        teachers: { include: { teacher: true } }
                    }
                },
                students: {
                    include: {
                        section: {
                            include: { major: true }
                        }
                    }
                }
            }
        });

        return res.status(200).json({ success: true, message: 'แก้ไขตารางสอนสำเร็จ', data: schedule });
    } catch (error) {
        console.error('Error in updateSchedule:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการแก้ไขตารางสอน' });
    }
};

/**
 * DELETE /api/schedules/:id
 */
export const deleteSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.schedule.delete({ where: { id } });
        return res.status(200).json({ success: true, message: 'ลบตารางสอนสำเร็จ' });
    } catch (error) {
        console.error('Error in deleteSchedule:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบตารางสอน' });
    }
};

/**
 * POST /api/schedules/swap-rooms
 */
export const swapRooms = async (req, res) => {
    try {
        const { scheduleId1, scheduleId2 } = req.body;

        if (!scheduleId1 || !scheduleId2) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุ scheduleId1 และ scheduleId2' });
        }

        const [s1, s2] = await Promise.all([
            prisma.schedule.findUnique({ where: { id: scheduleId1 } }),
            prisma.schedule.findUnique({ where: { id: scheduleId2 } })
        ]);

        if (!s1) return res.status(404).json({ success: false, message: `ไม่พบตารางสอน ID: ${scheduleId1}` });
        if (!s2) return res.status(404).json({ success: false, message: `ไม่พบตารางสอน ID: ${scheduleId2}` });

        if (s1.dayOfWeek !== s2.dayOfWeek) {
            return res.status(400).json({ success: false, message: 'ไม่สามารถสลับห้องระหว่างคาบที่อยู่คนละวันได้' });
        }

        // Swap in transaction
        const result = await prisma.$transaction(async (tx) => {
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

        // Update DailyAuthorizations
        const [auth1, auth2] = await Promise.all([
            updateDailyAuthorizationsOnRoomChange(scheduleId1, result.schedule1.roomCode),
            updateDailyAuthorizationsOnRoomChange(scheduleId2, result.schedule2.roomCode)
        ]);

        return res.status(200).json({
            success: true,
            message: `สลับห้องเรียนสำเร็จ: ${result.schedule1.roomCode} ↔ ${result.schedule2.roomCode}`,
            data: { schedule1: result.schedule1, schedule2: result.schedule2 }
        });
    } catch (error) {
        console.error('Error in swapRooms:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสลับห้องเรียน' });
    }
};

/**
 * POST /api/schedules/:id/move-room
 */
export const moveRoom = async (req, res) => {
    try {
        const { id } = req.params;
        const { newRoomCode } = req.body;

        if (!newRoomCode) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุ newRoomCode' });
        }

        const schedule = await prisma.schedule.findUnique({ where: { id } });
        if (!schedule) {
            return res.status(404).json({ success: false, message: `ไม่พบตารางสอน ID: ${id}` });
        }

        const available = await isRoomAvailable(newRoomCode, schedule.dayOfWeek, schedule.startTime, schedule.endTime, id);
        if (!available) {
            return res.status(400).json({ success: false, message: `ห้อง ${newRoomCode} ไม่ว่างในช่วงเวลานี้` });
        }

        const previousRoomCode = schedule.roomCode;
        const updatedSchedule = await prisma.schedule.update({
            where: { id },
            data: { roomCode: newRoomCode },
            include: { subject: true, teacher: true }
        });

        const affectedCount = await updateDailyAuthorizationsOnRoomChange(id, newRoomCode);

        return res.status(200).json({
            success: true,
            message: `ย้ายห้องเรียนสำเร็จ: ${previousRoomCode} → ${newRoomCode}`,
            data: { schedule: updatedSchedule, previousRoomCode }
        });
    } catch (error) {
        console.error('Error in moveRoom:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการย้ายห้องเรียน' });
    }
};

/**
 * POST /api/schedules/check-permission
 */
export const checkSchedulePermission = async (req, res) => {
    try {
        const { studentCode, roomCode } = req.body;

        if (!studentCode || !roomCode) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุ studentCode และ roomCode' });
        }

        const now = new Date();
        const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();

        const schedule = await findScheduleForTime(roomCode, dayOfWeek, now);

        if (!schedule) {
            return res.status(200).json({
                success: true,
                message: 'ไม่มีตารางสอนในเวลานี้ สามารถเบิกกุญแจได้',
                data: { hasSchedule: false, isInSection: false, schedule: null, canBorrow: true }
            });
        }

        return res.status(200).json({
            success: true,
            message: `มีคาบเรียนวิชา ${schedule.subject?.name || 'ไม่ระบุ'}`,
            data: {
                hasSchedule: true,
                isInSection: true,
                schedule: {
                    id: schedule.id,
                    subjectCode: schedule.subject?.code,
                    subjectName: schedule.subject?.name,
                    teacherId: schedule.teacherId,
                    teacherName: schedule.teacher ? `${schedule.teacher.firstName} ${schedule.teacher.lastName}` : null,
                    startTime: schedule.startTime,
                    endTime: schedule.endTime
                },
                canBorrow: true
            }
        });
    } catch (error) {
        console.error('Error in checkSchedulePermission:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบ' });
    }
};

/**
 * DELETE /api/schedules/delete-all
 */
export const deleteAllSchedules = async (req, res) => {
    try {
        await prisma.schedule.deleteMany({});
        return res.status(200).json({ success: true, message: 'ลบตารางเรียนทั้งหมดสำเร็จ' });
    } catch (error) {
        console.error('Error in deleteAllSchedules:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบข้อมูล' });
    }
};

/**
 * POST /api/schedules/batch-import
 */
export const batchImportSchedules = async (req, res) => {
    try {
        const { schedules } = req.body;

        if (!Array.isArray(schedules) || schedules.length === 0) {
            return res.status(400).json({ success: false, message: 'ไม่มีข้อมูลนำเข้า' });
        }

        let successCount = 0;
        let failCount = 0;
        const errors = [];

        for (const item of schedules) {
            try {
                if (!item.subjectId || !item.roomCode || item.dayOfWeek === undefined) {
                    throw new Error('Missing required fields');
                }

                await prisma.schedule.create({
                    data: {
                        subjectId: item.subjectId,
                        roomCode: item.roomCode,
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

        return res.status(200).json({
            success: true,
            message: `นำเข้าเสร็จสิ้น: สำเร็จ ${successCount}, ล้มเหลว ${failCount}`,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        console.error('Error in batchImportSchedules:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล' });
    }
};

/**
 * POST /api/schedules/import-repclasslist
 */
export const importRepclasslist = async (req, res) => {
    try {
        // Frontend sends { data: parsedData }, so extract from req.body.data
        const data = req.body.data || req.body;
        const teacherId = data.teacherId || req.body.teacherId;

        if (!data) return res.status(400).json({ message: 'ไม่พบข้อมูลนำเข้า' });

        const { subjectCode, subjectName, dayOfWeek, startTime, endTime, roomCode, students } = data;

        if (!subjectCode || !subjectName) {
            return res.status(400).json({ message: 'ไม่พบรหัสวิชาหรือชื่อวิชา' });
        }

        // 1. สร้างหรือหารายวิชา
        const subject = await prisma.subject.upsert({
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
            return res.status(400).json({ message: 'ไม่พบอาจารย์ในระบบ กรุณาเพิ่มอาจารย์ก่อน' });
        }



        // 4. Create Schedule
        let schedule = null;
        if (dayOfWeek !== undefined && startTime && endTime && roomCode) {
            const existing = await prisma.schedule.findFirst({
                where: {
                    subjectId: subject.id,
                    dayOfWeek: parseInt(dayOfWeek),
                    roomCode: roomCode
                }
            });

            if (!existing) {
                schedule = await prisma.schedule.create({
                    data: {
                        subjectId: subject.id,
                        roomCode,
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

                // Resolve Section for Student
                let resolvedSectionId = null;
                if (s.section) {
                    const sectionStr = s.section.toString().trim();
                    // Expected format: "MAJORCODE-SECTIONNAME" e.g. "TCT-DE-RA"
                    const dashIndex = sectionStr.indexOf('-');
                    if (dashIndex !== -1) {
                        const majorCode = sectionStr.substring(0, dashIndex);
                        const sectionName = sectionStr.substring(dashIndex + 1).split(' ')[0]; // Take only first part relative to space if exists

                        const major = await prisma.major.findUnique({ where: { code: majorCode } });
                        if (major) {
                            const section = await prisma.section.findFirst({
                                where: {
                                    name: sectionName,
                                    majorId: major.id
                                }
                            });
                            if (section) {
                                resolvedSectionId = section.id;
                            }
                        }
                    }
                }

                let user = await prisma.user.findUnique({ where: { studentCode: s.studentCode } });

                if (!user) {
                    const digits = s.studentCode.replace(/\D/g, '');
                    const email = digits.length > 0 ? `s${digits}@email.kmutnb.ac.th` : null;

                    user = await prisma.user.create({
                        data: {
                            studentCode: s.studentCode,
                            email,
                            firstName: s.firstName || 'ไม่ระบุ',
                            lastName: s.lastName || '',
                            role: 'STUDENT',
                            sectionId: resolvedSectionId // Set if resolved
                        }
                    });
                    createdStudents++;
                } else {
                    existingStudents++;
                    // Update section if resolved and user doesn't have one, or always update?
                    // User said: "if no data... match ... and create relation"
                    // We'll update if we resolved a section from the file.
                    if (resolvedSectionId) {
                        await prisma.user.update({
                            where: { id: user.id },
                            data: { sectionId: resolvedSectionId }
                        });
                    }
                }
                studentIds.push(user.id);
            }
        }

        if (schedule && studentIds.length > 0) {
            await prisma.schedule.update({
                where: { id: schedule.id },
                data: {
                    students: { connect: studentIds.map(id => ({ id })) }
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

        return res.status(200).json({
            message: 'นำเข้าข้อมูลสำเร็จ',
            data: {
                subject,
                schedule,
                studentsCreated: createdStudents,
                studentsExisted: existingStudents,
                roomCode
            }
        });
    } catch (error) {
        console.error('Error importing repclasslist:', error);
        return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล: ' + error.message });
    }
};
