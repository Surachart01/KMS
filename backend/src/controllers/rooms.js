import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET /api/rooms
 * ดึงรายการห้องเรียนทั้งหมด
 */
export const getAllRooms = async (req, res) => {
    try {
        const rooms = await prisma.room.findMany({
            include: {
                _count: {
                    select: {
                        keys: true,
                        class_schedules: true
                    }
                }
            },
            orderBy: [
                { building: 'asc' },
                { floor: 'asc' },
                { room_id: 'asc' }
            ]
        });

        return res.status(200).json({
            message: "ดึงข้อมูลห้องเรียนสำเร็จ",
            data: rooms
        });
    } catch (error) {
        console.error("Error getting rooms:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
    }
};

/**
 * GET /api/rooms/:id
 * ดึงข้อมูลห้องเรียนตาม ID
 */
export const getRoomById = async (req, res) => {
    try {
        const { id } = req.params;

        const room = await prisma.room.findUnique({
            where: {
                room_id: id
            },
            include: {
                keys: true,
                class_schedules: {
                    include: {
                        subject: true
                    }
                }
            }
        });

        if (!room) {
            return res.status(404).json({ message: "ไม่พบห้องเรียน" });
        }

        return res.status(200).json({
            message: "ดึงข้อมูลห้องเรียนสำเร็จ",
            data: room
        });
    } catch (error) {
        console.error("Error getting room:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
    }
};

/**
 * POST /api/rooms
 * เพิ่มห้องเรียนใหม่ (Staff Only)
 */
export const createRoom = async (req, res) => {
    try {
        const { room_id, room_name, building, floor, status } = req.body;

        if (!room_id) {
            return res.status(400).json({ message: "กรุณากรอกรหัสห้อง" });
        }

        const room = await prisma.room.create({
            data: {
                room_id,
                room_name,
                building,
                floor: floor ? parseInt(floor) : null,
                status: status || 'available'
            }
        });

        return res.status(201).json({
            message: "เพิ่มห้องเรียนสำเร็จ",
            data: room
        });
    } catch (error) {
        console.error("Error creating room:", error);

        if (error.code === 'P2002') {
            return res.status(400).json({ message: "รหัสห้องนี้มีอยู่ในระบบแล้ว" });
        }

        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการเพิ่มข้อมูล" });
    }
};

/**
 * PUT /api/rooms/:id
 * แก้ไขห้องเรียน (Staff Only)
 */
export const updateRoom = async (req, res) => {
    try {
        const { id } = req.params;
        const { room_name, building, floor, status } = req.body;

        const room = await prisma.room.update({
            where: {
                room_id: id
            },
            data: {
                room_name,
                building,
                floor: floor ? parseInt(floor) : null,
                status
            }
        });

        return res.status(200).json({
            message: "แก้ไขห้องเรียนสำเร็จ",
            data: room
        });
    } catch (error) {
        console.error("Error updating room:", error);

        if (error.code === 'P2025') {
            return res.status(404).json({ message: "ไม่พบห้องเรียน" });
        }

        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการแก้ไขข้อมูล" });
    }
};

/**
 * DELETE /api/rooms/:id
 * ลบห้องเรียน (Staff Only)
 */
export const deleteRoom = async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.room.delete({
            where: {
                room_id: id
            }
        });

        return res.status(200).json({
            message: "ลบห้องเรียนสำเร็จ"
        });
    } catch (error) {
        console.error("Error deleting room:", error);

        if (error.code === 'P2025') {
            return res.status(404).json({ message: "ไม่พบห้องเรียน" });
        }

        if (error.code === 'P2003') {
            return res.status(400).json({
                message: "ไม่สามารถลบได้ เนื่องจากมีกุญแจหรือตารางเรียนที่เกี่ยวข้อง"
            });
        }

        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการลบข้อมูล" });
    }
};
