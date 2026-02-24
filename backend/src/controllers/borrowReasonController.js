import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Default reasons to seed if table is empty
const DEFAULT_REASONS = [
    { label: 'สอนชดเชย', durationMinutes: 120, order: 1 },
    { label: 'กิจกรรมพิเศษ', durationMinutes: 180, order: 2 },
    { label: 'ซ่อมบำรุง', durationMinutes: 60, order: 3 },
    { label: 'ประชุม', durationMinutes: 90, order: 4 },
    { label: 'อื่นๆ', durationMinutes: null, order: 99 }, // ไม่จำกัดเวลา
];

// ── GET /api/borrow-reasons ──
export const getAll = async (req, res) => {
    try {
        // Auto-seed defaults if empty
        const count = await prisma.borrowReason.count();
        if (count === 0) {
            await prisma.borrowReason.createMany({ data: DEFAULT_REASONS });
        }

        const activeOnly = req.query.isActive === 'true'; // กรองเฉพาะเมื่อส่ง ?isActive=true มาเท่านั้น
        const reasons = await prisma.borrowReason.findMany({
            where: activeOnly ? { isActive: true } : undefined, // ไม่ระบุ = คืนทั้งหมด
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        });
        return res.json({ success: true, data: reasons });
    } catch (err) {
        console.error('getAll BorrowReason error:', err);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
};

// ── POST /api/borrow-reasons ──
export const create = async (req, res) => {
    try {
        const { label, order = 0, isActive = true, durationMinutes = 120 } = req.body;
        if (!label?.trim()) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อเหตุผล' });
        }
        const reason = await prisma.borrowReason.create({
            data: {
                label: label.trim(),
                order: Number(order),
                isActive,
                durationMinutes: Number(durationMinutes),
            },
        });
        return res.status(201).json({ success: true, data: reason });
    } catch (err) {
        if (err.code === 'P2002') {
            return res.status(409).json({ success: false, message: 'เหตุผลนี้มีอยู่แล้ว' });
        }
        console.error('create BorrowReason error:', err);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
};

// ── PUT /api/borrow-reasons/:id ──
export const update = async (req, res) => {
    try {
        const { id } = req.params;
        const { label, order, isActive, durationMinutes } = req.body;

        const data = {};
        if (label !== undefined) data.label = label.trim();
        if (order !== undefined) data.order = Number(order);
        if (isActive !== undefined) data.isActive = Boolean(isActive);
        if (durationMinutes !== undefined) data.durationMinutes = Number(durationMinutes);

        const reason = await prisma.borrowReason.update({ where: { id }, data });
        return res.json({ success: true, data: reason });
    } catch (err) {
        if (err.code === 'P2025') {
            return res.status(404).json({ success: false, message: 'ไม่พบเหตุผลนี้' });
        }
        if (err.code === 'P2002') {
            return res.status(409).json({ success: false, message: 'เหตุผลนี้มีอยู่แล้ว' });
        }
        console.error('update BorrowReason error:', err);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
};

// ── DELETE /api/borrow-reasons/:id ──
export const remove = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.borrowReason.delete({ where: { id } });
        return res.json({ success: true, message: 'ลบเหตุผลสำเร็จ' });
    } catch (err) {
        if (err.code === 'P2025') {
            return res.status(404).json({ success: false, message: 'ไม่พบเหตุผลนี้' });
        }
        console.error('delete BorrowReason error:', err);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
};
