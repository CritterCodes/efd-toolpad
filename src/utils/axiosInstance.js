// src/utils/axiosInstance.js
import axios from 'axios';

// Create an Axios instance
const axiosInstance = axios.create({
    baseURL: `${process.env.NEXT_PUBLIC_URL}/api`, // Keep your base URL in .env file
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
