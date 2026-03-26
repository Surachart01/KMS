/**
 * Socket.IO client — เชื่อมต่อ backend server
 * Export socket instance + helper functions
 */
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4556';

export const socket = io(BACKEND_URL, {
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

export function swapKey(studentCodeA, roomCodeA, studentCodeB, roomCodeB) {
    return new Promise((resolve) => {
        socket.emit('key:swap', { studentCodeA, roomCodeA, studentCodeB, roomCodeB }, (response) => {
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

export function transferKey(studentCodeA, studentCodeB) {
    return new Promise((resolve) => {
        socket.emit('key:transfer', { studentCodeA, studentCodeB }, (response) => {
            resolve(response);
        });
    });
}
