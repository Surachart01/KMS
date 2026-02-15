import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * POST /api/authorizations - Add manual authorization
 */
export const addAuthorization = async (req, res) => {
    try {
        const { userId, roomCode, date, startTime, endTime, subjectId } = req.body;

        if (!userId || !roomCode || !date || !startTime || !endTime) {
            return res.status(400).json({
                message: 'Missing required fields: userId, roomCode, date, startTime, endTime'
            });
        }

        const authorization = await prisma.dailyAuthorization.create({
            data: {
                userId,
                roomCode,
                date: new Date(date),
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                subjectId: subjectId || null,
                source: 'MANUAL',
                createdBy: req.user?.id
            },
            include: {
                user: {
                    select: {
                        id: true,
                        studentCode: true,
                        firstName: true,
                        lastName: true
                    }
                },
                subject: {
                    select: {
                        id: true,
                        code: true,
                        name: true
                    }
                }
            }
        });

        return res.status(201).json({
            message: 'Authorization added successfully',
            data: authorization
        });
    } catch (error) {
        console.error('Error adding authorization:', error);
        return res.status(500).json({ message: 'Failed to add authorization' });
    }
};

/**
 * GET /api/authorizations - Get all authorizations with filters
 */
export const getAllAuthorizations = async (req, res) => {
    try {
        const { roomCode, date, userId, source } = req.query;

        const filter = {};
        if (roomCode) filter.roomCode = roomCode;
        if (date) {
            // Parse as UTC midnight to match @db.Date storage
            const [year, month, day] = date.split('-').map(Number);
            filter.date = new Date(Date.UTC(year, month - 1, day));
        }
        if (userId) filter.userId = userId;
        if (source) filter.source = source;

        const authorizations = await prisma.dailyAuthorization.findMany({
            where: filter,
            include: {
                user: {
                    select: {
                        id: true,
                        studentCode: true,
                        firstName: true,
                        lastName: true
                    }
                },
                subject: true,
                schedule: true
            },
            orderBy: [
                { date: 'asc' },
                { startTime: 'asc' }
            ]
        });

        return res.status(200).json({
            message: 'Authorizations retrieved successfully',
            data: authorizations
        });
    } catch (error) {
        console.error('Error getting authorizations:', error);
        return res.status(500).json({ message: 'Failed to get authorizations' });
    }
};

/**
 * GET /api/authorizations/room/:roomCode - Get authorized users for a room
 */
export const getAuthorizedUsersForRoom = async (req, res) => {
    try {
        const { roomCode } = req.params;
        const { date, startTime, endTime } = req.query;

        const where = { roomCode };

        if (date) {
            where.date = new Date(date);
        }

        // Check for time overlap if provided
        if (startTime && endTime) {
            where.OR = [
                {
                    AND: [
                        { startTime: { lte: new Date(startTime) } },
                        { endTime: { gte: new Date(startTime) } }
                    ]
                },
                {
                    AND: [
                        { startTime: { lte: new Date(endTime) } },
                        { endTime: { gte: new Date(endTime) } }
                    ]
                }
            ];
        }

        const authorizations = await prisma.dailyAuthorization.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        studentCode: true,
                        firstName: true,
                        lastName: true,
                        section: {
                            include: {
                                major: true
                            }
                        }
                    }
                },
                subject: true,
                schedule: true
            },
            orderBy: [
                { date: 'asc' },
                { startTime: 'asc' }
            ]
        });

        return res.status(200).json({
            message: 'Authorized users retrieved successfully',
            data: authorizations
        });
    } catch (error) {
        console.error('Error getting authorized users:', error);
        return res.status(500).json({ message: 'Failed to get authorized users' });
    }
};

/**
 * GET /api/authorizations/check - Check if user is authorized
 */
export const checkAuthorization = async (req, res) => {
    try {
        const { userId, roomCode, dateTime } = req.query;

        if (!userId || !roomCode || !dateTime) {
            return res.status(400).json({
                message: 'Missing required parameters: userId, roomCode, dateTime'
            });
        }

        const checkDate = new Date(dateTime);
        const currentDate = new Date(checkDate);
        currentDate.setHours(0, 0, 0, 0);

        const authorization = await prisma.dailyAuthorization.findFirst({
            where: {
                userId,
                roomCode,
                date: currentDate,
                startTime: { lte: checkDate },
                endTime: { gte: checkDate }
            },
            include: {
                user: true,
                subject: true
            }
        });

        return res.status(200).json({
            message: authorization ? 'User is authorized' : 'User is not authorized',
            authorized: authorization !== null,
            data: authorization
        });
    } catch (error) {
        console.error('Error checking authorization:', error);
        return res.status(500).json({ message: 'Failed to check authorization' });
    }
};

