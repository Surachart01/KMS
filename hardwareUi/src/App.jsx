import { useState, useEffect, useCallback } from 'react';
import { socket, getKeys, borrowKey, returnKey, identifyUser } from './socket.js';
import Header from './components/Header.jsx';
import HomePage from './pages/HomePage.jsx';
import KeyListPage from './pages/KeyListPage.jsx';
import ScanWaitingPage from './pages/ScanWaitingPage.jsx';
import ConfirmIdentityPage from './pages/ConfirmIdentityPage.jsx';
import ReasonPage from './pages/ReasonPage.jsx';
import SuccessPage from './pages/SuccessPage.jsx';

/**
 * Flow การเบิกกุญแจ (Borrow):
 * 1. Home -> กด "เบิกกุญแจ" -> KeyList (เลือกห้อง)
 * 2. ScanWaiting -> สแกนหน้า
 * 3. ConfirmIdentity (แสดงรหัส + ห้อง) -> กดยืนยัน
 * 4. ตรวจสิทธิ์ / Reason -> Unlock -> Success
 *
 * Flow การคืนกุญแจ (Return):
 * 1. Home -> กด "คืนกุญแจ"
 * 2. ScanWaiting -> สแกนหน้า
 * 3. ตรวจสอบกุญแจค้าง (identifyUser)
 * 4. ConfirmIdentity (แสดงรหัส + ห้องที่ต้องคืน) -> กดยืนยัน
 * 5. Unlock -> Success
 */
const IDLE_TIMEOUT_MS = 30000;

