import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getAllKey = async (req , res) => {
    try {
        console.log("getAllKey: Fetching keys...")
        const keys = await prisma.key.findMany();
        return res.status(200).json({data:keys});
    } catch (error) {
        console.error("getAllKey: Error fetching keys:", error);
        throw error;
    }
}


export const verifyUsers = async (req , res) => {
    try {
        console.log("verifyUsers: Verifying users...")

        const {userId , keyId} = req.body;
        const users = await prisma.user.findUnique({where:{id:userId}});
        const key = await prisma.key.findUnique({where:{id:keyId}});

        const verify = await prisma.booking.findUnique({where:{userId , keyId}});
        if(!verify){
            return res.status(404).json({message:"ผู้ใช้งานไม่มีตารางเรียนในวันนี้"});
        }

        if(verify.status != 'BORROWED'){
            return res.status(400).json({message:"ผู้ใช้งานมีการเบิกกุญแจไว้อยู่แล้ว"});
        }

        return res.status(200).json({data:{users , key , verify}});
    } catch (error) {
        console.error("verifyUsers: Error verifying users:", error);
        throw error;
    }
}

export const createBooking = async (req , res) => {
    try {
        console.log("createBooking: Creating booking...")
        const {userId , keyId} = req.params;
        const users = await prisma.user.findUnique({where:{id:userId}});
        const key = await prisma.key.findUnique({where:{id:keyId}});
    } catch (error) {
        console.error("createBooking: Error creating booking:", error);
        throw error;
    }
}


