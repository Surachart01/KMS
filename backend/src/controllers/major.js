import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET /api/majors
 * ดึงรายการสาขาวิชาทั้งหมด
 */
export const getAllMajors = async (req, res) => {
    try {
        const majors = await prisma.major.findMany({
            include: {
                _count: {
                    select: {
                        sections: true,
                        users: true
                    }
                }
            },
            orderBy: {
                major_name: 'asc'
            }
        });

        return res.status(200).json({
            message: "ดึงข้อมูลสาขาวิชาสำเร็จ",
            data: majors
        });
    } catch (error) {
        console.error("Error getting majors:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
    }
};

/**
 * GET /api/majors/:id
 * ดึงข้อมูลสาขาวิชาตาม ID
 */
export const getMajorById = async (req, res) => {
    try {
        const { id } = req.params;

        const major = await prisma.major.findUnique({
            where: {
                major_id: parseInt(id)
            },
            include: {
                sections: true,
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

        if (!major) {
            return res.status(404).json({ message: "ไม่พบสาขาวิชา" });
        }

        return res.status(200).json({
            message: "ดึงข้อมูลสาขาวิชาสำเร็จ",
            data: major
        });
    } catch (error) {
        console.error("Error getting major:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
    }
};

/**
 * POST /api/majors
 * เพิ่มสาขาวิชาใหม่ (Staff Only)
 */
export const createMajor = async (req, res) => {
    try {
        const { major_name } = req.body;

        if (!major_name) {
            return res.status(400).json({ message: "กรุณากรอกชื่อสาขาวิชา" });
        }

        const major = await prisma.major.create({
            data: {
                major_name
            }
        });

        return res.status(201).json({
            message: "เพิ่มสาขาวิชาสำเร็จ",
            data: major
        });
    } catch (error) {
        console.error("Error creating major:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการเพิ่มข้อมูล" });
    }
};

/**
 * PUT /api/majors/:id
 * แก้ไขสาขาวิช า (Staff Only)
 */
export const updateMajor = async (req, res) => {
    try {
        const { id } = req.params;
        const { major_name } = req.body;

        if (!major_name) {
            return res.status(400).json({ message: "กรุณากรอกชื่อสาขาวิชา" });
        }

        const major = await prisma.major.update({
            where: {
                major_id: parseInt(id)
            },
            data: {
                major_name
            }
        });

        return res.status(200).json({
            message: "แก้ไขสาขาวิชาสำเร็จ",
            data: major
        });
    } catch (error) {
        console.error("Error updating major:", error);

        if (error.code === 'P2025') {
            return res.status(404).json({ message: "ไม่พบสาขาวิชา" });
        }

        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการแก้ไขข้อมูล" });
    }
};

/**
 * DELETE /api/majors/:id
 * ลบสาขาวิชา (Staff Only)
 */
export const deleteMajor = async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.major.delete({
            where: {
                major_id: parseInt(id)
            }
        });

        return res.status(200).json({
            message: "ลบสาขาวิชาสำเร็จ"
        });
    } catch (error) {
        console.error("Error deleting major:", error);

        if (error.code === 'P2025') {
            return res.status(404).json({ message: "ไม่พบสาขาวิชา" });
        }

        if (error.code === 'P2003') {
            return res.status(400).json({
                message: "ไม่สามารถลบได้ เนื่องจากมีข้อมูลที่เกี่ยวข้อง"
            });
        }

        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการลบข้อมูล" });
    }
};
