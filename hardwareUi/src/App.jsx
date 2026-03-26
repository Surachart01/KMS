import { useState, useEffect, useCallback } from 'react';
import { socket, getKeys, borrowKey, returnKey, identifyUser, transferKey, swapKey, moveKey } from './socket.js';
import Header from './components/Header.jsx';
import HomePage from './pages/HomePage.jsx';
import KeyListPage from './pages/KeyListPage.jsx';
import ScanWaitingPage from './pages/ScanWaitingPage.jsx';
import ConfirmIdentityPage from './pages/ConfirmIdentityPage.jsx';
import ReasonPage from './pages/ReasonPage.jsx';
import SuccessPage from './pages/SuccessPage.jsx';
import TransferConfirmPage from './pages/TransferConfirmPage.jsx';
import SwapConfirmPage from './pages/SwapConfirmPage.jsx';
import MoveConfirmPage from './pages/MoveConfirmPage.jsx';
import WaitForKeyReturnPage from './pages/WaitForKeyReturnPage.jsx';

/**
 * Flow การเบิกกุญแจ (Borrow):
 * Home → เลือกห้อง → ScanWaiting → ConfirmIdentity → (Reason?) → Success
 *
 * Flow การคืนกุญแจ (Return):
 * Home → ScanWaiting → ConfirmIdentity (แสดงห้องที่ต้องคืน) → Success
 *
 * Flow การย้ายสิทธิ์ (Transfer):
 * 1. Home → กด "ย้ายสิทธิ์"
 * 2. ScanWaiting (step=scan1) → สแกนคนที่ 1 (ผู้โอน)
 * 3. TransferConfirmPage (step=confirm1) → แสดง: "คนที่ 1 โอนห้อง [X]" → ยืนยัน
 * 4. ScanWaiting (step=scan2) → สแกนคนที่ 2 (ผู้รับ) → ตรวจคาบเรียน 30 นาที
 * 5. TransferConfirmPage (step=confirm2) → แสดงสรุป: [คนที่ 1] → ห้อง [X] → [คนที่ 2]
 * 6. ยืนยัน → key:transfer → Success / Error
 */
const IDLE_TIMEOUT_MS = 30000;

