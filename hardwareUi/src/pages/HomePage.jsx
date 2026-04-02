import { Key, Undo2, RefreshCw, MoveRight, UserPlus, Fingerprint } from 'lucide-react';

export default function HomePage({ onBorrow, onReturn, onTransfer, onSwap, onMove, loading }) {
    if (loading) {
        return (
            <div className="page home-page loading">
                <div className="spinner"></div>
                <p>กำลังโหลด...</p>
            </div>
        );
    }

    return (
        <div className="page home-page">
            <div className="home-logo">
                <div className="logo-circle">
                    <Fingerprint size={32} />
                </div>
                <h1>ระบบเบิก-คืนกุญแจ</h1>
                <p>Key Management System</p>
            </div>

            {/* ── All Actions ── */}
            <div className="home-primary-actions">
                <button className="btn-card btn-color-borrow" onClick={onBorrow}>
                    <div className="btn-card-icon">
                        <Key size={32} strokeWidth={2.5} />
                    </div>
                    <div className="btn-card-content">
                        <h2>เบิกกุญแจ</h2>
                        <span className="btn-card-desc">สำหรับผู้มีตาราง / มีสิทธิ์</span>
                    </div>
                </button>

                <button className="btn-card btn-color-return" onClick={onReturn}>
                    <div className="btn-card-icon">
                        <Undo2 size={32} strokeWidth={2.5} />
                    </div>
                    <div className="btn-card-content">
                        <h2>คืนกุญแจ</h2>
                        <span className="btn-card-desc">เมื่อใช้งานห้องเสร็จสิ้น</span>
                    </div>
                </button>
            </div>

            <div className="home-secondary-actions" style={{ marginTop: '20px' }}>
                <button className="btn-card btn-color-swap" onClick={onSwap}>
                    <div className="btn-card-icon">
                        <RefreshCw size={32} strokeWidth={2.5} />
                    </div>
                    <div className="btn-card-content">
                        <h2>สลับสิทธิ์</h2>
                        <span className="btn-card-desc">สลับผู้ดูแลกุญแจ</span>
                    </div>
                </button>

                <button className="btn-card btn-color-transfer" onClick={onTransfer}>
                    <div className="btn-card-icon">
                        <UserPlus size={32} strokeWidth={2.5} />
                    </div>
                    <div className="btn-card-content">
                        <h2>โอนสิทธิ์</h2>
                        <span className="btn-card-desc">ส่งมอบกุญแจให้ผู้อื่น</span>
                    </div>
                </button>
            </div>

            <p className="home-instruction">
                กรุณาเลือกรายการที่ต้องการเพื่อเริ่มต้นใช้งาน
            </p>
        </div>
    );
}

