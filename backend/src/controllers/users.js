import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// GET /api/users
export const getAllUsers = async (req, res) => {
    try {
        const { role, majorId, sectionId, keyword } = req.query;

        // Build where clause
        const where = {
            isBanned: false // Default to showing only active users
        };
        if (role) where.role = role;
        if (majorId) where.section = { majorId: majorId };
        if (sectionId) where.sectionId = sectionId;

        if (keyword) {
            where.OR = [
                { firstName: { contains: keyword, mode: 'insensitive' } },
                { lastName: { contains: keyword, mode: 'insensitive' } },
                { studentCode: { contains: keyword, mode: 'insensitive' } },
                { email: { contains: keyword, mode: 'insensitive' } }
            ];
        }

        const users = await prisma.user.findMany({
            where,
            include: {
                section: {
                    include: {
                        major: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return res.status(200).json({
            message: "ดึงข้อมูลผู้ใช้งานสำเร็จ",
            data: users
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้งาน" });
    }
};

// GET /api/users/:id
export const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({
            where: { id: id },
            include: {
                section: {
                    include: {
                        major: true
                    }
                }
            }
        });

        if (!user) {
            return res.status(404).json({ message: "ไม่พบผู้ใช้งาน" });
        }

        return res.status(200).json({
            message: "ดึงข้อมูลผู้ใช้งานสำเร็จ",
            data: user
        });
    } catch (error) {
        console.error("Error fetching user:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
    }
};

// POST /api/users
export const createUser = async (req, res) => {
    try {
        let { studentCode, firstName, lastName, email, password, role, majorId, sectionId } = req.body;

        // Auto-generate email for student if not provided
        if (!email && role === 'STUDENT' && studentCode) {
            const digits = studentCode.replace(/\D/g, '');
            if (digits.length > 0) {
                email = `s${digits}@email.kmutnb.ac.th`;
            }
        }

        // Check duplicates
        if (studentCode) {
            const existingCode = await prisma.user.findUnique({ where: { studentCode } });
            if (existingCode) return res.status(400).json({ message: "รหัสผู้ใช้งานซ้ำ" });
        }

        // Check email duplicate only if email is provided
        if (email) {
            const existingEmail = await prisma.user.findFirst({ where: { email } });
            if (existingEmail) return res.status(400).json({ message: "อีเมลซ้ำ" });
        }

        // Auto-generate password from studentCode if not provided
        const passwordToHash = password || studentCode || 'default123';
        const hashedPassword = await bcrypt.hash(passwordToHash, 10);

        const newUser = await prisma.user.create({
            data: {
                studentCode,
                firstName,
                lastName,
                email,
                password: hashedPassword,
                role,
                isBanned: false,
                sectionId: sectionId || null
            }
        });

        return res.status(201).json({
            message: "เพิ่มผู้ใช้งานสำเร็จ",
            data: newUser
        });
    } catch (error) {
        console.error("Error creating user:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการสร้างผู้ใช้งาน" });
    }
};

// PUT /api/users/:id
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { studentCode, firstName, lastName, email, role, isBanned, majorId, sectionId, password } = req.body;

        // Check duplicates if updating studentCode
        if (studentCode) {
            const existingCode = await prisma.user.findUnique({ where: { studentCode } });
            if (existingCode && existingCode.id !== id) {
                return res.status(400).json({ message: "รหัสผู้ใช้งานซ้ำ" });
            }
        }
        // Check duplicates if updating email
        if (email) {
            const existingEmail = await prisma.user.findFirst({ where: { email } });
            if (existingEmail && existingEmail.id !== id) {
                return res.status(400).json({ message: "อีเมลซ้ำ" });
            }
        }

        const updateData = {
            studentCode,
            firstName,
            lastName,
            email,
            role,
            isBanned,
            sectionId: sectionId || null
        };

        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const updatedUser = await prisma.user.update({
            where: { id: id },
            data: updateData
        });

        return res.status(200).json({
            message: "อัปเดตข้อมูลสำเร็จ",
            data: updatedUser
        });

    } catch (error) {
        console.error("Error updating user:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการอัปเดตข้อมูล" });
    }
};

// DELETE /api/users/:id
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if user has any related records (bookings, schedules, etc.)
        // We prioritize soft delete if there are historical records.
        // Actually, for consistency, we can just soft delete everyone or check constraints.

        // Check for bookings
        const hasBookings = await prisma.booking.count({
            where: { userId: id }
        });

        if (hasBookings > 0) {
            // Soft delete (Ban) because of history
            await prisma.user.update({
                where: { id: id },
                data: { isBanned: true }
            });
            return res.status(200).json({ message: "ผู้ใช้งานมีประวัติการใช้งาน จึงทำการระงับการใช้งาน (Soft Delete) แทนการลบถาวร" });
        }

        // If no history, we can try hard delete, but if other constraints exist (like being a teacher in a subject), it might fail.
        // Let's safe delete -> Soft delete for everyone is requested?
        // "Both system help me do soft delete" -> imply preference for soft delete.
        // But for fresh users with no data, hard delete is cleaner.
        // Let's stick to: if error/constraints -> soft delete.

        try {
            await prisma.user.delete({
                where: { id: id }
            });
            return res.status(200).json({ message: "ลบผู้ใช้งานถาวรสำเร็จ" });
        } catch (deleteError) {
            // If delete fails (e.g. FK constraint), fall back to soft delete
            if (deleteError.code === 'P2003') {
                await prisma.user.update({
                    where: { id: id },
                    data: { isBanned: true }
                });
                return res.status(200).json({ message: "ผู้ใช้งานมีข้อมูลที่เกี่ยวข้อง จึงทำการระงับการใช้งานแทนการลบ" });
            }
            throw deleteError;
        }

    } catch (error) {
        console.error("Error deleting user:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการลบผู้ใช้งาน" });
    }
};

