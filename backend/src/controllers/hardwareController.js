import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ==================== ฟังก์ชันช่วยเหลือ (Helper Functions) ====================

/**
 * คำนวณค่าปรับจากเวลาคืนกุญแจ
 * - ดึง PenaltyConfig ที่ active อยู่
 * - ถ้าคืนช้าเกิน graceMinutes → เริ่มหักคะแนน
 * - คำนวณจำนวน interval ที่สาย × คะแนนต่อ interval
 * 
 * @param {Date} borrowAt - เวลาที่เบิก
 * @param {Date} dueAt - เวลาที่ต้องคืน
 * @param {Date} returnAt - เวลาที่คืนจริง
 * @returns {{ lateMinutes: number, penaltyScore: number, isLate: boolean }}
 */
const calculatePenalty = async (borrowAt, dueAt, returnAt) => {
    // ดึงการตั้งค่า Penalty ที่ใช้งานอยู่ (เอาอันล่าสุด)
    const config = await prisma.penaltyConfig.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
    });

    // ค่าเริ่มต้นถ้าไม่มี config
    const graceMinutes = config?.graceMinutes || 30; // เวลาผ่อนผัน (นาที)
    const scorePerInterval = config?.scorePerInterval || 5; // หักกี่คะแนนต่อรอบ
    const intervalMinutes = config?.intervalMinutes || 15; // ทุกกี่นาทีที่หัก

    // คำนวณเวลาที่สาย (มิลลิวินาที → นาที)
    const diffMs = new Date(returnAt).getTime() - new Date(dueAt).getTime();
    const lateMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));

    // ถ้าสายไม่เกิน graceMinutes → ไม่หักคะแนน
    if (lateMinutes <= graceMinutes) {
        return { lateMinutes: 0, penaltyScore: 0, isLate: false };
    }

    // คำนวณเวลาสายจริง (หัก graceMinutes ออก)
    const actualLateMinutes = lateMinutes - graceMinutes;
    // จำนวนรอบที่ต้องหักคะแนน (ปัดขึ้น)
    const intervals = Math.ceil(actualLateMinutes / intervalMinutes);
    const penaltyScore = intervals * scorePerInterval;

    return { lateMinutes: actualLateMinutes, penaltyScore, isLate: true };
};

/**
 * ดึงข้อมูลวันที่ปัจจุบันในรูปแบบ Date (เฉพาะวันที่ ไม่มีเวลา)
 * ใช้สำหรับเปรียบเทียบกับ DailyAuthorization.date
 */
const getTodayRange = () => {
    const now = new Date();
    // Start of day in Local Time
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    // End of day in Local Time
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { startOfDay, endOfDay };
};

// ==================== API Endpoints ====================

/**
 * GET /api/hardware/keys
 * ดึงรายชื่อกุญแจทั้งหมดในระบบ
 * - ใช้สำหรับให้เครื่องสแกนรู้ว่ามีกุญแจอะไรบ้าง
 * - ส่งคืนข้อมูลกุญแจพร้อมสถานะการเบิก
 */
export const getAllKey = async (req, res) => {
    try {
        console.log("🔑 [Hardware] getAllKey: กำลังดึงรายชื่อกุญแจ...");

        const keys = await prisma.key.findMany({
            where: { isActive: true },
            include: {
                // รวมข้อมูล booking ที่กำลังเบิกอยู่ เพื่อดูว่ากุญแจว่างไหม
                bookings: {
                    where: { status: "BORROWED" },
                    select: {
                        id: true,
                        userId: true,
                        borrowAt: true,
                        dueAt: true,
                        user: {
                            select: { studentCode: true, firstName: true, lastName: true },
                        },
                    },
                },
            },
        });

        // แปลงข้อมูลให้อ่านง่ายสำหรับเครื่อง Hardware
        const result = keys.map((key) => ({
            id: key.id,
            roomCode: key.roomCode,
            slotNumber: key.slotNumber,
            isAvailable: key.bookings.length === 0, // ว่างถ้าไม่มีคนเบิก
            currentBorrower: key.bookings.length > 0 ? key.bookings[0].user : null,
        }));

        return res.status(200).json({
            success: true,
            message: "ดึงรายชื่อกุญแจสำเร็จ",
            data: result,
        });
    } catch (error) {
        console.error("❌ [Hardware] getAllKey: Error:", error);
        return res.status(500).json({
            success: false,
            message: "เกิดข้อผิดพลาดในการดึงรายชื่อกุญแจ",
        });
    }
};

/**
 * POST /api/hardware/identify
 * ระบุตัวตนผู้ใช้จากเครื่องสแกนหน้า
 * 
 * - รับ studentCode จากเครื่องสแกน (ZKTeco ส่งรหัสมา)
 * - ตรวจสอบผู้ใช้ในระบบ + สถานะแบน
 * - ส่งคืนข้อมูลผู้ใช้ + สถานะปัจจุบัน (มีกุญแจอยู่ไหม, มีสิทธิ์ห้องไหนบ้าง)
 * 
 * Body: { studentCode: string }
 */
