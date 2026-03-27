import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Home, Calendar, Hash } from 'lucide-react';

/**
 * หน้าสำเร็จ — แสดงผลเบิก/คืน พร้อม countdown กลับหน้าหลัก
 */
const COUNTDOWN_SEC = 8;

export default function SuccessPage({ result, onHome }) {
    const [countdown, setCountdown] = useState(COUNTDOWN_SEC);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onHome();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [onHome]);

    const isSuccess = result?.success;

    return (
        <div className="page success-page anim-fade-in">
            <div className={`success-icon-wrapper ${isSuccess ? 'success' : 'error'}`}>
                {isSuccess ? (
                    <CheckCircle size={60} strokeWidth={2} className="success-icon" />
                ) : (
                    <XCircle size={60} strokeWidth={2} className="success-icon" />
                )}
            </div>

            <h2 className="success-title">
                {isSuccess ? 'ทำรายการสำเร็จ!' : 'ขออภัย ทำรายการไม่สำเร็จ'}
            </h2>

            <p className="success-message">
                {result?.message || 'ดำเนินการเรียบร้อย'}
            </p>

            {result?.data && (
                <div className="success-details glass">
                    {result.data.roomCode && (
                        <div className="success-detail">
                            <Calendar size={20} className="text-primary" />
                            <span>ห้อง:</span>
                            <strong>{result.data.roomCode}</strong>
                        </div>
                    )}
                    {result.data.keySlotNumber && (
                        <div className="success-detail">
                            <Hash size={20} className="text-primary" />
                            <span>ช่องที่:</span>
                            <strong>{result.data.keySlotNumber}</strong>
                        </div>
                    )}
                </div>
            )}

            <div className="success-countdown">
                ระบบจะกลับหน้าหลักอัตโนมัติใน {countdown} วินาที
            </div>

            <button className="btn btn-primary btn-lg" onClick={onHome} style={{ minWidth: '240px' }}>
                <Home size={22} /> กลับหน้าหลัก
            </button>
        </div>
    );
}
