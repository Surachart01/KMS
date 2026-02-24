import { useState, useEffect } from 'react';

const FALLBACK_REASONS = ['สอนชดเชย', 'กิจกรรมพิเศษ', 'ซ่อมบำรุง', 'ประชุม', 'อื่นๆ'];
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4556';

/**
 * หน้ากรอกเหตุผล — เมื่อไม่มีสิทธิ์ตาม DailyAuthorization
 * ดึงรายการเหตุผลจาก API แทน hardcode
 */
export default function ReasonPage({ roomCode, onSubmit, onCancel, loading }) {
    const [reasons, setReasons] = useState(FALLBACK_REASONS);
    const [loadingReasons, setLoadingReasons] = useState(true);
    const [selected, setSelected] = useState('');
    const [customReason, setCustomReason] = useState('');

    useEffect(() => {
        const fetchReasons = async () => {
            try {
                const res = await fetch(`${API_URL}/api/borrow-reasons?isActive=true`);
                const json = await res.json();
                if (json.success && json.data?.length > 0) {
                    setReasons(json.data.map((r) => r.label));
                }
            } catch {
                // ใช้ fallback ถ้า fetch ไม่ได้
            } finally {
                setLoadingReasons(false);
            }
        };
        fetchReasons();
    }, []);

    const isOther = selected === 'อื่นๆ';

    const handleSubmit = () => {
        const reason = isOther ? customReason : selected;
        if (reason.trim()) {
            onSubmit(reason);
        }
    };

    return (
        <div className="page reason-page">
            <h2 className="reason-title">กรุณาระบุเหตุผลการเบิกกุญแจ</h2>
            <p className="reason-subtitle">ห้อง {roomCode} — ไม่มีสิทธิ์ตามตารางเรียน</p>

            {loadingReasons ? (
                <div className="reason-options" style={{ justifyContent: 'center' }}>
                    <p style={{ color: 'var(--text-muted)' }}>กำลังโหลด...</p>
                </div>
            ) : (
                <div className="reason-options">
                    {reasons.map((r) => (
                        <button
                            key={r}
                            className={`reason-chip ${selected === r ? 'active' : ''}`}
                            onClick={() => setSelected(r)}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            )}

            {isOther && (
                <input
                    className="reason-input"
                    type="text"
                    placeholder="พิมพ์เหตุผล..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    autoFocus
                />
            )}

            <div className="reason-actions">
                <button
                    className="btn btn-primary"
                    onClick={handleSubmit}
                    disabled={loading || !selected || (isOther && !customReason.trim())}
                >
                    ยืนยัน
                </button>
                <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>
                    ยกเลิก
                </button>
            </div>

            {loading && <div className="loading-bar"></div>}
        </div>
    );
}