export const identifyUser = async (req, res) => {
    try {
        const { studentCode } = req.body;
        console.log(`👤 [Hardware] identify: กำลังระบุตัวตน studentCode=${studentCode}`);

        // ตรวจว่ามี studentCode มาไหม
        if (!studentCode) {
            return res.status(400).json({
                success: false,
                message: "กรุณาระบุรหัสนักศึกษา/บุคลากร (studentCode)",
            });
        }

        // ค้นหาผู้ใช้จากรหัส
        const user = await prisma.user.findUnique({
            where: { studentCode },
            include: {
                section: { include: { major: true } },
            },
        });

        // ไม่พบผู้ใช้ในระบบ
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "ไม่พบผู้ใช้ในระบบ กรุณาลงทะเบียนก่อน",
            });
        }

        // ตรวจสถานะแบน
        if (user.isBanned) {
            return res.status(403).json({
                success: false,
                message: "บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อเจ้าหน้าที่",
                data: {
                    user: {
                        id: user.id,
                        studentCode: user.studentCode,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        role: user.role,
                        score: user.score,
                        isBanned: true,
                    },
                },
            });
        }

        // ค้นหา Booking ที่กำลังเบิกอยู่ (ถ้ามี)
        const activeBooking = await prisma.booking.findFirst({
            where: { userId: user.id, status: "BORROWED" },
            include: { key: true, subject: true },
        });

        // ค้นหาสิทธิ์เบิกกุญแจประจำวัน (DailyAuthorization ของวันนี้)
        const { startOfDay, endOfDay } = getTodayRange();
        const now = new Date();

        const todayAuthorizations = await prisma.dailyAuthorization.findMany({
            where: {
                userId: user.id,
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                startTime: { lte: now },
                endTime: { gt: now },
            },
            select: {
                id: true,
                roomCode: true,
                startTime: true,
                endTime: true,
                source: true,
                subject: { select: { code: true, name: true } },
            },
        });
        const resData = {
            user: {
                id: user.id,
                studentCode: user.studentCode,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                score: user.score,
                isBanned: user.isBanned,
                major: user.section?.major?.name || null,
                section: user.section?.name || null,
            },
            // สถานะกุญแจที่กำลังเบิกอยู่ (null ถ้าไม่มี)
            activeBooking: activeBooking
                ? {
                    id: activeBooking.id,
                    roomCode: activeBooking.key.roomCode,
                    slotNumber: activeBooking.key.slotNumber,
                    borrowAt: activeBooking.borrowAt,
                    dueAt: activeBooking.dueAt,
                    subjectName: activeBooking.subject?.name || null,
                }
                : null,
            // สิทธิ์เบิกกุญแจที่ใช้ได้ตอนนี้
            authorizedRooms: todayAuthorizations,
            // สถานะรวม: กำลังเบิกอยู่ หรือ พร้อมเบิก (มีสิทธิ์) หรือ ต้องระบุเหตุผล (ไม่มีสิทธิ์)
            status: activeBooking
                ? "HAS_KEY"
                : todayAuthorizations.length > 0
                    ? "READY_TO_BORROW"
                    : "NEED_REASON",
        };

        return res.status(200).json({
            success: true,
            message: "ระบุตัวตนสำเร็จ",
            data: resData,
        });
    } catch (error) {
        console.error("❌ [Hardware] identify: Error:", error);
        return res.status(500).json({
            success: false,
            message: "เกิดข้อผิดพลาดในการระบุตัวตน",
        });
    }
};

/**
 * POST /api/hardware/borrow
 * ยืมกุญแจ (เบิกกุญแจ)
 * 
 * ขั้นตอน:
 * 1. ตรวจสอบผู้ใช้ + สถานะแบน
 * 2. ตรวจว่าไม่มีกุญแจค้างอยู่แล้ว
 * 3. ตรวจสิทธิ์จาก DailyAuthorization (ห้อง + วันนี้ + เวลาปัจจุบัน)
 * 4. ค้นหา Booking RESERVED สำหรับห้องนี้
 * 5. เปลี่ยนสถานะเป็น BORROWED + บันทึก log
 * 
 * Body: { studentCode: string, roomCode: string }
 */
