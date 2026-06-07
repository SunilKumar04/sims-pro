// src/lib/auth.ts
import { authApi } from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'SCHOOL_ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT' | 'ACCOUNTANT' | 'SUPER_ADMIN';
  scope?: 'school' | 'superadmin';
  schoolId?: string;

  // ✅ FIX (important)
  studentId?: string;
  teacherId?: string;

  // existing fields
  className?: string;
  roll?: string;
  employeeCode?: string;
  subject?: string;
}

export interface SchoolBranding {
  shortName: string;
  logoUrl?: string;
  backgroundImageUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  themeMode: 'light' | 'dark';
}

const getLoginPortalSlug = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;

  const pathnameParts = window.location.pathname.split('/').filter(Boolean);
  if (pathnameParts[0] === 'portal' && pathnameParts[1]) {
    return decodeURIComponent(pathnameParts[1]).trim().toLowerCase();
  }

  try {
    const raw = localStorage.getItem('sims_tenant');
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { portalSlug?: string };
    const portalSlug = parsed.portalSlug?.trim().toLowerCase();
    return portalSlug || undefined;
  } catch {
    return undefined;
  }
};

const getStoredPortalSlug = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;

  try {
    const schoolRaw = localStorage.getItem('sims_school');
    if (schoolRaw) {
      const school = JSON.parse(schoolRaw) as { slug?: string };
      const schoolSlug = school.slug?.trim().toLowerCase();
      if (schoolSlug) return schoolSlug;
    }

    const tenantRaw = localStorage.getItem('sims_tenant');
    if (tenantRaw) {
      const tenant = JSON.parse(tenantRaw) as { portalSlug?: string };
      const portalSlug = tenant.portalSlug?.trim().toLowerCase();
      if (portalSlug) return portalSlug;
    }
  } catch {
    return undefined;
  }

  return getLoginPortalSlug();
};

export const getPortalRoleParam = (role?: string): 'admin' | 'teacher' | 'student' | undefined => {
  switch (String(role || '').toUpperCase()) {
    case 'ADMIN':
    case 'SCHOOL_ADMIN':
      return 'admin';
    case 'TEACHER':
      return 'teacher';
    case 'STUDENT':
    case 'PARENT':
      return 'student';
    default:
      return undefined;
  }
};

export const getSchoolLoginPath = (role?: string, returnTo?: string): string => {
  const portalSlug = getStoredPortalSlug();
  const roleParam = getPortalRoleParam(role);
  const safeReturnTo = returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')
    ? returnTo
    : '';
  const params = new URLSearchParams();

  if (roleParam) params.set('role', roleParam);
  if (safeReturnTo) params.set('returnTo', safeReturnTo);

  if (!portalSlug) {
    const query = params.toString();
    return query ? `/login?${query}` : '/login';
  }

  const query = params.toString();
  return query ? `/portal/${portalSlug}/login?${query}` : `/portal/${portalSlug}/login`;
};

export interface TenantSchool {
  id: string;
  name: string;
  schoolCode: string;
  slug: string;
  subdomain?: string | null;
  customDomain?: string | null;
  contactPerson?: string;
  email?: string;
  phone?: string | null;
  address?: string | null;
  status?: string;
  settings?: Record<string, any>;
}

export const login = async (
  email: string,
  password: string
): Promise<{ user: User; token: string }> => {
  const res = await authApi.login(email, password, getLoginPortalSlug());

  const { accessToken, user, school, settings, branding } = res.data;

  // ✅ store in localStorage
  localStorage.setItem('sims_token', accessToken);
  localStorage.setItem('sims_user', JSON.stringify(user));
  if (school) {
    localStorage.setItem('sims_school', JSON.stringify({ ...school, settings, branding }));
  }

  return { user, token: accessToken };
};

export const logout = () => {
  const user = getUser();
  const nextPath = getSchoolLoginPath(user?.role);
  localStorage.removeItem('sims_token');
  localStorage.removeItem('sims_user');
  localStorage.removeItem('sims_school');
  window.location.href = nextPath;
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

export const getSchool = (): (TenantSchool & { branding?: SchoolBranding; settings?: Record<string, any> }) | null => {
  if (typeof window === 'undefined') return null;

  const raw = localStorage.getItem('sims_school');
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const isAuthenticated = (): boolean => {
  return !!getToken();
};

export const getRoleRedirect = (role: string): string => {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/superadmin/dashboard';
    case 'SCHOOL_ADMIN':
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
