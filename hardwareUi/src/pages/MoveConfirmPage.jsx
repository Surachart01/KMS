export default function MoveConfirmPage({ user, fromRoom, toRoom, onConfirm, onCancel, loading }) {
    return (
        <div className="page confirm-page">
            <div className="confirm-card">
                <div className="swap-step-badge">ยืนยันการย้ายห้อง</div>
                <div className="confirm-avatar">👤</div>
                <h2 className="confirm-title">ยืนยันการย้ายห้อง</h2>

                <div className="confirm-info">
                    <p className="confirm-label">รหัสนักศึกษา</p>
                    <p className="confirm-value">{user?.userId || '-'}</p>
                </div>

                <div className="confirm-info" style={{ marginTop: '10px' }}>
                    <p className="confirm-label">ชื่อ-นามสกุล</p>
                    <p className="confirm-value" style={{ fontSize: '1.2rem', color: '#e2e8f0' }}>
                        {user?.firstName} {user?.lastName}
                    </p>
                </div>

                <div className="swap-users-row" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                    <div className="swap-user-box" style={{ padding: '0.5rem' }}>
                        <p className="swap-room-label">จากห้อง</p>
                        <div className="swap-room-from">{fromRoom || '?'}</div>
                    </div>
                    <div className="swap-arrow">➡️</div>
                    <div className="swap-user-box" style={{ padding: '0.5rem' }}>
                        <p className="swap-room-label">ไปห้อง</p>
                        <div className="swap-room-to">{toRoom || '?'}</div>
                    </div>
                </div>

                <div className="confirm-actions">
                    <button
                        className="btn btn-primary btn-lg"
                        style={{ background: '#3b82f6' }}
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading ? 'กำลังดำเนินการ...' : '✓ ยืนยันการย้ายห้อง'}
                    </button>
                    <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>
                        ยกเลิก
                    </button>
                </div>
            </div>
        </div>
    );
}