export const borrowKey = async (req, res) => {
    try {
        // Trigger generic restart
        const { studentCode, roomCode } = req.body;
        console.log(`📥 [Hardware] borrow: studentCode=${studentCode}, roomCode=${roomCode}`);

        // ตรวจ input
        if (!studentCode || !roomCode) {
            return res.status(400).json({
                success: false,
                message: "กรุณาระบุรหัสนักศึกษา (studentCode) และรหัสห้อง (roomCode)",
            });
        }

        // === ขั้นตอนที่ 1: ค้นหาและตรวจสอบผู้ใช้ ===
        const user = await prisma.user.findUnique({ where: { studentCode } });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "ไม่พบผู้ใช้ในระบบ",
            });
        }

        if (user.isBanned) {
            return res.status(403).json({
                success: false,
                message: "บัญชีของคุณถูกระงับ กรุณาติดต่อเจ้าหน้าที่",
            });
        }

        // === ขั้นตอนที่ 2: ตรวจว่ายังไม่ได้เบิกกุญแจอื่นค้างอยู่ ===
        const existingBorrow = await prisma.booking.findFirst({
            where: { userId: user.id, status: "BORROWED" },
            include: { key: true },
        });

        if (existingBorrow) {
            return res.status(400).json({
                success: false,
                message: `คุณกำลังเบิกกุญแจห้อง ${existingBorrow.key.roomCode} อยู่ กรุณาคืนก่อนเบิกใหม่`,
                data: {
                    activeBooking: {
                        roomCode: existingBorrow.key.roomCode,
                        slotNumber: existingBorrow.key.slotNumber,
                    },
                },
            });
        }

        // === ขั้นตอนที่ 3: ตรวจสิทธิ์จาก DailyAuthorization ===
        const { startOfDay, endOfDay } = getTodayRange();
        const now = new Date();

        console.log(`🔍 [Hardware] borrow: Checking authorization...`);
        console.log(`   userId: ${user.id}`);
        console.log(`   roomCode: ${roomCode}`);
        console.log(`   range: ${startOfDay.toISOString()} - ${endOfDay.toISOString()}`);
        console.log(`   now: ${now.toISOString()}`);

        // ดึง authorization ทั้งหมดของ user ในวันนี้เพื่อ debug
        const allAuthsToday = await prisma.dailyAuthorization.findMany({
            where: {
                userId: user.id,
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                },
            },
        });
        console.log(`   All auths today: ${JSON.stringify(allAuthsToday, null, 2)}`);

        const authorization = await prisma.dailyAuthorization.findFirst({
            where: {
                userId: user.id,
                roomCode: roomCode,
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                startTime: { lte: now },
                endTime: { gt: now },
            },
        });

        console.log(`   Authorization found: ${authorization ? JSON.stringify(authorization) : 'NONE'}`);

        // ถ้าไม่มีสิทธิ์ → ต้องมีเหตุผล (Reason) มาด้วย
        if (!authorization && !req.body.reason) {
            return res.status(403).json({
                success: false,
                message: "REQUIRE_REASON", // ส่ง code พิเศษเพื่อให้ Frontend รู้ว่าต้องถามเหตุผล
                error_code: "REQUIRE_REASON",
            });
        }

        // === ขั้นตอนที่ 4: ค้นหากุญแจในระบบ ===
        const key = await prisma.key.findUnique({
            where: { roomCode },
        });

        if (!key || !key.isActive) {
            return res.status(404).json({
                success: false,
                message: `ไม่พบกุญแจห้อง ${roomCode} ในระบบ หรือกุญแจถูกปิดใช้งาน`,
            });
        }

        // === ขั้นตอนที่ 5: สร้าง Booking (ไม่ต้องจองล่วงหน้า) ===
        // ถ้าไม่มี authoriztion ใช้เหตุผลที่ส่งมา
        const bookingSource = authorization ? "FACE_SCANNER" : "FACE_SCANNER_WITH_REASON";
        const bookingReason = authorization ? null : req.body.reason;

        // กำหนดเวลาคืน (เช่น 4 ชั่วโมง) หรือตาม Config
        const dueAt = new Date(now.getTime() + 4 * 60 * 60 * 1000);

        const ipAddress = req.ip || req.connection?.remoteAddress || null;

        const result = await prisma.$transaction(async (tx) => {
            // สร้าง Booking ใหม่เลย (สถานะ BORROWED)
            const newBooking = await tx.booking.create({
                data: {
                    userId: user.id,
                    keyId: key.id,
                    status: "BORROWED",
                    borrowAt: now,
                    dueAt: dueAt,
                    reason: bookingReason,
                },
                include: { user: true, key: true, subject: true },
            });

            // บันทึก log การเบิกกุญแจ
            await tx.systemLog.create({
                data: {
                    userId: user.id,
                    action: "HARDWARE_BORROW_KEY",
                    details: JSON.stringify({
                        bookingId: newBooking.id,
                        roomCode: roomCode,
                        slotNumber: key.slotNumber,
                        dueAt: newBooking.dueAt,
                        authorizationId: authorization?.id || null,
                        reason: bookingReason,
                        source: bookingSource,
                    }),
                    ipAddress,
                },
            });

            return newBooking;
        });

        console.log(`✅ [Hardware] borrow: สำเร็จ - ${user.firstName} ${user.lastName} เบิกห้อง ${roomCode}`);

        return res.status(201).json({
            success: true,
            message: "เบิกกุญแจสำเร็จ",
            data: {
                booking: {
                    id: result.id,
                    roomCode: result.key.roomCode,
                    slotNumber: result.key.slotNumber,
                    borrowAt: result.borrowAt,
                    dueAt: result.dueAt,
                    subjectName: result.subject?.name || null,
                },
                user: {
                    studentCode: user.studentCode,
                    firstName: user.firstName,
                    lastName: user.lastName,
                },
                keySlotNumber: result.key.slotNumber, // ช่องตู้ที่ต้องเปิด
            },
        });
    } catch (error) {
        console.error("❌ [Hardware] borrow: Error:", error);
        return res.status(500).json({
            success: false,
            message: "เกิดข้อผิดพลาดในการเบิกกุญแจ",
        });
    }
};

