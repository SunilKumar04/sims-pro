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
  login:          (email: string, password: string) => api.post('/auth/login', { email, password }),
  register:       (data: any)                        => api.post('/auth/register', data),
  getMe:          ()                                 => api.get('/auth/me'),
  changePassword: (data: any)                        => api.patch('/auth/change-password', data),
  forgotPassword: (email: string)                    => api.post('/auth/forgot-password', { email }),
  resetPassword:  (token: string, newPassword: string) => api.post('/auth/reset-password', { token, newPassword }),
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
  getAll:            (params?: any)              => api.get('/fees', { params }),
  getByStudent:      (studentId: string)          => api.get(`/fees/student/${studentId}`),
  create:            (data: any)                  => api.post('/fees', data),
  markPaid:          (id: string)                 => api.patch(`/fees/${id}/mark-paid`),
  updatePayment:     (id: string, data: any)      => api.patch(`/fees/${id}/payment`, data),
  getMonthlyStats:   ()                           => api.get('/fees/monthly-stats'),
  bulkCreateForTerm: (term: string, className?: string) => api.post('/fees/bulk-create-term', { term, className }),
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
  bulkSave:         (data: any)                                  => api.post('/marks/bulk', data),
  getByClass:       (className: string, examType: string, year?: number) => api.get(`/marks/class/${className}`, { params: { examType, year } }),
  getByStudent:     (studentId: string)                          => api.get(`/marks/student/${studentId}`),
  getStudentReport: (studentId: string, examType: string, year?: number) => api.get(`/marks/student/${studentId}/report`, { params: { examType, year } }),
  getMyReport:      (examType?: string, year?: number)           => api.get('/marks/me/report', { params: { examType, year } }),
};

// ══════════════════════════════════════
// TIMETABLE
// ══════════════════════════════════════
export const timetableApi = {
  createMapping:    (data: any)             => api.post('/timetable/mapping', data),
  getMappings:      (className?: string)    => api.get('/timetable/mapping', { params: { className } }),
  deleteMapping:    (id: string)            => api.delete(`/timetable/mapping/${id}`),
  upsertSlot:       (data: any)             => api.post('/timetable/slot', data),
  getClassTimetable:(className: string)     => api.get(`/timetable/class/${className}`),
  getMyTimetable:   ()                      => api.get('/timetable/teacher/me'),
  deleteSlot:       (id: string)            => api.delete(`/timetable/slot/${id}`),
};

// ══════════════════════════════════════
// SESSIONS (subject-wise attendance)
// ══════════════════════════════════════
export const sessionsApi = {
  create:              (data: any)                       => api.post('/sessions', data),
  markBulk:            (id: string, records: any[])      => api.post(`/sessions/${id}/mark`, { records }),
  lock:                (id: string)                      => api.patch(`/sessions/${id}/lock`),
  getToday:            ()                                => api.get('/sessions/today'),
  getSession:          (id: string)                      => api.get(`/sessions/${id}`),
  getSessionStudents:  (id: string)                      => api.get(`/sessions/${id}/students`),
  getSessions:         (params?: any)                    => api.get('/sessions', { params }),
};

// ══════════════════════════════════════
// EXAMS & DATE SHEET
// ══════════════════════════════════════
export const examsApi = {
  create:         (data: any)              => api.post('/exams', data),
  update:         (id: string, data: any)  => api.patch(`/exams/${id}`, data),
  delete:         (id: string)             => api.delete(`/exams/${id}`),
  getAll:         (params?: any)           => api.get('/exams', { params }),
  getByClass:     (className: string)      => api.get(`/exams/class/${className}`),
  getDatesheet:   (className: string, examType: string) => api.get(`/exams/class/${className}/datesheet`, { params: { examType } }),
  addEntry:       (examId: string, data: any)      => api.post(`/exams/${examId}/entries`, data),
  addBulkEntries: (examId: string, entries: any[]) => api.post(`/exams/${examId}/entries/bulk`, { entries }),
  deleteEntry:    (entryId: string)        => api.delete(`/exams/entries/${entryId}`),
  publish:        (id: string, pub = true) => api.patch(`/exams/${id}/publish`, { publish: pub }),
};

// ══════════════════════════════════════
// ASSIGNMENTS
// ══════════════════════════════════════
export const assignmentsApi = {
  create:                (data: any)            => api.post('/assignments', data),
  getAll:                (params?: any)          => api.get('/assignments', { params }),
  getOne:                (id: string)            => api.get(`/assignments/${id}`),
  update:                (id: string, data: any) => api.patch(`/assignments/${id}`, data),
  delete:                (id: string)            => api.delete(`/assignments/${id}`),
  getStudentAssignments: (className: string)     => api.get('/assignments/student', { params: { className } }),
  submit:                (id: string, data: any) => api.post(`/assignments/${id}/submit`, data),
  grade:                 (subId: string, data: any) => api.patch(`/assignments/submissions/${subId}/grade`, data),
};
