import * as scheduleService from '../services/scheduleService.js';

/**
 * Schedule Controller - API endpoints สำหรับจัดการตารางสอน (ใช้ schema ใหม่)
 */

/**
 * GET /api/schedules
 * ดึงรายการตารางสอนทั้งหมด
 * Query: { roomCode?, teacherId?, section?, dayOfWeek?, subjectId? }
 */
export const getAllSchedules = async (req, res) => {
    try {
        const { roomCode, teacherId, section, dayOfWeek, subjectId } = req.query;

        const filters = {};
        if (roomCode) filters.roomCode = roomCode;
        if (teacherId) filters.teacherId = teacherId;
        if (section) filters.section = section;
        if (dayOfWeek) filters.dayOfWeek = dayOfWeek;
        if (subjectId) filters.subjectId = subjectId;

        const schedules = await scheduleService.getAllSchedules(filters);

        return res.status(200).json({
            success: true,
            message: 'ดึงตารางสอนสำเร็จ',
            data: schedules,
            count: schedules.length
        });

    } catch (error) {
        console.error('Error in getAllSchedules:', error);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
        });
    }
};

/**
 * GET /api/schedules/:id
 * ดึงตารางสอนจาก ID
 */
export const getScheduleById = async (req, res) => {
    try {
        const { id } = req.params;
        const schedule = await scheduleService.getScheduleById(id);

        if (!schedule) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบตารางสอน'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'ดึงข้อมูลสำเร็จ',
            data: schedule
        });

    } catch (error) {
        console.error('Error in getScheduleById:', error);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
        });
    }
};

/**
 * GET /api/schedules/room/:roomCode
 * ดึงตารางสอนของห้อง
 */
export const getSchedulesByRoom = async (req, res) => {
    try {
        const { roomCode } = req.params;

        const schedules = await scheduleService.getSchedulesByRoom(roomCode);

        return res.status(200).json({
            success: true,
            message: `ดึงตารางสอนห้อง ${roomCode} สำเร็จ`,
            data: schedules,
            count: schedules.length
        });

    } catch (error) {
        console.error('Error in getSchedulesByRoom:', error);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
        });
    }
};

/**
 * GET /api/schedules/teacher/:teacherId
 * ดึงตารางสอนของอาจารย์
 */
export const getSchedulesByTeacher = async (req, res) => {
    try {
        const { teacherId } = req.params;

        const schedules = await scheduleService.getSchedulesByTeacher(teacherId);

        return res.status(200).json({
            success: true,
            message: 'ดึงตารางสอนอาจารย์สำเร็จ',
            data: schedules,
            count: schedules.length
        });

    } catch (error) {
        console.error('Error in getSchedulesByTeacher:', error);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
        });
    }
};

/**
 * GET /api/schedules/section/:section
 * ดึงตารางสอนของกลุ่มเรียน
 */
export const getSchedulesBySection = async (req, res) => {
    try {
        const { section } = req.params;

        const schedules = await scheduleService.getSchedulesBySection(section);

        return res.status(200).json({
            success: true,
            message: `ดึงตารางสอนกลุ่ม ${section} สำเร็จ`,
            data: schedules,
            count: schedules.length
        });

    } catch (error) {
        console.error('Error in getSchedulesBySection:', error);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
        });
    }
};

/**
 * POST /api/schedules
 * สร้างตารางสอนใหม่ (Staff Only)
 * Body: { subjectId, roomCode, section, teacherId, dayOfWeek, startTime, endTime }
 */
export const createSchedule = async (req, res) => {
    try {
        const { subjectId, roomCode, section, teacherId, dayOfWeek, startTime, endTime } = req.body;

        if (!subjectId || !roomCode || !section || !teacherId || !dayOfWeek || !startTime || !endTime) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
            });
        }

        const result = await scheduleService.createSchedule({
            subjectId,
            roomCode,
            section,
            teacherId,
            dayOfWeek: parseInt(dayOfWeek),
            startTime: new Date(startTime),
            endTime: new Date(endTime)
        });

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error
            });
        }

        return res.status(201).json({
            success: true,
            message: 'สร้างตารางสอนสำเร็จ',
            data: result.schedule
        });

    } catch (error) {
        console.error('Error in createSchedule:', error);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการสร้างตารางสอน'
        });
    }
};

/**
 * PUT /api/schedules/:id
 * แก้ไขตารางสอน (Staff Only)
 */
