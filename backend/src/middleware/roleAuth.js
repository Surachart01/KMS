/**
 * Role-based Authorization Middleware
 * ตรวจสอบสิทธิ์การเข้าถึงตาม role ของผู้ใช้งาน
 */

/**
 * Middleware: ตรวจสอบว่าเป็น Staff หรือไม่
 * ใช้สำหรับ protect routes ที่ต้องการสิทธิ์เจ้าหน้าที่เท่านั้น
 */
export const requireStaff = (req, res, next) => {
    // ตรวจสอบว่ามี user object จาก auth middleware หรือไม่
    if (!req.user) {
        return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบ' });
    }

    // ตรวจสอบว่า role เป็น staff หรือไม่
    if (req.user.role !== 'staff') {
        return res.status(403).json({
            message: 'ไม่มีสิทธิ์เข้าถึง - เฉพาะเจ้าหน้าที่เท่านั้น'
        });
    }

    next();
};

/**
 * Middleware: ตรวจสอบว่าเป็น Teacher หรือ Staff
 */
export const requireTeacherOrStaff = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบ' });
    }

    if (req.user.role !== 'teacher' && req.user.role !== 'staff') {
        return res.status(403).json({
            message: 'ไม่มีสิทธิ์เข้าถึง - เฉพาะอาจารย์และเจ้าหน้าที่เท่านั้น'
        });
    }

    next();
};

/**
 * Middleware: ตรวจสอบว่าเป็น Student, Teacher หรือ Staff (ทุกคน)
 */
export const requireAuthenticated = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบ' });
    }

    next();
};
