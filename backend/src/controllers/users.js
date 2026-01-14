import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// GET /api/users
export const getAllUsers = async (req, res) => {
    try {
        const { role, major_id, section_id, keyword } = req.query;

        // Build where clause
        const where = {};
        if (role) where.role = role;
        if (major_id) where.major_id = parseInt(major_id);
        if (section_id) where.section_id = parseInt(section_id);

        if (keyword) {
            where.OR = [
                { first_name: { contains: keyword, mode: 'insensitive' } },
                { last_name: { contains: keyword, mode: 'insensitive' } },
                { user_no: { contains: keyword, mode: 'insensitive' } },
                { email: { contains: keyword, mode: 'insensitive' } }
            ];
        }

        const users = await prisma.user.findMany({
            where,
            include: {
                major: true,
                section: true
            },
            orderBy: {
                created_at: 'desc'
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
            where: { user_id: id },
            include: {
                major: true,
                section: true
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
        const { user_no, first_name, last_name, email, password, role, status, major_id, section_id } = req.body;

        // Check duplicates
        if (user_no) {
            const existingUserNo = await prisma.user.findUnique({ where: { user_no } });
            if (existingUserNo) return res.status(400).json({ message: "รหัสผู้ใช้งานซ้ำ" });
        }

        // Check email duplicate only if email is provided
        // Note: In current schema email is not marked unique but logically it should be treated as unique for login
        if (email) {
            const existingEmail = await prisma.user.findFirst({ where: { email } });
            if (existingEmail) return res.status(400).json({ message: "อีเมลซ้ำ" });
        }

        // Auto-generate password from user_no if not provided
        const passwordToHash = password || user_no || 'default123';
        const hashedPassword = await bcrypt.hash(passwordToHash, 10);

        const newUser = await prisma.user.create({
            data: {
                user_no,
                first_name,
                last_name,
                email,
                password: hashedPassword,
                role,
                status: status || 'active',
                major_id: major_id ? parseInt(major_id) : null,
                section_id: section_id ? parseInt(section_id) : null
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
        const { user_no, first_name, last_name, email, role, status, major_id, section_id, password } = req.body;

        // Check duplicates if updating user_no
        if (user_no) {
            const existingUserNo = await prisma.user.findUnique({ where: { user_no } });
            if (existingUserNo && existingUserNo.user_id !== id) {
                return res.status(400).json({ message: "รหัสผู้ใช้งานซ้ำ" });
            }
        }
        // Check duplicates if updating email
        if (email) {
            const existingEmail = await prisma.user.findFirst({ where: { email } });
            if (existingEmail && existingEmail.user_id !== id) {
                return res.status(400).json({ message: "อีเมลซ้ำ" });
            }
        }

        const updateData = {
            user_no,
            first_name,
            last_name,
            email,
            role,
            status,
            major_id: major_id ? parseInt(major_id) : null,
            section_id: section_id ? parseInt(section_id) : null
        };

        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const updatedUser = await prisma.user.update({
            where: { user_id: id },
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

        // Check constraints (e.g., has borrow transactions)
        // For simple soft delete or direct delete, let's keep it simple for now or check relation
        const hasTransactions = await prisma.borrowTransaction.count({
            where: { user_id: id }
        });

        if (hasTransactions > 0) {
            // Soft delete recommended
            await prisma.user.update({
                where: { user_id: id },
                data: { status: 'inactive' }
            });
            return res.status(200).json({ message: "ผู้ใช้งานมีประวัติการเบิกคืน จึงทำการระงับการใช้งานแทนการลบ" });
        }

        await prisma.user.delete({
            where: { user_id: id }
        });

        return res.status(200).json({ message: "ลบผู้ใช้งานสำเร็จ" });

    } catch (error) {
        console.error("Error deleting user:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการลบผู้ใช้งาน" });
    }
};

// Update Password (Specific)
export const updatePassword = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email (using findFirst as email is not unique in schema)
        const user = await prisma.user.findFirst({
            where: { email }
        });

        if (!user) {
            return res.status(404).json({ message: "ไม่พบผู้ใช้งาน" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.update({
            where: { user_id: user.user_id },
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

        // Prepare default password hash
        const defaultPasswordHash = await bcrypt.hash("123456", 10);

        for (const item of users) {
            try {
                // Validate data
                if (!item.user_no || !item.first_name) {
                    throw new Error("Missing required fields (user_no, first_name)");
                }

                // Check duplicates (user_no)
                const existingUser = await prisma.user.findUnique({ where: { user_no: String(item.user_no) } });
                if (existingUser) {
                    throw new Error(`User No ${item.user_no} already exists`);
                }

                await prisma.user.create({
                    data: {
                        user_no: String(item.user_no),
                        first_name: item.first_name,
                        last_name: item.last_name || "",
                        email: item.email || null,
                        password: defaultPasswordHash,
                        role: item.role || 'student', // Default valid role
                        status: 'active',
                        major_id: item.major_id ? parseInt(item.major_id) : null,
                        section_id: item.section_id ? parseInt(item.section_id) : null
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
                role: 'teacher',
                status: 'active'
            },
            select: {
                user_id: true,
                user_no: true,
                first_name: true,
                last_name: true,
            },
            orderBy: { first_name: 'asc' }
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
