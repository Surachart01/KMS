import { useEffect, useState } from 'react';
import { socket } from '../socket.js';

export default function WaitForKeyReturnPage({ booking, onKeyDetected, onCancel }) {
    const [timeLeft, setTimeLeft] = useState(60); // 60 seconds timeout

    useEffect(() => {
        // Start LED blinking on the target slot
        socket.emit('led:blink-return', { slotNumber: booking.slotNumber });

        // Listen for NFC tag from Hardware
        const handleNfcTag = (data) => {
            console.log('📥 WaitForKeyReturnPage: nfc:tag received:', data);
            // Verify if it's the correct slot
            if (data.slotNumber === booking.slotNumber) {
                console.log('✅ Correct slot detected. Finalizing return...');
                // Stop blinking - key returned successfully
                socket.emit('led:stop-blink', { slotNumber: booking.slotNumber, keyReturned: true });
                onKeyDetected();
            }
        };

        socket.on('nfc:tag', handleNfcTag);

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
            clearInterval(timer);
        };
    }, [booking, onKeyDetected, onCancel]);

    return (
        <div className="page wait-key-page">
            <div className="wait-key-card modern-card anim-fade-in">
                <div className="wait-key-icon-container">
                    <div className="nfc-pulse-ring"></div>
                    <span className="wait-key-icon">📥</span>
                </div>
                
                <h2 className="wait-key-title">กรุณาเสียบกุญแจคืน</h2>
                <div className="wait-key-slot-badge">
                    ช่องหมายเลข <span className="slot-number">{booking.slotNumber}</span>
                </div>
                <p className="wait-key-subtitle">
                    ห้อง {booking.roomCode}
                </p>

                <div className="wait-key-instruction">
                    <p>ระบบกำลังรอตรวจจับกุญแจคอนโซล...</p>
                    <div className="progress-bar-container">
                        <div className="progress-bar-fill" style={{ width: `${(timeLeft / 60) * 100}%` }}></div>
                    </div>
                    <p className="timeout-text">เหลือเวลา {timeLeft} วินาที</p>
                </div>

                <button className="btn btn-secondary btn-lg" onClick={onCancel}>
                    ยกเลิก / กลับหน้าหลัก
                </button>
            </div>

            {/* Simulated hardware detection for testing */}
            <div className="test-scan-buttons" style={{ marginTop: '20px', opacity: 0.5 }}>
                <p>🧪 ทดสอบ (จำลองเซนเซอร์)</p>
                <button 
                    className="btn btn-test" 
                    onClick={() => socket.emit('nfc:tag', { slotNumber: booking.slotNumber, uid: 'TEST' })}
                >
                    จำลองการเสียบกุญแจช่อง {booking.slotNumber}
                </button>
            </div>
        </div>
    );
}
