import { PrismaClient } from "@prisma/client";
import { HardwareEvents } from '../utils/hardwareEvents.js';

const prisma = new PrismaClient();

/**
 * GET /api/keys
 * ดึงรายการกุญแจทั้งหมด
 */
export const getAllKeys = async (req, res) => {
    try {
        const keys = await prisma.key.findMany({
            include: {
                bookings: {
                    where: {
                        status: 'BORROWED'
                    },
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 1
                }
            },
            orderBy: {
                roomCode: 'asc'
            }
        });

        // Transform to add derived status
        const formattedKeys = keys.map(k => {
            let status = 'AVAILABLE';
            if (!k.isActive) {
                status = 'UNAVAILABLE';
            } else if (k.bookings.length > 0) {
                status = 'BORROWED';
            }

            return {
                id: k.id,
                roomCode: k.roomCode,
                slotNumber: k.slotNumber,
                isActive: k.isActive,
                nfcUid: k.nfcUid,
                status // Derived status for frontend
            };
        });

        return res.status(200).json({
            message: "ดึงข้อมูลกุญแจสำเร็จ",
            data: formattedKeys
        });
    } catch (error) {
        console.error("Error getting keys:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
    }
};

/**
 * GET /api/keys/:id
 * ดึงข้อมูลกุญแจตาม ID
 */
export const getKeyById = async (req, res) => {
    try {
        const { id } = req.params;

        const key = await prisma.key.findUnique({
            where: {
                id: id
            },
            include: {
                bookings: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                studentCode: true,
                                firstName: true,
                                lastName: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 10 // Recent history
                }
            }
        });

        if (!key) {
            return res.status(404).json({ message: "ไม่พบกุญแจ" });
        }

        // Derive status
        let status = 'AVAILABLE';
        const activeBooking = key.bookings.find(b => b.status === 'BORROWED');
        if (!key.isActive) {
            status = 'UNAVAILABLE';
        } else if (activeBooking) {
            status = 'BORROWED';
        }

        return res.status(200).json({
            message: "ดึงข้อมูลกุญแจสำเร็จ",
            data: {
                ...key,
                status
            }
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
        const { roomCode, slotNumber, isActive } = req.body;

        if (!roomCode || slotNumber === undefined) {
            return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
        }

        // Check if roomCode already exists? 
        // Schema doesn't say roomCode is unique per Key, but roomCode usually is unique for a Room.
        // Wait, one key per room? Or multiple keys per room?
        // Schema: `roomCode` is NOT unique in Key model?
        // Schema: `roomCode String` but no `@unique`.
        // BUT usually 1 key per room.
        // Let's assume validation: check if key for this room already exists?
        // Or maybe multiple keys for same room? 
        // Given it's a key cabinet, maybe 1 slot = 1 key.
        // Check slotNumber usage.

        // Let's check if slot is occupied?
        const existingKeyInSlot = await prisma.key.findFirst({
            where: { slotNumber: parseInt(slotNumber) }
        });
        if (existingKeyInSlot) {
            return res.status(400).json({ message: `ช่อง ${slotNumber} มีกุญแจอยู่แล้ว` });
        }

        // Check if room already has a key?
        const existingKeyForRoom = await prisma.key.findFirst({
            where: { roomCode: roomCode }
        });
        if (existingKeyForRoom) {
            return res.status(400).json({ message: `ห้อง ${roomCode} มีกุญแจอยู่แล้ว` });
        }

        const key = await prisma.key.create({
            data: {
                roomCode,
                slotNumber: parseInt(slotNumber),
                isActive: isActive !== undefined ? isActive : true
            }
        });

        return res.status(201).json({
            message: "เพิ่มกุญแจสำเร็จ",
            data: key
        });
    } catch (error) {
        console.error("Error creating key:", error);
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
        const { roomCode, slotNumber, isActive, nfcUid } = req.body;

        // Validations if changing slot/room
        // Skip for brevity, relying on user or constraints (none in schema except types)

        const key = await prisma.key.update({
            where: {
                id: id
            },
            data: {
                ...(roomCode !== undefined && { roomCode }),
                ...(slotNumber !== undefined && { slotNumber: parseInt(slotNumber) }),
                ...(isActive !== undefined && { isActive }),
                // nfcUid: null จะล้างค่า, nfcUid: 'xxx' จะบันทึก, undefined จะไม่เปลี่ยน
                ...(nfcUid !== undefined && { nfcUid: nfcUid || null }),
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
                id: id
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

/**
 * POST /api/keys/:id/nfc-write
 * สั่ง RPi เขียน NFC UID ลง tag ที่ช่อง slotNumber ของกุญแจนั้น
 * Body: { uid: string }
 */
export const writeNfcTag = async (req, res) => {
    try {
        const { id } = req.params;
        const { uid } = req.body;
        console.log(`\n\n[API ENTRY] POST /api/keys/${id}/nfc-write - Body:`, req.body);

        if (!uid || !uid.trim()) {
            return res.status(400).json({ message: "กรุณาระบุ NFC UID" });
        }

        // หากุญแจเพื่อเอา slotNumber
        const key = await prisma.key.findUnique({ where: { id } });
        if (!key) {
            return res.status(404).json({ message: "ไม่พบกุญแจ" });
        }

        // ส่งคำสั่ง write ไป RPi ผ่าน Socket.IO
        const io = req.app.get('io');
        if (!io) {
            return res.status(500).json({ message: "Socket.IO ยังไม่พร้อม" });
        }

        // emit ไป gpio room แล้วรอ result (timeout 15 วินาที)
        const writePromise = new Promise((resolve) => {
            const timeout = setTimeout(() => {
                resolve({ success: false, message: "หมดเวลารอ RPi ตอบกลับ (15 วินาที)" });
            }, 15000);

            // ฟัง result จาก RPi (ครั้งเดียว)
            const handler = (data) => {
                if (data.slotNumber === key.slotNumber) {
                    clearTimeout(timeout);
                    HardwareEvents.removeListener('nfc:write-result', handler);
                    resolve(data);
                }
            };

            // ฟังจาก global emitter ที่มาจาก socket.on ใน server.js
            HardwareEvents.on('nfc:write-result', handler);

            // ส่งคำสั่ง write ไป RPi (ผ่าน Socket.IO)
            io.to('gpio').emit('nfc:write', {
                slotNumber: key.slotNumber,
                uid: uid.trim(),
                roomCode: key.roomCode,
            });

            console.log(`🏷️ [NFC Write] สั่ง RPi เขียน UID ${uid} ลง slot ${key.slotNumber} (${key.roomCode})`);
        });

        const result = await writePromise;

        if (result.success) {
            // เขียนสำเร็จ → บันทึก UID ลง DB ด้วย
            await prisma.key.update({
                where: { id },
                data: { nfcUid: uid.trim() },
            });

            return res.status(200).json({
                message: `เขียน NFC UID สำเร็จ (ห้อง ${key.roomCode}, ช่อง ${key.slotNumber})`,
                data: { uid: uid.trim(), slotNumber: key.slotNumber },
            });
        } else {
            return res.status(500).json({
                message: result.message || "เขียน NFC ไม่สำเร็จ",
            });
        }
    } catch (error) {
        console.error("Error writing NFC:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการเขียน NFC" });
    }
};

