import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET /api/transactions
 * ดึงประวัติการเบิก-คืนทั้งหมด พร้อม Search & Filter
 */
export const getTransactions = async (req, res) => {
    try {
        const { status, search, startDate, endDate } = req.query;

        const where = {};

        // Filter by status
        if (status) {
            where.status = status;
        }

        // Search by User or Key or Room
        if (search) {
            where.OR = [
                {
                    user: {
                        OR: [
                            { user_no: { contains: search } },
                            { first_name: { contains: search } },
                            { last_name: { contains: search } }
                        ]
                    }
                },
                {
                    key: {
                        key_id: { contains: search }
                    }
                },
                {
                    room: {
                        room_name: { contains: search }
                    }
                }
            ];
        }

        // Filter by Date Range
        if (startDate && endDate) {
            where.borrow_time = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }

        const transactions = await prisma.borrowTransaction.findMany({
            where,
            include: {
                user: true,
                key: true,
                room: true,
                reason: true
            },
            orderBy: {
                borrow_time: 'desc'
            }
        });

        return res.status(200).json({
            message: "ดึงข้อมูลประวัติการเบิก-คืนสำเร็จ",
            data: transactions
        });
    } catch (error) {
        console.error("Error fetching transactions:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
    }
};

/**
 * POST /api/transactions/borrow
 * ทำรายการเบิกกุญแจ
 */
export const borrowKey = async (req, res) => {
    try {
        const { user_no, key_id, reason_id, note } = req.body;

        if (!user_no || !key_id || !reason_id) {
            return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
        }

        // 1. หา User
        const user = await prisma.user.findFirst({
            where: {
                user_no: user_no,
                status: 'active'
            }
        });

        if (!user) {
            return res.status(404).json({ message: "ไม่พบผู้ใช้งาน หรือบัญชีถูกระงับ" });
        }

        // 2. หา Key และตรวจสอบสถานะ
        const key = await prisma.key.findUnique({
            where: { key_id: key_id },
            include: { room: true }
        });

        if (!key) {
            return res.status(404).json({ message: "ไม่พบกุญแจในระบบ" });
        }

        if (key.status !== 'in_cabinet') {
            return res.status(400).json({ message: "กุญแจไม่ได้อยู่ในตู้ (ถูกเบิกไปแล้ว หรือเสีย)" });
        }

        // 3. สร้าง Transaction และอัพเดตสถานะกุญแจ (Atomic Transaction)
        const result = await prisma.$transaction(async (prisma) => {
            // สร้าง Transaction Record
            const transaction = await prisma.borrowTransaction.create({
                data: {
                    user_id: user.user_id,
                    key_id: key.key_id,
                    room_id: key.room_id,
                    reason_id: reason_id,
                    note: note,
                    borrow_time: new Date(),
                    status: 'borrowed',
                    verify_method: 'NFC' // สมมติว่าใช้ NFC หรือ Manual staff
                }
            });

            // อัพเดตสถานะ Key
            await prisma.key.update({
                where: { key_id: key_id },
                data: { status: 'borrowed' }
            });

            return transaction;
        });

        return res.status(201).json({
            message: "เบิกกุญแจสำเร็จ",
            data: result
        });

    } catch (error) {
        console.error("Error borrowing key:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการทำรายการ" });
    }
};

/**
 * POST /api/transactions/return
 * ทำรายการคืนกุญแจ
 */
export const returnKey = async (req, res) => {
    try {
        const { key_id } = req.body;

        if (!key_id) {
            return res.status(400).json({ message: "กรุณาระบุรหัสกุญแจ" });
        }

        // 1. หา Transaction ที่ยังไม่คืน ของกุญแจนี้
        const activeTransaction = await prisma.borrowTransaction.findFirst({
            where: {
                key_id: key_id,
                status: 'borrowed'
            },
            orderBy: {
                borrow_time: 'desc'
            }
        });

        if (!activeTransaction) {
            return res.status(404).json({ message: "ไม่พบข้อมูลการยืมที่ค้างอยู่สำหรับกุญแจนี้" });
        }

        // 2. อัพเดต Transaction และสถานะ Key (Atomic)
        const result = await prisma.$transaction(async (prisma) => {
            const updatedTransaction = await prisma.borrowTransaction.update({
                where: { transaction_id: activeTransaction.transaction_id },
                data: {
                    return_time: new Date(),
                    status: 'returned'
                }
            });

            await prisma.key.update({
                where: { key_id: key_id },
                data: { status: 'in_cabinet' }
            });

            return updatedTransaction;
        });

        return res.status(200).json({
            message: "คืนกุญแจสำเร็จ",
            data: result
        });

    } catch (error) {
        console.error("Error returning key:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการทำรายการ" });
    }
};
