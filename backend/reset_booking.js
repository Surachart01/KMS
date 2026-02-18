import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function resetBooking() {
    const bookingId = '0f536406-7921-4638-b11c-9c0b0bdc0a63';

    try {
        const booking = await prisma.booking.delete({
            where: { id: bookingId }
        });
        console.log(`✅ Deleted booking ${bookingId}`);

        // Reset key status if needed? No, booking deletion cascade handling?
        // Wait, Key doesn't have status field, it relies on Booking.
        // So deleting booking frees the key.

        // Also delete the SystemLog created? Not strictly necessary but keeps it clean.
        // The log ID isn't returned in API response.
    } catch (err) {
        console.error('❌ Error resetting booking:', err);
    }

    await prisma.$disconnect();
}

resetBooking();
