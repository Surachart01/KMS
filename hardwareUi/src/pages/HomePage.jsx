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

            {/* ── Primary Actions (The 90% Use Case) ── */}
            <div className="home-primary-actions">
                <button className="btn-card btn-card-primary" onClick={onBorrow}>
                    <div className="btn-card-icon">
                        <Key size={32} strokeWidth={2.5} />
                    </div>
                    <div className="btn-card-content">
                        <h2>เบิกกุญแจ</h2>
                        <span className="btn-card-desc">สำหรับผู้มีตาราง / มีสิทธิ์</span>
                    </div>
                </button>

                <button className="btn-card btn-card-secondary" onClick={onReturn}>
                    <div className="btn-card-icon">
                        <Undo2 size={32} strokeWidth={2.5} />
                    </div>
                    <div className="btn-card-content">
                        <h2>คืนกุญแจ</h2>
                        <span className="btn-card-desc">เมื่อใช้งานห้องเสร็จสิ้น</span>
                    </div>
                </button>
            </div>

            {/* ── Secondary Actions (The 10% Use Case) ── */}
            <div className="home-secondary-actions">
                <button className="btn-minimal btn-swap" onClick={onSwap}>
                    <div className="minimal-icon">
                        <RefreshCw size={20} />
                    </div>
                    <div className="minimal-text">
                        <span>สลับห้อง</span>
                        <small>Swap Room</small>
                    </div>
                </button>
                <button className="btn-minimal btn-move" onClick={onMove}>
                    <div className="minimal-icon">
                        <MoveRight size={20} />
                    </div>
                    <div className="minimal-text">
                        <span>ย้ายห้อง</span>
                        <small>Move Key</small>
                    </div>
                </button>
                <button className="btn-minimal btn-transfer" onClick={onTransfer}>
                    <div className="minimal-icon">
                        <UserPlus size={20} />
                    </div>
                    <div className="minimal-text">
                        <span>โอนสิทธิ์</span>
                        <small>Transfer</small>
                    </div>
                </button>
            </div>

            <p className="home-instruction">
                กรุณาเลือกรายการที่ต้องการเพื่อเริ่มต้นใช้งาน
            </p>
        </div>
    );
}

