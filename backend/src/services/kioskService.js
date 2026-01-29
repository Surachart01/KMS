import * as userRepository from '../repositories/userRepository.js';
import * as keyRepository from '../repositories/keyRepository.js';
import * as bookingRepository from '../repositories/bookingRepository.js';
import * as scheduleRepository from '../repositories/scheduleRepository.js';
import * as systemLogRepository from '../repositories/systemLogRepository.js';
import * as penaltyService from './penaltyService.js';
import prisma from '../repositories/index.js';

/**
 * Kiosk Service - Core business logic สำหรับ Raspberry Pi / ตู้กุญแจ
 */

/**
 * ตรวจสอบสิทธิ์เบิกกุญแจ
 * @param {string} studentCode - รหัสนักศึกษา/บุคลากร
 * @param {string} roomCode - รหัสห้อง
 * @returns {Promise<{ canBorrow: boolean, reason?: string, user?: object, keyInfo?: object, booking?: object }>}
 */
export const verifyBorrowEligibility = async (studentCode, roomCode) => {
    // 1. ตรวจสอบผู้ใช้
    const user = await userRepository.findByStudentCode(studentCode);

    if (!user) {
        return {
            canBorrow: false,
            reason: 'ไม่พบผู้ใช้ในระบบ'
        };
    }

    // 2. ตรวจสอบว่าถูกแบนหรือไม่
    if (user.isBanned) {
        return {
            canBorrow: false,
            reason: 'บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อเจ้าหน้าที่',
            user: {
                id: user.id,
                studentCode: user.studentCode,
                firstName: user.firstName,
                lastName: user.lastName,
                score: user.score,
                isBanned: user.isBanned
            }
        };
    }

    // 3. ตรวจสอบว่ากำลังเบิกกุญแจอื่นอยู่หรือไม่
    const activeBooking = await bookingRepository.findActiveBookingByUser(user.id);

    if (activeBooking) {
        return {
            canBorrow: false,
            reason: `คุณกำลังเบิกกุญแจห้อง ${activeBooking.key.roomCode} อยู่ กรุณาคืนก่อนเบิกใหม่`,
            user: {
                id: user.id,
                studentCode: user.studentCode,
                firstName: user.firstName,
                lastName: user.lastName
            },
            activeBooking: {
                id: activeBooking.id,
                roomCode: activeBooking.key.roomCode,
                slotNumber: activeBooking.key.slotNumber,
                borrowAt: activeBooking.borrowAt,
                dueAt: activeBooking.dueAt
            }
        };
    }

    // 4. ตรวจสอบ "รายการจอง" (RESERVED) สำหรับห้องนี้ ในเวลานี้
    const now = new Date();

    // หา Booking ที่เป็น RESERVED และยังไม่หมดเวลา สำหรับห้องนี้
    const reservedBooking = await prisma.booking.findFirst({
        where: {
            status: 'RESERVED',
            key: {
                roomCode: roomCode
            },
            borrowAt: { lte: now }, // ถึงเวลาเบิกแล้ว
            dueAt: { gt: now }      // ยังไม่หมดเวลาคืน
        },
        include: {
            key: true,
            subject: true,
            user: true, // Owner (Teacher)
            // เราเชื่อมโยง Schedule ผ่านอะไร?
            // Booking Schema: subjectId, userId, keyId. ไม่มี scheduleId
            // แต่เราต้องการตรวจสอบว่า student enroll ในวิชานี้หรือไม่
            // เราสามารถหา Schedule ของ subject นี้ ในเวลานี้ ได้หรือไม่?
        }
    });

    if (!reservedBooking) {
        return {
            canBorrow: false,
            reason: `ไม่พบรายการจองสำหรับห้อง ${roomCode} ในขณะนี้ (ต้องให้เจ้าหน้าที่ Gen Booking ก่อน หรือไม่อยู่ในช่วงเวลา)`,
            user: {
                id: user.id,
                studentCode: user.studentCode,
                firstName: user.firstName,
                lastName: user.lastName
            }
        };
    }

    // 5. ตรวจสอบสิทธิ์ของผู้ใช้กับ Booking นี้
    let isAuthorized = false;

    // 5.1 เป็นอาจารย์เจ้าของวิชา (คนที่ชื่ออยู่ใน Booking)
    if (user.id === reservedBooking.userId) {
        isAuthorized = true;
    }
    // 5.2 เป็นนักศึกษาในคลาส
    else if (user.role === 'STUDENT' && reservedBooking.subjectId) {
        // หา Schedule ที่ตรงกับ booking นี้เพื่อเช็ค students
        // เราใช้ เวลา และ ห้อง และ วิชา เพื่อหา Schedule ที่ถูกต้อง (เพราะ Booking ไม่มี scheduleId)
        const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();

        const schedule = await prisma.schedule.findFirst({
            where: {
                subjectId: reservedBooking.subjectId,
                roomCode: roomCode,
                dayOfWeek: dayOfWeek,
                // เวลาต้อง overlap กับ booking หรือ schedule นี้เป็นต้นกำเนิดของ booking
                // โดยปกติ generate มาจาก schedule ดังนั้นหา schedule ที่ active อยู่
                startTime: { lte: now },
                endTime: { gt: now }
            },
            include: {
                students: true // Load student list
            }
        });

        if (schedule) {
            // เช็คว่า user อยู่ใน list students หรือไม่
            const isStudentEnrolled = schedule.students.some(s => s.id === user.id);
            if (isStudentEnrolled) {
                isAuthorized = true;
            }
        }
    }
    // 5.3 อาจารย์ท่านอื่น? (อาจจะอนุญาตเฉพาะ owner หรือเปล่า? ตาม requirement คือ "คนที่มีสิทธิ์")
    // สมมติว่าเฉพาะ Owner หรือ Student ใน Class ก่อน

    if (!isAuthorized) {
        return {
            canBorrow: false,
            reason: `คุณไม่มีสิทธิ์เบิกกุญแจห้อง ${roomCode} ในเวลานี้ (ไม่ใช่ผู้จองและไม่ได้เรียนในคลาสนี้)`,
            user: {
                id: user.id,
                studentCode: user.studentCode,
                firstName: user.firstName,
                lastName: user.lastName
            }
        };
    }

    // สำเร็จ - สามารถเบิกได้
    return {
        canBorrow: true,
        user: {
            id: user.id,
            studentCode: user.studentCode,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            score: user.score
        },
        keyInfo: {
            id: reservedBooking.key.id,
            roomCode: reservedBooking.key.roomCode,
            slotNumber: reservedBooking.key.slotNumber
        },
        booking: reservedBooking // ส่ง booking กลับไปด้วยเพื่อใช้ update
    };
};

