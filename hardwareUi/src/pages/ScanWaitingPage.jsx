/**
 * หน้ารอสแกน — ผู้ใช้เลือกห้องแล้ว หรือกดคืนกุญแจ รอไปสแกนหน้าที่ ZKTeco
 * มีปุ่มทดสอบสำหรับจำลองการสแกน
 */


export default function ScanWaitingPage({ mode, roomCode, onCancel, onTestScan }) {
    const isReturn = mode === 'return';

    return (
        <div className="page scan-page">
            {/* ถ้าเป็นโหมดเบิกกุญแจ ให้แสดงห้องที่เลือก */}
            {!isReturn && roomCode && (
                <div className="scan-room-badge">
                    ห้อง {roomCode}
                </div>
            )}

            {/* ถ้าเป็นโหมดคืนกุญแจ แสดง Badge "คืนกุญแจ" */}
            {isReturn && (
                <div className="scan-room-badge return-badge">
                    คืนกุญแจ
                </div>
            )}

            <div className="scan-animation">
                <div className="scan-circle"></div>
                <div className="scan-circle delay-1"></div>
                <div className="scan-circle delay-2"></div>
                <span className="scan-icon">😄</span>
            </div>

            <h2 className="scan-title">กรุณาสแกนใบหน้า</h2>
            <p className="scan-subtitle">
                {isReturn
                    ? "มองไปที่เครื่อง ZKTeco เพื่อยืนยันตัวตนและคืนกุญแจ"
                    : "มองไปที่เครื่อง ZKTeco เพื่อยืนยันตัวตน"}
            </p>

            {/* ปุ่มทดสอบ — จำลองการสแกนหน้า */}
            <div className="test-scan-buttons">
                <p className="test-scan-label">🧪 ทดสอบ (จำลองสแกน)</p>
                <div className="test-scan-row">
                    <button
                        className="btn btn-test"
                        onClick={() => onTestScan('6702041510164')}
                    >
                        6702041510164
                    </button>
                    <button
                        className="btn btn-test"
                        onClick={() => onTestScan('6702041510181')}
                    >
                        6702041510181
                    </button>
                </div>
            </div>

            <button className="btn btn-secondary" onClick={onCancel}>
                ยกเลิก
            </button>
        </div>
    );
}
