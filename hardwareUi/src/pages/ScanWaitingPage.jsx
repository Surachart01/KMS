export default function ScanWaitingPage({ mode, transferStep, swapStep, moveStep, roomCode, onCancel, onTestScan }) {
    const isReturn = mode === 'return';
    const isTransfer = mode === 'transfer';
    const isSwap = mode === 'swap';
    const isMove = mode === 'move';

    let badgeText = '';
    let subtitle = 'มองไปที่เครื่อง ZKTeco เพื่อยืนยันตัวตน';

    if (isReturn) {
        badgeText = 'คืนกุญแจ';
        subtitle = 'มองไปที่เครื่อง ZKTeco เพื่อยืนยันตัวตนและคืนกุญแจ';
    } else if (isTransfer) {
        const isStep2 = transferStep === 'scan2';
        badgeText = isStep2 ? 'ย้ายสิทธิ์ — ผู้รับ' : 'ย้ายสิทธิ์ — ผู้โอน';
        subtitle = isStep2
            ? 'สแกนใบหน้าผู้รับสิทธิ์ (ต้องมีคาบเรียนภายใน 30 นาที)'
            : 'สแกนใบหน้าผู้โอนสิทธิ์กุญแจ';
    } else if (isSwap) {
        const isStep2 = swapStep === 'scan2';
        badgeText = isStep2 ? 'สลับห้อง — คนที่ 2' : 'สลับห้อง — คนที่ 1';
        subtitle = isStep2
            ? 'สแกนใบหน้าคนที่ 2'
            : 'สแกนใบหน้าคนที่ 1';
    } else if (isMove) {
        badgeText = 'ย้ายห้อง';
        subtitle = 'สแกนใบหน้าเพื่อระบุตัวตนและเลือกห้องใหม่';
    } else if (roomCode) {
        badgeText = `ห้อง ${roomCode}`;
    }

    return (
        <div className="page scan-page">
            {badgeText && (
                <div className={`scan-room-badge ${isReturn ? 'return-badge' : ''} ${isTransfer ? 'transfer-badge' : ''}`}>
                    {badgeText}
                </div>
            )}

            <div className="scan-animation">
                <div className="scan-circle"></div>
                <div className="scan-circle delay-1"></div>
                <div className="scan-circle delay-2"></div>
                <span className="scan-icon">😄</span>
            </div>

            <h2 className="scan-title">กรุณาสแกนใบหน้า</h2>
            <p className="scan-subtitle">{subtitle}</p>

            <div className="test-scan-buttons">
                <p className="test-scan-label">🧪 ทดสอบ (จำลองสแกน)</p>
                <div className="test-scan-row">
                    <button className="btn btn-test" onClick={() => onTestScan('6702041510164')}>
                        6702041510164
                    </button>
                    <button className="btn btn-test" onClick={() => onTestScan('6702041510181')}>
                        6702041510181
                    </button>
                </div>
            </div>

            <button className="btn btn-secondary" onClick={onCancel}>ยกเลิก</button>
        </div>
    );
}
