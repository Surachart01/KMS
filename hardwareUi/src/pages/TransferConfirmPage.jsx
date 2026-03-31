/**
 * หน้ายืนยันการโอนสิทธิ์กุญแจ
 * step='confirm1' → ยืนยันตัวตนคนที่ 1 (ผู้โอน) พร้อมแสดงห้องที่ถือสิทธิ์
 * step='confirm2' → แสดงสรุปการโอนไปให้คนที่ 2 (ผู้รับ) + ระบุเหตุผล/เวลาคืน (ถ้าไม่มีเรียน)
 */
import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, User, ArrowRight, AlertTriangle } from 'lucide-react';

const REASON_PRESETS = [
    'สอนชดเชย', 'เตรียมการสอน', 'ทำความสะอาด', 'ซ่อมแซมอุปกรณ์', 'จัดกิจกรรมพิเศษ'
];

function CustomTimePicker({ value, onChange }) {
    const initH = value ? parseInt(value.split(':')[0]) : (new Date().getHours() + 2) % 24;
    const initM = value ? parseInt(value.split(':')[1]) : 0;
    
    const [hours, setHours] = useState(initH);
    const [minutes, setMinutes] = useState(initM);

    useEffect(() => {
        onChange(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
    }, [hours, minutes]);

    const adjustTime = (h, m) => {
        let newH = hours + h;
        let newM = minutes + m;
        
        if (newM >= 60) { newM -= 60; newH += 1; }
        if (newM < 0) { newM += 60; newH -= 1; }
        if (newH >= 24) newH -= 24;
        if (newH < 0) newH += 24;
        
        const now = new Date();
        const currentH = now.getHours();
        const currentM = now.getMinutes();

        // ป้องกันไม่ให้เลือกเวลาย้อนหลังกลับไปในอดีต (ของวันปัจจุบัน)
        if (newH < currentH || (newH === currentH && newM < currentM)) {
            return; 
        }

        setHours(newH);
        setMinutes(newM);
    };

    const setPresetDuration = (durationH) => {
        const now = new Date();
        now.setHours(now.getHours() + durationH);
        setHours(now.getHours() % 24);
        setMinutes(now.getMinutes() > 30 ? 30 : 0);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '5px' }}>
            <div className="touch-time-picker" style={{ margin: '0 0 5px 0', padding: '4px 8px' }}>
                <div className="time-column" style={{ width: '40px' }}>
                    <button className="time-btn" style={{ width: '36px', height: '24px' }} onClick={() => adjustTime(1, 0)}><ChevronUp size={16} /></button>
                    <div className="time-value" style={{ fontSize: '1.2rem' }}>{hours.toString().padStart(2, '0')}</div>
                    <button className="time-btn" style={{ width: '36px', height: '20px' }} onClick={() => adjustTime(-1, 0)}><ChevronDown size={14} /></button>
                </div>
                <div className="time-separator" style={{ fontSize: '1.1rem', marginTop: '-4px' }}>:</div>
                <div className="time-column" style={{ width: '36px' }}>
                    <button className="time-btn" style={{ width: '36px', height: '20px' }} onClick={() => adjustTime(0, 30)}><ChevronUp size={14} /></button>
                    <div className="time-value" style={{ fontSize: '1.2rem' }}>{minutes.toString().padStart(2, '0')}</div>
                    <button className="time-btn" style={{ width: '36px', height: '20px' }} onClick={() => adjustTime(0, -30)}><ChevronDown size={14} /></button>
                </div>
            </div>
            <div className="time-presets" style={{ marginLeft: 0, paddingLeft: 0, borderLeft: 'none', justifyContent: 'center', marginTop: '4px' }}>
                <button className="preset-btn" style={{ padding: '2px 4px', fontSize: '0.65rem' }} onClick={() => setPresetDuration(1)}>+1 ชม.</button>
                <button className="preset-btn" style={{ padding: '2px 4px', fontSize: '0.65rem' }} onClick={() => setPresetDuration(2)}>+2 ชม.</button>
            </div>
        </div>
    );
}