/**
 * ทำการเบิกกุญแจ
 * @param {string} studentCode - รหัสนักศึกษา/บุคลากร
 * @param {string} roomCode - รหัสห้อง
 * @param {string} ipAddress - IP address ของตู้
 * @returns {Promise<{ success: boolean, booking?: object, keySlotNumber?: number, error?: string }>}
 */
export const borrowKey = async (studentCode, roomCode, ipAddress = null) => {
    // Verify eligibility ก่อน
    const eligibility = await verifyBorrowEligibility(studentCode, roomCode);

    if (!eligibility.canBorrow) {
        return {
            success: false,
            error: eligibility.reason
        };
    }

    try {
        // ใช้ transaction เพื่อความปลอดภัย
        const result = await prisma.$transaction(async (tx) => {
            const now = new Date();

            // อัพเดต Booking เดิมที่เป็น RESERVED ให้เป็น BORROWED
            // และเปลี่ยน userId เป็นคนที่มาเอา (เพื่อเก็บ record ว่าใครเอาไป)
            const updatedBooking = await tx.booking.update({
                where: { id: eligibility.booking.id },
                data: {
                    status: 'BORROWED',
                    userId: eligibility.user.id, // เปลี่ยนเป็นคนที่มาเบิกจริง
                    borrowAt: now, // อัพเดตเวลาเบิกจริง
                    // dueAt คงไว้ตามเดิม (จบคาบ)
                },
                include: {
                    user: true,
                    key: true,
                    subject: true
                }
            });

            // บันทึก System Log
            await tx.systemLog.create({
                data: {
                    userId: eligibility.user.id,
                    action: 'BORROW_KEY',
                    details: JSON.stringify({
                        bookingId: updatedBooking.id,
                        roomCode: roomCode,
                        slotNumber: eligibility.keyInfo.slotNumber,
                        dueAt: updatedBooking.dueAt,
                        originalReservedBy: eligibility.booking.userId // เก็บ log ว่าเดิมจองโดยใคร
                    }),
                    ipAddress
                }
            });

            return updatedBooking;
        });

        return {
            success: true,
            booking: {
                id: result.id,
                roomCode: result.key.roomCode,
                slotNumber: result.key.slotNumber,
                borrowAt: result.borrowAt,
                dueAt: result.dueAt,
                user: {
                    studentCode: result.user.studentCode,
                    firstName: result.user.firstName,
                    lastName: result.user.lastName
                }
            },
            keySlotNumber: result.key.slotNumber
        };

    } catch (error) {
        console.error('Error in borrowKey:', error);
        return {
            success: false,
            error: 'เกิดข้อผิดพลาดในการเบิกกุญแจ กรุณาลองใหม่'
        };
    }
};

/**
 * ตรวจสอบสิทธิ์คืนกุญแจ
 * @param {string} studentCode - รหัสนักศึกษา/บุคลากร
 * @returns {Promise<{ canReturn: boolean, reason?: string, activeBooking?: object, keySlotNumber?: number }>}
 */
