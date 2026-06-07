import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { School, SchoolStatus } from '@prisma/client';
import { Request } from 'express';

export type TenantScope = 'school' | 'superadmin';

export interface SchoolBranding {
  shortName: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  themeMode: 'light' | 'dark';
}

export interface ResolvedTenant {
  scope: TenantScope;
  hostname?: string;
  portalSlug?: string;
  resolvedBy?: 'customDomain' | 'subdomain' | 'slug' | 'tokenSchool' | 'default';
  schoolId?: string;
  school?: (School & { settings?: Record<string, any> }) | null;
  settings?: Record<string, any>;
  branding?: SchoolBranding;
  userId?: string;
  role?: string;
}

function normalizeValue(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

function isObjectValue(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

@Injectable()
export class TenantResolutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  normalizeHostname(hostname?: string | null): string {
    if (!hostname) return '';
    return normalizeValue(hostname).replace(/:\d+$/, '').replace(/^www\./, '');
  }

  extractHostname(req: Request): string {
    const forwardedHost = req.headers['x-forwarded-host'];
    const hostHeader = Array.isArray(forwardedHost)
      ? forwardedHost[0]
      : forwardedHost || req.headers.host || req.hostname;

    const rawHost = Array.isArray(hostHeader) ? hostHeader[0] : String(hostHeader).split(',')[0];
    return this.normalizeHostname(rawHost);
  }

  private settingsToMap(settings: { key: string; value: any }[]): Record<string, any> {
    return settings.reduce<Record<string, any>>((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {});
  }

  buildSchoolBranding(settings: Record<string, any>): SchoolBranding {
    const get = (...keys: string[]) => {
      for (const key of keys) {
        const value = settings[key];
        if (typeof value === 'string' && value.trim()) return value.trim();
        if (isObjectValue(value) && typeof value.value === 'string' && value.value.trim()) return value.value.trim();
      }
      return '';
    };

    return {
      shortName: get('short', 'shortName', 'schoolShortName') || 'SIMS',
      logoUrl: get('logoUrl', 'logo', 'brandLogo') || undefined,
      primaryColor: get('primaryColor', 'brandPrimaryColor') || '#1E90FF',
      secondaryColor: get('secondaryColor', 'brandSecondaryColor') || '#D4A017',
      accentColor: get('accentColor', 'brandAccentColor') || '#F0C040',
      backgroundColor: get('backgroundColor', 'brandBackgroundColor') || '#0A1628',
      textColor: get('textColor', 'brandTextColor') || '#FFFFFF',
      themeMode: (get('themeMode', 'theme') as 'light' | 'dark') || 'dark',
    };
  }

  private async loadSchool(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      include: { settings: true },
    });

    if (!school) return null;

    const settings = this.settingsToMap(school.settings);
    return {
      ...school,
      settings,
    };
  }

  private async findByCustomDomain(hostname: string) {
    return this.prisma.school.findFirst({
      where: {
        status: SchoolStatus.ACTIVE,
        customDomain: hostname,
      },
      include: { settings: true },
    });
  }

  private async findBySubdomain(hostname: string) {
    const primaryDomain = this.normalizeHostname(
      this.config.get<string>('PRIMARY_DOMAIN') ||
      this.config.get<string>('SAAS_DOMAIN') ||
      'simspro.in',
    );

    if (!primaryDomain || !hostname.endsWith(`.${primaryDomain}`)) {
      return null;
    }

    const subdomain = hostname.slice(0, -(primaryDomain.length + 1));
    if (!subdomain || subdomain.includes('.')) return null;

    return this.prisma.school.findFirst({
      where: {
        status: SchoolStatus.ACTIVE,
        subdomain,
      },
      include: { settings: true },
    });
  }

  private async findBySlug(slug: string) {
    const normalizedSlug = normalizeValue(slug);
    if (!normalizedSlug) return null;

    return this.prisma.school.findFirst({
      where: {
        status: SchoolStatus.ACTIVE,
        OR: [
          { slug: normalizedSlug },
          { subdomain: normalizedSlug },
          { customDomain: normalizedSlug },
          { customDomain: { startsWith: `${normalizedSlug}.` } },
        ],
      },
      include: { settings: true },
    });
  }

  async resolveSchoolByHostname(hostname?: string | null) {
    const normalizedHost = this.normalizeHostname(hostname);
    if (!normalizedHost) return null;

    const byCustomDomain = await this.findByCustomDomain(normalizedHost);
    if (byCustomDomain) {
      const settings = this.settingsToMap(byCustomDomain.settings);
      return {
        school: { ...byCustomDomain, settings },
        settings,
        branding: this.buildSchoolBranding(settings),
        resolvedBy: 'customDomain' as const,
      };
    }

    const bySubdomain = await this.findBySubdomain(normalizedHost);
    if (bySubdomain) {
      const settings = this.settingsToMap(bySubdomain.settings);
      return {
        school: { ...bySubdomain, settings },
        settings,
        branding: this.buildSchoolBranding(settings),
        resolvedBy: 'subdomain' as const,
      };
    }

    return null;
  }

  async resolveSchoolBySlug(slug?: string | null) {
    const normalizedSlug = normalizeValue(slug);
    if (!normalizedSlug) return null;

    const school = await this.findBySlug(normalizedSlug);
    if (!school) return null;

    const settings = this.settingsToMap(school.settings);
    return {
      school: { ...school, settings },
      settings,
      branding: this.buildSchoolBranding(settings),
      resolvedBy: 'slug' as const,
    };
  }

  async resolveSchoolById(schoolId?: string | null) {
    if (!schoolId) return null;
    const school = await this.loadSchool(schoolId);
    if (!school) return null;

    const settings = school.settings ?? {};
    return {
      school,
      settings,
      branding: this.buildSchoolBranding(settings),
      resolvedBy: 'tokenSchool' as const,
    };
  }

  async resolveTenant(req: Request, payload?: Record<string, any> | null): Promise<ResolvedTenant> {
    const hostname = this.extractHostname(req);
    const portalSlug = normalizeValue((req.query as Record<string, any>)?.portalSlug);
    const scope: TenantScope = payload?.scope === 'superadmin' ? 'superadmin' : 'school';

    if (scope === 'superadmin') {
      return {
        scope,
        hostname,
        userId: payload?.sub,
        role: payload?.role,
      };
    }

    const resolvedByHostname = await this.resolveSchoolByHostname(hostname);
    const resolvedBySlug = await this.resolveSchoolBySlug(portalSlug);
    const resolvedByToken = await this.resolveSchoolById(payload?.schoolId);
    const schoolPayload = resolvedByHostname ?? resolvedBySlug ?? resolvedByToken;

    if (!schoolPayload?.school) {
      return {
        scope,
        hostname,
        portalSlug: portalSlug || undefined,
        userId: payload?.sub,
        role: payload?.role,
      };
    }

    return {
      scope,
      hostname,
      portalSlug: portalSlug || undefined,
      resolvedBy: schoolPayload.resolvedBy,
      schoolId: schoolPayload.school.id,
      school: schoolPayload.school,
      settings: schoolPayload.settings,
      branding: schoolPayload.branding ?? this.buildSchoolBranding(schoolPayload.settings ?? {}),
      userId: payload?.sub,
      role: payload?.role,
    };
  }

  async buildTenantPayload(tenant: ResolvedTenant) {
    if (!tenant.school) {
      return {
        success: true,
        data: {
          scope: tenant.scope,
          hostname: tenant.hostname,
          portalSlug: tenant.portalSlug,
          resolvedBy: tenant.resolvedBy,
        },
      };
    }

    const { settings = {}, school, branding, ...rest } = tenant;
    return {
      success: true,
      data: {
        ...rest,
        school,
        settings,
        branding: branding ?? this.buildSchoolBranding(settings),
      },
    };
  }
}
