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
                    <span className="logo-icon">🔑</span>
                </div>
                <h1>ระบบเบิก-คืนกุญแจ</h1>
                <p>Key Management System</p>
            </div>

            {/* ── Primary Actions (The 90% Use Case) ── */}
            <div className="home-primary-actions">
                <button className="btn-card btn-card-primary pulse" onClick={onBorrow}>
                    <div className="btn-card-icon">🔑</div>
                    <div className="btn-card-content">
                        <h2>เบิกกุญแจ</h2>
                        <span className="btn-card-desc">สำหรับผู้มีตาราง / มีสิทธิ์</span>
                    </div>
                </button>

                <button className="btn-card btn-card-secondary" onClick={onReturn}>
                    <div className="btn-card-icon">↩️</div>
                    <div className="btn-card-content">
                        <h2>คืนกุญแจ</h2>
                        <span className="btn-card-desc">เมื่อใช้งานห้องเสร็จสิ้น</span>
                    </div>
                </button>
            </div>

            {/* ── Secondary Actions (The 10% Use Case) ── */}
            <div className="home-secondary-actions">
                <button className="btn-minimal btn-swap" onClick={onSwap}>
                    <span className="minimal-icon">🔄</span>
                    <div className="minimal-text">
                        <span>สลับห้อง</span>
                        <small>กับเพื่อน</small>
                    </div>
                </button>
                <button className="btn-minimal btn-move" onClick={onMove}>
                    <span className="minimal-icon">➡️</span>
                    <div className="minimal-text">
                        <span>ย้ายห้อง</span>
                        <small>เปลี่ยนห้องใหม่</small>
                    </div>
                </button>
                <button className="btn-minimal btn-transfer" onClick={onTransfer}>
                    <span className="minimal-icon">📋</span>
                    <div className="minimal-text">
                        <span>โอนสิทธิ์</span>
                        <small>มอบให้คนอื่น</small>
                    </div>
                </button>
            </div>

            <p className="home-instruction" style={{ marginTop: 'auto', marginBottom: '10px' }}>
                กดปุ่มเพื่อเริ่มต้นใช้งาน
            </p>
        </div>
    );
}
