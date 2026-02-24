import axios from 'axios';
import Cookies from 'js-cookie';

const envUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4556';
// Sanitize URL: remove trailing slash and '/api' suffix if present
const API_URL = envUrl.replace(/\/$/, "").replace(/\/api$/, "");

// สร้าง axios instance พร้อม config
const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Interceptor สำหรับเพิ่ม token ใน header
apiClient.interceptors.request.use(
    (config) => {
        const token = Cookies.get('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// ================== MAJOR API ==================
export const majorsAPI = {
    getAll: () => apiClient.get('/api/majors'),
    getById: (id) => apiClient.get(`/api/majors/${id}`),
    create: (data) => apiClient.post('/api/majors', data),
    update: (id, data) => apiClient.put(`/api/majors/${id}`, data),
    delete: (id) => apiClient.delete(`/api/majors/${id}`)
};

// ================== SECTION API ==================
export const sectionsAPI = {
    getAll: () => apiClient.get('/api/sections'),
    getById: (id) => apiClient.get(`/api/sections/${id}`),
    create: (data) => apiClient.post('/api/sections', data),
    update: (id, data) => apiClient.put(`/api/sections/${id}`, data),
    delete: (id) => apiClient.delete(`/api/sections/${id}`)
};

// ================== ROOM API ==================
export const roomsAPI = {
    getAll: () => apiClient.get('/api/rooms'),
    getById: (id) => apiClient.get(`/api/rooms/${id}`),
    create: (data) => apiClient.post('/api/rooms', data),
    update: (id, data) => apiClient.put(`/api/rooms/${id}`, data),
    delete: (id) => apiClient.delete(`/api/rooms/${id}`)
};

// ================== SUBJECT API ==================
export const subjectsAPI = {
    getAll: () => apiClient.get('/api/subjects'),
    getByCode: (code) => apiClient.get(`/api/subjects/${code}`),
    create: (data) => apiClient.post('/api/subjects', data),
    update: (code, data) => apiClient.put(`/api/subjects/${code}`, data),
    delete: (code) => apiClient.delete(`/api/subjects/${code}`)
};

// ================== KEY API ==================
export const keysAPI = {
    getAll: () => apiClient.get('/api/keys'),
    getById: (id) => apiClient.get(`/api/keys/${id}`),
    create: (data) => apiClient.post('/api/keys', data),
    update: (id, data) => apiClient.put(`/api/keys/${id}`, data),
    delete: (id) => apiClient.delete(`/api/keys/${id}`)
};

// ================== USER API ==================
export const usersAPI = {
    getAll: (params) => apiClient.get('/api/users', { params }),
    getById: (id) => apiClient.get(`/api/users/${id}`),
    create: (data) => apiClient.post('/api/users', data),
    update: (id, data) => apiClient.put(`/api/users/${id}`, data),
    delete: (id) => apiClient.delete(`/api/users/${id}`),
    batchImport: (data) => apiClient.post('/api/users/batch-import', data)
};

// ================== SCHEDULE API ==================
export const schedulesAPI = {
    getAll: (params) => apiClient.get('/api/schedules', { params }), // แก้: รับ params
    getById: (id) => apiClient.get(`/api/schedules/${id}`),
    create: (data) => apiClient.post('/api/schedules', data),
    update: (id, data) => apiClient.put(`/api/schedules/${id}`, data),
    delete: (id) => apiClient.delete(`/api/schedules/${id}`),
    deleteAll: () => apiClient.delete('/api/schedules/delete-all'),
    batchImport: (data) => apiClient.post('/api/schedules/batch-import', data),
    importRepclasslist: (data) => apiClient.post('/api/schedules/import-repclasslist', data)
};

// ================== BORROW REASON API ==================
export const borrowReasonsAPI = {
    getAll: () => apiClient.get('/api/borrow-reasons'),
    getById: (id) => apiClient.get(`/api/borrow-reasons/${id}`),
    create: (data) => apiClient.post('/api/borrow-reasons', data),
    update: (id, data) => apiClient.put(`/api/borrow-reasons/${id}`, data),
    delete: (id) => apiClient.delete(`/api/borrow-reasons/${id}`)
};

// ================== TRANSACTIONS API ==================
export const transactionsAPI = {
    getAll: (params) => apiClient.get('/api/transactions', { params }),
    borrow: (data) => apiClient.post('/api/transactions/borrow', data),
    returnKey: (data) => apiClient.post('/api/transactions/return', data)
};

// ================== STATISTICS API ==================
export const statisticsAPI = {
    getDashboard: () => apiClient.get('/api/statistics/dashboard'),
    getRecentTransactions: () => apiClient.get('/api/statistics/recent'),
    getTopRooms: () => apiClient.get('/api/statistics/top-rooms'),
    getTodayStats: () => apiClient.get('/api/statistics/today')
};

// ================== KIOSK API (สำหรับ Raspberry Pi) ==================
export const kioskAPI = {
    verifyBorrow: (data) => apiClient.post('/api/kiosk/verify-borrow', data),
    borrow: (data) => apiClient.post('/api/kiosk/borrow', data),
    verifyReturn: (data) => apiClient.post('/api/kiosk/verify-return', data),
    returnKey: (data) => apiClient.post('/api/kiosk/return', data),
    getAvailableRooms: () => apiClient.get('/api/kiosk/rooms'),
    getRoomStatus: () => apiClient.get('/api/kiosk/rooms/status')
};

// ================== PENALTY API ==================
export const penaltyAPI = {
    getConfig: () => apiClient.get('/api/penalty/config'),
    createConfig: (data) => apiClient.post('/api/penalty/config', data),
    updateConfig: (id, data) => apiClient.put(`/api/penalty/config/${id}`, data),
    manualPenalty: (data) => apiClient.post('/api/penalty/manual', data),
    getLogs: (params) => apiClient.get('/api/penalty/logs', { params }),
    getUserLogs: (userId) => apiClient.get(`/api/penalty/logs/${userId}`),
    getStats: (params) => apiClient.get('/api/penalty/stats', { params }),
    getScores: () => apiClient.get('/api/penalty/scores'),
    updateScore: (userId, data) => apiClient.put(`/api/penalty/scores/${userId}`, data)
};

// ================== BOOKINGS API (NEW) ==================
export const bookingsAPI = {
    getAll: (params) => apiClient.get('/api/bookings', { params }),
    getById: (id) => apiClient.get(`/api/bookings/${id}`),
    getActive: () => apiClient.get('/api/bookings/active'),
    getOverdue: () => apiClient.get('/api/bookings/overdue'),
    getStats: (params) => apiClient.get('/api/bookings/stats', { params }),
    getDailyStats: (date) => apiClient.get('/api/bookings/stats/daily', { params: { date } }),
    getWeeklyStats: () => apiClient.get('/api/bookings/stats/weekly'),
    getMonthlyStats: (month, year) => apiClient.get('/api/bookings/stats/monthly', { params: { month, year } }),
    generate: (data) => apiClient.post('/api/bookings/generate', data)
};

// ================== AUTHORIZATIONS API (สิทธิ์เบิกกุญแจรายวัน) ==================
export const authorizationsAPI = {
    getAll: (params) => apiClient.get('/api/authorizations', { params }),
    create: (data) => apiClient.post('/api/authorizations', data),
    delete: (id) => apiClient.delete(`/api/authorizations/${id}`),
    syncToday: () => apiClient.post('/api/authorizations/sync-today'),
    syncSchedule: (data) => apiClient.post('/api/authorizations/sync-schedule', data)
};

// ================== SCHEDULES V2 API (with Room Swap/Move) ==================
export const schedulesV2API = {
    getAll: (params) => apiClient.get('/api/v2/schedules', { params }),
    getByRoom: (roomCode) => apiClient.get(`/api/v2/schedules/room/${roomCode}`),
    getByTeacher: (teacherId) => apiClient.get(`/api/v2/schedules/teacher/${teacherId}`),
    getBySection: (section) => apiClient.get(`/api/v2/schedules/section/${section}`),
    create: (data) => apiClient.post('/api/v2/schedules', data),
    update: (id, data) => apiClient.put(`/api/v2/schedules/${id}`, data),
    delete: (id) => apiClient.delete(`/api/v2/schedules/${id}`),
    swapRooms: (scheduleId1, scheduleId2) => apiClient.post('/api/v2/schedules/swap-rooms', { scheduleId1, scheduleId2 }),
    moveRoom: (id, newRoomCode) => apiClient.post(`/api/v2/schedules/${id}/move-room`, { newRoomCode }),
    checkPermission: (studentCode, roomCode) => apiClient.post('/api/v2/schedules/check-permission', { studentCode, roomCode })
};

// ================== TEACHER PORTAL API ==================
export const teacherAPI = {
    getMe: () => apiClient.get('/api/teacher/me'),
    getMySubjects: () => apiClient.get('/api/teacher/my-subjects'),
    getMySchedules: () => apiClient.get('/api/teacher/my-schedules'),
    createSchedule: (data) => apiClient.post('/api/teacher/schedules', data),
    updateSchedule: (id, data) => apiClient.put(`/api/teacher/schedules/${id}`, data),
    deleteSchedule: (id) => apiClient.delete(`/api/teacher/schedules/${id}`),
    importRepclasslist: (data) => apiClient.post('/api/teacher/schedules/import-repclasslist', data)
};

export default apiClient;
