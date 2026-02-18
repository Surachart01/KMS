import { useState } from 'react';

/**
 * หน้ากรอกเหตุผล — เมื่อไม่มีสิทธิ์ตาม DailyAuthorization
 */
const REASONS = [
    'สอนชดเชย',
    'กิจกรรมพิเศษ',
    'ซ่อมบำรุง',
    'ประชุม',
    'อื่นๆ',
];

export default function ReasonPage({ roomCode, onSubmit, onCancel, loading }) {
    const [selected, setSelected] = useState('');
    const [customReason, setCustomReason] = useState('');

    const handleSubmit = () => {
        const reason = selected === 'อื่นๆ' ? customReason : selected;
        if (reason.trim()) {
            onSubmit(reason);
        }
    };

    return (
        <div className="page reason-page">
            <h2 className="reason-title">กรุณาระบุเหตุผลการเบิกกุญแจ</h2>
            <p className="reason-subtitle">ห้อง {roomCode} — ไม่มีสิทธิ์ตามตารางเรียน</p>

            <div className="reason-options">
                {REASONS.map((r) => (
                    <button
                        key={r}
                        className={`reason-chip ${selected === r ? 'active' : ''}`}
                        onClick={() => setSelected(r)}
                    >
                        {r}
                    </button>
                ))}
            </div>

            {selected === 'อื่นๆ' && (
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
                    disabled={loading || !selected || (selected === 'อื่นๆ' && !customReason.trim())}
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
