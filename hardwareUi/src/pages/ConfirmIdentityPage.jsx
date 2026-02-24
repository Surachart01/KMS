/**
 * หน้ายืนยันตัวตน — แสดงข้อมูลผู้ใช้และกุญแจที่จะเบิก/คืน
 */
export default function ConfirmIdentityPage({ mode, user, roomCode, onConfirm, onCancel, loading }) {
    const isReturn = mode === 'return';

    return (
        <div className="page confirm-page">
            <div className="confirm-card modern-card">
                <div className="confirm-header">
                    <div className="confirm-avatar-circle">
                        <span className="avatar-icon">👤</span>
                    </div>
                    <h2 className="confirm-title">
                        {isReturn ? "ยืนยันการคืนกุญแจ" : "ยืนยันการเบิกกุญแจ"}
                    </h2>
                </div>

                <div className="confirm-details-box">
                    <div className="detail-row">
                        <div className="detail-icon">🆔</div>
                        <div className="detail-text">
                            <span className="detail-label">รหัสนักศึกษา</span>
                            <span className="detail-value">{user?.userId || '-'}</span>
                        </div>
                    </div>

                    <div className="detail-divider"></div>

                    <div className="detail-row">
                        <div className="detail-icon">{isReturn ? '🚪' : '🔑'}</div>
                        <div className="detail-text">
                            <span className="detail-label">
                                {isReturn ? "ห้องเรียนที่คืน" : "ห้องเรียนที่เบิก"}
                            </span>
                            <span className="detail-room-badge">{roomCode || '-'}</span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="confirm-actions">
                    <button
                        className="btn btn-primary btn-lg pulse"
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading
                            ? "กำลังทำรายการ..."
                            : (isReturn ? "✓ ยืนยันการคืน" : "✓ ยืนยันการเบิก")
                        }
                    </button>
                    <button
                        className="btn btn-secondary btn-lg"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        ยกเลิก
                    </button>
                </div>
            </div>
        </div>
    );
}
