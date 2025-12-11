import axios from 'axios';

// สร้าง instance ไว้ใช้ทั้งโปรเจกต์
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// ดักทุก Request เพื่อยัด Token เข้าไป (ไม่ต้องเขียนทุกรอบ)
// api.interceptors.request.use((config) => {
//   const token = localStorage.getItem('token');
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });

// เวลาเรียกใช้
export const login = async (email, password , remember) => {
    try {
        const response = await api.post('/auth/login', { email, password , remember });
        return response;
    } catch (error) {
        throw error;
    }
}

export const sendResetPasswordEmail = async (email) => {
    try {
        const response = await api.post('/auth/reset-password', { email });
        return response;
    } catch (error) {
        throw error;
    }
}

export const verifyOTP = async (email, OTP) => {
    try {
        const response = await api.post('/auth/verify-otp', { email, OTP });
        return response;
    } catch (error) {
        throw error;
    }
}
