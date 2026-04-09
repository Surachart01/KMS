import { Scan, User, ArrowLeft } from 'lucide-react';

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
        badgeText = isStep2 ? 'สลับสิทธิ์ — คนที่ 2' : 'สลับสิทธิ์ — คนที่ 1';
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
            <div className="scan-room-badge header-badge">
                {badgeText || 'ระบบระบุตัวตน'}
            </div>

            <div className="scan-animation">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className={`scan-circle delay-${i}`}></div>
                ))}
                <div className="scan-icon">
                    <Scan size={64} strokeWidth={1.5} />
                </div>
            </div>

            <h2 className="scan-title">กรุณาสแกนใบหน้า</h2>
            <p className="scan-subtitle">{subtitle}</p>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button className="btn btn-secondary btn-lg" onClick={onCancel}>
                    <ArrowLeft size={20} /> กลับไปหน้าหลัก
                </button>
            </div>
        </div>
    );
}

