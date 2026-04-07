import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// อนุญาตให้เบิกกุญแจล่วงหน้าได้ 30 นาทีก่อนคาบเรียน
const EARLY_BORROW_MINUTES = 30;

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
    // ถ้าไม่มี dueAt (ไม่จำกัดเวลา) → ไม่มีค่าปรับ
    if (!dueAt) {
        return { lateMinutes: 0, penaltyScore: 0, isLate: false };
    }

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
            nfcUid: key.nfcUid,
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

        if (!activeBooking) {
            const anyBookings = await prisma.booking.findMany({
                where: { userId: user.id },
                orderBy: { createdAt: 'desc' },
                take: 5
            });
            console.log(`ℹ️ [Hardware] No active BORROWED booking for ${studentCode}. Last 5 bookings:`, 
                anyBookings.map(b => `[ID:${b.id} Status:${b.status} Room:${b.roomCode}]`).join(', '));
        }

        // ค้นหาสิทธิ์เบิกกุญแจประจำวัน (DailyAuthorization ของวันนี้)
        const { startOfDay, endOfDay } = getTodayRange();
        const now = new Date();

        // อนุญาตให้เบิกล่วงหน้าได้ EARLY_BORROW_MINUTES (30 นาที)
        const earlyBuffer = new Date(now.getTime() + EARLY_BORROW_MINUTES * 60 * 1000);

        const todayAuthorizations = await prisma.dailyAuthorization.findMany({
            where: {
                userId: user.id,
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                startTime: { lte: earlyBuffer }, // เบิกได้ก่อน 30 นาที
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

        // ครู/เจ้าหน้าที่ เบิกได้ทุกกรณีโดยไม่ต้องมีสิทธิ์หรือเหตุผล
        const isPrivileged = user.role === 'TEACHER' || user.role === 'STAFF';

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

        // อนุญาตให้เบิกล่วงหน้าได้ EARLY_BORROW_MINUTES (30 นาที)
        const earlyBuffer = new Date(now.getTime() + EARLY_BORROW_MINUTES * 60 * 1000);

        const authorization = await prisma.dailyAuthorization.findFirst({
            where: {
                userId: user.id,
                roomCode: roomCode,
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                startTime: { lte: earlyBuffer }, // เบิกได้ก่อน 30 นาที
                endTime: { gt: now },
            },
        });

        console.log(`   Authorization found: ${authorization ? JSON.stringify(authorization) : 'NONE'}`);

        // ถ้าไม่มีสิทธิ์ → ต้องมีเหตุผล (Reason) มาด้วย (ยกเว้นครู/เจ้าหน้าที่)
        if (!authorization && !req.body.reason && !isPrivileged) {
            return res.status(403).json({
                success: false,
                message: "REQUIRE_REASON", // ส่ง code พิเศษเพื่อให้ Frontend รู้ว่าต้องถามเหตุผล
                error_code: "REQUIRE_REASON",
            });
        }

        // === ขั้นตอนที่ 3.5: ตรวจสอบตารางสอนและสิทธิ์เบิกนอกเวลา ===
        
        // คาบเรียนที่ "ครอบคลุม" เวลาปัจจุบัน (รวมล่วงหน้า 30 นาที)
        const relevantSchedule = allAuthsToday.find(s => {
            const bufferStart = new Date(s.startTime.getTime() - EARLY_BORROW_MINUTES * 60 * 1000);
            return now >= bufferStart && now < s.endTime;
        });

        // ถ้าไม่มีสิทธิ์เบิกปกติ (authorization) และกำลังพยายามเบิกด้วยเหตุผล
        // ข้ามการตรวจสอบนี้สำหรับครู/เจ้าหน้าที่
        if (!authorization && req.body.reason && !isPrivileged) {
            if (relevantSchedule) {
                // มีคนที่มีเรียนในห้องนี้ตอนนี้ (หรือกำลังจะเริ่ม)
                const isScheduledUser = relevantSchedule.userId === user.id;
                
                if (!isScheduledUser) {
                    // ผู้ใช้ปัจจุบันไม่มีเรียน แต่ "คนอื่น" มีเรียน
                    const gracePeriodMs = 30 * 60 * 1000;
                    const isGracePeriodActive = now < new Date(relevantSchedule.startTime.getTime() + gracePeriodMs);
                    
                    if (isGracePeriodActive) {
                        const startStr = new Date(relevantSchedule.startTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                        const subjectName = relevantSchedule.subject?.name || 'คาบเรียนตามตาราง';
                        
                        // เช็คว่าเจ้าของสิทธิ์มาเบิกไปหรือยัง?
                        const existingBooking = await prisma.booking.findFirst({
                            where: { 
                                key: { roomCode: roomCode },
                                status: "BORROWED"
                            }
                        });

                        if (!existingBooking) {
                            return res.status(409).json({
                                success: false,
                                message: `ห้องนี้มีเรียนวิชา "${subjectName}" (${startStr}) ระบบสงวนสิทธิ์ให้ผู้สอนจนถึงเวลา ${new Date(relevantSchedule.startTime.getTime() + gracePeriodMs).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`,
                                error_code: "SCHEDULE_RESERVED",
                                data: {
                                    conflictingSchedule: {
                                        subjectName,
                                        startTime: relevantSchedule.startTime,
                                        graceUntil: new Date(relevantSchedule.startTime.getTime() + gracePeriodMs)
                                    }
                                }
                            });
                        }
                    }
                }
            }
        }

        // ตรวจสอบเวลาคืน (กรณีเบิกนอกตาราง) ไม่ให้ทับคาบเรียนถัดไป
        // ข้ามการตรวจสอบนี้สำหรับครู/เจ้าหน้าที่
        if (!authorization && req.body.returnByTime && !isPrivileged) {
            const returnBy = new Date(req.body.returnByTime);

            const conflicting = await prisma.dailyAuthorization.findFirst({
                where: {
                    roomCode: roomCode,
                    date: { gte: startOfDay, lte: endOfDay },
                    startTime: { lt: returnBy },
                    endTime: { gt: now },
                    userId: { not: user.id } // ไม่นับคาบของตัวเองถ้ามี
                },
                include: {
                    subject: { select: { code: true, name: true } },
                    user: { select: { firstName: true, lastName: true } },
                },
                orderBy: { startTime: 'asc' },
            });

            if (conflicting) {
                const startStr = new Date(conflicting.startTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                const subjectName = conflicting.subject?.name || 'ไม่ระบุวิชา';

                return res.status(409).json({
                    success: false,
                    message: `เวลาคืนทับกับคาบเรียน "${subjectName}" เริ่มเวลา ${startStr} กรุณาเลือกเวลาคืนที่เร็วกว่านี้`,
                    error_code: "SCHEDULE_OVERLAP",
                    data: {
                        conflictingSchedule: {
                            subjectName,
                            startTime: conflicting.startTime,
                            endTime: conflicting.endTime,
                        },
                        suggestedReturnBy: conflicting.startTime,
                    },
                });
            }
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
        // ถ้าไม่มี authoriztion ใช้เหตุผลที่ส่งมา (ครู/เจ้าหน้าที่ไม่ต้องมีเหตุผล)
        const bookingSource = authorization ? "FACE_SCANNER" : (isPrivileged ? "FACE_SCANNER_PRIVILEGED" : "FACE_SCANNER_WITH_REASON");
        const bookingReason = authorization ? null : (isPrivileged ? `เบิกโดย${user.role === 'TEACHER' ? 'อาจารย์' : 'เจ้าหน้าที่'}` : req.body.reason);

        // กำหนดเวลาคืน:
        // 1. ถ้า frontend ส่ง returnByTime มา → ใช้เป็น dueAt ตรงๆ
        // 2. ถ้าเบิกด้วยเหตุผล → ดึง durationMinutes จาก BorrowReason DB
        // 3. ถ้าเบิกปกติ (มีสิทธิ์) → 4 ชั่วโมง
        let dueAt;
        if (req.body.returnByTime) {
            // Frontend ส่งเวลาคืนมาแล้ว (เบิกนอกตาราง + เลือกเวลา)
            dueAt = new Date(req.body.returnByTime);
            console.log(`   ⏰ ใช้ returnByTime จาก frontend: ${dueAt.toISOString()}`);
        } else if (bookingReason) {
            // เบิกด้วยเหตุผล → ดึง durationMinutes จาก DB
            try {
                const matchedReason = await prisma.borrowReason.findFirst({
                    where: { label: bookingReason, isActive: true },
                });
                if (matchedReason && matchedReason.durationMinutes != null) {
                    dueAt = new Date(now.getTime() + matchedReason.durationMinutes * 60 * 1000);
                } else {
                    dueAt = null; // ไม่จำกัดเวลา
                }
            } catch (_) {
                dueAt = new Date(now.getTime() + 4 * 60 * 60 * 1000); // fallback 4 ชม.
            }
        } else {
            // เบิกปกติ (มีสิทธิ์) → 4 ชั่วโมง
            dueAt = new Date(now.getTime() + 4 * 60 * 60 * 1000);
        }

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
        const { studentCodeA, roomCodeA, returnByTimeA, studentCodeB, roomCodeB, returnByTimeB } = req.body;
        console.log(`🔄 [Hardware] swap request: ${studentCodeA}(${roomCodeA}) ↔ ${studentCodeB}(${roomCodeB})`);

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

        // === ขั้นตอนที่ 2: ดึงข้อมูลการเบิกที่มีอยู่ (Active Booking) ===
        const activeBookingA = await prisma.booking.findFirst({
            where: { userId: userA.id, status: "BORROWED" },
            include: { key: true }
        });
        const activeBookingB = await prisma.booking.findFirst({
            where: { userId: userB.id, status: "BORROWED" },
            include: { key: true }
        });

        // ใช้ห้องจาก Active Booking ถ้ามี ถ้าไม่มีให้ใช้จาก Request (ถ้ายืนยันมาจาก Frontend)
        const finalRoomCodeA = activeBookingA ? activeBookingA.key.roomCode : roomCodeA;
        const finalRoomCodeB = activeBookingB ? activeBookingB.key.roomCode : roomCodeB;

        // === ขั้นตอนที่ 3: ค้นหา DailyAuthorization เพื่อสลับ (ถ้ามี) ===
        const { startOfDay, endOfDay } = getTodayRange();
        const now = new Date();
        const earlyBuffer = new Date(now.getTime() + EARLY_BORROW_MINUTES * 60 * 1000);

        const authA = await prisma.dailyAuthorization.findFirst({
            where: {
                userId: userA.id,
                roomCode: finalRoomCodeA,
                date: { gte: startOfDay, lte: endOfDay },
                startTime: { lte: earlyBuffer },
                endTime: { gt: now },
            },
        });

        const authB = await prisma.dailyAuthorization.findFirst({
            where: {
                userId: userB.id,
                roomCode: finalRoomCodeB,
                date: { gte: startOfDay, lte: endOfDay },
                startTime: { lte: earlyBuffer },
                endTime: { gt: now },
            },
        });

        // === ขั้นตอนที่ 3.5: ตรวจสอบเวลาคืน (ถ้าส่งมา) ว่าทับกับคาบเรียนคนอื่นหรือไม่ ===
        if (returnByTimeA) {
            const returnByA = new Date(returnByTimeA);
            const conflictingA = await prisma.dailyAuthorization.findFirst({
                where: {
                    roomCode: finalRoomCodeB,
                    date: { gte: startOfDay, lte: endOfDay },
                    startTime: { lt: returnByA },
                    endTime: { gt: now },
                    userId: { notIn: [userA.id, userB.id] }
                },
                include: { subject: { select: { name: true } } },
                orderBy: { startTime: 'asc' },
            });
            if (conflictingA) {
                const startStr = new Date(conflictingA.startTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                return res.status(409).json({
                    success: false,
                    message: `ข้อมูลของคนที่ 1 (ที่จะรับห้อง ${finalRoomCodeB}): เวลาคืนทับกับคาบเรียน "${conflictingA.subject?.name || 'ไม่ระบุ'}" สมัยเวลา ${startStr} กรุณาเลือกเวลาคืนที่เร็วกว่านี้`,
                });
            }
        }

        if (returnByTimeB) {
            const returnByB = new Date(returnByTimeB);
            const conflictingB = await prisma.dailyAuthorization.findFirst({
                where: {
                    roomCode: finalRoomCodeA,
                    date: { gte: startOfDay, lte: endOfDay },
                    startTime: { lt: returnByB },
                    endTime: { gt: now },
                    userId: { notIn: [userA.id, userB.id] }
                },
                include: { subject: { select: { name: true } } },
                orderBy: { startTime: 'asc' },
            });
            if (conflictingB) {
                const startStr = new Date(conflictingB.startTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                return res.status(409).json({
                    success: false,
                    message: `ข้อมูลของคนที่ 2 (ที่จะรับห้อง ${finalRoomCodeA}): เวลาคืนทับกับคาบเรียน "${conflictingB.subject?.name || 'ไม่ระบุ'}" สมัยเวลา ${startStr} กรุณาเลือกเวลาคืนที่เร็วกว่านี้`,
                });
            }
        }

        // ตรวจสอบว่ามีอะไรให้สลับไหม (ต้องมี Active Booking หรือมี Authorization)
        console.log(`   [DEBUG] UserA: ActiveBooking=${!!activeBookingA}, Auth=${!!authA}`);
        console.log(`   [DEBUG] UserB: ActiveBooking=${!!activeBookingB}, Auth=${!!authB}`);

        if (!activeBookingA && !authA) {
            console.log(`   [DEBUG] Swap blocked: User A has nothing to swap`);
            await prisma.systemLog.create({
                data: {
                    userId: userA.id,
                    action: "DEBUG_SWAP_FAIL",
                    details: JSON.stringify({ reason: "User A has no active booking or auth", studentCodeA, studentCodeB, roomCodeA, roomCodeB }),
                }
            });
            return res.status(404).json({ success: false, message: `${userA.firstName} ไม่มีรายการเบิกหรือสิทธิ์ในห้อง ${finalRoomCodeA} เพื่อสลับ` });
        }
        if (!activeBookingB && !authB) {
            console.log(`   [DEBUG] Swap blocked: User B has nothing to swap`);
            await prisma.systemLog.create({
                data: {
                    userId: userB.id,
                    action: "DEBUG_SWAP_FAIL",
                    details: JSON.stringify({ reason: "User B has no active booking or auth", studentCodeA, studentCodeB, roomCodeA, roomCodeB }),
                }
            });
            return res.status(404).json({ success: false, message: `${userB.firstName} ไม่มีรายการเบิกหรือสิทธิ์ในห้อง ${finalRoomCodeB} เพื่อสลับ` });
        }

        // === ขั้นตอนที่ 4-5: สลับทุกอย่างใน Transaction ===
        const ipAddress = req.ip || req.connection?.remoteAddress || null;

        await prisma.$transaction(async (tx) => {
            // 1. สลับ DailyAuthorization (ลบของเดิม สร้างของใหม่สลับกัน)
            if (authA) await tx.dailyAuthorization.delete({ where: { id: authA.id } });
            if (authB) await tx.dailyAuthorization.delete({ where: { id: authB.id } });

            if (authA) {
                await tx.dailyAuthorization.upsert({
                    where: {
                        userId_roomCode_date_startTime: {
                            userId: userB.id,
                            roomCode: authA.roomCode,
                            date: authA.date,
                            startTime: authA.startTime,
                        }
                    },
                    update: {},
                    create: {
                        userId: userB.id, // สลับให้ B
                        roomCode: authA.roomCode,
                        date: authA.date,
                        startTime: authA.startTime,
                        endTime: authA.endTime,
                        source: "MANUAL",
                        scheduleId: authA.scheduleId,
                        subjectId: authA.subjectId,
                        createdBy: "HARDWARE_SWAP",
                    },
                });
            }

            if (authB) {
                await tx.dailyAuthorization.upsert({
                    where: {
                        userId_roomCode_date_startTime: {
                            userId: userA.id,
                            roomCode: authB.roomCode,
                            date: authB.date,
                            startTime: authB.startTime,
                        }
                    },
                    update: {},
                    create: {
                        userId: userA.id, // สลับให้ A
                        roomCode: authB.roomCode,
                        date: authB.date,
                        startTime: authB.startTime,
                        endTime: authB.endTime,
                        source: "MANUAL",
                        scheduleId: authB.scheduleId,
                        subjectId: authB.subjectId,
                        createdBy: "HARDWARE_SWAP",
                    },
                });
            }

            // 2. สลับ Active Booking (ถ้ามี) + อัปเดตเวลาคืนถ้ามี
            if (activeBookingA) {
                const dueAtA = returnByTimeB ? new Date(returnByTimeB) : activeBookingA.dueAt;
                await tx.booking.update({
                    where: { id: activeBookingA.id },
                    data: { userId: userB.id, dueAt: dueAtA } // โอนให้ B
                });
            }

            if (activeBookingB) {
                const dueAtB = returnByTimeA ? new Date(returnByTimeA) : activeBookingB.dueAt;
                await tx.booking.update({
                    where: { id: activeBookingB.id },
                    data: { userId: userA.id, dueAt: dueAtB } // โอนให้ A
                });
            }

            // 3. บันทึก SystemLog
            await tx.systemLog.create({
                data: {
                    userId: userA.id,
                    action: "HARDWARE_SWAP_KEY_ACTIVE",
                    details: JSON.stringify({
                        swapType: (activeBookingA && activeBookingB) ? "ACTIVE_BOOKINGS" : "MIXED",
                        userA: { studentCode: studentCodeA, fromRoom: finalRoomCodeA, hadBooking: !!activeBookingA },
                        userB: { studentCode: studentCodeB, fromRoom: finalRoomCodeB, hadBooking: !!activeBookingB },
                        source: "FACE_SCANNER",
                    }),
                    ipAddress,
                },
            });
        });

        console.log(`✅ [Hardware] swap: สำเร็จ - ${studentCodeA}(${finalRoomCodeA}→${finalRoomCodeB}) ↔ ${studentCodeB}(${finalRoomCodeB}→${finalRoomCodeA})`);

        return res.status(200).json({
            success: true,
            message: `สลับสิทธิ์สำเร็จ: ${userA.firstName} ↔ ${userB.firstName} (สลับกุญแจห้อง ${finalRoomCodeA} และ ${finalRoomCodeB})`,
            data: {
                userA: { studentCode: studentCodeA, room: finalRoomCodeB },
                userB: { studentCode: studentCodeB, room: finalRoomCodeA },
            },
        });
    } catch (error) {
        console.error("❌ [Hardware] swap error details:", error);
        try {
            await prisma.systemLog.create({
                data: {
                    userId: userA?.id || "SYSTEM",
                    action: "DEBUG_SWAP_ERROR",
                    details: JSON.stringify({ error: error.message || String(error), studentCodeA, studentCodeB }),
                }
            });
        } catch (_) {}
        return res.status(500).json({
            success: false,
            message: "เกิดข้อผิดพลาดในการสลับสิทธิ์กุญแจ (" + (error.message || String(error)) + ")",
        });
    }
};

/**
 * POST /api/hardware/check-swap-eligibility
 * ตรวจสอบก่อนสลับสิทธิ์ว่า ทั้งสอนคนมีคาบเรียนในห้องใหม่หรือไม่
 * Body: { studentCodeA, roomCodeA, studentCodeB, roomCodeB }
 */
export const checkSwapEligibility = async (req, res) => {
    try {
        const { studentCodeA, roomCodeA, studentCodeB, roomCodeB } = req.body;
        
        const userA = await prisma.user.findUnique({ where: { studentCode: studentCodeA } });
        const userB = await prisma.user.findUnique({ where: { studentCode: studentCodeB } });

        if (!userA || !userB) {
            return res.status(404).json({ success: false, message: "ไม่พบผู้ใช้ในระบบ" });
        }

        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        const earlyBuffer = new Date(now.getTime() + EARLY_BORROW_MINUTES * 60 * 1000); // 30 mins

        // Check active schedule for User B in Room B (The room A is moving INTO, inherited from B)
        const authB = await prisma.dailyAuthorization.findFirst({
            where: {
                userId: userB.id,
                roomCode: roomCodeB,
                date: { gte: startOfDay, lte: endOfDay },
                startTime: { lte: earlyBuffer },
                endTime: { gt: now }
            }
        });

        // Check active schedule for User A in Room A (The room B is moving INTO, inherited from A)
        const authA = await prisma.dailyAuthorization.findFirst({
            where: {
                userId: userA.id,
                roomCode: roomCodeA,
                date: { gte: startOfDay, lte: endOfDay },
                startTime: { lte: earlyBuffer },
                endTime: { gt: now }
            }
        });

        return res.status(200).json({
            success: true,
            data: {
                userA: {
                    hasSchedule: !!authB,
                    room: roomCodeB
                },
                userB: {
                    hasSchedule: !!authA,
                    room: roomCodeA
                }
            }
        });

    } catch (error) {
        console.error("❌ checkSwapEligibility Error:", error);
        return res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการตรวจสอบตารางสอน" });
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
 * POST /api/hardware/check-transfer-eligibility
 * ตรวจสอบก่อนโอนสิทธิ์ว่าผู้รับมีคาบเรียนในห้องที่จะโอนหรือไม่
 * Body: { studentCodeReceiver: string, roomCode: string }
 */
export const checkTransferEligibility = async (req, res) => {
    try {
        const { studentCodeReceiver, roomCode } = req.body;
        
        const userReceiver = await prisma.user.findUnique({ where: { studentCode: studentCodeReceiver } });

        if (!userReceiver) {
            return res.status(404).json({ success: false, message: "ไม่พบผู้ใช้ที่รับโอนในระบบ" });
        }

        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        const earlyBuffer = new Date(now.getTime() + EARLY_BORROW_MINUTES * 60 * 1000); // 30 mins

        // Check active schedule for Receiver in the specific room
        const auth = await prisma.dailyAuthorization.findFirst({
            where: {
                userId: userReceiver.id,
                roomCode: roomCode,
                date: { gte: startOfDay, lte: endOfDay },
                startTime: { lte: earlyBuffer },
                endTime: { gt: now }
            }
        });

        return res.status(200).json({
            success: true,
            data: {
                hasSchedule: !!auth,
            }
        });

    } catch (error) {
        console.error("❌ checkTransferEligibility Error:", error);
        return res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการตรวจสอบตารางสอนผู้รับโอน" });
    }
};

/**
 * POST /api/hardware/transfer
 * ย้ายสิทธิ์กุญแจจากคนที่ 1 (ผู้โอน) ให้คนที่ 2 (ผู้รับ)
 * 
 * ใช้กรณี: นักศึกษา A มีสิทธิ์ห้อง X ต้องการโอนให้ B ที่กำลังจะเรียนในห้องนั้น
 * 
 * ขั้นตอน:
 * 1. ตรวจสอบผู้ใช้ทั้ง 2 คน
 * 2. ค้นหาสิทธิ์ปัจจุบันของ A (ห้องที่ A มีสิทธิ์)
 * 3. ตรวจว่า B มีคาบเรียน (DailyAuthorization) ในช่วงเวลา 30 นาที
 * 4. โอน DailyAuthorization ของ A → B (A เสียสิทธิ์, B ได้สิทธิ์ห้อง A)
 * 5. บันทึก SystemLog
 * 
 * Body: { studentCodeA: string, studentCodeB: string }
 */
export const transferAuthorization = async (req, res) => {
    try {
        const { studentCodeA, studentCodeB, reason, returnByTime } = req.body;
        console.log(`🔀 [Hardware] transfer request: ${studentCodeA} → ${studentCodeB} | reason=${reason} | returnByTime=${returnByTime}`);

        if (!studentCodeA || !studentCodeB) {
            return res.status(400).json({
                success: false,
                message: "กรุณาระบุ studentCodeA (ผู้โอน) และ studentCodeB (ผู้รับ)",
            });
        }

        if (studentCodeA === studentCodeB) {
            return res.status(400).json({
                success: false,
                message: "ผู้โอนและผู้รับต้องไม่ใช่คนเดียวกัน",
            });
        }

        // === ขั้นตอนที่ 1: ค้นหาผู้ใช้ ===
        const userA = await prisma.user.findUnique({ where: { studentCode: studentCodeA } });
        const userB = await prisma.user.findUnique({ where: { studentCode: studentCodeB } });

        if (!userA) return res.status(404).json({ success: false, message: `ไม่พบผู้ใช้ ${studentCodeA} ในระบบ` });
        if (!userB) return res.status(404).json({ success: false, message: `ไม่พบผู้ใช้ ${studentCodeB} ในระบบ` });

        if (userA.isBanned) return res.status(403).json({ success: false, message: `${userA.firstName} ถูกระงับการใช้งาน` });
        if (userB.isBanned) return res.status(403).json({ success: false, message: `${userB.firstName} ถูกระงับการใช้งาน` });

        const { startOfDay, endOfDay } = getTodayRange();
        const now = new Date();
        const earlyBuffer = new Date(now.getTime() + EARLY_BORROW_MINUTES * 60 * 1000);

        // === ขั้นตอนที่ 2: หาสิทธิ์หรือรายการเบิกปัจจุบันของ A ===
        // 2.1 เช็คว่า A กำลังเบิกกุญแจอยู่หรือไม่ (Active Booking)
        const activeBookingA = await prisma.booking.findFirst({
            where: { userId: userA.id, status: "BORROWED" },
            include: { key: true }
        });

        // 2.2 หาสิทธิ์ (Authorization) ปัจจุบันของ A
        const authA = await prisma.dailyAuthorization.findFirst({
            where: {
                userId: userA.id,
                date: { gte: startOfDay, lte: endOfDay },
                startTime: { lte: earlyBuffer },
                endTime: { gt: now },
            },
        });

        // ตรวจสอบว่ามีอะไรให้โอนไหม (ต้องมี Active Booking หรือมี Authorization)
        console.log(`   [DEBUG] Giver: ActiveBooking=${!!activeBookingA}, Auth=${!!authA}`);
        if (!activeBookingA && !authA) {
            console.log(`   [DEBUG] Transfer blocked: User A has nothing to transfer`);
            await prisma.systemLog.create({
                data: {
                    userId: userA.id,
                    action: "DEBUG_TRANSFER_FAIL",
                    details: JSON.stringify({ reason: "Giver has no active booking or auth", studentCodeA, studentCodeB }),
                }
            });
            return res.status(404).json({
                success: false,
                message: `${userA.firstName} ไม่มีรายการเบิกกุญแจหรือสิทธิ์ห้องที่จะโอนในขณะนี้`,
            });
        }

        // กำหนดห้องที่จะทำการโอน (ลำดับความสำคัญ: Active Booking > Authorization)
        const roomCode = activeBookingA ? activeBookingA.key.roomCode : authA.roomCode;

        // === ขั้นตอนที่ 3: ตรวจว่า B มีคาบเรียนภายใน 30 นาที (เพื่อความปลอดภัย/นโยบาย) ===
        // หรือถ้า B เป็น Staff/Admin อาจจะไม่ต้องตรวจ แต่ในที่นี้ทำตาม Flow เดิมคือตรวจสิทธิ์ B
        const authB = await prisma.dailyAuthorization.findFirst({
            where: {
                userId: userB.id,
                roomCode: roomCode,
                date: { gte: startOfDay, lte: endOfDay },
                startTime: { lte: earlyBuffer },
                endTime: { gt: now },
            },
        });

        // === ขั้นตอนที่ 3.5: ตรวจสอบ Return Time หากไม่มี Schedules ===
        if (!authB && userB.role === 'STUDENT') {
            if (!reason || !returnByTime) {
                return res.status(400).json({
                    success: false,
                    message: "ผู้รับโอนไม่มีคาบเรียน กรุณาระบุเหตุผลและเวลาคืน",
                });
            }

            const returnByB = new Date(returnByTime);
            // ตรวจว่าเวลาคืน ทับกับคาบเรียนคนอื่นหรือไม่
            const conflictingB = await prisma.dailyAuthorization.findFirst({
                where: {
                    roomCode: roomCode,
                    date: { gte: startOfDay, lte: endOfDay },
                    startTime: { lt: returnByB },
                    endTime: { gt: now },
                    userId: { not: userB.id }
                },
                include: { subject: { select: { name: true } } },
                orderBy: { startTime: 'asc' },
            });

            if (conflictingB) {
                const startStr = new Date(conflictingB.startTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                return res.status(409).json({
                    success: false,
                    message: `เวลาคืนทับกับคาบเรียน "${conflictingB.subject?.name || 'ไม่ระบุ'}" เวลา ${startStr} กรุณาเลือกเวลาคืนที่เร็วกว่านี้`,
                });
            }
        }

        const ipAddress = req.ip || req.connection?.remoteAddress || null;

        // === ขั้นตอนที่ 4: ทำการโอนใน Transaction ===
        await prisma.$transaction(async (tx) => {
            // 1. ถ้ามี Active Booking ให้โอนกรรมสิทธิ์
            if (activeBookingA) {
                const dueAtData = returnByTime ? new Date(returnByTime) : (authA ? authA.endTime : activeBookingA.dueAt);
                await tx.booking.update({
                    where: { id: activeBookingA.id },
                    data: { 
                        userId: userB.id,
                        reason: reason || activeBookingA.reason,
                        dueAt: dueAtData
                    }
                });
            }

            // 2. จัดการ DailyAuthorization
            // ลบสิทธิ์ของ A สำหรับห้องนี้ (ถ้ามี)
            if (authA) {
                await tx.dailyAuthorization.delete({ where: { id: authA.id } });
            }

            // ตรวจสอบว่า B มีสิทธิ์ในห้องนี้เวลานี้อยู่แล้วหรือไม่
            const existingAuthB = await tx.dailyAuthorization.findFirst({
                where: {
                    userId: userB.id,
                    roomCode: roomCode,
                    date: authA?.date || startOfDay,
                    startTime: authA?.startTime || now
                }
            });

            // ถ้ายังไม่มี ค่อยสร้างให้ B (เป็นสิทธิ์โอนแบบ MANUAL)
            // หรือถ้าเดิมมี authA เอาเวลาเดิม, ถ้าไม่มีให้ใช้ returnByTime เป็นหลัก
            const newEndTime = returnByTime ? new Date(returnByTime) : (authA?.endTime || new Date(now.getTime() + 2 * 60 * 60 * 1000));
            
            if (!existingAuthB) {
                await tx.dailyAuthorization.create({
                    data: {
                        userId: userB.id,
                        roomCode: roomCode,
                        date: authA?.date || startOfDay,
                        startTime: authA?.startTime || now,
                        endTime: newEndTime, 
                        source: "MANUAL",
                        scheduleId: authA?.scheduleId || null,
                        subjectId: authA?.subjectId || null,
                        createdBy: "HARDWARE_TRANSFER",
                    },
                });
            }

            // === ขั้นตอนที่ 5: บันทึก SystemLog ===
            await tx.systemLog.create({
                data: {
                    userId: userA.id,
                    action: activeBookingA ? "HARDWARE_TRANSFER_KEY_ACTIVE" : "HARDWARE_TRANSFER_AUTHORIZATION",
                    details: JSON.stringify({
                        transferType: activeBookingA ? "ACTIVE_BOOKING" : "AUTHORIZATION_ONLY",
                        bookingId: activeBookingA?.id || null,
                        roomCode: roomCode,
                        giver: studentCodeA,
                        receiver: studentCodeB,
                        source: "FACE_SCANNER",
                    }),
                    ipAddress,
                },
            });
        });

        console.log(`✅ [Hardware] transfer: สำเร็จ - ${userA.firstName} โอนห้อง ${roomCode} (${activeBookingA ? 'Active' : 'Auth'}) ให้ ${userB.firstName}`);

        return res.status(200).json({
            success: true,
            message: `โอนสิทธิ์สำเร็จ: ${userA.firstName} โอนห้อง ${roomCode} ให้ ${userB.firstName} ${activeBookingA ? '(โอนรายการเบิกกุญแจด้วย)' : ''}`,
            data: {
                roomCode,
                transferType: activeBookingA ? "ACTIVE_BOOKING" : "AUTHORIZATION_ONLY",
                giver: { studentCode: studentCodeA, firstName: userA.firstName, lastName: userA.lastName },
                receiver: { studentCode: studentCodeB, firstName: userB.firstName, lastName: userB.lastName },
            },
        });
    } catch (error) {
        console.error("❌ [Hardware] transfer error details:", error);
        try {
            await prisma.systemLog.create({
                data: {
                    userId: userA?.id || "SYSTEM",
                    action: "DEBUG_TRANSFER_ERROR",
                    details: JSON.stringify({ error: error.message || String(error), studentCodeA, studentCodeB }),
                }
            });
        } catch (_) {}
        return res.status(500).json({
            success: false,
            message: "เกิดข้อผิดพลาดในการโอนสิทธิ์กุญแจ (" + (error.message || String(error)) + ")",
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

/**
 * reconcileKeys — ตรวจสอบการคืนกุญแจอัตโนมัติ
 * 
 * รับ slotStatuses จาก Hardware Service (array ของ { slotNumber, uid })
 * เทียบกับ DB: ถ้า slot มี NFC tag อยู่ (uid != null) แต่ booking ยัง BORROWED
 * → auto-return booking นั้น
 * 
 * @param {Array<{slotNumber: number, uid: string|null}>} slotStatuses
 * @returns {Promise<{reconciled: number, details: Array}>}
 */
export const reconcileKeys = async (slotStatuses) => {
    const reconciled = [];

    try {
        // ดึง key ทั้งหมดที่มีคน BORROWED อยู่
        const borrowedBookings = await prisma.booking.findMany({
            where: { status: "BORROWED" },
            include: {
                key: true,
                user: { select: { id: true, studentCode: true, firstName: true, lastName: true, score: true } },
            },
        });

        if (borrowedBookings.length === 0) {
            console.log("🔍 [Reconcile] ไม่มี booking ที่ BORROWED อยู่");
            return { reconciled: 0, details: [] };
        }

        console.log(`🔍 [Reconcile] ตรวจสอบ ${borrowedBookings.length} bookings กับ ${slotStatuses.length} slots...`);

        for (const booking of borrowedBookings) {
            const slotNumber = booking.key?.slotNumber;
            const expectedUid = booking.key?.nfcUid?.toUpperCase();
            if (!slotNumber) continue;

            // หา slot status ของช่องนี้
            const slotStatus = slotStatuses.find(s => s.slotNumber === slotNumber);
            if (!slotStatus) continue; // ไม่มีข้อมูล slot นี้จาก hardware

            // ถ้าเจอ NFC tag ในช่อง && UID ตรงกับกุญแจที่ assigned ไว้
            // → แปลว่ากุญแจถูกเอาคืนมาแล้ว แต่ไม่ได้กดเมนูคืน
            const detectedUid = slotStatus.uid?.toUpperCase();
            if (!detectedUid) continue; // ช่องว่าง → ยังไม่ได้คืน

            // เช็ค UID ตรง (ถ้ามี expectedUid ในระบบ)
            if (expectedUid && detectedUid !== expectedUid) {
                console.log(`⚠️ [Reconcile] Slot ${slotNumber}: UID ไม่ตรง (${detectedUid} ≠ ${expectedUid}), ข้าม`);
                continue;
            }

            // ✅ Auto-return: กุญแจอยู่ในช่องถูกต้อง แต่ DB ยัง BORROWED
            console.log(`🔄 [Reconcile] Auto-return: Slot ${slotNumber} (${booking.key.roomCode}) — booking ${booking.id}`);

            const now = new Date();

            // คำนวณ penalty (ถ้าคืนช้า)
            const penaltyResult = await calculatePenalty(booking.borrowAt, booking.dueAt, now);

            await prisma.$transaction(async (tx) => {
                // อัปเดต booking เป็น RETURNED/LATE
                await tx.booking.update({
                    where: { id: booking.id },
                    data: {
                        returnAt: now,
                        status: penaltyResult.isLate ? "LATE" : "RETURNED",
                        lateMinutes: penaltyResult.lateMinutes,
                        penaltyScore: penaltyResult.penaltyScore,
                    },
                });

                // หักคะแนนถ้าสาย
                if (penaltyResult.isLate && penaltyResult.penaltyScore > 0) {
                    const newScore = Math.max(0, booking.user.score - penaltyResult.penaltyScore);
                    const shouldBan = newScore <= 0;
                    await tx.user.update({
                        where: { id: booking.user.id },
                        data: { score: newScore, isBanned: shouldBan },
                    });

                    await tx.penaltyLog.create({
                        data: {
                            userId: booking.user.id,
                            bookingId: booking.id,
                            type: "LATE_RETURN",
                            scoreCut: penaltyResult.penaltyScore,
                            reason: `คืนกุญแจห้อง ${booking.key.roomCode} ช้า ${penaltyResult.lateMinutes} นาที (ตรวจพบอัตโนมัติ)`,
                        },
                    });
                }

                // บันทึก log
                await tx.systemLog.create({
                    data: {
                        userId: booking.user.id,
                        action: "AUTO_RECONCILE_RETURN",
                        details: JSON.stringify({
                            bookingId: booking.id,
                            roomCode: booking.key.roomCode,
                            slotNumber,
                            detectedUid,
                            lateMinutes: penaltyResult.lateMinutes,
                            penaltyScore: penaltyResult.penaltyScore,
                            isLate: penaltyResult.isLate,
                            message: "กุญแจถูกคืนมาแล้ว (ตรวจพบจาก NFC อัตโนมัติ)",
                        }),
                    },
                });
            });

            reconciled.push({
                bookingId: booking.id,
                roomCode: booking.key.roomCode,
                slotNumber,
                studentCode: booking.user.studentCode,
                userName: `${booking.user.firstName} ${booking.user.lastName}`,
                isLate: penaltyResult.isLate,
                lateMinutes: penaltyResult.lateMinutes,
            });
        }

        if (reconciled.length > 0) {
            console.log(`✅ [Reconcile] Auto-return สำเร็จ ${reconciled.length} รายการ:`,
                reconciled.map(r => `${r.roomCode}(slot${r.slotNumber})`).join(', '));
        } else {
            console.log("✅ [Reconcile] ไม่มีกุญแจที่ต้อง auto-return");
        }

        return { reconciled: reconciled.length, details: reconciled };
    } catch (error) {
        console.error("❌ [Reconcile] Error:", error);
        return { reconciled: 0, details: [], error: error.message };
    }
};
