import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Kiosk Controller - API endpoints สำหรับ Raspberry Pi / ตู้กุญแจ
 */

// ==================== Helper Functions ====================

/**
 * คำนวณ penalty จากเวลาคืน
 */
const calculatePenalty = async (borrowAt, dueAt, returnAt) => {
    const config = await prisma.penaltyConfig.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
    });

    const graceMinutes = config?.graceMinutes || 30;
    const scorePerInterval = config?.scorePerInterval || 5;
    const intervalMinutes = config?.intervalMinutes || 15;

    const diffMs = new Date(returnAt).getTime() - new Date(dueAt).getTime();
    const lateMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));

    if (lateMinutes <= graceMinutes) {
        return { lateMinutes: 0, penaltyScore: 0, isLate: false };
    }

    const actualLateMinutes = lateMinutes - graceMinutes;
    const intervals = Math.ceil(actualLateMinutes / intervalMinutes);
    const penaltyScore = intervals * scorePerInterval;

    return { lateMinutes: actualLateMinutes, penaltyScore, isLate: true };
};

/**
 * ตรวจสอบสิทธิ์เบิกกุญแจ (internal helper)
 */
const verifyBorrowEligibilityHelper = async (studentCode, roomCode) => {
    const user = await prisma.user.findUnique({ where: { studentCode } });
    if (!user) return { canBorrow: false, reason: 'ไม่พบผู้ใช้ในระบบ' };

    if (user.isBanned) {
        return {
            canBorrow: false,
            reason: 'บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อเจ้าหน้าที่',
            user: { id: user.id, studentCode: user.studentCode, firstName: user.firstName, lastName: user.lastName, score: user.score, isBanned: user.isBanned }
        };
    }

    // Check active booking
    const activeBooking = await prisma.booking.findFirst({
        where: { userId: user.id, status: 'BORROWED' },
        include: { key: true, subject: true }
    });

    if (activeBooking) {
        return {
            canBorrow: false,
            reason: `คุณกำลังเบิกกุญแจห้อง ${activeBooking.key.roomCode} อยู่ กรุณาคืนก่อนเบิกใหม่`,
            user: { id: user.id, studentCode: user.studentCode, firstName: user.firstName, lastName: user.lastName },
            activeBooking: { id: activeBooking.id, roomCode: activeBooking.key.roomCode, slotNumber: activeBooking.key.slotNumber }
        };
    }

    // Check reserved booking
    const now = new Date();
    const reservedBooking = await prisma.booking.findFirst({
        where: {
            status: 'RESERVED',
            key: { roomCode },
            borrowAt: { lte: now },
            dueAt: { gt: now }
        },
        include: { key: true, subject: true, user: true }
    });

    if (!reservedBooking) {
        return {
            canBorrow: false,
            reason: `ไม่พบรายการจองสำหรับห้อง ${roomCode} ในขณะนี้`,
            user: { id: user.id, studentCode: user.studentCode, firstName: user.firstName, lastName: user.lastName }
        };
    }

    // Check authorization
    let isAuthorized = user.id === reservedBooking.userId;

    if (!isAuthorized && user.role === 'STUDENT' && reservedBooking.subjectId) {
        const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
        const schedule = await prisma.schedule.findFirst({
            where: {
                subjectId: reservedBooking.subjectId,
                roomCode: roomCode,
                dayOfWeek: dayOfWeek
            },
            include: { students: true }
        });

        if (schedule) {
            isAuthorized = schedule.students.some(s => s.id === user.id);
        }
    }

    if (!isAuthorized) {
        return {
            canBorrow: false,
            reason: `คุณไม่มีสิทธิ์เบิกกุญแจห้อง ${roomCode} ในเวลานี้`,
            user: { id: user.id, studentCode: user.studentCode, firstName: user.firstName, lastName: user.lastName }
        };
    }

    return {
        canBorrow: true,
        user: { id: user.id, studentCode: user.studentCode, firstName: user.firstName, lastName: user.lastName, role: user.role, score: user.score },
        keyInfo: { id: reservedBooking.key.id, roomCode: reservedBooking.key.roomCode, slotNumber: reservedBooking.key.slotNumber },
        booking: reservedBooking
    };
};

// ==================== Controller Functions ====================

/**
 * POST /api/kiosk/verify-borrow
 */
