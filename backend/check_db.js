import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: {
            studentCode: { in: ['6702041510164', '6702041510181'] }
        },
        select: {
            id: true,
            studentCode: true,
            firstName: true,
            lastName: true,
            role: true
        }
    });

    console.log('--- Users ---');
    console.log(JSON.stringify(users, null, 2));

    const bookings = await prisma.booking.findMany({
        where: {
            status: 'BORROWED'
        },
        include: {
            user: true,
            key: true
        }
    });

    console.log('\n--- Active Bookings ---');
    console.log(JSON.stringify(bookings.map(b => ({
        id: b.id,
        user: b.user.studentCode,
        userName: b.user.firstName,
        room: b.key.roomCode,
        status: b.status
    })), null, 2));

    const auths = await prisma.dailyAuthorization.findMany({
        where: {
            userId: { in: users.map(u => u.id) },
        },
        orderBy: { date: 'desc' },
        take: 10
    });
    
    console.log('\n--- Auth Logs (last 10 for these users) ---');
    console.log(JSON.stringify(auths, null, 2));

    const logs = await prisma.systemLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { user: true }
    });
    console.log('\n--- System Logs (last 20) ---');
    console.log(JSON.stringify(logs.map(l => ({
        id: l.id,
        user: l.user.studentCode,
        action: l.action,
        details: l.details,
        createdAt: l.createdAt
    })), null, 2));

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const roomAuths = await prisma.dailyAuthorization.findMany({
        where: {
            roomCode: '52-213',
            date: { gte: startOfDay, lte: endOfDay }
        },
        include: { user: true }
    });
    console.log('\n--- Room 52-213 All Auths Today ---');
    console.log(JSON.stringify(roomAuths.map(a => ({
        user: a.user.studentCode,
        start: a.startTime,
        end: a.endTime,
        source: a.source
    })), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
