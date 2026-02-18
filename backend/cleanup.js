import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function cleanup() {
    const bookingId = 'b715bced-d8f9-4214-b0d5-a93cc17606b4';
    const tempAuthId = '8fa8df79-a8c4-4a7d-ad23-4097e0cb7340';

    try {
        // Delete Booking
        await prisma.booking.deleteMany({
            where: { id: bookingId }
        });
        console.log(`✅ Deleted booking ${bookingId}`);

        // Delete Temp Auth
        await prisma.dailyAuthorization.deleteMany({
            where: { id: tempAuthId }
        });
        console.log(`✅ Deleted temp auth ${tempAuthId}`);

    } catch (err) {
        console.error('❌ Error cleaning up:', err);
    }

    await prisma.$disconnect();
}

cleanup();