/**
 * POST /api/hardware/return
 * คืนกุญแจ
 * 
 * ขั้นตอน:
 * 1. ตรวจสอบผู้ใช้
 * 2. ค้นหา Booking ที่มีสถานะ BORROWED
 * 3. คำนวณค่าปรับ (ถ้าคืนช้า)
 * 4. อัพเดทสถานะเป็น RETURNED หรือ LATE
 * 5. หักคะแนน + แบนถ้าคะแนนเหลือ 0
 * 6. บันทึก PenaltyLog + SystemLog
 * 
 * Body: { studentCode: string }
 */
export const returnKey = async (req, res) => {
    try {
        const { studentCode } = req.body;
        console.log(`📤 [Hardware] return: studentCode=${studentCode}`);

        // ตรวจ input
        if (!studentCode) {
            return res.status(400).json({
                success: false,
                message: "กรุณาระบุรหัสนักศึกษา (studentCode)",
            });
        }

        // === ขั้นตอนที่ 1: ค้นหาผู้ใช้ ===
        const user = await prisma.user.findUnique({ where: { studentCode } });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "ไม่พบผู้ใช้ในระบบ",
            });
        }

        // === ขั้นตอนที่ 2: ค้นหา Booking ที่กำลังเบิกอยู่ ===
        const activeBooking = await prisma.booking.findFirst({
            where: { userId: user.id, status: "BORROWED" },
            include: { key: true, subject: true },
        });

        if (!activeBooking) {
            return res.status(400).json({
                success: false,
                message: "คุณไม่มีกุญแจที่ต้องคืน",
            });
        }

        // === ขั้นตอนที่ 3: คำนวณค่าปรับ ===
        const now = new Date();
        const ipAddress = req.ip || req.connection?.remoteAddress || null;
        const penaltyResult = await calculatePenalty(
            activeBooking.borrowAt,
            activeBooking.dueAt,
            now
        );

        // === ขั้นตอนที่ 4-6: อัพเดท Booking + หักคะแนน + บันทึก log (Transaction) ===
        const result = await prisma.$transaction(async (tx) => {
            // อัพเดทสถานะ Booking
            const updatedBooking = await tx.booking.update({
                where: { id: activeBooking.id },
                data: {
                    returnAt: now,
                    status: penaltyResult.isLate ? "LATE" : "RETURNED",
                    lateMinutes: penaltyResult.lateMinutes,
                    penaltyScore: penaltyResult.penaltyScore,
                },
                include: { user: true, key: true },
            });

            // ถ้าคืนช้า → หักคะแนน + แบนถ้าจำเป็น
            if (penaltyResult.isLate && penaltyResult.penaltyScore > 0) {
                const newScore = Math.max(0, user.score - penaltyResult.penaltyScore);
                const shouldBan = newScore <= 0; // แบนถ้าคะแนนเหลือ 0

                // อัพเดทคะแนนผู้ใช้
                await tx.user.update({
                    where: { id: user.id },
                    data: { score: newScore, isBanned: shouldBan },
                });

                // บันทึก PenaltyLog
                await tx.penaltyLog.create({
                    data: {
                        userId: user.id,
                        bookingId: activeBooking.id,
                        type: "LATE_RETURN",
                        scoreCut: penaltyResult.penaltyScore,
                        reason: `คืนกุญแจห้อง ${activeBooking.key.roomCode} ช้า ${penaltyResult.lateMinutes} นาที (ผ่านเครื่องสแกนหน้า)`,
                    },
                });
            }

            // บันทึก SystemLog
            await tx.systemLog.create({
                data: {
                    userId: user.id,
                    action: "HARDWARE_RETURN_KEY",
                    details: JSON.stringify({
                        bookingId: activeBooking.id,
                        roomCode: activeBooking.key.roomCode,
                        slotNumber: activeBooking.key.slotNumber,
                        lateMinutes: penaltyResult.lateMinutes,
                        penaltyScore: penaltyResult.penaltyScore,
                        isLate: penaltyResult.isLate,
                        source: "FACE_SCANNER",
                    }),
                    ipAddress,
                },
            });

            return updatedBooking;
        });

        // ดึงข้อมูลผู้ใช้ล่าสุด (หลังหักคะแนน)
        const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });

        // สร้างข้อความตอบกลับ
        let message = "คืนกุญแจสำเร็จ";
        if (penaltyResult.isLate) {
            message = `คืนกุญแจสำเร็จ (สาย ${penaltyResult.lateMinutes} นาที, หักคะแนน ${penaltyResult.penaltyScore} คะแนน)`;
        }

        console.log(`✅ [Hardware] return: สำเร็จ - ${user.firstName} ${user.lastName} คืนห้อง ${activeBooking.key.roomCode}`);

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
                    returnAt: now,
                    status: result.status,
                },
                penalty: {
                    isLate: penaltyResult.isLate,
                    lateMinutes: penaltyResult.lateMinutes,
                    penaltyScore: penaltyResult.penaltyScore,
                },
                user: {
                    studentCode: user.studentCode,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    currentScore: updatedUser.score,
                    isBanned: updatedUser.isBanned,
                },
                keySlotNumber: result.key.slotNumber, // ช่องตู้ที่ต้องเปิดรับกุญแจ
            },
        });
    } catch (error) {
        console.error("❌ [Hardware] return: Error:", error);
        return res.status(500).json({
            success: false,
            message: "เกิดข้อผิดพลาดในการคืนกุญแจ",
        });
    }
};