// Update Password (Specific)
export const updatePassword = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findFirst({
            where: { email }
        });

        if (!user) {
            return res.status(404).json({ message: "ไม่พบผู้ใช้งาน" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });

        return res.status(200).json({ message: "รีเซ็ตรหัสผ่านสำเร็จ" });
    } catch (error) {
        console.error("Error updating password:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน" });
    }
};

// POST /api/users/batch-import
export const batchImportUsers = async (req, res) => {
    try {
        const { users } = req.body; // Expect array of user objects

        if (!Array.isArray(users) || users.length === 0) {
            return res.status(400).json({ message: "ไม่มีข้อมูลนำเข้า" });
        }

        let successCount = 0;
        let failCount = 0;
        const errors = [];

        const defaultPasswordHash = await bcrypt.hash("123456", 10);

        for (const item of users) {
            try {
                // Validate data
                if (!item.studentCode || !item.firstName) {
                    throw new Error("Missing required fields (studentCode, firstName)");
                }

                // Auto-generate email for student if missing
                if (!item.email && (item.role === 'STUDENT' || !item.role)) { // Default role is student
                    const digits = String(item.studentCode).replace(/\D/g, '');
                    if (digits.length > 0) {
                        item.email = `s${digits}@email.kmutnb.ac.th`;
                    }
                }

                const existingUser = await prisma.user.findUnique({ where: { studentCode: String(item.studentCode) } });
                if (existingUser) {
                    throw new Error(`User Code ${item.studentCode} already exists`);
                }

                await prisma.user.create({
                    data: {
                        studentCode: String(item.studentCode),
                        firstName: item.firstName,
                        lastName: item.lastName || "",
                        email: item.email || null,
                        password: defaultPasswordHash,
                        role: item.role || 'STUDENT',
                        isBanned: false,
                        sectionId: item.sectionId ? String(item.sectionId) : null
                    }
                });
                successCount++;
            } catch (err) {
                failCount++;
                errors.push({ item, error: err.message });
            }
        }

        return res.status(200).json({
            message: `นำเข้าเสร็จสิ้น: สำเร็จ ${successCount}, ล้มเหลว ${failCount}`,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error("Error importing users:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการนำเข้าข้อมูล" });
    }
};

// GET /api/users/teachers
export const getTeachers = async (req, res) => {
    try {
        const teachers = await prisma.user.findMany({
            where: {
                role: 'TEACHER',
                isBanned: false
            },
            select: {
                id: true,
                studentCode: true,
                firstName: true,
                lastName: true,
            },
            orderBy: { firstName: 'asc' }
        });

        return res.status(200).json({
            message: "ดึงข้อมูลอาจารย์สำเร็จ",
            data: teachers
        });
    } catch (error) {
        console.error("Error getting teachers:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
    }
};
