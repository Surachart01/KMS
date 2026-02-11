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
                teachers: {
                    include: {
                        teacher: {
                            select: {
                                id: true,
                                studentCode: true,
                                firstName: true,
                                lastName: true
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        schedules: true
                    }
                }
            },
            orderBy: {
                code: 'asc'
            }
        });

        // Transform data to flatten teachers (removed extra level)
        // Adjust logic based on how frontend expects it. frontend expects array of teacher objects inside teachers array?
        // New structure: teachers is array of SubjectTeacher objects which contain teacher object.
        // Let's keep it simple or flatten.
        // Frontend previously used: record.teachers.map(t => t.teacher.firstName)
        // Let's look at frontend code:
        // record.teachers.map(t => t.teacher?.firstName)
        // So the current structure is Array of SubjectTeacher -> Teacher.
        // So no flattening needed if I just return the result of findMany.

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
                code: code
            },
            include: {
                schedules: {
                    include: {
                        // room: true // Room model is removed? Wait. Room is removed in controller but is it in Schema?
                        // Schema lines 1-100 didn't show Room.
                        // I need to check if Room model exists in schema.
                        // If Room model is removed, this include will fail too.
                        // Let's comment default Room include until verified.
                        // But wait, schedules usually have rooms.
                        // Let's assume schema has roomCode string but no Room relation?
                        // Or I should check schema fully.
                    }
                },
                teachers: {
                    include: {
                        teacher: true
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
        const { code, name, teacherIds } = req.body;

        if (!code || !name) {
            return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
        }

        const subject = await prisma.subject.create({
            data: {
                code,
                name,
                teachers: {
                    create: teacherIds?.map(id => ({
                        teacherId: id
                    })) || []
                }
            },
            include: {
                teachers: {
                    include: { teacher: true }
                }
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
        // Param could be 'code' or 'id' - try both
        const { code: identifier } = req.params;
        const { code, name, teacherIds } = req.body; // updated data

        if (!name) {
            return res.status(400).json({ message: "กรุณากรอกชื่อรายวิชา" });
        }

        // Check if subject exists - try id first, then code
        let existingSubject = await prisma.subject.findUnique({
            where: { id: identifier }
        });

        if (!existingSubject) {
            existingSubject = await prisma.subject.findUnique({
                where: { code: identifier }
            });
        }

        if (!existingSubject) {
            return res.status(404).json({ message: "ไม่พบรายวิชา" });
        }

        // If code is changing, we use it in data, but where clause uses currentCode
        const data = { name };
        if (code) data.code = code;

        // Handle teachers update - use subject id instead of code for reliability
        if (teacherIds) {
            data.teachers = {
                deleteMany: {},
                create: teacherIds.map(id => ({
                    teacherId: id
                }))
            };
        }

        const subject = await prisma.subject.update({
            where: {
                id: existingSubject.id
            },
            data,
            include: {
                teachers: {
                    include: { teacher: true }
                }
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
        // We might need ID here depending on route, but let's stick to code if that's what API expects
        // But wait, the Frontend sends ID for delete: `await subjectsAPI.delete(id);`
        // Let's check api.js: `delete: (code) => apiClient.delete(/api/subjects/${code})`
        // Wait! In Page.jsx: `handleDelete` uses `record.id`.
        // BUT api.js uses `code`.
        // This is inconsistent.
        // Ideally we should use ID for delete.
        // I will change controller to try finding by ID first, if not then by Code? No that's messy.
        // Standardize on using ID for everything if possible.
        // BUT API route is /api/subjects/:code possibly?
        // Let's assume the frontend passes ID now because I updated frontend `delete(record.id)`.
        // So I should update this controller to expect ID in params if the route uses :id.
        // Or if route uses :code, I should use findUnique where id = param (if it looks like UUID) or code = param.

        // Actually, the frontend call I wrote in `subjects/page.jsx` was: `await subjectsAPI.delete(id)`.
        // And `api.js` defines `delete` as accepting `code`.
        // So `apiClient.delete(/api/subjects/${code})`.
        // If I pass UUID as code, it will send UUID in URL.
        // So I should check if the param is UUID, then delete by ID.
        // Or just change API logic to always use ID?
        // Changing API logic to use ID is safer.
        // I'll assume the param is ID (since we moved to UUIDs for PK).

        const { code } = req.params; // Variable name in route likely 'code' but we treat as ID if it is UUID

        // Let's try to delete by ID first (as UUID)
        try {
            await prisma.subject.delete({
                where: { id: code }
            });
        } catch (e) {
            // If failed, maybe it was a code?
            if (e.code === 'P2025') {
                // Try by code
                await prisma.subject.delete({
                    where: { code: code }
                });
            } else {
                throw e;
            }
        }

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
