import { authApi } from './api';
import { SchoolBranding, TenantSchool } from './auth';

export interface TenantBootstrap {
  scope: 'school' | 'superadmin';
  hostname?: string;
  portalSlug?: string;
  resolvedBy?: string;
  school: TenantSchool | null;
  settings: Record<string, any>;
  branding: SchoolBranding;
}

const FALLBACK_BRANDING: SchoolBranding = {
  shortName: process.env.NEXT_PUBLIC_SCHOOL_SHORT || 'SIMS',
  primaryColor: process.env.NEXT_PUBLIC_SCHOOL_PRIMARY || '#1E90FF',
  secondaryColor: process.env.NEXT_PUBLIC_SCHOOL_SECONDARY || '#D4A017',
  accentColor: process.env.NEXT_PUBLIC_SCHOOL_ACCENT || '#F0C040',
  backgroundColor: process.env.NEXT_PUBLIC_SCHOOL_BACKGROUND || '#0A1628',
  textColor: process.env.NEXT_PUBLIC_SCHOOL_TEXT || '#FFFFFF',
  themeMode: 'dark',
};

export const getHostname = () => {
  if (typeof window === 'undefined') return '';
  return window.location.hostname.toLowerCase();
};

export const getPortalSlug = () => {
  if (typeof window === 'undefined') return '';

  const [first, second] = window.location.pathname.split('/').filter(Boolean);
  if (first !== 'portal' || !second) return '';

  return decodeURIComponent(second).trim().toLowerCase();
};

export const createFallbackTenant = (): TenantBootstrap => ({
  scope: 'school',
  hostname: getHostname(),
  portalSlug: getPortalSlug() || undefined,
  school: null,
  settings: {},
  branding: FALLBACK_BRANDING,
});

export const readCachedTenant = (): TenantBootstrap | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem('sims_tenant');
    if (!raw) return null;

    const parsed = JSON.parse(raw) as TenantBootstrap;
    const hostname = getHostname();
    const portalSlug = getPortalSlug();
    if (parsed?.hostname && hostname && parsed.hostname !== hostname) {
      return null;
    }
    if ((parsed?.portalSlug ?? '') !== portalSlug) return null;

    return parsed;
  } catch {
    return null;
  }
};

export const writeCachedTenant = (tenant: TenantBootstrap) => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem('sims_tenant', JSON.stringify(tenant));
  } catch {
    // ignore persistence issues
  }
};

export const mergeTenantBranding = (
  school?: TenantSchool | null,
  settings?: Record<string, any>,
  branding?: Partial<SchoolBranding> | null,
): SchoolBranding => {
  const read = (...keys: string[]) => {
    for (const key of keys) {
      const value = settings?.[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
      if (value && typeof value === 'object' && typeof value.value === 'string' && value.value.trim()) {
        return value.value.trim();
      }
    }
    return '';
  };

  return {
    shortName: branding?.shortName || read('short', 'shortName', 'schoolShortName') || school?.name || FALLBACK_BRANDING.shortName,
    logoUrl: branding?.logoUrl || read('logoUrl', 'logo', 'brandLogo') || undefined,
    backgroundImageUrl: branding?.backgroundImageUrl || read('backgroundImageUrl', 'backgroundImage', 'loginBackgroundImage', 'brandBackgroundImage') || undefined,
    primaryColor: branding?.primaryColor || read('primaryColor', 'brandPrimaryColor') || FALLBACK_BRANDING.primaryColor,
    secondaryColor: branding?.secondaryColor || read('secondaryColor', 'brandSecondaryColor') || FALLBACK_BRANDING.secondaryColor,
    accentColor: branding?.accentColor || read('accentColor', 'brandAccentColor') || FALLBACK_BRANDING.accentColor,
    backgroundColor: branding?.backgroundColor || read('backgroundColor', 'brandBackgroundColor') || FALLBACK_BRANDING.backgroundColor,
    textColor: branding?.textColor || read('textColor', 'brandTextColor') || FALLBACK_BRANDING.textColor,
    themeMode: branding?.themeMode || (read('themeMode', 'theme') as 'light' | 'dark') || FALLBACK_BRANDING.themeMode,
  };
};

export async function loadTenantBootstrap(): Promise<TenantBootstrap> {
  const fallback = createFallbackTenant();
  const portalSlug = fallback.portalSlug;

  try {
    const response = await authApi.getTenant(portalSlug ? { portalSlug } : undefined);
    const data = response.data?.data ?? response.data;
    const school = (data?.school ?? null) as TenantSchool | null;
    const settings = (data?.settings ?? {}) as Record<string, any>;
    const branding = mergeTenantBranding(school, settings, data?.branding ?? null);

    return {
      scope: data?.scope ?? 'school',
      hostname: data?.hostname ?? fallback.hostname,
      portalSlug,
      resolvedBy: data?.resolvedBy,
      school,
      settings,
      branding,
    };
  } catch {
    return fallback;
  }
}
