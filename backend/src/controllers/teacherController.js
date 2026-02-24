import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** helper: ตรวจสอบว่าห้องว่างในช่วงเวลาที่ระบุหรือไม่ */
const isRoomAvailable = async (roomCode, dayOfWeek, startTime, endTime, excludeId = null) => {
    const schedules = await prisma.schedule.findMany({
        where: { roomCode, dayOfWeek, id: excludeId ? { not: excludeId } : undefined }
    });
    const newStart = new Date(startTime).getHours() * 60 + new Date(startTime).getMinutes();
    const newEnd = new Date(endTime).getHours() * 60 + new Date(endTime).getMinutes();
    for (const s of schedules) {
        const sStart = s.startTime.getHours() * 60 + s.startTime.getMinutes();
        const sEnd = s.endTime.getHours() * 60 + s.endTime.getMinutes();
        if (newStart < sEnd && newEnd > sStart) return false;
    }
    return true;
};

/**
 * GET /api/teacher/me
 * ดึงข้อมูลอาจารย์ที่ login อยู่ พร้อมวิชาที่สอน
 */
export const getMe = async (req, res) => {
    try {
        const teacher = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: {
                subjectTeachers: {
                    include: {
                        subject: {
                            include: {
                                schedules: {
                                    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
                                    include: {
                                        students: {
                                            include: { section: { include: { major: true } } }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        return res.json({
            success: true,
            data: {
                id: teacher.id,
                firstName: teacher.firstName,
                lastName: teacher.lastName,
                studentCode: teacher.studentCode,
                email: teacher.email,
                subjects: teacher.subjectTeachers.map(st => st.subject)
            }
        });
    } catch (error) {
        console.error('Error in teacher getMe:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
};

/**
 * GET /api/teacher/my-subjects
 * ดึงรายวิชาที่อาจารย์คนนี้สอน
 */
export const getMySubjects = async (req, res) => {
    try {
        const subjectTeachers = await prisma.subjectTeacher.findMany({
            where: { teacherId: req.user.id },
            include: {
                subject: {
                    include: {
                        schedules: {
                            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
                            include: {
                                students: {
                                    include: { section: { include: { major: true } } }
                                }
                            }
                        }
                    }
                }
            }
        });

        const subjects = subjectTeachers.map(st => st.subject);
        return res.json({ success: true, data: subjects });
    } catch (error) {
        console.error('Error in getMySubjects:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
};

/**
 * GET /api/teacher/my-schedules
 * ดึงตารางเรียนของวิชาที่อาจารย์คนนี้สอน
 */
export const getMySchedules = async (req, res) => {
    try {
        const schedules = await prisma.schedule.findMany({
            where: {
                subject: {
                    teachers: { some: { teacherId: req.user.id } }
                }
            },
            include: {
                subject: {
                    include: {
                        teachers: { include: { teacher: true } }
                    }
                },
                students: {
                    include: { section: { include: { major: true } } }
                }
            },
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
        });

        return res.json({ success: true, data: schedules, count: schedules.length });
    } catch (error) {
        console.error('Error in getMySchedules:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
};

/**
 * POST /api/teacher/schedules
 * เพิ่มตารางเรียนสำหรับวิชาของตัวเอง
 * - ตรวจสอบว่า subjectId เป็นวิชาของอาจารย์คนนี้
 */
export const createMySchedule = async (req, res) => {
    try {
        const { subjectId, roomCode, dayOfWeek, startTime, endTime, students } = req.body;

        if (!subjectId || !roomCode || dayOfWeek === undefined || dayOfWeek === null || !startTime || !endTime) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
        }

        // ตรวจสอบว่าเป็นวิชาของอาจารย์คนนี้
        const ownership = await prisma.subjectTeacher.findUnique({
            where: {
                subjectId_teacherId: {
                    subjectId,
                    teacherId: req.user.id
                }
            }
        });

        if (!ownership) {
            return res.status(403).json({
                success: false,
                message: 'ไม่มีสิทธิ์เพิ่มตารางเรียน — วิชานี้ไม่ใช่วิชาที่คุณสอน'
            });
        }

        // ตรวจสอบห้องว่าง
        const available = await isRoomAvailable(roomCode, parseInt(dayOfWeek), new Date(startTime), new Date(endTime));
        if (!available) {
            return res.status(400).json({ success: false, message: `ห้อง ${roomCode} ไม่ว่างในช่วงเวลานี้` });
        }

        // Handle students update (like in scheduleController)
        let studentIds = [];
        if (students && Array.isArray(students)) {
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
        }

        const schedule = await prisma.schedule.create({
            data: {
                subjectId,
                roomCode,
                dayOfWeek: parseInt(dayOfWeek),
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                students: studentIds.length > 0 ? {
                    connect: studentIds.map(id => ({ id }))
                } : undefined
            },
            include: {
                subject: {
                    include: {
                        teachers: { include: { teacher: true } }
                    }
                },
                students: {
                    include: { section: { include: { major: true } } }
                }
            }
        });

        // สร้าง Key สำหรับห้องถ้ายังไม่มี
        const existKey = await prisma.key.findFirst({ where: { roomCode } });
        if (!existKey) {
            const lastKey = await prisma.key.findFirst({ orderBy: { slotNumber: 'desc' } });
            await prisma.key.create({
                data: { roomCode, slotNumber: (lastKey?.slotNumber || 0) + 1 }
            });
        }

        return res.status(201).json({ success: true, message: 'เพิ่มตารางเรียนสำเร็จ', data: schedule });
    } catch (error) {
        console.error('Error in createMySchedule:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด: ' + error.message });
    }
};

/**
 * PUT /api/teacher/schedules/:id
 * อัปเดตตารางเรียน (เฉพาะวิชาของตัวเอง)
 */
export const updateMySchedule = async (req, res) => {
    try {
        const { id } = req.params;
        const { subjectId, roomCode, dayOfWeek, startTime, endTime, students } = req.body;

        const existingSchedule = await prisma.schedule.findUnique({
            where: { id },
            include: { subject: true }
        });

        if (!existingSchedule) {
            return res.status(404).json({ success: false, message: 'ไม่พบตารางสอน' });
        }

        // ตรวจสอบว่าครูคนนี้สอนวิชานี้จริงหรือไม่
        const ownership = await prisma.subjectTeacher.findUnique({
            where: {
                subjectId_teacherId: {
                    subjectId: existingSchedule.subjectId,
                    teacherId: req.user.id
                }
            }
        });

        if (!ownership) {
            return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์แก้ไขตารางเรียนวิชานี้' });
        }

        // Check room availability if changing room or time
        if ((roomCode && roomCode !== existingSchedule.roomCode) || startTime || endTime || dayOfWeek !== undefined) {
            const available = await isRoomAvailable(
                roomCode || existingSchedule.roomCode,
                dayOfWeek !== undefined ? parseInt(dayOfWeek) : existingSchedule.dayOfWeek,
                new Date(startTime || existingSchedule.startTime),
                new Date(endTime || existingSchedule.endTime),
                id
            );
            if (!available) {
                return res.status(400).json({ success: false, message: `ห้องไม่ว่างในช่วงเวลานี้` });
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
            data.students = { set: studentIds.map(stId => ({ id: stId })) };
        }

        const updatedSchedule = await prisma.schedule.update({
            where: { id },
            data,
            include: {
                subject: {
                    include: {
                        teachers: { include: { teacher: true } }
                    }
                },
                students: {
                    include: { section: { include: { major: true } } }
                }
            }
        });

        return res.status(200).json({ success: true, message: 'แก้ไขตารางสอนสำเร็จ', data: updatedSchedule });
    } catch (error) {
        console.error('Error in updateMySchedule:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการแก้ไขตารางสอน' });
    }
};

/**
 * DELETE /api/teacher/schedules/:id
 * ลบตารางเรียน (เฉพาะของตนเอง)
 */
export const deleteMySchedule = async (req, res) => {
    try {
        const { id } = req.params;

        const schedule = await prisma.schedule.findUnique({ where: { id } });
        if (!schedule) {
            return res.status(404).json({ success: false, message: 'ไม่พบตารางสอน' });
        }

        const ownership = await prisma.subjectTeacher.findUnique({
            where: {
                subjectId_teacherId: {
                    subjectId: schedule.subjectId,
                    teacherId: req.user.id
                }
            }
        });

        if (!ownership) {
            return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์ลบตารางเรียนวิชานี้' });
        }

        await prisma.schedule.delete({ where: { id } });
        return res.status(200).json({ success: true, message: 'ลบตารางสอนสำเร็จ' });
    } catch (error) {
        console.error('Error in deleteMySchedule:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบตารางสอน' });
    }
};

/**
 * POST /api/teacher/schedules/import-repclasslist
 * นำเข้าคลาส (Repclasslist)
 */
export const importMyRepclasslist = async (req, res) => {
    try {
        const data = req.body.data || req.body;
        // บังคับให้เป็นครูที่ล็อกอินอยู่เสมอ
        const teacherId = req.user.id;

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

        // 2. ผูกกับอาจารย์คนนี้
        await prisma.subjectTeacher.upsert({
            where: {
                subjectId_teacherId: {
                    subjectId: subject.id,
                    teacherId
                }
            },
            update: {},
            create: {
                subjectId: subject.id,
                teacherId
            }
        });

        // 3. Create Schedule
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

        // 4. Create/Update Students and link
        let createdStudents = 0;
        let existingStudents = 0;
        const studentIds = [];

        if (students && Array.isArray(students)) {
            for (const s of students) {
                if (!s.studentCode) continue;

                let resolvedSectionId = null;
                if (s.section) {
                    const sectionStr = s.section.toString().trim();
                    const dashIndex = sectionStr.indexOf('-');
                    if (dashIndex !== -1) {
                        const majorCode = sectionStr.substring(0, dashIndex);
                        const sectionName = sectionStr.substring(dashIndex + 1).split(' ')[0];
                        const major = await prisma.major.findUnique({ where: { code: majorCode } });
                        if (major) {
                            const section = await prisma.section.findFirst({
                                where: { name: sectionName, majorId: major.id }
                            });
                            if (section) resolvedSectionId = section.id;
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
                            sectionId: resolvedSectionId
                        }
                    });
                    createdStudents++;
                } else {
                    existingStudents++;
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

        // 5. Create Key
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
            data: { subject, schedule, studentsCreated: createdStudents, studentsExisted: existingStudents, roomCode }
        });
    } catch (error) {
        console.error('Error importing repclasslist:', error);
        return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล: ' + error.message });
    }
};
