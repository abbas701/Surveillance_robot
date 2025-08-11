import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    withCredentials: true,
    timeout: 10000,
});

// Request interceptor
api.interceptors.request.use(
    (config) => {
        // Add any request headers or modifications here
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // Handle common errors
        if (error.response?.status === 401) {
            // Unauthorized - redirect to login
            window.location.href = '/login';
        }

        return Promise.reject(error);
    }
);

export default api; 