import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET /api/borrow-reasons
 * ดึงรายการเหตุผลการเบิกทั้งหมด
 */
export const getAllBorrowReasons = async (req, res) => {
    try {
        const reasons = await prisma.borrowReason.findMany({
            include: {
                _count: {
                    select: {
                        borrow_transactions: true
                    }
                }
            },
            orderBy: {
                reason_name: 'asc'
            }
        });

        return res.status(200).json({
            message: "ดึงข้อมูลเหตุผลการเบิกสำเร็จ",
            data: reasons
        });
    } catch (error) {
        console.error("Error getting borrow reasons:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
    }
};

/**
 * GET /api/borrow-reasons/:id
 * ดึงข้อมูลเหตุผลการเบิกตาม ID
 */
export const getBorrowReasonById = async (req, res) => {
    try {
        const { id } = req.params;

        const reason = await prisma.borrowReason.findUnique({
            where: {
                reason_id: id
            },
            include: {
                borrow_transactions: {
                    include: {
                        user: {
                            select: {
                                user_id: true,
                                user_no: true,
                                first_name: true,
                                last_name: true
                            }
                        },
                        key: true,
                        room: true
                    },
                    orderBy: {
                        borrow_time: 'desc'
                    }
                }
            }
        });

        if (!reason) {
            return res.status(404).json({ message: "ไม่พบเหตุผลการเบิก" });
        }

        return res.status(200).json({
            message: "ดึงข้อมูลเหตุผลการเบิกสำเร็จ",
            data: reason
        });
    } catch (error) {
        console.error("Error getting borrow reason:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
    }
};

/**
 * POST /api/borrow-reasons
 * เพิ่มเหตุผลการเบิกใหม่ (Staff Only)
 */
export const createBorrowReason = async (req, res) => {
    try {
        const { reason_id, reason_name, require_note } = req.body;

        if (!reason_id || !reason_name) {
            return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
        }

        const reason = await prisma.borrowReason.create({
            data: {
                reason_id,
                reason_name,
                require_note: require_note || false
            }
        });

        return res.status(201).json({
            message: "เพิ่มเหตุผลการเบิกสำเร็จ",
            data: reason
        });
    } catch (error) {
        console.error("Error creating borrow reason:", error);

        if (error.code === 'P2002') {
            return res.status(400).json({ message: "รหัสเหตุผลนี้มีอยู่ในระบบแล้ว" });
        }

        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการเพิ่มข้อมูล" });
    }
};

/**
 * PUT /api/borrow-reasons/:id
 * แก้ไขเหตุผลการเบิก (Staff Only)
 */
export const updateBorrowReason = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason_name, require_note } = req.body;

        if (!reason_name) {
            return res.status(400).json({ message: "กรุณากรอกชื่อเหตุผลการเบิก" });
        }

        const reason = await prisma.borrowReason.update({
            where: {
                reason_id: id
            },
            data: {
                reason_name,
                require_note: require_note !== undefined ? require_note : undefined
            }
        });

        return res.status(200).json({
            message: "แก้ไขเหตุผลการเบิกสำเร็จ",
            data: reason
        });
    } catch (error) {
        console.error("Error updating borrow reason:", error);

        if (error.code === 'P2025') {
            return res.status(404).json({ message: "ไม่พบเหตุผลการเบิก" });
        }

        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการแก้ไขข้อมูล" });
    }
};

/**
 * DELETE /api/borrow-reasons/:id
 * ลบเหตุผลการเบิก (Staff Only)
 */
export const deleteBorrowReason = async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.borrowReason.delete({
            where: {
                reason_id: id
            }
        });

        return res.status(200).json({
            message: "ลบเหตุผลการเบิกสำเร็จ"
        });
    } catch (error) {
        console.error("Error deleting borrow reason:", error);

        if (error.code === 'P2025') {
            return res.status(404).json({ message: "ไม่พบเหตุผลการเบิก" });
        }

        if (error.code === 'P2003') {
            return res.status(400).json({
                message: "ไม่สามารถลบได้ เนื่องจากมีการใช้งานในประวัติการเบิก"
            });
        }

        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการลบข้อมูล" });
    }
};