/**
 * DELETE /api/authorizations/:id - Remove authorization
 */
export const deleteAuthorization = async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.dailyAuthorization.delete({
            where: { id }
        });

        return res.status(200).json({
            message: 'Authorization removed successfully'
        });
    } catch (error) {
        console.error('Error deleting authorization:', error);
        return res.status(500).json({ message: 'Failed to delete authorization' });
    }
};

/**
 * POST /api/authorizations/sync-schedule - Sync from schedule (date range)
 */
export const syncSchedule = async (req, res) => {
    try {
        const { startDate, endDate } = req.body;

        if (!startDate || !endDate) {
            return res.status(400).json({
                message: 'Missing required fields: startDate, endDate'
            });
        }

        const schedules = await prisma.schedule.findMany({
            include: { students: true }
        });

        const current = new Date(startDate);
        const end = new Date(endDate);

        // Delete existing schedule-based authorizations for this range
        await prisma.dailyAuthorization.deleteMany({
            where: {
                date: {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                },
                source: 'SCHEDULE'
            }
        });

        const authorizations = [];

        while (current <= end) {
            const dayOfWeek = current.getDay();
            const daySchedules = schedules.filter(s => s.dayOfWeek === dayOfWeek);

            for (const schedule of daySchedules) {
                for (const student of schedule.students || []) {
                    authorizations.push({
                        userId: student.id,
                        roomCode: schedule.roomCode,
                        date: new Date(current),
                        startTime: schedule.startTime,
                        endTime: schedule.endTime,
                        scheduleId: schedule.id,
                        subjectId: schedule.subjectId,
                        source: 'SCHEDULE'
                    });
                }
            }
            current.setDate(current.getDate() + 1);
        }

        const result = await prisma.dailyAuthorization.createMany({
            data: authorizations,
            skipDuplicates: true
        });

        return res.status(200).json({
            message: `Synced ${result.count} authorizations (Cleared old schedule data)`,
            count: result.count
        });
    } catch (error) {
        console.error('Error syncing schedule:', error);
        return res.status(500).json({ message: 'Failed to sync schedule' });
    }
};

/**
 * POST /api/authorizations/sync-today - Sync today's schedules
 */
export const syncToday = async (req, res) => {
    try {
        const now = new Date();
        // Create UTC midnight date to match @db.Date storage
        const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

        // Fetch schedules for today's dayOfWeek with enrolled students
        const schedules = await prisma.schedule.findMany({
            where: { dayOfWeek },
            include: {
                students: true,
                subject: { select: { id: true, code: true, name: true } }
            }
        });

        if (schedules.length === 0) {
            return res.status(200).json({
                message: 'ไม่มีตารางสอนในวันนี้',
                count: 0,
                scheduleCount: 0
            });
        }

        // Delete existing schedule-based authorizations for today
        await prisma.dailyAuthorization.deleteMany({
            where: {
                date: today,
                source: 'SCHEDULE'
            }
        });

        const authorizations = [];
        for (const schedule of schedules) {
            for (const student of schedule.students || []) {
                authorizations.push({
                    userId: student.id,
                    roomCode: schedule.roomCode,
                    date: today,
                    startTime: schedule.startTime,
                    endTime: schedule.endTime,
                    scheduleId: schedule.id,
                    subjectId: schedule.subjectId,
                    source: 'SCHEDULE'
                });
            }
        }

        const result = await prisma.dailyAuthorization.createMany({
            data: authorizations,
            skipDuplicates: true
        });

        return res.status(200).json({
            message: `ซิงค์สำเร็จ ${result.count} รายการ (ลบข้อมูลเก่าแล้ว)`,
            count: result.count,
            scheduleCount: schedules.length
        });
    } catch (error) {
        console.error('Error syncing today:', error);
        return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการซิงค์' });
    }
};
