/**
 * หน้าหลัก — แสดงสถานะและเมนู
 */
export default function HomePage({ onBorrow, onReturn, loading }) {
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

            <div className="home-actions">
                <button className="btn btn-primary btn-lg pulse" onClick={onBorrow}>
                    🔑 เบิกกุญแจ
                </button>
                <button className="btn btn-secondary btn-lg" onClick={onReturn}>
                    ↩️ คืนกุญแจ
                </button>
            </div>

            <p className="home-instruction">กดปุ่มด้านบนเพื่อเริ่มต้นใช้งาน</p>
        </div>
    );
}
