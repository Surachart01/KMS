import KeyCard from '../components/KeyCard.jsx';

/**
 * หน้ารายการกุญแจ — แสดงกุญแจทั้งหมดให้เลือก
 */
export default function KeyListPage({ keys, onSelectRoom, onCancel, loading }) {
    const availableKeys = keys.filter(k => k.isAvailable);
    const borrowedKeys = keys.filter(k => !k.isAvailable);

    return (
        <div className="page keylist-page">
            <h2 className="keylist-title">เลือกห้องที่ต้องการเบิกกุญแจ</h2>

            <div className="keylist-grid">
                {availableKeys.map((key) => (
                    <KeyCard
                        key={key.id}
                        roomCode={key.roomCode}
                        slotNumber={key.slotNumber}
                        isAvailable={true}
                        onSelect={onSelectRoom}
                    />
                ))}
                {borrowedKeys.map((key) => (
                    <KeyCard
                        key={key.id}
                        roomCode={key.roomCode}
                        slotNumber={key.slotNumber}
                        isAvailable={false}
                        currentBorrower={key.currentBorrower}
                        onSelect={() => { }}
                    />
                ))}
            </div>

            {keys.length === 0 && (
                <p className="keylist-empty">ไม่พบข้อมูลกุญแจ</p>
            )}

            <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>
                ← ย้อนกลับ
            </button>

            {loading && <div className="loading-bar"></div>}
        </div>
    );
}