export default function App() {
    const [page, setPage] = useState('home');
    const [mode, setMode] = useState('borrow'); // 'borrow' | 'return'
    const [connected, setConnected] = useState(socket.connected);
    const [keys, setKeys] = useState([]);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [returningKey, setReturningKey] = useState(null);
    const [scannedUser, setScannedUser] = useState(null);
    const [borrowResult, setBorrowResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errorPopup, setErrorPopup] = useState(null);
    const [idleTimer, setIdleTimer] = useState(null);

    // ── Reset idle timer ──
    const resetIdleTimer = useCallback(() => {
        if (idleTimer) clearTimeout(idleTimer);
        if (page !== 'home') {
            const timer = setTimeout(() => goHome(), IDLE_TIMEOUT_MS);
            setIdleTimer(timer);
        }
    }, [page, idleTimer]);

    // ── Go home + clear state ──
    const goHome = useCallback(() => {
        setPage('home');
        setMode('borrow');
        setSelectedRoom(null);
        setReturningKey(null);
        setScannedUser(null);
        setBorrowResult(null);
        setErrorPopup(null);
        setLoading(false);
    }, []);

    // ── Socket events ──
    useEffect(() => {
        function onConnect() { setConnected(true); }
        function onDisconnect() { setConnected(false); }

        function onScanReceived(data) {
            console.log('😄 Scan received:', data);

            // เฉพาะตอนอยู่หน้ารอ scan เท่านั้น
            if (document.querySelector('.scan-page')) {
                handleScanProcess(data);
            }
        }

        function onSlotUnlocked(data) {
            console.log('⚡ Slot unlocked:', data);
        }

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('scan:received', onScanReceived);
        socket.on('slot:unlocked', onSlotUnlocked);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('scan:received', onScanReceived);
            socket.off('slot:unlocked', onSlotUnlocked);
        };
    }, [mode, page]); // Re-bind when mode changes to capture correct mode in closure

    // ── Handle Scan Logic ──
    const handleScanProcess = async (data) => {
        setScannedUser(data);

        if (mode === 'return') {
            setLoading(true);
            try {
                // ตรวจสอบว่า user นี้มีกุญแจค้างอยู่ไหม
                const res = await identifyUser(data.userId);
                if (res?.success && res.data?.activeBooking) {
                    setReturningKey(res.data.activeBooking);
                    setPage('confirmIdentity');
                } else {
                    setErrorPopup('ไม่พบรายการกุญแจที่ต้องคืน หรือไม่พบผู้ใช้ในระบบ');
                    // อยู่หน้าเดิม (scanWaiting)
                }
            } catch (err) {
                setErrorPopup('เกิดข้อผิดพลาดในการตรวจสอบข้อมูล');
            } finally {
                setLoading(false);
            }
        } else {
            // mode === 'borrow'
            // ไปหน้า confirm ได้เลย เพราะเลือกห้องมาแล้ว
            setPage('confirmIdentity');
        }
    };

    // ── Step 1 (Borrow): กดเบิกกุญแจ ──
    const handleStartBorrow = async () => {
        setMode('borrow');
        setLoading(true);
        try {
            const res = await getKeys();
            if (res?.success) {
                setKeys(res.data || []);
                setPage('keyList');
            } else {
                setErrorPopup('ไม่สามารถดึงข้อมูลกุญแจได้');
            }
        } catch (err) {
            setErrorPopup('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        } finally {
            setLoading(false);
        }
    };

    // ── Step 1 (Return): กดคืนกุญแจ ──
    const handleStartReturn = () => {
        setMode('return');
        setPage('scanWaiting');
    };

    // ── Step 2 (Borrow): เลือกห้อง ──
    const handleSelectRoom = (roomCode) => {
        setSelectedRoom(roomCode);
        setPage('scanWaiting');
    };

    // ── Step 4: กดยืนยันตัวตน ──
    const handleConfirmIdentity = async () => {
        if (!scannedUser?.userId) return;
        setLoading(true);

        try {
            if (mode === 'return') {
                // --- Flow คืนกุญแจ ---
                const result = await returnKey(scannedUser.userId);
                setBorrowResult(result);

                if (result?.success) {
                    setPage('success');
                } else {
                    setErrorPopup(result?.message || 'เกิดข้อผิดพลาดในการคืนกุญแจ');
                }

            } else {
                // --- Flow เบิกกุญแจ ---
                if (!selectedRoom) return;
                const result = await borrowKey(scannedUser.userId, selectedRoom);
                setBorrowResult(result);

                if (result?.success) {
                    setPage('success');
                } else if (result?.error_code === 'REQUIRE_REASON') {
                    // ต้องระบุเหตุผล (ไม่มีสิทธิ์ตามตาราง)
                    setPage('reason');
                } else {
                    setErrorPopup(result?.message || 'ไม่มีสิทธิ์ในการเบิกกุญแจ');
                }
            }
        } catch (err) {
            setErrorPopup('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        } finally {
            setLoading(false);
        }
    };

    // ── Step 5 (Borrow): ส่งเหตุผล ──
    const handleReasonSubmit = async (reason) => {
        if (!scannedUser?.userId || !selectedRoom) return;
        setLoading(true);
        try {
            const result = await borrowKey(scannedUser.userId, selectedRoom, reason);
            setBorrowResult(result);
            if (result?.success) {
                setPage('success');
            } else {
                setErrorPopup(result?.message || 'เกิดข้อผิดพลาด');
            }
        } catch (err) {
            setErrorPopup('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        } finally {
            setLoading(false);
        }
    };

    // ── Helper for test scan buttons ──
    const handleTestScan = (studentId) => {
        console.log('🧪 Test scan:', studentId);
        handleScanProcess({ userId: studentId });
    };

    const closePopup = () => setErrorPopup(null);

    // ── Render ──
    return (
        <div className="app" onClick={resetIdleTimer}>
            <Header connected={connected} onHomeClick={goHome} />

            <main className="main-content">
                {page === 'home' && (
                    <HomePage
                        onBorrow={handleStartBorrow}
                        onReturn={handleStartReturn} // ส่ง prop onReturn
                        loading={loading}
                    />
                )}

                {page === 'keyList' && (
                    <KeyListPage
                        keys={keys}
                        onSelectRoom={handleSelectRoom}
                        onCancel={goHome}
                        loading={loading}
                    />
                )}

                {page === 'scanWaiting' && (
                    <ScanWaitingPage
                        mode={mode} // 'borrow' | 'return'
                        roomCode={selectedRoom}
                        onCancel={goHome}
                        onTestScan={handleTestScan}
                    />
                )}

                {page === 'confirmIdentity' && (
                    <ConfirmIdentityPage
                        mode={mode} // 'borrow' | 'return'
                        user={scannedUser}
                        roomCode={mode === 'borrow' ? selectedRoom : returningKey?.roomCode}
                        onConfirm={handleConfirmIdentity}
                        onCancel={goHome}
                        loading={loading}
                    />
                )}

                {page === 'reason' && (
                    <ReasonPage
                        roomCode={selectedRoom}
                        onSubmit={handleReasonSubmit}
                        onCancel={goHome}
                        loading={loading}
                    />
                )}

                {page === 'success' && (
                    <SuccessPage
                        result={borrowResult}
                        onHome={goHome}
                    />
                )}
            </main>

            {errorPopup && (
                <div className="popup-overlay" onClick={closePopup}>
                    <div className="popup-card" onClick={(e) => e.stopPropagation()}>
                        <div className="popup-icon">⚠️</div>
                        <p className="popup-message">{errorPopup}</p>
                        <button className="btn btn-primary" onClick={closePopup}>
                            ตกลง
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
