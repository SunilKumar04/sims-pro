// src/lib/auth.ts
import { authApi } from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';

  // ✅ FIX (important)
  studentId?: string;
  teacherId?: string;

  // existing fields
  className?: string;
  roll?: string;
  employeeCode?: string;
  subject?: string;
}

export const login = async (
  email: string,
  password: string
): Promise<{ user: User; token: string }> => {
  const res = await authApi.login(email, password);

  const { accessToken, user } = res.data;

  // ✅ store in localStorage
  localStorage.setItem('sims_token', accessToken);
  localStorage.setItem('sims_user', JSON.stringify(user));

  return { user, token: accessToken };
};

export const logout = () => {
  localStorage.removeItem('sims_token');
  localStorage.removeItem('sims_user');
  window.location.href = '/login';
};

export const getUser = (): User | null => {
  if (typeof window === 'undefined') return null;

  const raw = localStorage.getItem('sims_user');
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('sims_token');
};

export const isAuthenticated = (): boolean => {
  return !!getToken();
};

export const getRoleRedirect = (role: string): string => {
  switch (role) {
    case 'ADMIN':
      return '/admin/dashboard';
    case 'TEACHER':
      return '/teacher/dashboard';
    case 'STUDENT':
      return '/student/home';
    case 'PARENT':
      return '/student/home';
    default:
      return '/login';
  }
};