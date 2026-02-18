/**
 * KeyCard — การ์ดกุญแจแต่ละห้อง
 */
export default function KeyCard({ roomCode, slotNumber, isAvailable, currentBorrower, onSelect }) {
    return (
        <button
            className={`key-card ${isAvailable ? 'available' : 'borrowed'}`}
            onClick={() => isAvailable && onSelect(roomCode)}
            disabled={!isAvailable}
        >
            <div className="key-card-header">
                <div className="key-card-icon">
                    {isAvailable ? '🔑' : '🔒'}
                </div>
                <div className="key-card-info">
                    <span className="key-card-room">{roomCode}</span>
                    <span className="key-card-slot">ช่อง {slotNumber}</span>
                </div>
            </div>

            <div className={`key-card-status ${isAvailable ? 'status-available' : 'status-borrowed'}`}>
                {isAvailable ? 'ว่าง' : (currentBorrower ? `${currentBorrower.firstName} ${currentBorrower.lastName}` : 'ถูกเบิก')}
            </div>
        </button>
    );
}
