/**
 * หน้ายืนยันตัวตน — แสดงข้อมูลผู้ใช้และกุญแจที่จะเบิก/คืน
 */
export default function ConfirmIdentityPage({ mode, user, roomCode, onConfirm, onCancel, loading }) {
    const isReturn = mode === 'return';

    return (
        <div className="page confirm-page">
            <div className="confirm-card">
                {/* Avatar / Icon */}
                <div className="user-avatar">
                    <span className="avatar-icon">👤</span>
                </div>

                {/* Confirm Title */}
                <h2 className="confirm-title">
                    {isReturn ? "ยืนยันการคืนกุญแจ" : "ยืนยันการเบิกกุญแจ"}
                </h2>

                {/* User Info */}
                <div className="confirm-info">
                    <p className="info-label">รหัสนักศึกษา</p>
                    <p className="info-value">{user?.userId || '-'}</p>
                </div>

                {/* Room Info */}
                <div className="confirm-info">
                    <p className="info-label">
                        {isReturn ? "ต้องการคืนกุญแจห้อง" : "ต้องการเบิกกุญแจห้อง"}
                    </p>
                    <p className="confirm-room">{roomCode || '-'}</p>
                </div>

                {/* Actions */}
                <div className="confirm-actions">
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading
                            ? "กำลังทำรายการ..."
                            : (isReturn ? "ยืนยันการคืน" : "ยืนยันการเบิก")
                        }
                    </button>

                    <button
                        className="btn btn-secondary"
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
