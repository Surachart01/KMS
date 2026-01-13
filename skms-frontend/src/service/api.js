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
    batchImport: (data) => apiClient.post('/api/schedules/batch-import', data) // เพิ่ม: batchImport
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

export default apiClient;
