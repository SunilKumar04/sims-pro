// src/lib/api.ts
import axios, { AxiosInstance, AxiosResponse } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

// ── Axios instance ──
const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// ── Request interceptor: attach token ──
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('sims_token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401 ──
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sims_token');
        localStorage.removeItem('sims_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error.response?.data || error);
  }
);

// ══════════════════════════════════════
// AUTH
// ══════════════════════════════════════
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  register: (data: any) =>
    api.post('/auth/register', data),

  getMe: () =>
    api.get('/auth/me'),

  changePassword: (data: any) =>
    api.patch('/auth/change-password', data),
};

// ══════════════════════════════════════
// STUDENTS
// ══════════════════════════════════════
export const studentsApi = {
  getAll: (params?: any) =>
    api.get('/students', { params }),

  getById: (id: string) =>
    api.get(`/students/${id}`),

  create: (data: any) =>
    api.post('/students', data),

  update: (id: string, data: any) =>
    api.patch(`/students/${id}`, data),

  delete: (id: string) =>
    api.delete(`/students/${id}`),

  getStats: () =>
    api.get('/students/stats'),
};

// ══════════════════════════════════════
// TEACHERS
// ══════════════════════════════════════
export const teachersApi = {
  getAll: (params?: any) =>
    api.get('/teachers', { params }),

  getById: (id: string) =>
    api.get(`/teachers/${id}`),

  create: (data: any) =>
    api.post('/teachers', data),

  update: (id: string, data: any) =>
    api.patch(`/teachers/${id}`, data),

  delete: (id: string) =>
    api.delete(`/teachers/${id}`),
};

// ══════════════════════════════════════
// CLASSES
// ══════════════════════════════════════
export const classesApi = {
  getAll: (params?: any) =>
    api.get('/classes', { params }),

  getById: (id: string) =>
    api.get(`/classes/${id}`),

  create: (data: any) =>
    api.post('/classes', data),

  update: (id: string, data: any) =>
    api.patch(`/classes/${id}`, data),

  delete: (id: string) =>
    api.delete(`/classes/${id}`),
};

// ══════════════════════════════════════
// FEES
// ══════════════════════════════════════
export const feesApi = {
  getAll: (params?: any) =>
    api.get('/fees', { params }),

  getByStudent: (studentId: string) =>
    api.get(`/fees/student/${studentId}`),

  create: (data: any) =>
    api.post('/fees', data),

  markPaid: (id: string) =>
    api.patch(`/fees/${id}/mark-paid`),

  updatePayment: (id: string, data: any) =>
    api.patch(`/fees/${id}/payment`, data),

  getMonthlyStats: () =>
    api.get('/fees/monthly-stats'),
};

// ══════════════════════════════════════
// NOTICES
// ══════════════════════════════════════
export const noticesApi = {
  getAll: (params?: any) =>
    api.get('/notices', { params }),

  getById: (id: string) =>
    api.get(`/notices/${id}`),

  create: (data: any) =>
    api.post('/notices', data),

  update: (id: string, data: any) =>
    api.patch(`/notices/${id}`, data),

  delete: (id: string) =>
    api.delete(`/notices/${id}`),
};

// ══════════════════════════════════════
// HOMEWORK
// ══════════════════════════════════════
export const homeworkApi = {
  getAll: (params?: any) =>
    api.get('/homework', { params }),

  getById: (id: string) =>
    api.get(`/homework/${id}`),

  create: (data: any) =>
    api.post('/homework', data),

  update: (id: string, data: any) =>
    api.patch(`/homework/${id}`, data),

  delete: (id: string) =>
    api.delete(`/homework/${id}`),
};

// ══════════════════════════════════════
// ATTENDANCE
// ══════════════════════════════════════
export const attendanceApi = {
  markBulk: (data: any) =>
    api.post('/attendance/bulk', data),

  getByClass: (className: string, date: string) =>
    api.get(`/attendance/class/${className}`, { params: { date } }),

  getByStudent: (studentId: string, month?: number, year?: number) =>
    api.get(`/attendance/student/${studentId}`, { params: { month, year } }),

  getClassSummary: (className: string) =>
    api.get(`/attendance/class/${className}/summary`),
};

// ══════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════
export const dashboardApi = {
  getAdminStats: () =>
    api.get('/dashboard/admin'),

  getTeacherStats: () =>
    api.get('/dashboard/teacher'),

  getStudentStats: () =>
    api.get('/dashboard/student'),
};

export default api;

// ══════════════════════════════════════
// MARKS
// ══════════════════════════════════════
export const marksApi = {
  bulkSave: (data: any) =>
    api.post('/marks/bulk', data),

  getByClass: (className: string, examType: string, year?: number) =>
    api.get(`/marks/class/${className}`, { params: { examType, year } }),

  getByStudent: (studentId: string) =>
    api.get(`/marks/student/${studentId}`),

  getStudentReport: (studentId: string, examType: string, year?: number) =>
    api.get(`/marks/student/${studentId}/report`, { params: { examType, year } }),

  getMyReport: (examType?: string, year?: number) =>
    api.get('/marks/me/report', { params: { examType, year } }),
};
