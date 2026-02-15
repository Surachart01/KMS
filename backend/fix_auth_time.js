import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

const STUDENT_CODE = "6702041510164";
const ROOM_CODE = "44-703";

async function forceUpdateAuth() {
    console.log("🛠️ Force updating authorization...");

    // 1. Find user
    const user = await prisma.user.findUnique({
        where: { studentCode: STUDENT_CODE },
    });

    if (!user) {
        console.error("❌ User not found!");
        return;
    }

    // 2. Set time range to cover NOW
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Normalize to start of day local?
    // Actually, let's just use the 'date' field from the existing record to match

    // Find the existing record
    const auth = await prisma.dailyAuthorization.findFirst({
        where: {
            userId: user.id,
            roomCode: ROOM_CODE,
            // date: today, // Might be risky if timezone mismatch on date, let's find by user+room and sort desc
        },
        orderBy: { createdAt: 'desc' }
    });

    if (!auth) {
        console.log("❌ No existing authorization found to update. Creating one...");
        // Create new
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        await prisma.dailyAuthorization.create({
            data: {
                userId: user.id,
                roomCode: ROOM_CODE,
                date: startOfDay, // careful with timezone
                startTime: startOfDay,
                endTime: endOfDay,
                source: "MANUAL",
                createdBy: "DEBUG_SCRIPT"
            }
        });
        console.log("✅ Created new FULL DAY authorization.");
        return;
    }

    // Update existing
    console.log(`Found existing auth ID: ${auth.id}`);
    console.log(`Old Time: ${auth.startTime.toISOString()} - ${auth.endTime.toISOString()}`);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    await prisma.dailyAuthorization.update({
        where: { id: auth.id },
        data: {
            startTime: startOfDay,
            endTime: endOfDay,
            date: startOfDay // Ensure date matches too
        }
    });

    console.log(`✅ Updated to FULL DAY: ${startOfDay.toISOString()} - ${endOfDay.toISOString()}`);
}

forceUpdateAuth()
    .catch((e) => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
