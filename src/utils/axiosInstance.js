// src/utils/axiosInstance.js
import axios from 'axios';

// Create an Axios instance
// Use relative path for client-side to avoid CORS and ensure correct environment usage
// On the server, a Vercel PREVIEW must call itself, not NEXT_PUBLIC_URL (the production domain) — see auth.js.
const serverOrigin = process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_URL;
const baseURL = typeof window !== 'undefined'
    ? '/api'
    : (serverOrigin ? `${serverOrigin}/api` : 'http://localhost:3000/api');

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
        // Safe check for error.response
        if (error.response && error.response.status === 401) {
            // Only redirect if we are in the browser
            if (typeof window !== 'undefined') {
                alert('Session expired. Please log in again.');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
