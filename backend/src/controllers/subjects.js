import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET /api/subjects
 * ดึงรายการรายวิชาทั้งหมด
 */
export const getAllSubjects = async (req, res) => {
    try {
        const subjects = await prisma.subject.findMany({
            include: {
                _count: {
                    select: {
                        class_schedules: true
                    }
                }
            },
            orderBy: {
                subject_code: 'asc'
            }
        });

        return res.status(200).json({
            message: "ดึงข้อมูลรายวิชาสำเร็จ",
            data: subjects
        });
    } catch (error) {
        console.error("Error getting subjects:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
    }
};

/**
 * GET /api/subjects/:code
 * ดึงข้อมูลรายวิชาตามรหัสวิชา
 */
export const getSubjectByCode = async (req, res) => {
    try {
        const { code } = req.params;

        const subject = await prisma.subject.findUnique({
            where: {
                subject_code: code
            },
            include: {
                class_schedules: {
                    include: {
                        room: true
                    }
                }
            }
        });

        if (!subject) {
            return res.status(404).json({ message: "ไม่พบรายวิชา" });
        }

        return res.status(200).json({
            message: "ดึงข้อมูลรายวิชาสำเร็จ",
            data: subject
        });
    } catch (error) {
        console.error("Error getting subject:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
    }
};

/**
 * POST /api/subjects
 * เพิ่มรายวิชาใหม่ (Staff Only)
 */
export const createSubject = async (req, res) => {
    try {
        const { subject_code, subject_name } = req.body;

        if (!subject_code || !subject_name) {
            return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
        }

        const subject = await prisma.subject.create({
            data: {
                subject_code,
                subject_name
            }
        });

        return res.status(201).json({
            message: "เพิ่มรายวิชาสำเร็จ",
            data: subject
        });
    } catch (error) {
        console.error("Error creating subject:", error);

        if (error.code === 'P2002') {
            return res.status(400).json({ message: "รหัสวิชานี้มีอยู่ในระบบแล้ว" });
        }

        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการเพิ่มข้อมูล" });
    }
};

/**
 * PUT /api/subjects/:code
 * แก้ไขรายวิชา (Staff Only)
 */
export const updateSubject = async (req, res) => {
    try {
        const { code } = req.params;
        const { subject_name } = req.body;

        if (!subject_name) {
            return res.status(400).json({ message: "กรุณากรอกชื่อรายวิชา" });
        }

        const subject = await prisma.subject.update({
            where: {
                subject_code: code
            },
            data: {
                subject_name
            }
        });

        return res.status(200).json({
            message: "แก้ไขรายวิชาสำเร็จ",
            data: subject
        });
    } catch (error) {
        console.error("Error updating subject:", error);

        if (error.code === 'P2025') {
            return res.status(404).json({ message: "ไม่พบรายวิชา" });
        }

        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการแก้ไขข้อมูล" });
    }
};

/**
 * DELETE /api/subjects/:code
 * ลบรายวิชา (Staff Only)
 */
export const deleteSubject = async (req, res) => {
    try {
        const { code } = req.params;

        await prisma.subject.delete({
            where: {
                subject_code: code
            }
        });

        return res.status(200).json({
            message: "ลบรายวิชาสำเร็จ"
        });
    } catch (error) {
        console.error("Error deleting subject:", error);

        if (error.code === 'P2025') {
            return res.status(404).json({ message: "ไม่พบรายวิชา" });
        }

        if (error.code === 'P2003') {
            return res.status(400).json({
                message: "ไม่สามารถลบได้ เนื่องจากมีตารางเรียนที่เกี่ยวข้อง"
            });
        }

        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการลบข้อมูล" });
    }
};
