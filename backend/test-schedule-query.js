
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Testing getAllSchedules query...");
        const schedules = await prisma.schedule.findMany({
            include: {
                subject: true,
                teacher: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        studentCode: true
                    }
                },
                students: true
            },
            orderBy: [
                { dayOfWeek: 'asc' },
                { startTime: 'asc' }
            ]
        });
        console.log("Query success! Found schedules:", schedules.length);
        console.log(JSON.stringify(schedules[0], null, 2));
    } catch (error) {
        console.error("Query failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