/**
 * POST /api/hardware/swap
 * สลับสิทธิ์กุญแจระหว่าง 2 คน / 2 ห้อง
 * 
 * ใช้กรณี: นักศึกษา A มีสิทธิ์ห้อง X, นักศึกษา B มีสิทธิ์ห้อง Y
 *          ต้องการสลับให้ A ไปห้อง Y, B ไปห้อง X
 * 
 * ขั้นตอน:
 * 1. ตรวจสอบผู้ใช้ทั้ง 2 คน
 * 2. ตรวจว่าทั้งคู่ยังไม่ได้เบิกกุญแจ (ต้องสลับก่อนเบิก)
 * 3. สลับ DailyAuthorization ของทั้ง 2 คน
 * 4. สลับ Booking RESERVED (ถ้ามี)
 * 5. บันทึก SystemLog
 * 
 * Body: {
 *   studentCodeA: string, roomCodeA: string,
 *   studentCodeB: string, roomCodeB: string
 * }
 */
export const swapAuthorization = async (req, res) => {
    try {
        const { studentCodeA, roomCodeA, studentCodeB, roomCodeB } = req.body;
        console.log(`🔄 [Hardware] swap: ${studentCodeA}(${roomCodeA}) ↔ ${studentCodeB}(${roomCodeB})`);

        // ตรวจ input
        if (!studentCodeA || !roomCodeA || !studentCodeB || !roomCodeB) {
            return res.status(400).json({
                success: false,
                message: "กรุณาระบุข้อมูลให้ครบ: studentCodeA, roomCodeA, studentCodeB, roomCodeB",
            });
        }

        // ตรวจว่าไม่ใช่ห้องเดียวกัน
        if (roomCodeA === roomCodeB) {
            return res.status(400).json({
                success: false,
                message: "ห้องทั้งสองต้องไม่ใช่ห้องเดียวกัน",
            });
        }

        // === ขั้นตอนที่ 1: ค้นหาผู้ใช้ทั้ง 2 คน ===
        const userA = await prisma.user.findUnique({ where: { studentCode: studentCodeA } });
        const userB = await prisma.user.findUnique({ where: { studentCode: studentCodeB } });

        if (!userA) {
            return res.status(404).json({ success: false, message: `ไม่พบผู้ใช้ ${studentCodeA} ในระบบ` });
        }
        if (!userB) {
            return res.status(404).json({ success: false, message: `ไม่พบผู้ใช้ ${studentCodeB} ในระบบ` });
        }

        // === ขั้นตอนที่ 2: ตรวจว่ายังไม่ได้เบิกกุญแจ ===
        const borrowedA = await prisma.booking.findFirst({
            where: { userId: userA.id, status: "BORROWED" },
        });
        const borrowedB = await prisma.booking.findFirst({
            where: { userId: userB.id, status: "BORROWED" },
        });

        if (borrowedA) {
            return res.status(400).json({
                success: false,
                message: `${userA.firstName} ${userA.lastName} กำลังเบิกกุญแจอยู่ ต้องคืนก่อนจึงจะสลับได้`,
            });
        }
        if (borrowedB) {
            return res.status(400).json({
                success: false,
                message: `${userB.firstName} ${userB.lastName} กำลังเบิกกุญแจอยู่ ต้องคืนก่อนจึงจะสลับได้`,
            });
        }

        // === ขั้นตอนที่ 3: ค้นหา DailyAuthorization ที่จะสลับ ===
        const { startOfDay, endOfDay } = getTodayRange();
        const now = new Date();

        // สิทธิ์ของ A ในห้อง A
        const authA = await prisma.dailyAuthorization.findFirst({
            where: {
                userId: userA.id,
                roomCode: roomCodeA,
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                startTime: { lte: now },
                endTime: { gt: now },
            },
        });

        // สิทธิ์ของ B ในห้อง B
        const authB = await prisma.dailyAuthorization.findFirst({
            where: {
                userId: userB.id,
                roomCode: roomCodeB,
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                startTime: { lte: now },
                endTime: { gt: now },
            },
        });

        if (!authA) {
            return res.status(404).json({
                success: false,
                message: `${userA.firstName} ไม่มีสิทธิ์ห้อง ${roomCodeA} ในขณะนี้`,
            });
        }
        if (!authB) {
            return res.status(404).json({
                success: false,
                message: `${userB.firstName} ไม่มีสิทธิ์ห้อง ${roomCodeB} ในขณะนี้`,
            });
        }

        // === ขั้นตอนที่ 4-5: สลับทุกอย่างใน Transaction ===
        const ipAddress = req.ip || req.connection?.remoteAddress || null;
        const keyA = await prisma.key.findUnique({ where: { roomCode: roomCodeA } });
        const keyB = await prisma.key.findUnique({ where: { roomCode: roomCodeB } });

        await prisma.$transaction(async (tx) => {
            // สลับ DailyAuthorization: A ไปห้อง B, B ไปห้อง A
            // ลบ auth เดิมแล้วสร้างใหม่ (เพราะ unique constraint)
            await tx.dailyAuthorization.delete({ where: { id: authA.id } });
            await tx.dailyAuthorization.delete({ where: { id: authB.id } });

            // สร้าง auth ใหม่: A → ห้อง B
            await tx.dailyAuthorization.create({
                data: {
                    userId: userA.id,
                    roomCode: roomCodeB,
                    date: authA.date,
                    startTime: authA.startTime,
                    endTime: authA.endTime,
                    source: "MANUAL",
                    scheduleId: authA.scheduleId,
                    subjectId: authA.subjectId,
                    createdBy: "HARDWARE_SWAP",
                },
            });

            // สร้าง auth ใหม่: B → ห้อง A
            await tx.dailyAuthorization.create({
                data: {
                    userId: userB.id,
                    roomCode: roomCodeA,
                    date: authB.date,
                    startTime: authB.startTime,
                    endTime: authB.endTime,
                    source: "MANUAL",
                    scheduleId: authB.scheduleId,
                    subjectId: authB.subjectId,
                    createdBy: "HARDWARE_SWAP",
                },
            });

            // สลับ Booking RESERVED (ถ้ามี)
            if (keyA && keyB) {
                const reservedA = await tx.booking.findFirst({
                    where: { userId: userA.id, keyId: keyA.id, status: "RESERVED" },
                });
                const reservedB = await tx.booking.findFirst({
                    where: { userId: userB.id, keyId: keyB.id, status: "RESERVED" },
                });

                // ถ้าทั้ง 2 มี booking → สลับ room (keyId)
                if (reservedA && reservedB) {
                    await tx.booking.update({
                        where: { id: reservedA.id },
                        data: { keyId: keyB.id },
                    });
                    await tx.booking.update({
                        where: { id: reservedB.id },
                        data: { keyId: keyA.id },
                    });
                }
            }

            // บันทึก SystemLog
            await tx.systemLog.create({
                data: {
                    userId: userA.id,
                    action: "HARDWARE_SWAP_AUTHORIZATION",
                    details: JSON.stringify({
                        swapType: "SWAP",
                        userA: { id: userA.id, studentCode: studentCodeA, from: roomCodeA, to: roomCodeB },
                        userB: { id: userB.id, studentCode: studentCodeB, from: roomCodeB, to: roomCodeA },
                        source: "FACE_SCANNER",
                    }),
                    ipAddress,
                },
            });
        });

        console.log(`✅ [Hardware] swap: สำเร็จ - ${studentCodeA}(${roomCodeA}→${roomCodeB}) ↔ ${studentCodeB}(${roomCodeB}→${roomCodeA})`);

        return res.status(200).json({
            success: true,
            message: `สลับสิทธิ์สำเร็จ: ${userA.firstName} → ห้อง ${roomCodeB}, ${userB.firstName} → ห้อง ${roomCodeA}`,
            data: {
                userA: {
                    studentCode: studentCodeA,
                    firstName: userA.firstName,
                    lastName: userA.lastName,
                    fromRoom: roomCodeA,
                    toRoom: roomCodeB,
                },
                userB: {
                    studentCode: studentCodeB,
                    firstName: userB.firstName,
                    lastName: userB.lastName,
                    fromRoom: roomCodeB,
                    toRoom: roomCodeA,
                },
            },
        });
    } catch (error) {
        console.error("❌ [Hardware] swap: Error:", error);
        return res.status(500).json({
            success: false,
            message: "เกิดข้อผิดพลาดในการสลับสิทธิ์กุญแจ",
        });
    }
};

