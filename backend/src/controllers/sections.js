import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET /api/sections
 * ดึงรายการกลุ่มเรียนทั้งหมด
 */
export const getAllSections = async (req, res) => {
    try {
        const sections = await prisma.section.findMany({
            include: {
                major: true,
                _count: {
                    select: {
                        users: true
                    }
                }
            },
            orderBy: [
                { major_id: 'asc' },
                { section_name: 'asc' }
            ]
        });

        return res.status(200).json({
            message: "ดึงข้อมูลกลุ่มเรียนสำเร็จ",
            data: sections
        });
    } catch (error) {
        console.error("Error getting sections:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
    }
};

/**
 * GET /api/sections/:id
 * ดึงข้อมูลกลุ่มเรียนตาม ID
 */
export const getSectionById = async (req, res) => {
    try {
        const { id } = req.params;

        const section = await prisma.section.findUnique({
            where: {
                section_id: parseInt(id)
            },
            include: {
                major: true,
                users: {
                    select: {
                        user_id: true,
                        user_no: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        role: true
                    }
                }
            }
        });

        if (!section) {
            return res.status(404).json({ message: "ไม่พบกลุ่มเรียน" });
        }

        return res.status(200).json({
            message: "ดึงข้อมูลกลุ่มเรียนสำเร็จ",
            data: section
        });
    } catch (error) {
        console.error("Error getting section:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
    }
};

/**
 * POST /api/sections
 * เพิ่มกลุ่มเรียนใหม่ (Staff Only)
 */
export const createSection = async (req, res) => {
    try {
        const { section_name, major_id } = req.body;

        if (!section_name || !major_id) {
            return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
        }

        const section = await prisma.section.create({
            data: {
                section_name,
                major_id: parseInt(major_id)
            },
            include: {
                major: true
            }
        });

        return res.status(201).json({
            message: "เพิ่มกลุ่มเรียนสำเร็จ",
            data: section
        });
    } catch (error) {
        console.error("Error creating section:", error);

        if (error.code === 'P2003') {
            return res.status(400).json({ message: "ไม่พบสาขาวิชาที่เลือก" });
        }

        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการเพิ่มข้อมูล" });
    }
};

/**
 * PUT /api/sections/:id
 * แก้ไขกลุ่มเรียน (Staff Only)
 */
export const updateSection = async (req, res) => {
    try {
        const { id } = req.params;
        const { section_name, major_id } = req.body;

        if (!section_name || !major_id) {
            return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
        }

        const section = await prisma.section.update({
            where: {
                section_id: parseInt(id)
            },
            data: {
                section_name,
                major_id: parseInt(major_id)
            },
            include: {
                major: true
            }
        });

        return res.status(200).json({
            message: "แก้ไขกลุ่มเรียนสำเร็จ",
            data: section
        });
    } catch (error) {
        console.error("Error updating section:", error);

        if (error.code === 'P2025') {
            return res.status(404).json({ message: "ไม่พบกลุ่มเรียน" });
        }

        if (error.code === 'P2003') {
            return res.status(400).json({ message: "ไม่พบสาขาวิชาที่เลือก" });
        }

        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการแก้ไขข้อมูล" });
    }
};

/**
 * DELETE /api/sections/:id
 * ลบกลุ่มเรียน (Staff Only)
 */
export const deleteSection = async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.section.delete({
            where: {
                section_id: parseInt(id)
            }
        });

        return res.status(200).json({
            message: "ลบกลุ่มเรียนสำเร็จ"
        });
    } catch (error) {
        console.error("Error deleting section:", error);

        if (error.code === 'P2025') {
            return res.status(404).json({ message: "ไม่พบกลุ่มเรียน" });
        }

        if (error.code === 'P2003') {
            return res.status(400).json({
                message: "ไม่สามารถลบได้ เนื่องจากมีข้อมูลที่เกี่ยวข้อง"
            });
        }

        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการลบข้อมูล" });
    }
};
