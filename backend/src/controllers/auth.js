import { PrismaClient } from "@prisma/client";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { redis } from '../lib/redis.js';

const prisma = new PrismaClient();

// สร้าง transporter สำหรับ Gmail SMTP
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

export const login = async (req, res) => {
    try {
        const { email, password, remember } = req.body;
        // console.log(email, password, remember);
        // 1. ค้นหา User จาก Email
        const user = await prisma.user.findFirst({
            where: {
                email: email
            },
            include: {
                section: {
                    include: {
                        major: true
                    }
                }
            }
        });
        // 2. เช็คว่ามี User หรือไม่?
        if (!user) {
            // เพื่อความปลอดภัย ไม่ควรบอกละเอียดว่า "ไม่พบอีเมล" 
            // ให้บอกรวมๆ ว่า "อีเมลหรือรหัสผ่านไม่ถูกต้อง" เพื่อป้องกัน Hacker เดาอีเมล
            return res.status(401).json({ "message": "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
        }

        // 3. ตรวจสอบรหัสผ่านด้วย bcrypt (Compare Hash)
        // password คือที่ user พิมพ์มา, user.password คือ Hash ที่เก็บใน DB
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ "message": "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
        }

        // เช็ค Role: อนุญาตเฉพาะ Staff เท่านั้นสำหรับหน้า Backoffice
        if (user.role !== 'STAFF') {
            return res.status(403).json({ "message": "คุณไม่มีสิทธิ์เข้าใช้งานระบบ (สำหรับเจ้าหน้าที่เท่านั้น)" });
        }
        const EXP = remember ? '7d' : '1d';
        // 4. สร้าง JWT Token
        // payload: ข้อมูลที่จะฝังใน Token (เช่น id, role) อย่าใส่ password เข้าไปเด็ดขาด
        const payload = {
            id: user.id,
            studentCode: user.studentCode,
            email: user.email,
            role: user.role
        };

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET, // ต้องตั้งค่าใน .env (ห้าม Hardcode)
            { expiresIn: EXP } // Token หมดอายุใน 1 วัน
        );

        // 5. เตรียมข้อมูล User ส่งกลับ (ตัด field password ออก)
        const { password: _, ...userData } = user;

        return res.status(200).json({
            "message": "เข้าสู่ระบบสำเร็จ",
            "token": token,
            "user": userData,
            "role": user.role
        });

    } catch (error) {
        console.error("Error logging in:", error);
        return res.status(500).json({ "message": "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" });
    }
}

export const decodeToken = (req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return res.status(200).json({
            "message": "Token is valid",
            "user": decoded
        });
    } catch (error) {
        console.error("Error decoding token:", error);
        return res.status(401).json({ "message": "Token is invalid" });
    }
}

export const sendResetPasswordEmail = async (req, res) => {
    try {
        const { email } = req.body;
        console.log(email);
        const user = await prisma.user.findFirst({
            where: {
                email: email
            }
        });
        // if (!user) {
        //     return res.status(404).json({ "message": "User not found" });
        // }
        const OTP = Math.floor(100000 + Math.random() * 900000);
        const key = `otp:${email}`; // ตั้งชื่อ Key ให้ไม่ซ้ำกัน
        const ttl = 90; // 90 วินาที = 1.30 นาที

        // ตั้งค่าอีเมล
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Reset Password - OTP Verification',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
                    <div style="background: white; padding: 30px; border-radius: 10px;">
                        <h1 style="color: #16a34a; margin: 0 0 20px 0;">รีเซ็ตรหัสผ่าน</h1>
                        <p>คุณได้ขอรีเซ็ตรหัสผ่านสำหรับบัญชี <strong>${email}</strong></p>
                        
                        <p>รหัส OTP ของคุณคือ:</p>
                        <div style="font-size: 32px; font-weight: bold; color: #16a34a; letter-spacing: 5px; margin: 20px 0; text-align: center;">
                            ${OTP}
                        </div>
                        
                        <p style="color: #666; margin-top: 30px; font-size: 14px;">
                            รหัส OTP นี้จะหมดอายุใน 1 นาที<br>
                            หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยอีเมลนี้
                        </p>
                    </div>
                </div>
            `
        };

        // ส่งอีเมลผ่าน Nodemailer
        try {
            const info = await transporter.sendMail(mailOptions);
            console.log('Email sent successfully:', info.messageId);
        } catch (emailError) {
            console.error('Nodemailer Error:', emailError);
            throw emailError;
        }

        // บันทึก OTP ลง Redis และบอกให้ลบตัวเองเมื่อครบ 1 นาที
        await redis.set(key, OTP, 'EX', ttl);
        return res.status(200).json({ "message": "Email sent successfully" });
    } catch (error) {
        console.error("Error sending reset password email:", error);
        return res.status(500).json({ "message": "Error sending reset password email" });
    }
}

export const verifyOTP = async (req, res) => {
    try {
        const { email, OTP } = req.body;
        const key = `otp:${email}`;
        console.log(email, OTP);
        const storedOTP = await redis.get(key);
        console.log(storedOTP);
        if (!storedOTP) {
            return res.status(401).json({ "message": "Invalid OTP" });
        }
        if (storedOTP !== OTP) {
            return res.status(401).json({ "message": "Invalid OTP" });
        }
        return res.status(200).json({ "message": "OTP verified successfully" });
    } catch (error) {
        console.error("Error verifying OTP:", error);
        return res.status(500).json({ "message": "Error verifying OTP" });
    }
}