/**
 * POST /api/hardware/move
 * ย้ายสิทธิ์กุญแจจากห้อง A ไปห้อง B (คนเดียว)
 * 
 * ใช้กรณี: นักศึกษามีสิทธิ์ห้อง X แต่ต้องการย้ายไปห้อง Y
 *          (เช่น ห้องย้ายเรียน, ห้องเดิมเสีย ฯลฯ)
 * 
 * ขั้นตอน:
 * 1. ตรวจสอบผู้ใช้
 * 2. ตรวจว่ายังไม่ได้เบิกกุญแจ
 * 3. ตรวจว่ามีสิทธิ์ห้องเดิม (fromRoom)
 * 4. ตรวจว่าห้องใหม่ (toRoom) มี Key ในระบบ
 * 5. ย้าย DailyAuthorization + Booking RESERVED
 * 6. บันทึก SystemLog
 * 
 * Body: { studentCode: string, fromRoomCode: string, toRoomCode: string }
 */
export const moveAuthorization = async (req, res) => {
    try {
        const { studentCode, fromRoomCode, toRoomCode } = req.body;
        console.log(`➡️ [Hardware] move: ${studentCode} จาก ${fromRoomCode} → ${toRoomCode}`);

        // ตรวจ input
        if (!studentCode || !fromRoomCode || !toRoomCode) {
            return res.status(400).json({
                success: false,
                message: "กรุณาระบุข้อมูลให้ครบ: studentCode, fromRoomCode, toRoomCode",
            });
        }

        // ตรวจว่าไม่ใช่ห้องเดียวกัน
        if (fromRoomCode === toRoomCode) {
            return res.status(400).json({
                success: false,
                message: "ห้องต้นทางและปลายทางต้องไม่ใช่ห้องเดียวกัน",
            });
        }

        // === ขั้นตอนที่ 1: ค้นหาผู้ใช้ ===
        const user = await prisma.user.findUnique({ where: { studentCode } });

        if (!user) {
            return res.status(404).json({ success: false, message: "ไม่พบผู้ใช้ในระบบ" });
        }

        // === ขั้นตอนที่ 2: ตรวจว่ายังไม่ได้เบิกกุญแจ ===
        const activeBooking = await prisma.booking.findFirst({
            where: { userId: user.id, status: "BORROWED" },
        });

        if (activeBooking) {
            return res.status(400).json({
                success: false,
                message: "คุณกำลังเบิกกุญแจอยู่ ต้องคืนก่อนจึงจะย้ายสิทธิ์ได้",
            });
        }

        // === ขั้นตอนที่ 3: ตรวจสิทธิ์ห้องเดิม ===
        const { startOfDay, endOfDay } = getTodayRange();
        const now = new Date();

        const currentAuth = await prisma.dailyAuthorization.findFirst({
            where: {
                userId: user.id,
                roomCode: fromRoomCode,
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                startTime: { lte: now },
                endTime: { gt: now },
            },
        });

        if (!currentAuth) {
            return res.status(404).json({
                success: false,
                message: `คุณไม่มีสิทธิ์ห้อง ${fromRoomCode} ในขณะนี้`,
            });
        }

        // === ขั้นตอนที่ 4: ตรวจว่าห้องใหม่มี Key ในระบบ ===
        const toKey = await prisma.key.findUnique({ where: { roomCode: toRoomCode } });

        if (!toKey || !toKey.isActive) {
            return res.status(404).json({
                success: false,
                message: `ไม่พบกุญแจห้อง ${toRoomCode} ในระบบ หรือกุญแจถูกปิดใช้งาน`,
            });
        }

        // ตรวจว่าห้องใหม่ไม่มีคนเบิกกุญแจอยู่แล้ว
        const toRoomBorrowed = await prisma.booking.findFirst({
            where: { keyId: toKey.id, status: "BORROWED" },
        });

        if (toRoomBorrowed) {
            return res.status(400).json({
                success: false,
                message: `ห้อง ${toRoomCode} มีคนเบิกกุญแจอยู่แล้ว ไม่สามารถย้ายได้`,
            });
        }

        // === ขั้นตอนที่ 5-6: ย้ายทุกอย่างใน Transaction ===
        const ipAddress = req.ip || req.connection?.remoteAddress || null;
        const fromKey = await prisma.key.findUnique({ where: { roomCode: fromRoomCode } });

        await prisma.$transaction(async (tx) => {
            // ลบ auth เดิม แล้วสร้างใหม่สำหรับห้องใหม่
            await tx.dailyAuthorization.delete({ where: { id: currentAuth.id } });

            await tx.dailyAuthorization.create({
                data: {
                    userId: user.id,
                    roomCode: toRoomCode,
                    date: currentAuth.date,
                    startTime: currentAuth.startTime,
                    endTime: currentAuth.endTime,
                    source: "MANUAL",
                    scheduleId: currentAuth.scheduleId,
                    subjectId: currentAuth.subjectId,
                    createdBy: "HARDWARE_MOVE",
                },
            });

            // ย้าย Booking RESERVED (ถ้ามี)
            if (fromKey) {
                const reservedBooking = await tx.booking.findFirst({
                    where: { userId: user.id, keyId: fromKey.id, status: "RESERVED" },
                });

                if (reservedBooking) {
                    await tx.booking.update({
                        where: { id: reservedBooking.id },
                        data: { keyId: toKey.id },
                    });
                }
            }

            // บันทึก SystemLog
            await tx.systemLog.create({
                data: {
                    userId: user.id,
                    action: "HARDWARE_MOVE_AUTHORIZATION",
                    details: JSON.stringify({
                        moveType: "MOVE",
                        studentCode,
                        fromRoom: fromRoomCode,
                        toRoom: toRoomCode,
                        authorizationId: currentAuth.id,
                        source: "FACE_SCANNER",
                    }),
                    ipAddress,
                },
            });
        });

        console.log(`✅ [Hardware] move: สำเร็จ - ${user.firstName} ย้ายจาก ${fromRoomCode} → ${toRoomCode}`);

        return res.status(200).json({
            success: true,
            message: `ย้ายสิทธิ์สำเร็จ: ${user.firstName} ${user.lastName} จากห้อง ${fromRoomCode} → ${toRoomCode}`,
            data: {
                user: {
                    studentCode: user.studentCode,
                    firstName: user.firstName,
                    lastName: user.lastName,
                },
                fromRoom: fromRoomCode,
                toRoom: toRoomCode,
                toSlotNumber: toKey.slotNumber,
            },
        });
    } catch (error) {
        console.error("❌ [Hardware] move: Error:", error);
        return res.status(500).json({
            success: false,
            message: "เกิดข้อผิดพลาดในการย้ายสิทธิ์กุญแจ",
        });
    }
};

