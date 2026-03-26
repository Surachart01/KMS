import { User, Fingerprint, DoorOpen, Key, CheckCircle, XCircle } from 'lucide-react';

/**
 * หน้ายืนยันตัวตน — แสดงข้อมูลผู้ใช้และกุญแจที่จะเบิก/คืน
 */
export default function ConfirmIdentityPage({ mode, user, roomCode, onConfirm, onCancel, loading }) {
    const isReturn = mode === 'return';

    return (
        <div className="page confirm-page">
            <div className="confirm-card glass">
                <div className="confirm-header">
                    <div className="confirm-avatar-circle">
                        <User size={40} strokeWidth={1.5} />
                    </div>
                    <h2 className="confirm-title">
                        {isReturn ? "ยืนยันการคืนกุญแจ" : "ยืนยันการเบิกกุญแจ"}
                    </h2>
                </div>

                <div className="confirm-details-box">
                    <div className="detail-row">
                        <div className="detail-icon">
                            <Fingerprint size={24} />
                        </div>
                        <div className="detail-text">
                            <span className="detail-label">ID / รหัสนักศึกษา</span>
                            <span className="detail-value">{user?.userId || '-'}</span>
                        </div>
                    </div>

                    <div className="detail-divider"></div>

                    <div className="detail-row">
                        <div className="detail-icon">
                            {isReturn ? <DoorOpen size={24} /> : <Key size={24} />}
                        </div>
                        <div className="detail-text">
                            <span className="detail-label">
                                {isReturn ? "ห้องเรียนที่คืน" : "ห้องเรียนที่เบิก"}
                            </span>
                            <span className="detail-value text-gradient">{roomCode || '-'}</span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="confirm-actions">
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading ? (
                            "กำลังทำรายการ..."
                        ) : (
                            <><CheckCircle size={20} /> ยืนยันทำรายการ</>
                        )}
                    </button>
                    <button
                        className="btn btn-secondary btn-lg"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        <XCircle size={20} /> ยกเลิก
                    </button>
                </div>
            </div>
        </div>
    );
}

