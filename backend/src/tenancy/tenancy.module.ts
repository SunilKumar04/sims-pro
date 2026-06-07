import { Global, Module } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { TenantMiddleware } from './tenant.middleware';
import { TenantResolutionService } from './tenant-resolution.service';
import { TenantController } from './tenant.controller';

@Global()
@Module({
  controllers: [TenantController],
  providers: [TenantContextService, TenantMiddleware, TenantResolutionService],
  exports: [TenantContextService, TenantMiddleware, TenantResolutionService],
})
export class TenancyModule {}
