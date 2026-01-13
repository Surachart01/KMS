import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/statistics/dashboard
// สถิติภาพรวมสำหรับ Dashboard Cards
export const getDashboardStats = async (req, res) => {
    try {
        const [totalKeys, borrowedKeys, inCabinetKeys, totalRooms] = await Promise.all([
            prisma.key.count(),
            prisma.key.count({ where: { status: 'borrowed' } }),
            prisma.key.count({ where: { status: 'in_cabinet' } }),
            prisma.room.count()
        ]);

        return res.status(200).json({
            totalKeys,
            borrowedKeys,
            availableKeys: inCabinetKeys, // rename for frontend consistency
            totalRooms
        });
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ" });
    }
};

// GET /api/statistics/recent-transactions
// การเบิก-คืนล่าสุด 5 รายการ
export const getRecentTransactions = async (req, res) => {
    try {
        const transactions = await prisma.borrowTransaction.findMany({
            take: 5,
            orderBy: {
                borrow_time: 'desc'
            },
            include: {
                user: {
                    select: {
                        first_name: true,
                        last_name: true,
                        user_no: true
                    }
                },
                room: {
                    select: {
                        room_id: true,
                        room_name: true
                    }
                },
                key: {
                    select: {
                        key_id: true
                    }
                }
            }
        });

        // Format data for frontend
        const formatted = transactions.map(t => ({
            key: t.transaction_id,
            user: `${t.user.first_name} ${t.user.last_name}`,
            room: t.room.room_id,
            action: t.status === 'borrowed' ? 'เบิก' : 'คืน', // Logic display
            time: t.return_time ? t.return_time : t.borrow_time, // Show latest activity time
            status: t.status,
            raw_borrow: t.borrow_time,
            raw_return: t.return_time
        }));

        return res.status(200).json(formatted);
    } catch (error) {
        console.error("Error fetching recent transactions:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
    }
};

// GET /api/statistics/room-usage
// ห้องที่ถูกใช้งานบ่อยที่สุด 5 อันดับ (นับจาก Transaction)
export const getTopRooms = async (req, res) => {
    try {
        const topRooms = await prisma.borrowTransaction.groupBy({
            by: ['room_id'],
            _count: {
                room_id: true
            },
            orderBy: {
                _count: {
                    room_id: 'desc'
                }
            },
            take: 5
        });

        // Fetch room details
        const roomDetails = await Promise.all(
            topRooms.map(async (item) => {
                const room = await prisma.room.findUnique({
                    where: { room_id: item.room_id }
                });
                return {
                    room_id: item.room_id,
                    room_name: room ? room.room_name : 'Unknown',
                    count: item._count.room_id
                };
            })
        );

        return res.status(200).json(roomDetails);
    } catch (error) {
        console.error("Error fetching top rooms:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
    }
};

// GET /api/statistics/today-stats
// สถิติการเบิก-คืน วันนี้
export const getTodayStats = async (req, res) => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const [borrowCount, returnCount, pendingCount] = await Promise.all([
            // Borrowed today
            prisma.borrowTransaction.count({
                where: {
                    borrow_time: {
                        gte: startOfDay,
                        lte: endOfDay
                    }
                }
            }),
            // Returned today
            prisma.borrowTransaction.count({
                where: {
                    return_time: {
                        gte: startOfDay,
                        lte: endOfDay
                    }
                }
            }),
            // Currently pending (not returned yet, total)
            prisma.borrowTransaction.count({
                where: {
                    status: 'borrowed'
                }
            })
        ]);

        return res.status(200).json({
            borrowCount,
            returnCount,
            pendingCount
        });
    } catch (error) {
        console.error("Error fetching today stats:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
    }
};
