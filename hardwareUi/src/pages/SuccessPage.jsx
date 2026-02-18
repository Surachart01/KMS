import { useEffect, useState } from 'react';

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
        <div className="page success-page">
            <div className={`success-icon-wrapper ${isSuccess ? 'success' : 'error'}`}>
                <span className="success-icon">{isSuccess ? '✅' : '❌'}</span>
            </div>

            <h2 className="success-title">
                {isSuccess ? 'สำเร็จ!' : 'ไม่สำเร็จ'}
            </h2>

            <p className="success-message">
                {result?.message || 'ดำเนินการเรียบร้อย'}
            </p>

            {result?.data && (
                <div className="success-details">
                    {result.data.roomCode && (
                        <div className="success-detail">
                            <span>ห้อง:</span>
                            <strong>{result.data.roomCode}</strong>
                        </div>
                    )}
                    {result.data.keySlotNumber && (
                        <div className="success-detail">
                            <span>ช่อง:</span>
                            <strong>{result.data.keySlotNumber}</strong>
                        </div>
                    )}
                </div>
            )}

            <div className="success-countdown">
                กลับหน้าหลักใน {countdown} วินาที
            </div>

            <button className="btn btn-primary" onClick={onHome}>
                กลับหน้าหลัก
            </button>
        </div>
    );
}
