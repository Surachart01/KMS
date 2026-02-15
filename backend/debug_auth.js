import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

const STUDENT_CODE = "6702041510164";
const ROOM_CODE = "44-703";

async function checkAuth() {
    console.log("🔍 Checking authorization for:");
    console.log(`- Student: ${STUDENT_CODE}`);
    console.log(`- Room: ${ROOM_CODE}`);
    console.log(`- Time: ${new Date().toLocaleString()}`);

    // 1. Check User
    const user = await prisma.user.findUnique({
        where: { studentCode: STUDENT_CODE },
    });

    if (!user) {
        console.error("❌ User not found!");
        return;
    }
    console.log(`✅ User found: ${user.firstName} ${user.lastName} (ID: ${user.id})`);

    // 2. Check DailyAuthorization
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    console.log(`📅 Checking auth for date: ${today.toISOString()}`);
    console.log(`⏰ Checking time between: ${now.toISOString()}`);

    // Find ANY auth for this user today, regardless of time
    const allAuths = await prisma.dailyAuthorization.findMany({
        where: {
            userId: user.id,
            date: today,
        },
    });

    console.log(`\n📋 Found ${allAuths.length} authorizations for today:`);

    allAuths.forEach(auth => {
        const isActive = auth.startTime <= now && auth.endTime > now;
        const isRoomMatch = auth.roomCode === ROOM_CODE;

        console.log(`  - Room: ${auth.roomCode} | Time: ${auth.startTime.toLocaleTimeString()} - ${auth.endTime.toLocaleTimeString()}`);
        console.log(`    > Matches Room? ${isRoomMatch ? "YES" : "NO"}`);
        console.log(`    > Active Time? ${isActive ? "YES" : "NO"}`);

        if (isRoomMatch && !isActive) {
            console.log(`    ⚠️  Room matches but time is invalid! Current time: ${now.toLocaleTimeString()}`);
        }
    });

    // 3. Exact query used in controller
    const validAuth = await prisma.dailyAuthorization.findFirst({
        where: {
            userId: user.id,
            roomCode: ROOM_CODE,
            date: today,
            startTime: { lte: now },
            endTime: { gt: now },
        },
    });

    console.log("\n--------------------------------");
    if (validAuth) {
        console.log("✅ RESULT: Authorization IS VALID according to controller logic.");
    } else {
        console.log("❌ RESULT: Authorization is INVALID / NOT FOUND according to controller logic.");
    }

}

checkAuth()
    .catch((e) => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
