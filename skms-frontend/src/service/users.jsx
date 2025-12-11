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

export const getAllUser = async () => {
    try {
        const response = await api.get('/users');
        return response.data;
    } catch (error) {
        console.error('Error fetching users:', error);
        throw error;
    }
}

export const getUser = async (id) => {
  try {
    const response = await api.get(`/users/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
};

export const createUser = async (user) => {
    try {
        const response = await api.post('/users', user);
        return response.data;
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
}


export const updateUser = async (id, user) => {
  try {
    const response = await api.put(`/users/${id}`, user);
    return response.data;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

export const updatePassword = async (email, password) => {
  try {
    const response = await api.post('/users/reset-password', { email, password });
    return response;
  } catch (error) {
    console.error('Error updating password:', error);
    throw error;
  }
};

export const deleteUser = async (id) => {
  try {
    const response = await api.delete(`/users/${id}`);
    return response;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