export default function TransferConfirmPage({
    step,
    user1, roomCode1,
    user2,
    eligibility,
    onConfirm,
    onCancel,
    loading,
}) {
    const [reason, setReason] = useState('');
    const [returnTime, setReturnTime] = useState('');

    const handleConfirmClick = () => {
        let finalTime = null;
        
        if (eligibility && !eligibility.hasSchedule && returnTime) {
            const now = new Date();
            const [hh, mm] = returnTime.split(':');
            now.setHours(parseInt(hh, 10), parseInt(mm, 10), 0, 0);
            
            if (now <= new Date()) {
                 now.setDate(now.getDate() + 1);
            }
            finalTime = now.toISOString();
        }

        onConfirm(reason, finalTime);
    };

    const isConfirmDisabled = loading || 
        (eligibility && !eligibility.hasSchedule && (!reason || !returnTime));

    // ── step confirm1: ยืนยันคนที่ 1 ──
    if (step === 'confirm1') {
        return (
            <div className="page confirm-page">
                <div className="confirm-card">
                    <div className="transfer-step-badge">โอนสิทธิ์ — ผู้โอน</div>

                    <div className="confirm-avatar" style={{ marginBottom: '8px' }}><User size={32} /></div>

                    <h2 className="confirm-title" style={{ fontSize: '1.4rem', marginBottom: '15px' }}>ยืนยันผู้โอนกุญแจ</h2>

                    <div className="confirm-info" style={{ marginBottom: '8px' }}>
                        <p className="confirm-label" style={{ fontSize: '0.8rem' }}>รหัสนักศึกษา</p>
                        <p className="confirm-value">{user1?.userId || '-'}</p>
                    </div>

                    <div className="confirm-info" style={{ marginBottom: '8px' }}>
                        <p className="confirm-label" style={{ fontSize: '0.8rem' }}>ชื่อ-นามสกุล</p>
                        <p className="confirm-value" style={{ fontSize: '1.1rem', color: '#e2e8f0' }}>
                            {user1?.firstName} {user1?.lastName}
                        </p>
                    </div>

                    {roomCode1 ? (
                        <div className="confirm-info" style={{ marginBottom: '15px' }}>
                            <p className="confirm-label" style={{ fontSize: '0.8rem' }}>สิทธิ์ห้องปัจจุบันที่จะโอน</p>
                            <div className="transfer-room-badge" style={{ marginTop: '5px' }}>{roomCode1}</div>
                        </div>
                    ) : (
                        <div className="confirm-info warn-box" style={{ padding: '8px' }}>
                            <p className="confirm-label" style={{ fontSize: '0.8rem' }}>⚠️ ไม่พบสิทธิ์ห้องที่จะโอน</p>
                        </div>
                    )}

                    <div className="confirm-actions">
                        <button
                            className="btn btn-transfer btn-lg"
                            onClick={() => onConfirm(null, null)}
                            disabled={loading || !roomCode1}
                        >
                            {loading ? 'กำลังตรวจสอบ...' : '✓ ยืนยัน — ไปสแกนผู้รับโอน'}
                        </button>
                        <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>
                            ยกเลิก
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── step confirm2: ยืนยันการโอนให้คนที่ 2 ──
    return (
        <div className="page confirm-page">
            <div className="confirm-card transfer-final-card">
                <div className="swap-users-row transfer-summary" style={{ flexDirection: 'row', display: 'flex', gap: '10px', alignItems: 'center', marginTop: '5px' }}>
                    {/* ผู้โอน */}
                    <div className="transfer-user-box giver-box" style={{ flex: 1 }}>
                        <div className="transfer-user-avatar" style={{ marginBottom: '4px' }}><User size={20} /></div>
                        <p className="transfer-user-id" style={{ fontSize: '0.85rem' }}>{user1?.userId || '-'}</p>
                        <p className="transfer-user-name" style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>{user1?.firstName} {user1?.lastName}</p>
                        <p className="swap-room-label" style={{ fontSize: '0.7rem', color: '#94a3b8' }}>ส่งมอบ ห้อง {roomCode1 || '?'}</p>
                    </div>

                    {/* ลูกศรโอน */}
                    <div className="transfer-arrow" style={{ padding: '0 5px' }}>
                        <ArrowRight size={28} color="#8b5cf6" />
                    </div>

                    {/* ผู้รับโอน */}
                    <div className="transfer-user-box receiver-box" style={{ flex: 1 }}>
                        <div className="transfer-user-avatar" style={{ marginBottom: '4px' }}><User size={20} /></div>
                        <p className="transfer-user-id" style={{ fontSize: '0.85rem' }}>{user2?.userId || '-'}</p>
                        <p className="transfer-user-name" style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>{user2?.firstName} {user2?.lastName}</p>
                        <p className="swap-room-label" style={{ fontSize: '0.7rem', color: '#94a3b8' }}>รับโอน ห้อง {roomCode1 || '?'}</p>
                    </div>
                </div>

                {/* ส่วนของไม่มีคาบเรียน */}
                {eligibility && !eligibility.hasSchedule && (
                    <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '10px', border: '1px solid #1e293b' }}>
                        <h4 style={{ margin: '0 0 8px 0', color: '#fbbf24', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <AlertTriangle size={16} /> ผู้รับไม่มีคาบเรียน
                        </h4>
                        
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                            {/* เหตุผล */}
                            <div style={{ flex: 1.4, textAlign: 'left' }}>
                                <label style={{ display: 'block', marginBottom: '6px', color: '#94a3b8', fontSize: '0.8rem' }}>• เหตุผลการโอน</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {REASON_PRESETS.map((r) => (
                                        <button
                                            key={r}
                                            onClick={() => setReason(r)}
                                            style={{
                                                padding: '4px 8px',
                                                borderRadius: '5px',
                                                border: `1px solid ${reason === r ? '#8b5cf6' : '#334155'}`,
                                                background: reason === r ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                                                color: reason === r ? '#fff' : '#cbd5e1',
                                                fontSize: '0.75rem',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* เวลาคืน */}
                            <div style={{ flex: 1, borderLeft: '1px solid #334155', paddingLeft: '10px' }}>
                                <label style={{ display: 'block', marginBottom: '4px', color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center' }}>• เวลาคืน</label>
                                <CustomTimePicker value={returnTime} onChange={setReturnTime} />
                            </div>
                        </div>
                    </div>
                )}

                <div className="confirm-actions" style={{ marginTop: '15px' }}>
                    <button
                        className="btn btn-transfer btn-lg"
                        style={{ background: isConfirmDisabled ? '#475569' : 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)', boxShadow: isConfirmDisabled ? 'none' : '0 8px 20px rgba(139, 92, 246, 0.3)' }}
                        onClick={handleConfirmClick}
                        disabled={isConfirmDisabled}
                    >
                        {loading ? 'กำลังโอนสิทธิ์...' : <><ArrowRight size={20} style={{marginRight: '8px'}} /> ยืนยันการโอนสิทธิ์</>}
                    </button>
                    <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>
                        ยกเลิก
                    </button>
                </div>
            </div>
        </div>
    );
}
