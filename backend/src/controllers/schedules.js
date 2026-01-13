import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET /api/schedules
 * ดึงรายการตารางเรียนทั้งหมด (รองรับ filter ตาม section_id)
 */
export const getAllSchedules = async (req, res) => {
    try {
        const { section_id } = req.query;
        const where = {};

        if (section_id) {
            where.section_id = parseInt(section_id);
        }

        const schedules = await prisma.classSchedule.findMany({
            where,
            include: {
                subject: true,
                room: true,
                section: true
            },
            orderBy: [
                { day_of_week: 'asc' },
                { start_time: 'asc' }
            ]
        });

        return res.status(200).json({
            message: "ดึงข้อมูลตารางเรียนสำเร็จ",
            data: schedules
        });
    } catch (error) {
        console.error("Error getting schedules:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
    }
};

/**
 * GET /api/schedules/:id
 * ดึงข้อมูลตารางเรียนตาม ID
 */
export const getScheduleById = async (req, res) => {
    try {
        const { id } = req.params;

        const schedule = await prisma.classSchedule.findUnique({
            where: {
                schedule_id: id
            },
            include: {
                subject: true,
                room: true,
                section: true
            }
        });

        if (!schedule) {
            return res.status(404).json({ message: "ไม่พบตารางเรียน" });
        }

        return res.status(200).json({
            message: "ดึงข้อมูลตารางเรียนสำเร็จ",
            data: schedule
        });
    } catch (error) {
        console.error("Error getting schedule:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
    }
};

/**
 * POST /api/schedules
 * เพิ่มตารางเรียนใหม่ (Staff Only)
 */
export const createSchedule = async (req, res) => {
    try {
        const { subject_code, room_id, day_of_week, start_time, end_time, semester, academic_year, section_id } = req.body;

        if (!subject_code || !room_id || !day_of_week || !start_time || !end_time || !semester || !academic_year) {
            return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
        }

        const schedule = await prisma.classSchedule.create({
            data: {
                subject_code,
                room_id,
                day_of_week: parseInt(day_of_week),
                start_time: new Date(start_time),
                end_time: new Date(end_time),
                semester,
                academic_year: parseInt(academic_year),
                section_id: section_id ? parseInt(section_id) : null
            },
            include: {
                subject: true,
                room: true,
                section: true
            }
        });

        return res.status(201).json({
            message: "เพิ่มตารางเรียนสำเร็จ",
            data: schedule
        });
    } catch (error) {
        console.error("Error creating schedule:", error);

        if (error.code === 'P2003') {
            return res.status(400).json({ message: "ไม่พบรายวิชา, ห้องเรียน หรือกลุ่มเรียนที่เลือก" });
        }

        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการเพิ่มข้อมูล" });
    }
};

/**
 * PUT /api/schedules/:id
 * แก้ไขตารางเรียน (Staff Only)
 */
export const updateSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        const { subject_code, room_id, day_of_week, start_time, end_time, semester, academic_year, section_id } = req.body;

        const schedule = await prisma.classSchedule.update({
            where: {
                schedule_id: id
            },
            data: {
                subject_code,
                room_id,
                day_of_week: parseInt(day_of_week),
                start_time: new Date(start_time),
                end_time: new Date(end_time),
                semester,
                academic_year: parseInt(academic_year),
                section_id: section_id ? parseInt(section_id) : null
            },
            include: {
                subject: true,
                room: true,
                section: true
            }
        });

        return res.status(200).json({
            message: "แก้ไขตารางเรียนสำเร็จ",
            data: schedule
        });
    } catch (error) {
        console.error("Error updating schedule:", error);

        if (error.code === 'P2025') {
            return res.status(404).json({ message: "ไม่พบตารางเรียน" });
        }

        if (error.code === 'P2003') {
            return res.status(400).json({ message: "ไม่พบรายวิชา, ห้องเรียน หรือกลุ่มเรียนที่เลือก" });
        }

        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการแก้ไขข้อมูล" });
    }
};

/**
 * DELETE /api/schedules/:id
 * ลบตารางเรียน (Staff Only)
 */
export const deleteSchedule = async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.classSchedule.delete({
            where: {
                schedule_id: id
            }
        });

        return res.status(200).json({
            message: "ลบตารางเรียนสำเร็จ"
        });
    } catch (error) {
        console.error("Error deleting schedule:", error);

        if (error.code === 'P2025') {
            return res.status(404).json({ message: "ไม่พบตารางเรียน" });
        }

        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการลบข้อมูล" });
    }
};

/**
 * POST /api/schedules/batch-import
 * นำเข้าข้อมูลตารางเรียนจาก Excel (รับเป็น JSON Array)
 */
export const batchImportSchedules = async (req, res) => {
    try {
        const { schedules } = req.body; // Expect array of schedule objects

        if (!Array.isArray(schedules) || schedules.length === 0) {
            return res.status(400).json({ message: "ไม่มีข้อมูลนำเข้า" });
        }

        let successCount = 0;
        let failCount = 0;
        const errors = [];

        for (const item of schedules) {
            try {
                // Validate data
                if (!item.subject_code || !item.room_id || !item.day_of_week) {
                    throw new Error("Missing required fields");
                }

                // Check if subject/room exists (Optional: Prisma will check FK)

                await prisma.classSchedule.create({
                    data: {
                        subject_code: item.subject_code,
                        room_id: item.room_id,
                        day_of_week: parseInt(item.day_of_week),
                        start_time: new Date(item.start_time),
                        end_time: new Date(item.end_time),
                        semester: item.semester || "1",
                        academic_year: parseInt(item.academic_year) || new Date().getFullYear(),
                        section_id: item.section_id ? parseInt(item.section_id) : null
                    }
                });
                successCount++;
            } catch (err) {
                failCount++;
                errors.push({ item, error: err.message });
            }
        }

        return res.status(200).json({
            message: `นำเข้าเสร็จสิ้น: สำเร็จ ${successCount}, ล้มเหลว ${failCount}`,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        console.error("Error importing schedules:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการนำเข้าข้อมูล" });
    }
};
