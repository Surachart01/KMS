import { useState, useEffect } from 'react';

const FALLBACK_REASONS = ['สอนชดเชย', 'กิจกรรมพิเศษ', 'ซ่อมบำรุง', 'ประชุม', 'อื่นๆ'];
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4556';

/**
 * หน้ากรอกเหตุผล + เลือกเวลาคืน — เมื่อไม่มีสิทธิ์ตาม DailyAuthorization
 * onSubmit(reason, returnByTime) — returnByTime เป็น ISO string
 */
export default function ReasonPage({ roomCode, onSubmit, onCancel, loading }) {
    const [reasons, setReasons] = useState(FALLBACK_REASONS);
    const [loadingReasons, setLoadingReasons] = useState(true);
    const [selected, setSelected] = useState('');
    const [customReason, setCustomReason] = useState('');
    const [returnTime, setReturnTime] = useState(''); // HH:MM format

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

    // แปลง HH:MM เป็น ISO string (วันนี้ หรือวันพรุ่งนี้ถ้าเวลาผ่านไปแล้ว)
    const getReturnByTime = () => {
        if (!returnTime) return null;
        const [hh, mm] = returnTime.split(':').map(Number);
        const d = new Date();
        d.setHours(hh, mm, 0, 0);
        if (d <= new Date()) d.setDate(d.getDate() + 1);
        return d.toISOString();
    };

    const reason = isOther ? customReason : selected;
    const canSubmit = reason.trim() && returnTime;

    const handleSubmit = () => {
        if (canSubmit) {
            onSubmit(reason, getReturnByTime());
        }
    };

    return (
        <div className="page reason-page">
            <h2 className="reason-title">กรุณาระบุเหตุผลการเบิกกุญแจ</h2>
            <p className="reason-subtitle">ห้อง {roomCode} — ไม่มีสิทธิ์ตามตารางเรียน</p>

            {/* ── ขั้นตอนที่ 1: เลือกเหตุผล ── */}
            <p className="reason-step-label">1. เลือกเหตุผล</p>
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

            {/* ── ขั้นตอนที่ 2: เลือกเวลาคืน ── */}
            {selected && (
                <>
                    <p className="reason-step-label" style={{ marginTop: '1.2rem' }}>2. เวลาที่จะคืน</p>
                    <input
                        className="reason-input"
                        type="time"
                        value={returnTime}
                        onChange={(e) => setReturnTime(e.target.value)}
                    />
                    {returnTime && (
                        <p className="reason-return-preview">
                            ⏰ ต้องคืนภายใน: <strong>{returnTime} น.</strong>
                        </p>
                    )}
                </>
            )}

            <div className="reason-actions">
                <button
                    className="btn btn-primary"
                    onClick={handleSubmit}
                    disabled={loading || !canSubmit}
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