/**
 * GET /api/hardware/room-status
 * ดึงสถานะกุญแจรายห้อง
 * 
 * - แสดงว่าแต่ละห้องมีกุญแจกี่ดอก, เบิกไปแล้วกี่ดอก, เหลือกี่ดอก
 * - ใช้สำหรับแสดงผลบนหน้าจอเครื่อง Hardware
 */
export const getRoomStatus = async (req, res) => {
    try {
        console.log("🏠 [Hardware] room-status: กำลังดึงสถานะห้อง...");

        // ดึงกุญแจทั้งหมดพร้อมสถานะการเบิก
        const allKeys = await prisma.key.findMany({
            where: { isActive: true },
            include: {
                bookings: {
                    where: { status: "BORROWED" },
                    include: {
                        user: {
                            select: { studentCode: true, firstName: true, lastName: true },
                        },
                    },
                },
            },
        });

        // จัดกลุ่มตามห้อง
        const result = allKeys.map((key) => ({
            roomCode: key.roomCode,
            slotNumber: key.slotNumber,
            isAvailable: key.bookings.length === 0,
            borrower: key.bookings.length > 0
                ? {
                    studentCode: key.bookings[0].user.studentCode,
                    firstName: key.bookings[0].user.firstName,
                    lastName: key.bookings[0].user.lastName,
                    borrowAt: key.bookings[0].borrowAt,
                    dueAt: key.bookings[0].dueAt,
                }
                : null,
        }));

        return res.status(200).json({
            success: true,
            message: "ดึงสถานะห้องสำเร็จ",
            data: result,
            summary: {
                total: result.length,
                available: result.filter((r) => r.isAvailable).length,
                borrowed: result.filter((r) => !r.isAvailable).length,
            },
        });
    } catch (error) {
        console.error("❌ [Hardware] room-status: Error:", error);
        return res.status(500).json({
            success: false,
            message: "เกิดข้อผิดพลาดในการดึงสถานะห้อง",
        });
    }
};

