// src/utils/axiosInstance.js
import axios from 'axios';

// Create an Axios instance
// Use relative path for client-side to avoid CORS and ensure correct environment usage
const baseURL = typeof window !== 'undefined' 
    ? '/api' 
    : (process.env.NEXT_PUBLIC_URL ? `${process.env.NEXT_PUBLIC_URL}/api` : 'http://localhost:3000/api');

const axiosInstance = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// ✅ Request Interceptor
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// ✅ Response Interceptor
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response.status === 401) {
            alert('Session expired. Please log in again.');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
