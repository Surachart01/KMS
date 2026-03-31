/**
 * หน้ายืนยันการย้ายสิทธิ์กุญแจ
 * step='confirm1' → ยืนยันตัวตนคนที่ 1 (ผู้โอน) + แสดงห้องที่จะโอน
 * step='confirm2' → แสดงสรุป [ผู้โอน] ห้อง [X] → [ผู้รับ] ก่อนยืนยัน
 */
export default function TransferConfirmPage({
    step,
    user1, roomCode1,
    user2,
    onConfirm,
    onCancel,
    loading,
}) {
    // ── step confirm1: ยืนยันคนที่ 1 (ผู้โอน) ──
    if (step === 'confirm1') {
        return (
            <div className="page confirm-page">
                <div className="confirm-card">
                    <div className="transfer-step-badge">ย้ายสิทธิ์ — ผู้โอน</div>

                    <div className="confirm-avatar">👤</div>
                    <h2 className="confirm-title">ยืนยันตัวตนผู้โอน</h2>

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

                    {roomCode1 ? (
                        <div className="confirm-info">
                            <p className="confirm-label">ห้องที่จะโอนสิทธิ์</p>
                            <p className="confirm-room transfer-room">{roomCode1}</p>
                        </div>
                    ) : (
                        <div className="confirm-info warn-box">
                            <p className="confirm-label">⚠️ ไม่พบสิทธิ์ห้องที่จะโอน</p>
                            <p className="confirm-value" style={{ fontSize: '0.75rem' }}>ตรวจสอบว่ามีคาบเรียนภายใน 30 นาที</p>
                        </div>
                    )}

                    <div className="confirm-actions">
                        <button
                            className="btn btn-transfer btn-lg"
                            onClick={onConfirm}
                            disabled={loading || !roomCode1}
                        >
                            {loading ? 'กำลังตรวจสอบ...' : '✓ ยืนยัน — ไปสแกนผู้รับ'}
                        </button>
                        <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>
                            ยกเลิก
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── step confirm2: ยืนยันการย้ายสุดท้าย ──
    return (
        <div className="page confirm-page">
            <div className="confirm-card transfer-final-card">
                <div className="transfer-step-badge transfer-step-final">ยืนยันการย้ายสิทธิ์</div>

                <div className="transfer-summary">
                    {/* ผู้โอน */}
                    <div className="transfer-user-box giver-box">
                        <p className="transfer-user-label">ผู้โอน</p>
                        <div className="transfer-user-avatar">👤</div>
                        <p className="transfer-user-id">{user1?.userId || '-'}</p>
                        <p className="transfer-user-name" style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '10px' }}>{user1?.firstName} {user1?.lastName}</p>
                        <div className="transfer-room-badge">{roomCode1 || '?'}</div>
                    </div>

                    {/* ลูกศรย้าย */}
                    <div className="transfer-arrow">
                        <span className="transfer-arrow-icon">→</span>
                        <p className="transfer-arrow-label">โอนสิทธิ์</p>
                    </div>

                    {/* ผู้รับ */}
                    <div className="transfer-user-box receiver-box">
                        <p className="transfer-user-label">ผู้รับ</p>
                        <div className="transfer-user-avatar">👤</div>
                        <p className="transfer-user-id">{user2?.userId || '-'}</p>
                        <p className="transfer-user-name" style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '10px' }}>{user2?.firstName} {user2?.lastName}</p>
                        <div className="transfer-room-badge receive">{roomCode1 || '?'}</div>
                    </div>
                </div>

                <p className="transfer-note">
                    ระบบจะตรวจสอบว่าผู้รับมีคาบเรียนภายใน 30 นาที
                </p>

                <div className="confirm-actions">
                    <button
                        className="btn btn-transfer btn-lg"
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading ? 'กำลังย้ายสิทธิ์...' : '📋 ยืนยันการย้ายสิทธิ์'}
                    </button>
                    <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>
                        ยกเลิก
                    </button>
                </div>
            </div>
        </div>
    );
}
