/**
 * หน้ายืนยันการสลับสิทธิ์กุญแจ
 * step='confirm1' → ยืนยันตัวตนคนที่ 1 พร้อมแสดงห้องที่ถือสิทธิ์
 * step='confirm2' → แสดงสรุปการสลับทั้ง 2 คน + ปุ่มยืนยันการสลับ
 */
import { useState } from 'react';

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
                                <input 
                                    type="time" 
                                    value={returnTimeA} 
                                    onChange={(e) => setReturnTimeA(e.target.value)}
                                    style={{ background: '#1e293b', border: '1px solid #eab308', color: '#fff', padding: '8px 12px', borderRadius: '5px', width: '100%', fontSize: '1rem', textAlign: 'center' }}
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
                                <input 
                                    type="time" 
                                    value={returnTimeB} 
                                    onChange={(e) => setReturnTimeB(e.target.value)}
                                    style={{ background: '#1e293b', border: '1px solid #eab308', color: '#fff', padding: '8px 12px', borderRadius: '5px', width: '100%', fontSize: '1rem', textAlign: 'center' }}
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
