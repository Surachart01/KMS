import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Middleware สำหรับตรวจสอบ JWT Token และดึงข้อมูล User
 * ใช้กับ schema ใหม่ที่มี user_id (UUID), role (UserRole enum)
 */
export const authenticate = async (req, res, next) => {
    try {
        // 1. ตรวจสอบ Authorization Header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                message: "ไม่พบ Token กรุณาเข้าสู่ระบบ"
            });
        }

        // 2. แยก Token จาก "Bearer <token>"
        const token = authHeader.split(' ')[1];

        // 3. ตรวจสอบและ Decode Token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 4. ดึงข้อมูล User จาก Database
        // Note: decoded uses 'id' not 'user_id' based on auth.js payload
        const user = await prisma.user.findUnique({
            where: {
                id: decoded.id // Updated to match payload
            },
            include: {
                section: {
                    include: {
                        major: true
                    }
                }
            }
        });

        // 5. ตรวจสอบว่ามี User และ Status เป็น active
        if (!user) {
            return res.status(404).json({
                message: "ไม่พบผู้ใช้งาน"
            });
        }

        // Check isBanned instead of status
        if (user.isBanned) {
            return res.status(403).json({
                message: "บัญชีผู้ใช้งานถูกระงับ"
            });
        }

        // 6. เก็บข้อมูล User ไว้ใน req.user สำหรับใช้งานต่อใน Controller
        req.user = user;

        // 7. ผ่านการตรวจสอบ ไปต่อยัง Controller
        next();

    } catch (error) {
        console.error("Error in authenticate middleware:", error);

        // Token หมดอายุหรือไม่ถูกต้อง
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                message: "Token ไม่ถูกต้อง"
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                message: "Token หมดอายุ กรุณาเข้าสู่ระบบใหม่"
            });
        }

        return res.status(500).json({
            message: "เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์"
        });
    }
};

/**
 * Middleware สำหรับเจ้าหน้าที่ (staff) เท่านั้น
 */
export const requireStaff = async (req, res, next) => {
    try {
        // ตรวจสอบ authentication ก่อน
        await authenticate(req, res, () => {
            // ตรวจสอบว่า role เป็น STAFF หรือไม่ (Use Uppercase)
            if (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN') { // Allow ADMIN too just in case
                return res.status(403).json({
                    message: "ไม่มีสิทธิ์เข้าถึง - เฉพาะเจ้าหน้าที่เท่านั้น"
                });
            }
            next();
        });
    } catch (error) {
        console.error("Error in requireStaff middleware:", error);
        return res.status(500).json({
            message: "เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์"
        });
    }
};

/**
 * Middleware สำหรับอาจารย์และเจ้าหน้าที่
 */
export const requireTeacherOrStaff = async (req, res, next) => {
    try {
        await authenticate(req, res, () => {
            if (req.user.role !== 'TEACHER' && req.user.role !== 'STAFF' && req.user.role !== 'ADMIN') {
                return res.status(403).json({
                    message: "ไม่มีสิทธิ์เข้าถึง - เฉพาะอาจารย์และเจ้าหน้าที่เท่านั้น"
                });
            }
            next();
        });
    } catch (error) {
        console.error("Error in requireTeacherOrStaff middleware:", error);
        return res.status(500).json({
            message: "เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์"
        });
    }
};

/**
 * Middleware สำหรับนักศึกษา
 */
export const requireStudent = async (req, res, next) => {
    try {
        await authenticate(req, res, () => {
            if (req.user.role !== 'STUDENT') {
                return res.status(403).json({
                    message: "ไม่มีสิทธิ์เข้าถึง - เฉพาะนักศึกษาเท่านั้น"
                });
            }
            next();
        });
    } catch (error) {
        console.error("Error in requireStudent middleware:", error);
        return res.status(500).json({
            message: "เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์"
        });
    }
};

/**
 * Middleware สำหรับอาจารย์
 */
export const requireTeacher = async (req, res, next) => {
    try {
        await authenticate(req, res, () => {
            if (req.user.role !== 'TEACHER') {
                return res.status(403).json({
                    message: "ไม่มีสิทธิ์เข้าถึง - เฉพาะอาจารย์เท่านั้น"
                });
            }
            next();
        });
    } catch (error) {
        console.error("Error in requireTeacher middleware:", error);
        return res.status(500).json({
            message: "เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์"
        });
    }
};