export const verifyBorrow = async (req, res) => {
    try {
        const { studentCode, roomCode } = req.body;

        if (!studentCode || !roomCode) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุรหัสนักศึกษาและรหัสห้อง' });
        }

        const result = await verifyBorrowEligibilityHelper(studentCode, roomCode);

        return res.status(200).json({
            success: result.canBorrow,
            message: result.canBorrow ? 'สามารถเบิกกุญแจได้' : result.reason,
            data: result
        });
    } catch (error) {
        console.error('Error in verifyBorrow:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์' });
    }
};

/**
 * POST /api/kiosk/borrow
 */
export const borrowKey = async (req, res) => {
    try {
        const { studentCode, roomCode } = req.body;

        if (!studentCode || !roomCode) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุรหัสนักศึกษาและรหัสห้อง' });
        }

        const ipAddress = req.ip || req.connection?.remoteAddress || null;
        const eligibility = await verifyBorrowEligibilityHelper(studentCode, roomCode);

        if (!eligibility.canBorrow) {
            return res.status(400).json({ success: false, message: eligibility.reason });
        }

        const result = await prisma.$transaction(async (tx) => {
            const now = new Date();

            const updatedBooking = await tx.booking.update({
                where: { id: eligibility.booking.id },
                data: {
                    status: 'BORROWED',
                    userId: eligibility.user.id,
                    borrowAt: now
                },
                include: { user: true, key: true, subject: true }
            });

            await tx.systemLog.create({
                data: {
                    userId: eligibility.user.id,
                    action: 'BORROW_KEY',
                    details: JSON.stringify({
                        bookingId: updatedBooking.id,
                        roomCode: roomCode,
                        slotNumber: eligibility.keyInfo.slotNumber,
                        dueAt: updatedBooking.dueAt,
                        originalReservedBy: eligibility.booking.userId
                    }),
                    ipAddress
                }
            });

            return updatedBooking;
        });

        return res.status(201).json({
            success: true,
            message: 'เบิกกุญแจสำเร็จ',
            data: {
                booking: {
                    id: result.id,
                    roomCode: result.key.roomCode,
                    slotNumber: result.key.slotNumber,
                    borrowAt: result.borrowAt,
                    dueAt: result.dueAt,
                    user: { studentCode: result.user.studentCode, firstName: result.user.firstName, lastName: result.user.lastName }
                },
                keySlotNumber: result.key.slotNumber
            }
        });
    } catch (error) {
        console.error('Error in borrowKey:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเบิกกุญแจ' });
    }
};

/**
 * POST /api/kiosk/verify-return
 */
export const verifyReturn = async (req, res) => {
    try {
        const { studentCode } = req.body;

        if (!studentCode) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุรหัสนักศึกษา' });
        }

        const user = await prisma.user.findUnique({ where: { studentCode } });
        if (!user) {
            return res.status(200).json({ success: false, message: 'ไม่พบผู้ใช้ในระบบ', data: { canReturn: false } });
        }

        const activeBooking = await prisma.booking.findFirst({
            where: { userId: user.id, status: 'BORROWED' },
            include: { key: true, subject: true }
        });

        if (!activeBooking) {
            return res.status(200).json({
                success: false,
                message: 'คุณไม่มีกุญแจที่ต้องคืน',
                data: { canReturn: false, user: { id: user.id, studentCode, firstName: user.firstName, lastName: user.lastName } }
            });
        }

        const now = new Date();
        const isOverdue = now > activeBooking.dueAt;
        const overdueMinutes = isOverdue ? Math.floor((now - activeBooking.dueAt) / (1000 * 60)) : 0;

        return res.status(200).json({
            success: true,
            message: 'พร้อมคืนกุญแจ',
            data: {
                canReturn: true,
                user: { id: user.id, studentCode, firstName: user.firstName, lastName: user.lastName, score: user.score },
                activeBooking: {
                    id: activeBooking.id,
                    roomCode: activeBooking.key.roomCode,
                    slotNumber: activeBooking.key.slotNumber,
                    borrowAt: activeBooking.borrowAt,
                    dueAt: activeBooking.dueAt,
                    subjectName: activeBooking.subject?.name || null
                },
                keySlotNumber: activeBooking.key.slotNumber,
                isOverdue,
                overdueMinutes
            }
        });
    } catch (error) {
        console.error('Error in verifyReturn:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบ' });
    }
};

/**
 * POST /api/kiosk/return
 */
