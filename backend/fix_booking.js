import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

const STUDENT_CODE = "6702041510164";
const ROOM_CODE = "44-703";

async function createReservation() {
    console.log("🛠️ Creating RESERVED Booking...");

    // 1. Find user
    const user = await prisma.user.findUnique({
        where: { studentCode: STUDENT_CODE },
    });

    if (!user) {
        console.error("❌ User not found!");
        return;
    }

    // 2. Find Key
    const key = await prisma.key.findUnique({
        where: { roomCode: ROOM_CODE }
    });

    if (!key) {
        console.error("❌ Key/Room not found!");
        return;
    }

    // 3. Create Booking
    const now = new Date();
    const dueTime = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour

    // Check if already exists
    const existing = await prisma.booking.findFirst({
        where: {
            userId: user.id,
            keyId: key.id,
            status: "RESERVED",
            borrowAt: { lte: now },
            dueAt: { gt: now }
        }
    });

    if (existing) {
        console.log("✅ Valid RESERVED booking already exists:", existing.id);
        return;
    }

    const booking = await prisma.booking.create({
        data: {
            userId: user.id,
            keyId: key.id,
            status: "RESERVED",
            borrowAt: now,
            dueAt: dueTime,
        }
    });

    console.log(`✅ Created RESERVED Booking: ${booking.id}`);
    console.log(`- User: ${user.firstName} ${user.lastName}`);
    console.log(`- Room: ${key.roomCode}`);
    console.log(`- Time: ${booking.borrowAt.toLocaleTimeString()} - ${booking.dueAt.toLocaleTimeString()}`);
}

createReservation()
    .catch((e) => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
