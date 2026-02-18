/**
 * Header — แถบด้านบน แสดงชื่อระบบ + สถานะเชื่อมต่อ
 */
export default function Header({ connected, onHomeClick }) {
    return (
        <header className="header">
            <button className="header-home-btn" onClick={onHomeClick}>
                🔑
            </button>
            <h1 className="header-title">ระบบเบิก-คืนกุญแจ</h1>
            <div className={`header-status ${connected ? 'online' : 'offline'}`}>
                <span className="status-dot"></span>
                {connected ? 'เชื่อมต่อแล้ว' : 'ไม่ได้เชื่อมต่อ'}
            </div>
        </header>
    );
}
