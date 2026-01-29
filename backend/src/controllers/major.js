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
                name: 'asc'
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
                id: id
            },
            include: {
                sections: true,
                users: {
                    select: {
                        id: true,
                        studentCode: true,
                        firstName: true,
                        lastName: true,
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
        const { code, name } = req.body;

        if (!code || !name) {
            return res.status(400).json({ message: "กรุณากรอกรหัสและชื่อสาขาวิชา" });
        }

        // Check if code exists
        const existing = await prisma.major.findUnique({
            where: { code }
        });

        if (existing) {
            return res.status(400).json({ message: "รหัสสาขาวิชานี้มีอยู่แล้ว" });
        }

        const major = await prisma.major.create({
            data: {
                code,
                name
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
 * แก้ไขสาขาวิชา (Staff Only)
 */
export const updateMajor = async (req, res) => {
    try {
        const { id } = req.params;
        const { code, name } = req.body;

        if (!name) { // code might be optional if not changing
            return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
        }

        const data = { name };
        if (code) data.code = code;

        const major = await prisma.major.update({
            where: {
                id: id
            },
            data
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

        if (error.code === 'P2002') {
            return res.status(400).json({ message: "รหัสสาขาวิชาซ้ำ" });
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
                id: id
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
