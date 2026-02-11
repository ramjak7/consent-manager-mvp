import axios from 'axios';
import type { AxiosError, AxiosRequestConfig } from 'axios';

// Create Axios instance
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for httpOnly cookies
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // JWT token is in httpOnly cookie, automatically sent by browser
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Session expired, redirect to login
      window.location.href = '/login?session_expired=true';
    } else if (error.response?.status === 429) {
      // Rate limit exceeded
      console.error('Too many requests. Please try again later.');
    }
    return Promise.reject(error);
  }
);

// Generic API call wrapper
export async function apiRequest<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.request<T>(config);
  return response.data;
}