export default function App() {
    const [page, setPage] = useState('home');
    const [mode, setMode] = useState('borrow'); // 'borrow' | 'return' | 'transfer'
    const [connected, setConnected] = useState(socket.connected);
    const [hardwareStatus, setHardwareStatus] = useState({ ready: false, message: 'กำลังเชื่อมต่อระบบ...' });
    const [keys, setKeys] = useState([]);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [returningKey, setReturningKey] = useState(null);
    const [scannedUser, setScannedUser] = useState(null);
    const [borrowResult, setBorrowResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errorPopup, setErrorPopup] = useState(null);
    const [idleTimer, setIdleTimer] = useState(null);

    // ── Transfer-specific state ──
    const [transferStep, setTransferStep] = useState('scan1'); // 'scan1' | 'confirm1' | 'scan2' | 'confirm2'
    const [transferUser1, setTransferUser1] = useState(null);  // ผู้โอน (giver)
    const [transferRoom1, setTransferRoom1] = useState(null);  // ห้องของผู้โอน
    const [transferUser2, setTransferUser2] = useState(null);  // ผู้รับ (receiver)

    // ── Swap-specific state ──
    const [swapStep, setSwapStep] = useState('scan1');
    const [swapUser1, setSwapUser1] = useState(null);
    const [swapRoom1, setSwapRoom1] = useState(null);
    const [swapUser2, setSwapUser2] = useState(null);
    const [swapRoom2, setSwapRoom2] = useState(null);

    // ── Move-specific state ──
    const [moveStep, setMoveStep] = useState('scan');
    const [moveUser, setMoveUser] = useState(null);
    const [moveFromRoom, setMoveFromRoom] = useState(null);

    // ── Reset idle timer ──
    const resetIdleTimer = useCallback(() => {
        if (idleTimer) clearTimeout(idleTimer);
        if (page !== 'home') {
            const timer = setTimeout(() => goHome(), IDLE_TIMEOUT_MS);
            setIdleTimer(timer);
        }
    }, [page, idleTimer]);

    // ── Go home + clear all state ──
    const goHome = useCallback(() => {
        setPage('home');
        setMode('borrow');
        setSelectedRoom(null);
        setReturningKey(null);
        setScannedUser(null);
        setBorrowResult(null);
        setErrorPopup(null);
        setLoading(false);
        setTransferStep('scan1');
        setTransferUser1(null);
        setTransferRoom1(null);
        setTransferUser2(null);
        setSwapStep('scan1');
        setSwapUser1(null);
        setSwapRoom1(null);
        setSwapUser2(null);
        setSwapRoom2(null);
        setMoveStep('scan');
        setMoveUser(null);
        setMoveFromRoom(null);
    }, []);

    // ── Socket events ──
    useEffect(() => {
        function onConnect() { setConnected(true); }
        function onDisconnect() { setConnected(false); }

        function onBorrowCancelled(data) {
            console.log('❌ borrow:cancelled received in UI:', data);
            setErrorPopup(`หมดเวลาดึงกุญแจช่อง ${data.slotNumber}! การเบิกถูกยกเลิก (ข้อมูลถูกลบทิ้งแล้ว)`);
            goHome();
        }

        function onKeyPulled(data) {
            console.log('✅ key:pulled received in UI:', data);
            // ถ้าหน้า Success กำลังรออยู่ ให้มันจัดการตัวเองได้ 
            // หรือจะ goHome() ทันทีก็ได้ 
        }

        function onHardwareStatus(data) {
            console.log('🔌 Hardware status:', data);
            setHardwareStatus(data);
        }

        const onScanReceived = (data) => {
            console.log('😄 Scan received:', data);
            // Safety check: ensure we are on a page that expects a scan
            if (document.querySelector('.scan-page')) {
                handleScanProcess(data);
            }
        };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('scan:received', onScanReceived);
        socket.on('borrow:cancelled', onBorrowCancelled);
        socket.on('key:pulled', onKeyPulled);
        socket.on('hardware:status', onHardwareStatus);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('scan:received', onScanReceived);
            socket.off('borrow:cancelled', onBorrowCancelled);
            socket.off('key:pulled', onKeyPulled);
            socket.off('hardware:status', onHardwareStatus);
        };
    }, [handleScanProcess]); // Now depends on useCallback-wrapped handler

    // ── Handle Scan (Robust Processing) ──
    const handleScanProcess = useCallback(async (data) => {
        if (!data || !data.userId) {
            console.warn('⚠️ handleScanProcess: Invalid scan data received');
            return;
        }

        setScannedUser(data);

        if (mode === 'return') {
            setLoading(true);
            try {
                const res = await identifyUser(data.userId);
                if (res?.success && res.data?.activeBooking) {
                    setReturningKey(res.data.activeBooking);
                    setPage('confirmIdentity');
                } else {
                    setErrorPopup(res?.message || 'ไม่พบรายการกุญแจที่ต้องคืน หรือไม่พบผู้ใช้ในระบบ');
                }
            } catch (err) {
                console.error('❌ Return Scan Error:', err);
                setErrorPopup('เกิดข้อผิดพลาดในการตรวจสอบข้อมูลกุญแจ');
            } finally {
                setLoading(false);
            }

        } else if (mode === 'transfer') {
            handleTransferScan(data);
        } else if (mode === 'swap') {
            handleSwapScan(data);
        } else if (mode === 'move') {
            handleMoveScan(data);
        } else {
            // mode === 'borrow' 
            // Borrow doesn't need immediate identification, just proceeds to confirm
            setPage('confirmIdentity');
        }
    }, [mode, transferStep, swapStep, moveStep]); // Recreate when flow state changes

    // ── Transfer: รับผลสแกนแต่ละขั้น ──
    const handleTransferScan = useCallback(async (data) => {
        if (!data?.userId) return;

        if (transferStep === 'scan1') {
            setLoading(true);
            try {
                const res = await identifyUser(data.userId);
                if (res?.success) {
                    const rooms = res.data?.authorizedRooms || [];
                    const room = rooms.length > 0 ? rooms[0].roomCode : null;
                    setTransferUser1(data);
                    setTransferRoom1(room);
                    setTransferStep('confirm1');
                    setPage('transferConfirm');
                } else {
                    setErrorPopup(res?.message || 'ไม่พบผู้ใช้ในระบบ');
                }
            } catch (err) {
                console.error('❌ Transfer Scan Error:', err);
                setErrorPopup('เกิดข้อผิดพลาดในการตรวจสอบข้อมูล');
            } finally {
                setLoading(false);
            }
        } else if (transferStep === 'scan2') {
            setTransferUser2(data);
            setTransferStep('confirm2');
            setPage('transferConfirm');
        }
    }, [transferStep]);

    // ── Transfer: ยืนยันแต่ละขั้น ──
    const handleTransferConfirm = async () => {
        if (transferStep === 'confirm1') {
            // ยืนยันคนที่ 1 → ไปสแกนคนที่ 2
            setTransferStep('scan2');
            setPage('scanWaiting');

        } else if (transferStep === 'confirm2') {
            // ยืนยันการย้ายสิทธิ์
            if (!transferUser1?.userId || !transferUser2?.userId) {
                setErrorPopup('ข้อมูลไม่ครบถ้วน กรุณาเริ่มใหม่');
                return;
            }
            setLoading(true);
            try {
                const result = await transferKey(transferUser1.userId, transferUser2.userId);
                setBorrowResult(result);
                if (result?.success) {
                    setPage('success');
                } else {
                    setErrorPopup(result?.message || 'เกิดข้อผิดพลาดในการย้ายสิทธิ์');
                }
            } catch {
                setErrorPopup('เกิดข้อผิดพลาดในการเชื่อมต่อ');
            } finally {
                setLoading(false);
            }
        }
    };

    // ── Start Borrow ──
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
        } catch {
            setErrorPopup('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        } finally {
            setLoading(false);
        }
    };

    // ── Start Return ──
    const handleStartReturn = () => {
        setMode('return');
        setPage('scanWaiting');
    };

    // ── Start Transfer ──
    const handleStartTransfer = () => {
        setMode('transfer');
        setTransferStep('scan1');
        setTransferUser1(null);
        setTransferRoom1(null);
        setTransferUser2(null);
        setPage('scanWaiting');
    };

    // ── Start Swap ──
    const handleStartSwap = () => {
        setMode('swap');
        setSwapStep('scan1');
        setSwapUser1(null);
        setSwapRoom1(null);
        setSwapUser2(null);
        setSwapRoom2(null);
        setPage('scanWaiting');
    };

    // ── Start Move ──
    const handleStartMove = () => {
        setMode('move');
        setMoveStep('scan');
        setMoveUser(null);
        setMoveFromRoom(null);
        setPage('scanWaiting');
    };

    // ── Swap: รับผลสแกน ──
    const handleSwapScan = useCallback(async (data) => {
        if (!data?.userId) return;

        if (swapStep === 'scan1') {
            setLoading(true);
            try {
                const res = await identifyUser(data.userId);
                if (res?.success) {
                    const rooms = res.data?.authorizedRooms || [];
                    const room = rooms.length > 0 ? rooms[0].roomCode : null;
                    if (!room) {
                        setErrorPopup('ไม่พบสิทธิ์ห้องเรียนในขณะนี้');
                        return;
                    }
                    setSwapUser1(data);
                    setSwapRoom1(room);
                    setSwapStep('confirm1');
                    setPage('swapConfirm');
                } else {
                    setErrorPopup(res?.message || 'ไม่พบผู้ใช้ในระบบ');
                }
            } catch (err) {
                console.error('❌ Swap Scan Error:', err);
                setErrorPopup('เกิดข้อผิดพลาดในการตรวจสอบข้อมูล');
            } finally {
                setLoading(false);
            }
        } else if (swapStep === 'scan2') {
            setLoading(true);
            try {
                const res = await identifyUser(data.userId);
                if (res?.success) {
                    const rooms = res.data?.authorizedRooms || [];
                    const room = rooms.length > 0 ? rooms[0].roomCode : null;
                    if (!room) {
                        setErrorPopup('คนที่ 2 ไม่มีสิทธิ์ห้องเรียนในขณะนี้');
                        return;
                    }
                    if (room === swapRoom1) {
                        setErrorPopup('ไม่สามารถสลับกับห้องตัวเองได้ (ห้องเดียวกัน)');
                        return;
                    }
                    setSwapUser2(data);
                    setSwapRoom2(room);
                    setSwapStep('confirm2');
                    setPage('swapConfirm');
                } else {
                    setErrorPopup(res?.message || 'ไม่พบผู้ใช้ในระบบ');
                }
            } catch (err) {
                console.error('❌ Swap Scan 2 Error:', err);
                setErrorPopup('เกิดข้อผิดพลาดในการตรวจสอบข้อมูล');
            } finally {
                setLoading(false);
            }
        }
    }, [swapStep, swapRoom1]);

    // ── Swap: ยืนยัน ──
    const handleSwapConfirm = async () => {
        if (swapStep === 'confirm1') {
            setSwapStep('scan2');
            setPage('scanWaiting');
        } else if (swapStep === 'confirm2') {
            if (!swapUser1?.userId || !swapUser2?.userId) {
                setErrorPopup('ข้อมูลไม่ครบถ้วน กรุณาเริ่มใหม่');
                return;
            }
            setLoading(true);
            try {
                const result = await swapKey(swapUser1.userId, swapRoom1, swapUser2.userId, swapRoom2);
                setBorrowResult(result);
                if (result?.success) {
                    setPage('success');
                } else {
                    setErrorPopup(result?.message || 'เกิดข้อผิดพลาดในการสลับสิทธิ์');
                }
            } catch {
                setErrorPopup('เกิดข้อผิดพลาดในการเชื่อมต่อ');
            } finally {
                setLoading(false);
            }
        }
    };

    // ── Move: รับผลสแกน ──
    const handleMoveScan = useCallback(async (data) => {
        if (!data?.userId) return;
        if (moveStep === 'scan') {
            setLoading(true);
            try {
                const res = await identifyUser(data.userId);
                if (res?.success) {
                    const rooms = res.data?.authorizedRooms || [];
                    const room = rooms.length > 0 ? rooms[0].roomCode : null;
                    if (!room) {
                        setErrorPopup('ไม่พบสิทธิ์ห้องเรียนในขณะนี้ ไม่สามารถย้ายสิทธิ์ได้');
                        return;
                    }
                    setMoveUser(data);
                    setMoveFromRoom(room);

                    // ไปหน้าเลือกห้อง
                    const resKeys = await getKeys();
                    if (resKeys?.success) {
                        setKeys(resKeys.data || []);
                        setMoveStep('selectRoom');
                        setPage('keyList');
                    } else {
                        setErrorPopup('ไม่สามารถดึงข้อมูลกุญแจได้');
                    }
                } else {
                    setErrorPopup(res?.message || 'ไม่พบผู้ใช้ในระบบ');
                }
            } catch (err) {
                console.error('❌ Move Scan Error:', err);
                setErrorPopup('เกิดข้อผิดพลาดในการตรวจสอบข้อมูล');
            } finally {
                setLoading(false);
            }
        }
    }, [moveStep]);

    // ── Move: Select Room ──
    const handleMoveRoomSelect = (roomCode) => {
        if (roomCode === moveFromRoom) {
            setErrorPopup('กรุณาเลือกห้องอื่นที่ไม่ใช่ห้องเดิม');
            return;
        }
        setSelectedRoom(roomCode);
        setMoveStep('confirm');
        setPage('moveConfirm');
    };

    // ── Move: Confirm ──
    const handleMoveConfirm = async () => {
        setLoading(true);
        try {
            const result = await moveKey(moveUser.userId, moveFromRoom, selectedRoom);
            setBorrowResult(result);
            if (result?.success) {
                setPage('success');
            } else {
                setErrorPopup(result?.message || 'เกิดข้อผิดพลาดในการย้ายสิทธิ์');
            }
        } catch {
            setErrorPopup('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        } finally {
            setLoading(false);
        }
    };

    // ── Select Room (borrow / move) ──
    const handleSelectRoom = (roomCode) => {
        if (mode === 'move') {
            handleMoveRoomSelect(roomCode);
        } else {
            setSelectedRoom(roomCode);
            setPage('scanWaiting');
        }
    };

    // ── Confirm Identity (borrow/return) ──
    const handleConfirmIdentity = async () => {
        if (!scannedUser?.userId) return;
        setLoading(true);
        try {
            if (mode === 'return') {
                setPage('waitForKeyReturn');
            } else {
                if (!selectedRoom) return;
                const result = await borrowKey(scannedUser.userId, selectedRoom);
                setBorrowResult(result);
                if (result?.success) {
                    setPage('success');
                } else if (result?.error_code === 'REQUIRE_REASON') {
                    setPage('reason');
                } else {
                    setErrorPopup(result?.message || 'ไม่มีสิทธิ์ในการเบิกกุญแจ');
                }
            }
        } catch {
            setErrorPopup('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        } finally {
            setLoading(false);
        }
    };

    // ── Final Return (After Physical Key Detected) ──
    const handleFinalReturn = async () => {
        if (!scannedUser?.userId) return;
        setLoading(true);
        try {
            const result = await returnKey(scannedUser.userId);
            setBorrowResult(result);
            if (result?.success) {
                setPage('success');
            } else {
                setErrorPopup(result?.message || 'เกิดข้อผิดพลาดในการคืนกุญแจในระบบ');
                goHome();
            }
        } catch {
            setErrorPopup('เกิดข้อผิดพลาดในการเชื่อมต่อ (Return)');
        } finally {
            setLoading(false);
        }
    };

    // ── Reason Submit (borrow) ──
    const handleReasonSubmit = async (reason, returnByTime) => {
        if (!scannedUser?.userId || !selectedRoom) return;
        setLoading(true);
        try {
            const result = await borrowKey(scannedUser.userId, selectedRoom, reason, returnByTime);
            setBorrowResult(result);
            if (result?.success) {
                setPage('success');
            } else {
                setErrorPopup(result?.message || 'เกิดข้อผิดพลาด');
            }
        } catch {
            setErrorPopup('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        } finally {
            setLoading(false);
        }
    };

    const handleTestScan = (studentId) => handleScanProcess({ userId: studentId });
    const closePopup = () => setErrorPopup(null);

    return (
        <div className="app" onClick={resetIdleTimer}>
            <Header connected={connected} onHomeClick={goHome} />

            <main className="main-content">
                {page === 'home' && (
                    <HomePage
                        onBorrow={handleStartBorrow}
                        onReturn={handleStartReturn}
                        onTransfer={handleStartTransfer}
                        onSwap={handleStartSwap}
                        onMove={handleStartMove}
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
                        mode={mode}
                        transferStep={transferStep}
                        swapStep={swapStep}
                        moveStep={moveStep}
                        roomCode={selectedRoom}
                        onCancel={goHome}
                        onTestScan={handleTestScan}
                    />
                )}

                {page === 'confirmIdentity' && (
                    <ConfirmIdentityPage
                        mode={mode}
                        user={scannedUser}
                        roomCode={mode === 'borrow' ? selectedRoom : returningKey?.roomCode}
                        onConfirm={handleConfirmIdentity}
                        onCancel={goHome}
                        loading={loading}
                    />
                )}

                {page === 'transferConfirm' && (
                    <TransferConfirmPage
                        step={transferStep}
                        user1={transferUser1}
                        roomCode1={transferRoom1}
                        user2={transferUser2}
                        onConfirm={handleTransferConfirm}
                        onCancel={goHome}
                        loading={loading}
                    />
                )}

                {page === 'swapConfirm' && (
                    <SwapConfirmPage
                        step={swapStep}
                        user1={swapUser1}
                        roomCode1={swapRoom1}
                        user2={swapUser2}
                        roomCode2={swapRoom2}
                        onConfirm={handleSwapConfirm}
                        onCancel={goHome}
                        loading={loading}
                    />
                )}

                {page === 'moveConfirm' && (
                    <MoveConfirmPage
                        user={moveUser}
                        fromRoom={moveFromRoom}
                        toRoom={selectedRoom}
                        onConfirm={handleMoveConfirm}
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

                {page === 'waitForKeyReturn' && (
                    <WaitForKeyReturnPage
                        booking={returningKey}
                        onKeyDetected={handleFinalReturn}
                        onCancel={goHome}
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
                        <button className="btn btn-primary" onClick={closePopup}>ตกลง</button>
                    </div>
                </div>
            )}

            {/* ── Hardware Initialization Overlay ── */}
            {(!hardwareStatus.ready || !connected) && (
                <div className="hardware-init-overlay">
                    <div className="init-content">
                        <div className="init-spinner">
                            <div className="spinner-ring"></div>
                            <div className="spinner-center">
                                <span className="init-percentage">
                                    {connected ? (hardwareStatus.attempt || 1) * 20 : '0'}%
                                </span>
                            </div>
                        </div>
                        <h2 className="init-title">
                            {!connected ? 'กำลังเชื่อมต่อ Server...' : 'กำลังเริ่มต้นระบบ...'}
                        </h2>
                        <p className="init-status">
                            {hardwareStatus.message}
                        </p>
                        {hardwareStatus.attempt > 0 && (
                            <div className="init-progress-track">
                                <div 
                                    className="init-progress-fill" 
                                    style={{ width: `${(hardwareStatus.attempt / (hardwareStatus.maxAttempts || 5)) * 100}%` }}
                                ></div>
                            </div>
                        )}
                        <p className="init-subtext">กรุณารอสักครู่ ระบบกำลังสื่อสารกับตู้กุญแจ</p>
                    </div>
                </div>
            )}
        </div>
    );
}
