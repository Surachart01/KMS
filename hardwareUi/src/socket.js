/**
 * Socket.IO client — เชื่อมต่อ backend server
 * Export socket instance + helper functions
 */
import { io } from 'socket.io-client';

const BACKEND_URL_STR = import.meta.env.VITE_BACKEND_URL || 'https://btct.ced.kmutnb.ac.th/kmsws';

// Extract hostname and prefix path so Socket.io routes through Nginx properly
const parsedUrl = new URL(BACKEND_URL_STR);
const urlPath = parsedUrl.pathname === '/' ? '' : parsedUrl.pathname.replace(/\/$/, '');

// บังคับให้ Socket.IO วิ่งผ่าน /api/socket.io เพื่อหลบข้อจำกัดของ Nginx ที่อนุญาตแค่ /kmsws/api
export const socket = io(parsedUrl.origin, {
    path: `${urlPath}/api/socket.io`,
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity,
});

// Join kiosk room on connect
socket.on('connect', () => {
    console.log('🔌 Connected to backend:', socket.id);
    socket.emit('join:kiosk');
});

socket.on('disconnect', () => {
    console.log('🔌 Disconnected from backend');
});

socket.on('connect_error', (err) => {
    console.error('❌ Socket connection error:', err.message);
});

// ── Helper functions ──

export function getKeys() {
    return new Promise((resolve) => {
        socket.emit('keys:get', (response) => {
            resolve(response);
        });
    });
}

export function identifyUser(studentCode) {
    console.log('📡 identifyUser: Sending user:identify for', studentCode);
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            console.error('⏰ identifyUser: Timeout after 10s for', studentCode);
            resolve({ success: false, message: 'หมดเวลาในการตรวจสอบผู้ใช้ กรุณาลองใหม่' });
        }, 10000);

        socket.emit('user:identify', studentCode, (response) => {
            clearTimeout(timeout);
            console.log('📡 identifyUser: Got response', JSON.stringify(response)?.substring(0, 200));
            resolve(response);
        });
    });
}

export function borrowKey(studentCode, roomCode, reason, returnByTime) {
    return new Promise((resolve) => {
        socket.emit('key:borrow', { studentCode, roomCode, reason, returnByTime }, (response) => {
            resolve(response);
        });
    });
}

export function returnKey(studentCode) {
    return new Promise((resolve) => {
        socket.emit('key:return', { studentCode }, (response) => {
            resolve(response);
        });
    });
}

export function checkSwapEligibility(studentCodeA, roomCodeA, studentCodeB, roomCodeB) {
    return new Promise((resolve) => {
        socket.emit('key:check-swap', { studentCodeA, roomCodeA, studentCodeB, roomCodeB }, (response) => {
            resolve(response);
        });
    });
}

export function swapKey(studentCodeA, roomCodeA, returnByTimeA, studentCodeB, roomCodeB, returnByTimeB) {
    return new Promise((resolve) => {
        socket.emit('key:swap', { studentCodeA, roomCodeA, returnByTimeA, studentCodeB, roomCodeB, returnByTimeB }, (response) => {
            resolve(response);
        });
    });
}

export function moveKey(studentCode, fromRoomCode, toRoomCode) {
    return new Promise((resolve) => {
        socket.emit('key:move', { studentCode, fromRoomCode, toRoomCode }, (response) => {
            resolve(response);
        });
    });
}

export function checkTransferEligibility(studentCodeReceiver, roomCode) {
    return new Promise((resolve) => {
        socket.emit('key:check-transfer', { studentCodeReceiver, roomCode }, (response) => {
            resolve(response);
        });
    });
}

export function transferKey(studentCodeA, studentCodeB, reason, returnByTime) {
    return new Promise((resolve) => {
        socket.emit('key:transfer', { studentCodeA, studentCodeB, reason, returnByTime }, (response) => {
            resolve(response);
        });
    });
}

/**
 * requestReconcile — สั่ง scan ทุกช่อง NFC เพื่อ auto-return กุญแจที่คืนแล้วแต่ไม่ได้กดเมนู
 * เรียกก่อนเบิกกุญแจใหม่ เพื่อให้ข้อมูลตู้ตรงกับ DB
 */
export function requestReconcile() {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            resolve({ success: false, message: 'Reconcile timeout' });
        }, 15000); // 15 วินาที timeout

        // Listen สำหรับผลลัพธ์
        socket.once('key:reconcile-done', (result) => {
            clearTimeout(timeout);
            resolve({ success: true, ...result });
        });

        socket.emit('key:request-reconcile', (ack) => {
            console.log('📡 requestReconcile: sent', ack);
        });
    });
}

