import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SuperAdminService } from './superadmin.service';
import { SuperAdminController } from './superadmin.controller';
import { SuperAdminAuthController } from './auth/superadmin-auth.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SuperAdminController, SuperAdminAuthController],
  providers: [SuperAdminService],
  exports: [SuperAdminService],
})
export class SuperAdminModule {}