/**
 * GET /api/hardware/user/:studentCode/status
 * ดึงสถานะของผู้ใช้งาน
 * 
 * - ข้อมูลผู้ใช้ (ชื่อ, สาขา, คะแนน, สถานะแบน)
 * - กุญแจที่กำลังเบิกอยู่ (ถ้ามี)
 * - สิทธิ์เบิกกุญแจประจำวันนี้
 */
export const getUserStatus = async (req, res) => {
    try {
        const { studentCode } = req.params;
        console.log(`👤 [Hardware] user-status: studentCode=${studentCode}`);

        if (!studentCode) {
            return res.status(400).json({
                success: false,
                message: "กรุณาระบุรหัสนักศึกษา",
            });
        }

        // ค้นหาผู้ใช้
        const user = await prisma.user.findUnique({
            where: { studentCode },
            include: {
                section: { include: { major: true } },
            },
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "ไม่พบผู้ใช้ในระบบ",
            });
        }

        // ค้นหาการเบิกที่ active อยู่
        const activeBooking = await prisma.booking.findFirst({
            where: { userId: user.id, status: "BORROWED" },
            include: { key: true, subject: true },
        });

        // ค้นหาสิทธิ์เบิกกุญแจวันนี้ (ทุกช่วงเวลา)
        const today = getTodayDate();
        const todayAuthorizations = await prisma.dailyAuthorization.findMany({
            where: {
                userId: user.id,
                date: today,
            },
            select: {
                roomCode: true,
                startTime: true,
                endTime: true,
                source: true,
                subject: { select: { code: true, name: true } },
            },
            orderBy: { startTime: "asc" },
        });

        // ค้นหาประวัติล่าสุด (5 รายการ)
        const recentBookings = await prisma.booking.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
            take: 5,
            include: {
                key: { select: { roomCode: true } },
            },
        });

        return res.status(200).json({
            success: true,
            message: "ดึงข้อมูลผู้ใช้สำเร็จ",
            data: {
                user: {
                    id: user.id,
                    studentCode: user.studentCode,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    score: user.score,
                    isBanned: user.isBanned,
                    major: user.section?.major?.name || null,
                    section: user.section?.name || null,
                },
                activeBooking: activeBooking
                    ? {
                        id: activeBooking.id,
                        roomCode: activeBooking.key.roomCode,
                        slotNumber: activeBooking.key.slotNumber,
                        borrowAt: activeBooking.borrowAt,
                        dueAt: activeBooking.dueAt,
                        subjectName: activeBooking.subject?.name || null,
                        isOverdue: new Date() > activeBooking.dueAt,
                    }
                    : null,
                todayAuthorizations,
                recentBookings: recentBookings.map((b) => ({
                    id: b.id,
                    roomCode: b.key.roomCode,
                    status: b.status,
                    borrowAt: b.borrowAt,
                    returnAt: b.returnAt,
                    lateMinutes: b.lateMinutes,
                })),
            },
        });
    } catch (error) {
        console.error("❌ [Hardware] user-status: Error:", error);
        return res.status(500).json({
            success: false,
            message: "เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้",
        });
    }
};
