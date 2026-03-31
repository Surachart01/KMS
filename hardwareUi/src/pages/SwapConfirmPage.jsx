/**
 * หน้ายืนยันการสลับสิทธิ์กุญแจ
 * step='confirm1' → ยืนยันตัวตนคนที่ 1 พร้อมแสดงห้องที่ถือสิทธิ์
 * step='confirm2' → แสดงสรุปการสลับทั้ง 2 คน + ปุ่มยืนยันการสลับ
 */
import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

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
                    <button className="time-btn" style={{ width: '36px', height: '24px' }} onClick={() => adjustTime(-1, 0)}><ChevronDown size={16} /></button>
                </div>
                <div className="time-separator" style={{ fontSize: '1.2rem', marginTop: '-6px' }}>:</div>
                <div className="time-column" style={{ width: '40px' }}>
                    <button className="time-btn" style={{ width: '36px', height: '24px' }} onClick={() => adjustTime(0, 30)}><ChevronUp size={16} /></button>
                    <div className="time-value" style={{ fontSize: '1.2rem' }}>{minutes.toString().padStart(2, '0')}</div>
                    <button className="time-btn" style={{ width: '36px', height: '24px' }} onClick={() => adjustTime(0, -30)}><ChevronDown size={16} /></button>
                </div>
            </div>
            <div className="time-presets" style={{ marginLeft: 0, paddingLeft: 0, borderLeft: 'none', justifyContent: 'center' }}>
                <button className="preset-btn" style={{ padding: '2px 6px', fontSize: '0.7rem' }} onClick={() => setPresetDuration(1)}>+1 ชม.</button>
                <button className="preset-btn" style={{ padding: '2px 6px', fontSize: '0.7rem' }} onClick={() => setPresetDuration(2)}>+2 ชม.</button>
            </div>
        </div>
    );
}

export default function SwapConfirmPage({
    step,
    user1, roomCode1,
    user2, roomCode2,
    eligibility,
    onConfirm,
    onCancel,
    loading,
}) {
    const [returnTimeA, setReturnTimeA] = useState('');
    const [returnTimeB, setReturnTimeB] = useState('');

    const handleConfirmClick = () => {
        let timeA = null;
        let timeB = null;
        
        if (eligibility && !eligibility.userA.hasSchedule && returnTimeA) {
            const now = new Date();
            const [hh, mm] = returnTimeA.split(':');
            now.setHours(parseInt(hh, 10), parseInt(mm, 10), 0, 0);
            timeA = now.toISOString();
        }
        
        if (eligibility && !eligibility.userB.hasSchedule && returnTimeB) {
            const now = new Date();
            const [hh, mm] = returnTimeB.split(':');
            now.setHours(parseInt(hh, 10), parseInt(mm, 10), 0, 0);
            timeB = now.toISOString();
        }

        onConfirm(timeA, timeB);
    };

    const isConfirmDisabled = loading || 
        (eligibility && !eligibility.userA.hasSchedule && !returnTimeA) ||
        (eligibility && !eligibility.userB.hasSchedule && !returnTimeB);

    // ── step confirm1: ยืนยันคนที่ 1 ──
    if (step === 'confirm1') {
        return (
            <div className="page confirm-page">
                <div className="confirm-card">
                    <div className="swap-step-badge">สลับสิทธิ์ — คนที่ 1</div>

                    <div className="confirm-avatar">👤</div>

                    <h2 className="confirm-title">ยืนยันตัวตนคนที่ 1</h2>

                    <div className="confirm-info">
                        <p className="confirm-label">รหัสนักศึกษา</p>
                        <p className="confirm-value">{user1?.userId || '-'}</p>
                    </div>

                    <div className="confirm-info" style={{ marginTop: '10px' }}>
                        <p className="confirm-label">ชื่อ-นามสกุล</p>
                        <p className="confirm-value" style={{ fontSize: '1.2rem', color: '#e2e8f0' }}>
                            {user1?.firstName} {user1?.lastName}
                        </p>
                    </div>

                    {roomCode1 && (
                        <div className="confirm-info">
                            <p className="confirm-label">สิทธิ์ห้องปัจจุบัน</p>
                            <p className="confirm-room">{roomCode1}</p>
                        </div>
                    )}

                    <div className="confirm-actions">
                        <button
                            className="btn btn-primary btn-lg"
                            onClick={onConfirm}
                            disabled={loading}
                        >
                            {loading ? 'กำลังตรวจสอบ...' : '✓ ยืนยัน — ไปสแกนคนที่ 2'}
                        </button>
                        <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>
                            ยกเลิก
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── step confirm2: ยืนยันการสลับสุดท้าย ──
    return (
        <div className="page confirm-page">
            <div className="confirm-card swap-final-card">
                <div className="swap-step-badge swap-step-final">ยืนยันการสลับสิทธิ์</div>

                <div className="swap-users-row">
                    {/* คนที่ 1 */}
                    <div className="swap-user-box">
                        <div className="swap-user-avatar">👤</div>
                        <p className="swap-user-id">{user1?.userId || '-'}</p>
                        <p className="swap-user-name" style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '10px' }}>{user1?.firstName} {user1?.lastName}</p>
                        <div className="swap-room-from">{roomCode1 || '?'}</div>
                        <p className="swap-room-label">→ สลับไปห้อง</p>
                        <div className="swap-room-to">{roomCode2 || '?'}</div>
                        
                        {eligibility && !eligibility.userA.hasSchedule && (
                            <div className="swap-time-picker" style={{ marginTop: '15px' }}>
                                <label style={{ color: '#fbbf24', fontSize: '0.85rem', display: 'block', marginBottom: '5px' }}>
                                    ⚠️ ไม่มีคาบเรียน: ระบุเวลาคืน
                                </label>
                                <CustomTimePicker 
                                    value={returnTimeA} 
                                    onChange={setReturnTimeA} 
                                />
                            </div>
                        )}
                    </div>

                    {/* ลูกศรกลาง */}
                    <div className="swap-arrow">🔄</div>

                    {/* คนที่ 2 */}
                    <div className="swap-user-box">
                        <div className="swap-user-avatar">👤</div>
                        <p className="swap-user-id">{user2?.userId || '-'}</p>
                        <p className="swap-user-name" style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '10px' }}>{user2?.firstName} {user2?.lastName}</p>
                        <div className="swap-room-from">{roomCode2 || '?'}</div>
                        <p className="swap-room-label">→ สลับไปห้อง</p>
                        <div className="swap-room-to">{roomCode1 || '?'}</div>

                        {eligibility && !eligibility.userB.hasSchedule && (
                            <div className="swap-time-picker" style={{ marginTop: '15px' }}>
                                <label style={{ color: '#fbbf24', fontSize: '0.85rem', display: 'block', marginBottom: '5px' }}>
                                    ⚠️ ไม่มีคาบเรียน: ระบุเวลาคืน
                                </label>
                                <CustomTimePicker 
                                    value={returnTimeB} 
                                    onChange={setReturnTimeB} 
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="confirm-actions">
                    <button
                        className="btn btn-swap btn-lg"
                        onClick={handleConfirmClick}
                        disabled={isConfirmDisabled}
                    >
                        {loading ? 'กำลังสลับสิทธิ์...' : '🔄 ยืนยันการสลับ'}
                    </button>
                    <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>
                        ยกเลิก
                    </button>
                </div>
            </div>
        </div>
    );
}
