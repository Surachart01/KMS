import { useRef } from 'react';
import KeyCard from '../components/KeyCard.jsx';
import { ChevronUp, ChevronDown, ArrowLeft } from 'lucide-react';

/**
 * หน้ารายการกุญแจ — แสดงกุญแจทั้งหมดให้เลือก
 */
export default function KeyListPage({ keys, onSelectRoom, onCancel, loading }) {
    const availableKeys = keys.filter(k => k.isAvailable);
    const borrowedKeys = keys.filter(k => !k.isAvailable);
    
    const gridRef = useRef(null);

    const scrollUp = () => {
        if (gridRef.current) {
            gridRef.current.scrollBy({ top: -250, behavior: 'smooth' });
        }
    };

    const scrollDown = () => {
        if (gridRef.current) {
            gridRef.current.scrollBy({ top: 250, behavior: 'smooth' });
        }
    };

    return (
        <div className="page keylist-page">
            <h2 className="keylist-title">เลือกห้องที่ต้องการเบิกกุญแจ</h2>

            <div style={{ display: 'flex', gap: '20px', width: '100%', alignItems: 'stretch' }}>
                {/* ── Room Grid Area ── */}
                <div 
                    className="keylist-grid" 
                    ref={gridRef} 
                    style={{ 
                        flex: 1, 
                        overflowY: 'hidden', /* Disable touch scroll to rely on buttons */
                        maxHeight: '55vh',
                        padding: '10px'
                    }}
                >
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

                {/* ── Scroll Controls ── */}
                <div className="scroll-controls" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '20px' }}>
                    <button 
                        className="btn btn-secondary" 
                        onClick={scrollUp} 
                        style={{ padding: '24px', borderRadius: '24px', touchAction: 'manipulation' }}
                        aria-label="Scroll Up"
                    >
                        <ChevronUp size={48} strokeWidth={3} />
                    </button>
                    <button 
                        className="btn btn-secondary" 
                        onClick={scrollDown} 
                        style={{ padding: '24px', borderRadius: '24px', touchAction: 'manipulation' }}
                        aria-label="Scroll Down"
                    >
                        <ChevronDown size={48} strokeWidth={3} />
                    </button>
                </div>
            </div>

            {keys.length === 0 && (
                <p className="keylist-empty">ไม่พบข้อมูลกุญแจ</p>
            )}

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
                <button className="btn btn-secondary btn-lg" onClick={onCancel} disabled={loading}>
                    <ArrowLeft size={28} style={{ marginRight: '10px' }} />
                    ย้อนกลับหน้าหลัก
                </button>
            </div>

            {loading && <div className="loading-bar"></div>}
        </div>
    );
}
