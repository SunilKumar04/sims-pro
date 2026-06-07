import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { CurrentTenant } from './current-tenant.decorator';
import { TenantContextService } from './tenant-context.service';
import { TenantResolutionService } from './tenant-resolution.service';

@Controller('tenant')
export class TenantController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly tenantResolver: TenantResolutionService,
  ) {}

  @Get()
  async getTenant(@Req() req: Request, @CurrentTenant() tenant?: Record<string, any>) {
    const resolvedTenant = tenant ? this.tenantContext.get() : await this.tenantResolver.resolveTenant(req);

    return this.tenantResolver.buildTenantPayload(resolvedTenant as any);
  }
}
