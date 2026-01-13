import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET /api/keys
 * ดึงรายการกุญแจทั้งหมด
 */
export const getAllKeys = async (req, res) => {
    try {
        const keys = await prisma.key.findMany({
            include: {
                room: true
            },
            orderBy: {
                key_id: 'asc'
            }
        });

        return res.status(200).json({
            message: "ดึงข้อมูลกุญแจสำเร็จ",
            data: keys
        });
    } catch (error) {
        console.error("Error getting keys:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
    }
};

/**
 * GET /api/keys/:id
 * ดึงข้อมูลกุญแจตล่าง ID
 */
export const getKeyById = async (req, res) => {
    try {
        const { id } = req.params;

        const key = await prisma.key.findUnique({
            where: {
                key_id: id
            },
            include: {
                room: true,
                borrow_transactions: {
                    include: {
                        user: {
                            select: {
                                user_id: true,
                                user_no: true,
                                first_name: true,
                                last_name: true
                            }
                        }
                    },
                    orderBy: {
                        borrow_time: 'desc'
                    }
                }
            }
        });

        if (!key) {
            return res.status(404).json({ message: "ไม่พบกุญแจ" });
        }

        return res.status(200).json({
            message: "ดึงข้อมูลกุญแจสำเร็จ",
            data: key
        });
    } catch (error) {
        console.error("Error getting key:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
    }
};

/**
 * POST /api/keys
 * เพิ่มกุญแจใหม่ (Staff Only)
 */
export const createKey = async (req, res) => {
    try {
        const { key_id, room_id, cabinet_slot, nfc_uid, status } = req.body;

        if (!key_id || !room_id || !nfc_uid) {
            return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
        }

        const key = await prisma.key.create({
            data: {
                key_id,
                room_id,
                cabinet_slot: cabinet_slot ? parseInt(cabinet_slot) : null,
                nfc_uid,
                status: status || 'in_cabinet'
            },
            include: {
                room: true
            }
        });

        return res.status(201).json({
            message: "เพิ่มกุญแจสำเร็จ",
            data: key
        });
    } catch (error) {
        console.error("Error creating key:", error);

        if (error.code === 'P2002') {
            return res.status(400).json({ message: "รหัสกุญแจหรือ NFC UID นี้มีอยู่ในระบบแล้ว" });
        }

        if (error.code === 'P2003') {
            return res.status(400).json({ message: "ไม่พบห้องเรียนที่เลือก" });
        }

        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการเพิ่มข้อมูล" });
    }
};

/**
 * PUT /api/keys/:id
 * แก้ไขกุญแจ (Staff Only)
 */
export const updateKey = async (req, res) => {
    try {
        const { id } = req.params;
        const { room_id, cabinet_slot, nfc_uid, status } = req.body;

        const key = await prisma.key.update({
            where: {
                key_id: id
            },
            data: {
                room_id,
                cabinet_slot: cabinet_slot ? parseInt(cabinet_slot) : null,
                nfc_uid,
                status
            },
            include: {
                room: true
            }
        });

        return res.status(200).json({
            message: "แก้ไขกุญแจสำเร็จ",
            data: key
        });
    } catch (error) {
        console.error("Error updating key:", error);

        if (error.code === 'P2025') {
            return res.status(404).json({ message: "ไม่พบกุญแจ" });
        }

        if (error.code === 'P2002') {
            return res.status(400).json({ message: "NFC UID นี้มีอยู่ในระบบแล้ว" });
        }

        if (error.code === 'P2003') {
            return res.status(400).json({ message: "ไม่พบห้องเรียนที่เลือก" });
        }

        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการแก้ไขข้อมูล" });
    }
};

/**
 * DELETE /api/keys/:id
 * ลบกุญแจ (Staff Only)
 */
export const deleteKey = async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.key.delete({
            where: {
                key_id: id
            }
        });

        return res.status(200).json({
            message: "ลบกุญแจสำเร็จ"
        });
    } catch (error) {
        console.error("Error deleting key:", error);

        if (error.code === 'P2025') {
            return res.status(404).json({ message: "ไม่พบกุญแจ" });
        }

        if (error.code === 'P2003') {
            return res.status(400).json({
                message: "ไม่สามารถลบได้ เนื่องจากมีประวัติการเบิกที่เกี่ยวข้อง"
            });
        }

        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการลบข้อมูล" });
    }
};