export const returnKey = async (req, res) => {
    try {
        const { studentCode } = req.body;

        if (!studentCode) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุรหัสนักศึกษา' });
        }

        const user = await prisma.user.findUnique({ where: { studentCode } });
        if (!user) {
            return res.status(400).json({ success: false, message: 'ไม่พบผู้ใช้ในระบบ' });
        }

        const activeBooking = await prisma.booking.findFirst({
            where: { userId: user.id, status: 'BORROWED' },
            include: { key: true, subject: true }
        });

        if (!activeBooking) {
            return res.status(400).json({ success: false, message: 'คุณไม่มีกุญแจที่ต้องคืน' });
        }

        const ipAddress = req.ip || req.connection?.remoteAddress || null;
        const now = new Date();
        const penaltyResult = await calculatePenalty(activeBooking.borrowAt, activeBooking.dueAt, now);

        const result = await prisma.$transaction(async (tx) => {
            const updatedBooking = await tx.booking.update({
                where: { id: activeBooking.id },
                data: {
                    returnAt: now,
                    status: penaltyResult.isLate ? 'LATE' : 'RETURNED',
                    lateMinutes: penaltyResult.lateMinutes,
                    penaltyScore: penaltyResult.penaltyScore
                },
                include: { user: true, key: true }
            });

            if (penaltyResult.isLate && penaltyResult.penaltyScore > 0) {
                const newScore = Math.max(0, updatedBooking.user.score - penaltyResult.penaltyScore);
                const shouldBan = newScore <= 0;

                await tx.user.update({
                    where: { id: user.id },
                    data: { score: newScore, isBanned: shouldBan }
                });

                await tx.penaltyLog.create({
                    data: {
                        userId: user.id,
                        bookingId: activeBooking.id,
                        type: 'LATE_RETURN',
                        scoreCut: penaltyResult.penaltyScore,
                        reason: `คืนกุญแจห้อง ${activeBooking.key.roomCode} ช้า ${penaltyResult.lateMinutes} นาที`
                    }
                });
            }

            await tx.systemLog.create({
                data: {
                    userId: user.id,
                    action: 'RETURN_KEY',
                    details: JSON.stringify({
                        bookingId: activeBooking.id,
                        roomCode: activeBooking.key.roomCode,
                        slotNumber: activeBooking.key.slotNumber,
                        lateMinutes: penaltyResult.lateMinutes,
                        penaltyScore: penaltyResult.penaltyScore,
                        isLate: penaltyResult.isLate
                    }),
                    ipAddress
                }
            });

            return updatedBooking;
        });

        const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });

        let message = 'คืนกุญแจสำเร็จ';
        if (penaltyResult.isLate) {
            message = `คืนกุญแจสำเร็จ (สาย ${penaltyResult.lateMinutes} นาที, หักคะแนน ${penaltyResult.penaltyScore} คะแนน)`;
        }

        return res.status(200).json({
            success: true,
            message,
            data: {
                booking: {
                    id: result.id,
                    roomCode: result.key.roomCode,
                    slotNumber: result.key.slotNumber,
                    borrowAt: result.borrowAt,
                    dueAt: result.dueAt,
                    returnAt: result.returnAt,
                    status: result.status
                },
                lateMinutes: penaltyResult.lateMinutes,
                penaltyScore: penaltyResult.penaltyScore,
                isLate: penaltyResult.isLate,
                user: { studentCode, firstName: user.firstName, lastName: user.lastName, currentScore: updatedUser.score, isBanned: updatedUser.isBanned }
            }
        });
    } catch (error) {
        console.error('Error in returnKey:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการคืนกุญแจ' });
    }
};

/**
 * GET /api/kiosk/rooms
 */
export const getAvailableRooms = async (req, res) => {
    try {
        const rooms = await prisma.key.groupBy({
            by: ['roomCode'],
            where: {
                isActive: true,
                bookings: { none: { status: 'BORROWED' } }
            },
            _count: { id: true }
        });

        const result = rooms.map(r => ({ roomCode: r.roomCode, availableCount: r._count.id }));

        return res.status(200).json({ success: true, message: 'ดึงรายการห้องสำเร็จ', data: result });
    } catch (error) {
        console.error('Error in getAvailableRooms:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
};

/**
 * GET /api/kiosk/rooms/status
 */
export const getRoomKeyStatus = async (req, res) => {
    try {
        const allKeys = await prisma.key.findMany({
            where: { isActive: true },
            include: { bookings: { where: { status: 'BORROWED' } } }
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

        const result = Array.from(roomMap.entries()).map(([roomCode, data]) => ({
            roomCode,
            totalKeys: data.total,
            availableKeys: data.available
        }));

        return res.status(200).json({ success: true, message: 'ดึงสถานะห้องสำเร็จ', data: result });
    } catch (error) {
        console.error('Error in getRoomKeyStatus:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
};
