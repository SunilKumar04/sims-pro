import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContextService } from './tenant-context.service';
import { TenantResolutionService } from './tenant-resolution.service';

function decodeJwtPayload(token: string): Record<string, any> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(payload, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly tenantResolver: TenantResolutionService,
  ) {}

  async use(req: Request & { tenant?: Record<string, any>; school?: Record<string, any> }, _res: Response, next: NextFunction) {
    try {
      const requestPath = String((req as any).originalUrl || req.url || '');
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
      const payload = token ? decodeJwtPayload(token) : null;

      if (requestPath.includes('/superadmin') && payload?.scope !== 'superadmin') {
        const tenant = {
          scope: 'superadmin',
          hostname: this.tenantResolver.extractHostname(req),
          userId: payload?.sub,
          role: payload?.role,
        };
        req.tenant = tenant as any;
        this.tenantContext.run(tenant as any, () => next());
        return;
      }

      const tenant = await this.tenantResolver.resolveTenant(req, payload);

      req.tenant = tenant as any;
      if (tenant.school) {
        req.school = tenant.school;
      }

      this.tenantContext.run(tenant, () => next());
    } catch (error) {
      next(error as Error);
    }
  }
}
