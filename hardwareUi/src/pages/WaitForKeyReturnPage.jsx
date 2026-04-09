import { useEffect, useState } from 'react';
import { socket } from '../socket.js';
import { ArrowDownToLine, AlertTriangle } from 'lucide-react';

export default function WaitForKeyReturnPage({ booking, onKeyDetected, onCancel }) {
    const [timeLeft, setTimeLeft] = useState(60); // 60 seconds timeout
    const [wrongSlotAlert, setWrongSlotAlert] = useState(null);

    useEffect(() => {
        // Start LED blinking on the target slot
        socket.emit('led:blink-return', { slotNumber: booking.slotNumber });

        // Listen for NFC tag from Hardware
        const handleNfcTag = (data) => {
            console.log('📥 WaitForKeyReturnPage: nfc:tag received:', data);
            // Verify if it's the correct slot
            if (data.slotNumber === booking.slotNumber) {
                console.log('✅ Correct slot detected. Finalizing return...');
                setWrongSlotAlert(null);
                // Stop blinking - key returned successfully
                socket.emit('led:stop-blink', { slotNumber: booking.slotNumber, keyReturned: true });
                onKeyDetected();
            }
        };

        // Listen for wrong slot insertion
        const handleWrongSlot = (data) => {
            console.log('⚠️ WaitForKeyReturnPage: key:wrong-slot received:', data);
            setWrongSlotAlert({
                insertedSlot: data.slotNumber,
                expectedSlot: booking.slotNumber,
                uid: data.uid,
                expectedUid: data.expectedUid,
            });
            // Reset timer — give user more time after showing alert
            setTimeLeft(60);
        };

        socket.on('nfc:tag', handleNfcTag);
        socket.on('key:wrong-slot', handleWrongSlot);

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    // Stop blinking - timeout
                    socket.emit('led:stop-blink', { slotNumber: booking.slotNumber, keyReturned: false });
                    onCancel(); // Timeout -> Go home
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            // Cleanup: stop blink if component unmounts (e.g. user cancels)
            socket.emit('led:stop-blink', { slotNumber: booking.slotNumber, keyReturned: false });
            socket.off('nfc:tag', handleNfcTag);
            socket.off('key:wrong-slot', handleWrongSlot);
            clearInterval(timer);
        };
    }, [booking, onKeyDetected, onCancel]);

    return (
        <div className="page wait-key-page">
            <div className="wait-key-card glass anim-fade-in">
                <div className="wait-key-icon-container">
                    <div className="nfc-pulse-ring"></div>
                    <ArrowDownToLine className="wait-key-icon" size={42} strokeWidth={1.5} />
                </div>
                
                <h2 className="wait-key-title">กรุณาเสียบกุญแจคืน</h2>
                <div className="wait-key-slot-badge">
                    ช่องหมายเลข <span className="slot-number">{booking.slotNumber}</span>
                </div>
                <p className="wait-key-subtitle">
                    ห้อง {booking.roomCode}
                </p>

                {/* Wrong slot alert */}
                {wrongSlotAlert && (
                    <div className="wrong-slot-alert" style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '2px solid #ef4444',
                        borderRadius: '12px',
                        padding: '16px',
                        margin: '16px 0',
                        textAlign: 'center',
                        animation: 'shake 0.5s ease-in-out',
                    }}>
                        <AlertTriangle size={32} color="#ef4444" style={{ marginBottom: '8px' }} />
                        <p style={{ color: '#ef4444', fontWeight: 700, fontSize: '1.1rem', margin: '4px 0' }}>
                            ⚠️ เสียบกุญแจผิดช่อง!
                        </p>
                        <p style={{ color: '#fca5a5', fontSize: '0.95rem' }}>
                            คุณเสียบในช่อง <strong>{wrongSlotAlert.insertedSlot}</strong> 
                            {' '}กรุณาดึงออก แล้วเสียบในช่อง <strong style={{ color: '#22c55e', fontSize: '1.2rem' }}>{wrongSlotAlert.expectedSlot}</strong>
                        </p>
                    </div>
                )}

                <div className="wait-key-instruction">
                    <p>ระบบกำลังรอตรวจจับกุญแจคอนโซล...</p>
                    <div className="progress-bar-container">
                        <div className="progress-bar-fill" style={{ width: `${(timeLeft / 60) * 100}%` }}></div>
                    </div>
                    <p className="timeout-text">เหลือเวลา {timeLeft} วินาที</p>
                </div>

                <div className="flex gap-4">
                    <button className="btn btn-secondary btn-lg w-full" onClick={onCancel}>
                        ยกเลิก / กลับหน้าหลัก
                    </button>
                </div>
            </div>
        </div>
    );
}
