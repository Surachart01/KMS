import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const admin = async (req, res, next) => {
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
        const user = await prisma.users.findUnique({
            where: {
                user_no: decoded.user_no
            }
        });

        // 5. ตรวจสอบว่ามี User และ Status เป็น Active
        if (!user) {
            return res.status(404).json({
                message: "ไม่พบผู้ใช้งาน"
            });
        }

        if (user.status !== 'Active') {
            return res.status(403).json({
                message: "บัญชีผู้ใช้งานถูกระงับ"
            });
        }

        // 6. ตรวจสอบว่า Position เป็น Admin หรือไม่
        if (user.position !== 'Admin') {
            return res.status(403).json({
                message: "ไม่มีสิทธิ์เข้าถึง (สำหรับผู้ดูแลระบบเท่านั้น)"
            });
        }

        // 7. เก็บข้อมูล User ไว้ใน req.user สำหรับใช้งานต่อใน Controller
        req.user = user;

        // 8. ผ่านการตรวจสอบ ไปต่อยัง Controller
        next();

    } catch (error) {
        console.error("Error in adminMiddleware:", error);

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
 * Middleware สำหรับเจ้าหน้าที่ (ครู หรือ ผู้ดูแลระบบ)
 * อนุญาตให้เข้าถึงได้ถ้า position เป็น Teacher หรือ Admin
 */
export const adminAndTeacher = async (req, res, next) => {
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
        const user = await prisma.users.findUnique({
            where: {
                user_no: decoded.user_no
            }
        });

        // 5. ตรวจสอบว่ามี User และ Status เป็น Active
        if (!user) {
            return res.status(404).json({
                message: "ไม่พบผู้ใช้งาน"
            });
        }

        if (user.status !== 'Active') {
            return res.status(403).json({
                message: "บัญชีผู้ใช้งานถูกระงับ"
            });
        }

        // 6. ตรวจสอบว่า Position เป็น Teacher หรือ Admin
        if (user.position !== 'Teacher' && user.position !== 'Admin') {
            return res.status(403).json({
                message: "ไม่มีสิทธิ์เข้าถึง (สำหรับเจ้าหน้าที่เท่านั้น)"
            });
        }

        // 7. เก็บข้อมูล User ไว้ใน req.user สำหรับใช้งานต่อใน Controller
        req.user = user;

        // 8. ผ่านการตรวจสอบ ไปต่อยัง Controller
        next();

    } catch (error) {
        console.error("Error in staffMiddleware:", error);

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

export const student = async (req, res, next) => {
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
        const user = await prisma.users.findUnique({
            where: {
                user_no: decoded.user_no
            }
        });

        // 5. ตรวจสอบว่ามี User และ Status เป็น Active
        if (!user) {
            return res.status(404).json({
                message: "ไม่พบผู้ใช้งาน"
            });
        }

        if (user.status !== 'Active') {
            return res.status(403).json({
                message: "บัญชีผู้ใช้งานถูกระงับ"
            });
        }

        // 6. ตรวจสอบว่า Position เป็น Student หรือไม่
        if (user.position !== 'Student') {
            return res.status(403).json({
                message: "ไม่มีสิทธิ์เข้าถึง (สำหรับนักศึกษาเท่านั้น)"
            });
        }

        // 7. เก็บข้อมูล User ไว้ใน req.user สำหรับใช้งานต่อใน Controller
        req.user = user;

        // 8. ผ่านการตรวจสอบ ไปต่อยัง Controller
        next();

    } catch (error) {
        console.error("Error in studentMiddleware:", error);

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

export const teacher = async (req, res, next) => {
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
        const user = await prisma.users.findUnique({
            where: {
                user_no: decoded.user_no
            }
        });

        // 5. ตรวจสอบว่ามี User และ Status เป็น Active
        if (!user) {
            return res.status(404).json({
                message: "ไม่พบผู้ใช้งาน"
            });
        }

        if (user.status !== 'Active') {
            return res.status(403).json({
                message: "บัญชีผู้ใช้งานถูกระงับ"
            });
        }

        // 6. ตรวจสอบว่า Position เป็น Teacher หรือไม่
        if (user.position !== 'Teacher') {
            return res.status(403).json({
                message: "ไม่มีสิทธิ์เข้าถึง (สำหรับครูเท่านั้น)"
            });
        }

        // 7. เก็บข้อมูล User ไว้ใน req.user สำหรับใช้งานต่อใน Controller
        req.user = user;

        // 8. ผ่านการตรวจสอบ ไปต่อยัง Controller
        next();

    } catch (error) {
        console.error("Error in teacherMiddleware:", error);

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