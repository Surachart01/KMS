import { Home, Cloud, CloudOff } from 'lucide-react';

/**
 * Header — แถบด้านบน แสดงชื่อระบบ + สถานะเชื่อมต่อ
 */
export default function Header({ connected, onHomeClick }) {
    return (
        <header className="header">
            <button className="header-home-btn" onClick={onHomeClick} title="Home">
                <Home size={20} strokeWidth={2.5} />
            </button>
            
            <h1 className="header-title">ระบบเบิก-คืนกุญแจ</h1>

            <div className={`header-status ${connected ? 'online' : 'offline'}`}>
                <span className="status-dot"></span>
                {connected ? (
                    <><Cloud size={14} /> <span>ONLINE</span></>
                ) : (
                    <><CloudOff size={14} /> <span>OFFLINE</span></>
                )}
            </div>
        </header>
    );
}

