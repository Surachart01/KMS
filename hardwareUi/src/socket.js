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
    return new Promise((resolve) => {
        socket.emit('user:identify', studentCode, (response) => {
            resolve(response);
        });
    });
}

export function borrowKey(studentCode, roomCode, reason) {
    return new Promise((resolve) => {
        socket.emit('key:borrow', { studentCode, roomCode, reason }, (response) => {
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
