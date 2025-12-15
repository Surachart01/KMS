import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
const prisma = new PrismaClient();

export const getAllUsers = async (req,res) => {
    try {
        const {status , position} = req.query;
        const where = {};
        if(status){
            where.status = status;
        }
        if(position){
            where.position = position;
        }

        const users = await prisma.users.findMany({
            where: where
        });
        return res.status(200).json({"message":"ดึงข้อมูลผู้ใช้งานสำเร็จ",data:users});
    } catch (error) {
        console.error("Error fetching users:", error);
        return res.status(500).json({"message":"เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้งาน"});
    }
}

export const getUserById = async (req,res) => {
    try {
        const {id} = req.params;
        const user = await prisma.users.findUnique({
            where: {
                user_no: id
            }
        });
        return res.status(200).json({"message":"ดึงข้อมูลผู้ใช้งานสำเร็จ",data:user});
    } catch (error) {
        console.error("Error fetching user:", error);
        return res.status(500).json({"message":"เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้งาน"});
    }
}

export const createUser = async (req,res) => {
    try {
        
        const {user_no,prefix,firstname,lastname,email,password,year_study,position} = req.body;
        const checkUserNo = await prisma.users.findUnique({
            where: {
                user_no: user_no
            }
        });
        if(checkUserNo){
            return res.status(400).json({"message":"เลขประจำตัวนักศึกษาซ้ำ"});
        }
        const checkEmail = await prisma.users.findUnique({
            where: {
                email: email
            }
        });

        if(checkEmail){
            return res.status(400).json({"message":"อีเมลซ้ำ"});
        }
        let passwordHash = await bcrypt.hash(password, 10);
        const user = {
            user_no: user_no,
            prefix,
            firstname,
            lastname,
            email,
            password: passwordHash,
            year_study,
            position,
            status: "Active",
            is_reset_password: false
        }
        console.log(user);
        const newUser = await prisma.users.create({
            data: user,
        });
        console.log(newUser);
        return res.status(201).json({"message":"สร้างผู้ใช้งานสำเร็จ",data:newUser});
   
    } catch (error) {
        console.error("Error creating user:", error);
        return res.status(500).json({"message":"เกิดข้อผิดพลาดในการสร้างผู้ใช้งาน"});
    }
}

export const updateUser = async (req,res) => {
    try {
        const {id} = req.params;
        const {user_no,prefix,firstname,lastname,email,password,year_study,position,status} = req.body;
        const checkUserNo = await prisma.users.findUnique({
            where: {
                user_no: user_no
            }
        });
        if(checkUserNo){
            return res.status(400).json({"message":"เลขประจำตัวนักศึกษาซ้ำ"});
        }
        const checkEmail = await prisma.users.findUnique({
            where: {
                email: email
            }
        });
        if(checkEmail){
            return res.status(400).json({"message":"อีเมลซ้ำ"});
        }
        let passwordHash = await bcrypt.hash(password, 10);
        const user = {
            user_no,
            prefix,
            firstname,
            lastname,
            email,
            password: passwordHash,
            year_study,
            position,
            status,
            is_reset_password: false
        }
        const updatedUser = await prisma.users.update({
            where: {
                id: id
            },
            data: user
        });
        return res.status(200).json({"message":"อัปเดตข้อมูลผู้ใช้งานสำเร็จ",data:updatedUser});
    } catch (error) {
        console.error("Error updating user:", error);
        return res.status(500).json({"message":"เกิดข้อผิดพลาดในการอัปเดตข้อมูลผู้ใช้งาน"});
    }
}

export const updatePassword = async (req,res) => {
    try {
        const {email,password} = req.body;
        console.log(email,password);
        const user = await prisma.users.findUnique({
            where: {
                email: email
            }
        });
        if(!user){
            return res.status(404).json({"message":"ไม่พบผู้ใช้งาน"});
        }
        let passwordHash = await bcrypt.hash(password, 10);
        const updatedUser = await prisma.users.update({
            where: {
                id: user.id
            },
            data: {
                password: passwordHash
            }
        });
        return res.status(200).json({"message":"อัปเดตรหัสผ่านผู้ใช้งานสำเร็จ",data:updatedUser});
    } catch (error) {
        console.error("Error updating user:", error);
        return res.status(500).json({"message":"เกิดข้อผิดพลาดในการอัปเดตรหัสผ่านผู้ใช้งาน"});
    }
}

export const updateIsResetPassword = async (req,res) => {
    try {
        const {id} = req.params;
        const updatedUser = await prisma.users.update({
            where: {
                user_no: id
            },
            data: {
                is_reset_password: true
            }
        });
        return res.status(200).json({"message":"อัปเดตผู้ใช้งานสำเร็จ",data:updatedUser});
    } catch (error) {
        console.error("Error updating user:", error);
        return res.status(500).json({"message":"เกิดข้อผิดพลาดในการอัปเดตผู้ใช้งาน"});
    }
}

export const deleteUser = async (req,res) => {
    try {
        const {id} = req.params;
        const deletedUser = await prisma.users.update({
            where: {
                user_no: id
            },
            data: {
                status: "Inactive"
            }
        });
        return res.status(200).json({"message":"ลบผู้ใช้งานสำเร็จ",data:deletedUser});
    } catch (error) {
        console.error("Error deleting user:", error);
        return res.status(500).json({"message":"เกิดข้อผิดพลาดในการลบผู้ใช้งาน"});
    }
}