export const verifyReturnEligibility = async (studentCode) => {
    // 1. ตรวจสอบผู้ใช้
    const user = await userRepository.findByStudentCode(studentCode);

    if (!user) {
        return {
            canReturn: false,
            reason: 'ไม่พบผู้ใช้ในระบบ'
        };
    }

    // 2. หา active booking
    const activeBooking = await bookingRepository.findActiveBookingByUser(user.id);

    if (!activeBooking) {
        return {
            canReturn: false,
            reason: 'คุณไม่มีกุญแจที่ต้องคืน',
            user: {
                id: user.id,
                studentCode: user.studentCode,
                firstName: user.firstName,
                lastName: user.lastName
            }
        };
    }

    // คำนวณว่าจะสายหรือไม่
    const now = new Date();
    const isOverdue = now > activeBooking.dueAt;
    const overdueMinutes = isOverdue ? Math.floor((now - activeBooking.dueAt) / (1000 * 60)) : 0;

    return {
        canReturn: true,
        user: {
            id: user.id,
            studentCode: user.studentCode,
            firstName: user.firstName,
            lastName: user.lastName,
            score: user.score
        },
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
    };
};

/**
 * ทำการคืนกุญแจ
 * @param {string} studentCode - รหัสนักศึกษา/บุคลากร
 * @param {string} ipAddress - IP address ของตู้
 * @returns {Promise<{ success: boolean, booking?: object, lateMinutes?: number, penaltyScore?: number, error?: string }>}
 */
export const returnKey = async (studentCode, ipAddress = null) => {
    // Verify eligibility ก่อน
    const eligibility = await verifyReturnEligibility(studentCode);

    if (!eligibility.canReturn) {
        return {
            success: false,
            error: eligibility.reason
        };
    }

    try {
        const now = new Date();
        const activeBooking = eligibility.activeBooking;

        // คำนวณ penalty
        const bookingData = await bookingRepository.findById(activeBooking.id);
        const penaltyResult = await penaltyService.calculatePenalty(
            bookingData.borrowAt,
            bookingData.dueAt,
            now
        );

        // ใช้ transaction
        const result = await prisma.$transaction(async (tx) => {
            // อัพเดต Booking
            const updatedBooking = await tx.booking.update({
                where: { id: activeBooking.id },
                data: {
                    returnAt: now,
                    status: penaltyResult.isLate ? 'LATE' : 'RETURNED',
                    lateMinutes: penaltyResult.lateMinutes,
                    penaltyScore: penaltyResult.penaltyScore
                },
                include: {
                    user: true,
                    key: true
                }
            });

            // ถ้าสาย ตัดคะแนนและบันทึก log
            if (penaltyResult.isLate && penaltyResult.penaltyScore > 0) {
                // หักคะแนน
                const newScore = Math.max(0, updatedBooking.user.score - penaltyResult.penaltyScore);
                const shouldBan = newScore <= 0;

                await tx.user.update({
                    where: { id: eligibility.user.id },
                    data: {
                        score: newScore,
                        isBanned: shouldBan
                    }
                });

                // สร้าง Penalty Log
                await tx.penaltyLog.create({
                    data: {
                        userId: eligibility.user.id,
                        bookingId: activeBooking.id,
                        type: 'LATE_RETURN',
                        scoreCut: penaltyResult.penaltyScore,
                        reason: `คืนกุญแจห้อง ${activeBooking.roomCode} ช้า ${penaltyResult.lateMinutes} นาที`
                    }
                });
            }

            // บันทึก System Log
            await tx.systemLog.create({
                data: {
                    userId: eligibility.user.id,
                    action: 'RETURN_KEY',
                    details: JSON.stringify({
                        bookingId: activeBooking.id,
                        roomCode: activeBooking.roomCode,
                        slotNumber: activeBooking.slotNumber,
                        lateMinutes: penaltyResult.lateMinutes,
                        penaltyScore: penaltyResult.penaltyScore,
                        isLate: penaltyResult.isLate
                    }),
                    ipAddress
                }
            });

            return updatedBooking;
        });

        // ดึงคะแนนล่าสุด
        const updatedUser = await userRepository.findById(eligibility.user.id);

        return {
            success: true,
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
            user: {
                studentCode: eligibility.user.studentCode,
                firstName: eligibility.user.firstName,
                lastName: eligibility.user.lastName,
                currentScore: updatedUser.score,
                isBanned: updatedUser.isBanned
            }
        };

    } catch (error) {
        console.error('Error in returnKey:', error);
        return {
            success: false,
            error: 'เกิดข้อผิดพลาดในการคืนกุญแจ กรุณาลองใหม่'
        };
    }
};

/**
 * ดึงรายการห้องที่มีกุญแจว่าง
 * @returns {Promise<{ roomCode: string, availableCount: number }[]>}
 */
export const getAvailableRooms = async () => {
    return keyRepository.getAvailableRooms();
};

/**
 * ดึงสถานะกุญแจทุกห้อง
 * @returns {Promise<{ roomCode: string, totalKeys: number, availableKeys: number }[]>}
 */
export const getRoomKeyStatus = async () => {
    return keyRepository.getRoomKeyStatus();
};
