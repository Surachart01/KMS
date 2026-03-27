import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, FileText } from 'lucide-react';

const FALLBACK_REASONS = ['สอนชดเชย', 'กิจกรรมพิเศษ', 'ซ่อมบำรุง', 'ประชุม', 'อื่นๆ'];
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4556';

export default function ReasonPage({ roomCode, onSubmit, onCancel, loading }) {
    const [reasons, setReasons] = useState(FALLBACK_REASONS);
    const [loadingReasons, setLoadingReasons] = useState(true);
    const [selected, setSelected] = useState('');
    const [customReason, setCustomReason] = useState('');
    const [returnTime, setReturnTime] = useState('');

    useEffect(() => {
        const fetchReasons = async () => {
            try {
                const res = await fetch(`${API_URL}/api/borrow-reasons?isActive=true`);
                const json = await res.json();
                if (json.success && json.data?.length > 0) {
                    setReasons(json.data.map((r) => r.label));
                }
            } catch {
                // fallback
            } finally {
                setLoadingReasons(false);
            }
        };
        fetchReasons();
    }, []);

    const isOther = selected === 'อื่นๆ';
    const reason = isOther ? customReason : selected;
    const canSubmit = reason.trim() && returnTime;

    const getReturnByTime = () => {
        if (!returnTime) return null;
        const [hh, mm] = returnTime.split(':').map(Number);
        const d = new Date();
        d.setHours(hh, mm, 0, 0);
        if (d <= new Date()) d.setDate(d.getDate() + 1);
        return d.toISOString();
    };

    const handleSubmit = () => {
        if (canSubmit) {
            onSubmit(reason, getReturnByTime());
        }
    };

    return (
        <div className="page reason-page">
            <div className="reason-card glass">
                <div className="reason-header">
                    <FileText size={32} className="text-gradient" />
                    <h2 className="reason-title">ระบุเหตุผลการเบิกกุญแจ</h2>
                </div>
                
                <p className="reason-subtitle">ห้อง {roomCode} — อยู่นอกตารางเรียนของคุณ</p>

                <div className="reason-content-scroll">
                    {/* Step 1 */}
                    <p className="reason-step-label">1. เลือกเหตุผลการใช้งาน</p>
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

                    {isOther && (
                        <input
                            className="reason-input anim-fade-in"
                            type="text"
                            placeholder="ระบุเหตุผลอื่นๆ..."
                            value={customReason}
                            onChange={(e) => setCustomReason(e.target.value)}
                            autoFocus
                        />
                    )}

                    {/* Step 2 */}
                    {selected && (
                        <div className="reason-time-section anim-fade-in">
                            <p className="reason-step-label">
                                <Clock size={16} /> 2. กำหนดเวลาที่จะคืนกุญแจ
                            </p>
                            <input
                                className="reason-input"
                                type="time"
                                value={returnTime}
                                onChange={(e) => setReturnTime(e.target.value)}
                            />
                            {returnTime && (
                                <p className="reason-return-preview">
                                    ⏰ คืนกุญแจไม่เกิน: <strong>{returnTime} น.</strong>
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className="reason-actions">
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={handleSubmit}
                        disabled={loading || !canSubmit}
                    >
                        {loading ? 'กำลังส่งข้อมูล...' : <><CheckCircle size={20} /> ยืนยัน</>}
                    </button>
                    <button className="btn btn-secondary btn-lg" onClick={onCancel} disabled={loading}>
                        <XCircle size={20} /> ยกเลิก
                    </button>
                </div>
            </div>
        </div>
    );
}
