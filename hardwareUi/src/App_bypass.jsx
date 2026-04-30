// ==========================================
// SCREENSHOT BYPASS MODE - FOR DOCUMENTATION
// ==========================================
import { useState } from 'react';
import Header from './components/Header.jsx';
import HomePage from './pages/HomePage.jsx';
import KeyListPage from './pages/KeyListPage.jsx';
import ScanWaitingPage from './pages/ScanWaitingPage.jsx';
import ConfirmIdentityPage from './pages/ConfirmIdentityPage.jsx';
import ReasonPage from './pages/ReasonPage.jsx';
import SuccessPage from './pages/SuccessPage.jsx';
import WaitForKeyReturnPage from './pages/WaitForKeyReturnPage.jsx';
import SwapConfirmPage from './pages/SwapConfirmPage.jsx';
import TransferConfirmPage from './pages/TransferConfirmPage.jsx';

// ── Mock Data ──────────────────────────────────────────────────
const MOCK_KEYS = [
  { roomCode: '52-213', slotNumber: 1, status: 'available', nfcUid: 'mock1', isActive: true },
  { roomCode: '52-511', slotNumber: 2, status: 'borrowed', nfcUid: 'mock2', isActive: true },
  { roomCode: '52-702', slotNumber: 3, status: 'available', nfcUid: 'mock3', isActive: true },
  { roomCode: '52-802', slotNumber: 4, status: 'available', nfcUid: 'mock4', isActive: true },
];

const MOCK_USER = {
  userId: 'usr-001',
  studentCode: '6702041510181',
  firstName: 'สุรชาติ',
  lastName: 'ลิ้มรัตนพันธ์',
  role: 'STUDENT',
  score: 100,
};

const MOCK_USER2 = {
  userId: 'usr-002',
  studentCode: '6702041510182',
  firstName: 'ปิยะพงษ์',
  lastName: 'ยะจันโก',
  role: 'STUDENT',
  score: 95,
};

const MOCK_BOOKING = {
  id: 'bk-001',
  roomCode: '52-213',
  slotNumber: 1,
  borrowAt: new Date().toISOString(),
  dueAt: new Date(Date.now() + 3600000).toISOString(),
};

const MOCK_BORROW_RESULT = {
  success: true,
  message: 'ทำรายการสำเร็จ',
  data: {
    roomCode: '52-213',
    keySlotNumber: 1,
    booking: {
      id: 'bk-001',
      roomCode: '52-213',
      slotNumber: 1,
      borrowAt: new Date().toISOString(),
      dueAt: new Date(Date.now() + 3600000).toISOString(),
      user: MOCK_USER,
    }
  }
};

// ── All pages list ─────────────────────────────────────────────
const PAGES = [
  'home',
  'keyList',
  'scanWaiting',
  'confirmIdentity',
  'reason',
  'waitForKeyReturn',
  'swapConfirm',
  'transferConfirm',
  'success',
];

export default function App() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const page = PAGES[currentIdx];

  const noop = () => {};

  return (
    <div className="app" style={{ position: 'relative' }}>
      {/* ── Page Switcher (for manual testing) ── */}
      <div style={{
        position: 'fixed', bottom: 12, right: 12, zIndex: 9999,
        display: 'flex', gap: 6,
      }}>
        <button
          onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
          style={{ padding: '6px 14px', borderRadius: 8, background: '#334155', color: '#fff', border: 'none', cursor: 'pointer' }}
        >◀ prev</button>
        <span style={{ padding: '6px 10px', background: '#1e293b', color: '#94a3b8', borderRadius: 8, fontSize: 12 }}>
          {page} ({currentIdx + 1}/{PAGES.length})
        </span>
        <button
          onClick={() => setCurrentIdx(i => Math.min(PAGES.length - 1, i + 1))}
          style={{ padding: '6px 14px', borderRadius: 8, background: '#334155', color: '#fff', border: 'none', cursor: 'pointer' }}
        >next ▶</button>
      </div>

      <Header connected={true} onHomeClick={() => setCurrentIdx(0)} />

      <main className="main-content">
        {page === 'home' && (
          <HomePage
            onBorrow={() => setCurrentIdx(1)}
            onReturn={noop}
            onTransfer={noop}
            onSwap={noop}
            onMove={noop}
            loading={false}
          />
        )}

        {page === 'keyList' && (
          <KeyListPage
            keys={MOCK_KEYS}
            onSelectRoom={noop}
            onCancel={() => setCurrentIdx(0)}
            loading={false}
          />
        )}

        {page === 'scanWaiting' && (
          <ScanWaitingPage
            mode="borrow"
            transferStep="scan1"
            swapStep="scan1"
            moveStep="scan"
            roomCode="52-213"
            onCancel={() => setCurrentIdx(0)}
          />
        )}

        {page === 'confirmIdentity' && (
          <ConfirmIdentityPage
            mode="borrow"
            user={MOCK_USER}
            roomCode="52-213"
            onConfirm={noop}
            onCancel={() => setCurrentIdx(0)}
            loading={false}
          />
        )}

        {page === 'reason' && (
          <ReasonPage
            roomCode="52-213"
            onSubmit={noop}
            onCancel={() => setCurrentIdx(0)}
            loading={false}
          />
        )}

        {page === 'waitForKeyReturn' && (
          <WaitForKeyReturnPage
            booking={MOCK_BOOKING}
            onKeyDetected={noop}
            onCancel={() => setCurrentIdx(0)}
          />
        )}

        {page === 'swapConfirm' && (
          <SwapConfirmPage
            step="confirm2"
            user1={MOCK_USER}
            roomCode1="52-213"
            user2={MOCK_USER2}
            roomCode2="52-511"
            eligibility={{ 
              userA: { hasSchedule: true },
              userB: { hasSchedule: true }
             }}
            onConfirm={noop}
            onCancel={() => setCurrentIdx(0)}
            loading={false}
          />
        )}

        {page === 'transferConfirm' && (
          <TransferConfirmPage
            step="confirm2"
            user1={MOCK_USER}
            roomCode1="52-213"
            user2={MOCK_USER2}
            eligibility={{ hasSchedule: true, canReceive: true }}
            onConfirm={noop}
            onCancel={() => setCurrentIdx(0)}
            loading={false}
          />
        )}

        {page === 'success' && (
          <SuccessPage
            result={MOCK_BORROW_RESULT}
            onHome={() => setCurrentIdx(0)}
          />
        )}
      </main>
    </div>
  );
}
