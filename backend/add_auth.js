import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function addAuth() {
    const studentCode = '6702041510164';
    const roomCode = '44-704';

    const user = await prisma.user.findUnique({ where: { studentCode } });
    if (!user) {
        console.log('❌ User not found');
        return;
    }

    // Today Start/End
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Create Authorization
    // Note: We need 'date' (DateTime) to match query.
    // And startTime/endTime to cover now.
    // startTime usually set to start of day or specific time.

    // Use today's date for 'date' field
    // Use full timestamp for startTime/endTime

    // For safety, let's cover the whole day
    const startTime = new Date();
    startTime.setHours(0, 0, 0, 0);
    const endTime = new Date();
    endTime.setHours(23, 59, 59, 999);

    try {
        const auth = await prisma.dailyAuthorization.create({
            data: {
                userId: user.id,
                roomCode: roomCode,
                date: startTime, // using startTime as date
                startTime: startTime,
                endTime: endTime,
                source: 'MANUAL',
                createdBy: 'SYSTEM_FIX'
            }
        });
        console.log(`✅ Added authorization for ${user.firstName} -> Room ${roomCode}`);
        console.log(auth);
    } catch (err) {
        console.error('❌ Error adding auth:', err);
    }

    await prisma.$disconnect();
}

addAuth();
