import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContextService } from './tenant-context.service';

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
  constructor(private readonly tenantContext: TenantContextService) {}

  use(req: Request & { tenant?: Record<string, any> }, _res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const payload = token ? decodeJwtPayload(token) : null;

    const tenant = {
      scope: payload?.scope === 'superadmin' ? 'superadmin' : 'school',
      role: payload?.role,
      schoolId: payload?.schoolId,
      userId: payload?.sub,
    } as const;

    req.tenant = tenant as any;

    this.tenantContext.run(tenant, () => next());
  }
}