export const updateSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        const { subjectId, roomCode, section, teacherId, dayOfWeek, startTime, endTime, students } = req.body;

        const data = {};
        if (subjectId) data.subjectId = subjectId;
        if (roomCode) data.roomCode = roomCode;
        if (section) data.section = section;
        if (teacherId) data.teacherId = teacherId;
        if (dayOfWeek) data.dayOfWeek = parseInt(dayOfWeek);
        if (startTime) data.startTime = new Date(startTime);
        if (endTime) data.endTime = new Date(endTime);
        if (students) data.students = students;

        const result = await scheduleService.updateSchedule(id, data);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error
            });
        }

        return res.status(200).json({
            success: true,
            message: 'แก้ไขตารางสอนสำเร็จ',
            data: result.schedule
        });

    } catch (error) {
        console.error('Error in updateSchedule:', error);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการแก้ไขตารางสอน'
        });
    }
};

/**
 * DELETE /api/schedules/:id
 * ลบตารางสอน (Staff Only)
 */
export const deleteSchedule = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await scheduleService.deleteSchedule(id);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error
            });
        }

        return res.status(200).json({
            success: true,
            message: 'ลบตารางสอนสำเร็จ'
        });

    } catch (error) {
        console.error('Error in deleteSchedule:', error);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการลบตารางสอน'
        });
    }
};

/**
 * POST /api/schedules/swap-rooms
 * สลับห้องเรียนระหว่าง 2 ตารางสอน (Staff Only)
 * Body: { scheduleId1, scheduleId2 }
 */
export const swapRooms = async (req, res) => {
    try {
        const { scheduleId1, scheduleId2 } = req.body;

        if (!scheduleId1 || !scheduleId2) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาระบุ scheduleId1 และ scheduleId2'
            });
        }

        const result = await scheduleService.swapRooms(scheduleId1, scheduleId2);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error
            });
        }

        return res.status(200).json({
            success: true,
            message: result.message,
            data: {
                schedule1: result.schedule1,
                schedule2: result.schedule2
            }
        });

    } catch (error) {
        console.error('Error in swapRooms:', error);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการสลับห้องเรียน'
        });
    }
};

/**
 * POST /api/schedules/:id/move-room
 * ย้ายห้องเรียน (Staff Only)
 * Body: { newRoomCode }
 */
export const moveRoom = async (req, res) => {
    try {
        const { id } = req.params;
        const { newRoomCode } = req.body;

        if (!newRoomCode) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาระบุ newRoomCode'
            });
        }

        const result = await scheduleService.moveScheduleToRoom(id, newRoomCode);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error
            });
        }

        return res.status(200).json({
            success: true,
            message: result.message,
            data: {
                schedule: result.schedule,
                previousRoomCode: result.previousRoomCode
            }
        });

    } catch (error) {
        console.error('Error in moveRoom:', error);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการย้ายห้องเรียน'
        });
    }
};

/**
 * POST /api/schedules/check-permission
 * ตรวจสอบสิทธิ์ตามตารางสอน
 * Body: { studentCode, roomCode }
 */
export const checkSchedulePermission = async (req, res) => {
    try {
        const { studentCode, roomCode } = req.body;

        if (!studentCode || !roomCode) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาระบุ studentCode และ roomCode'
            });
        }

        const result = await scheduleService.checkSchedulePermission(studentCode, roomCode);

        return res.status(200).json({
            success: true,
            message: result.message,
            data: result
        });

    } catch (error) {
        console.error('Error in checkSchedulePermission:', error);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการตรวจสอบ'
        });
    }
};

/**
 * DELETE /api/schedules/delete-all
 * ลบตารางสอนทั้งหมด (Staff Only)
 */
export const deleteAllSchedules = async (req, res) => {
    try {
        const result = await scheduleService.deleteAllSchedules();
        if (!result.success) {
            return res.status(500).json({ message: result.error });
        }
        return res.status(200).json({ success: true, message: result.message });
    } catch (error) {
        console.error('Error in deleteAllSchedules:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบข้อมูล' });
    }
};

/**
 * POST /api/schedules/batch-import
 * นำเข้าข้อมูลตารางเรียนจาก Excel (Batch)
 */
export const batchImportSchedules = async (req, res) => {
    try {
        const { schedules } = req.body;
        const result = await scheduleService.batchImportSchedules(schedules);

        if (!result.success) {
            return res.status(400).json({ message: result.error });
        }
        return res.status(200).json(result);
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
        const data = req.body;
        const result = await scheduleService.importRepclasslist(data, req.body.teacherId);

        if (!result.success) {
            return res.status(500).json({ message: result.error });
        }
        return res.status(200).json({
            message: "นำเข้าข้อมูลสำเร็จ",
            data: result.data
        });
    } catch (error) {
        console.error('Error importing repclasslist:', error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการนำเข้าข้อมูล: " + error.message });
    }
};
