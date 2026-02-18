import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkAuth() {
    const studentCode = '6702041510164';
    const roomCode = '44-703';

    const user = await prisma.user.findUnique({ where: { studentCode } });
    if (!user) {
        console.log('❌ User not found');
        return;
    }
    console.log(`👤 User: ${user.firstName} ${user.lastName} (ID: ${user.id})`);

    const now = new Date();

    // Set today to start of day in LOCAL time (since DB might store local time but normalized to UTC?)
    // Actually Prisma usually handles Date objects as UTC.
    // Let's create a date object for "today"
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    console.log(`🕒 Now: ${now.toISOString()}`);
    console.log(`📅 Search Range: ${startOfDay.toISOString()} - ${endOfDay.toISOString()}`);

    const auths = await prisma.dailyAuthorization.findMany({
        where: {
            userId: user.id,
            date: {
                gte: startOfDay,
                lte: endOfDay
            }
        }
    });

    console.log(`📋 Found ${auths.length} authorizations for today:`);

    auths.forEach(auth => {
        console.log(`   - Room: ${auth.roomCode}`);
        console.log(`     Date: ${auth.date.toISOString()}`);
        console.log(`     Time: ${auth.startTime.toISOString()} - ${auth.endTime.toISOString()}`);

        // Check if Current time is within range
        // Note: auth.startTime/endTime might have 1970-01-01 date part or full date part depending on how it's stored.
        // If it's full date, we compare directly.

        const isRoomMatch = auth.roomCode === roomCode;
        const isDateMatch = auth.date.toISOString().split('T')[0] === now.toISOString().split('T')[0];
        const isTimeMatch = now >= auth.startTime && now < auth.endTime;

        console.log(`     Match Room? ${isRoomMatch ? '✅' : '❌'}`);
        console.log(`     Match Date? ${isDateMatch ? '✅' : '❌'}`);
        console.log(`     Match Time? ${isTimeMatch ? '✅' : '❌'}`);
    });

    if (auths.length === 0) {
        console.log('⚠️ No authorizations found for today.');
    }

    await prisma.$disconnect();
}

checkAuth();
