import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Dashboard') @ApiBearerAuth('JWT-Auth')
@UseGuards(JwtAuthGuard, RolesGuard) @Controller('dashboard')
export class DashboardController {
  constructor(private s: DashboardService) {}

  @Get('admin') @Roles('ADMIN')
  getAdminStats() { return this.s.getAdminStats(); }

  @Get('teacher') @Roles('ADMIN','TEACHER')
  getTeacherStats(@CurrentUser() u: any) {
    // teacherId from JWT; fallback to userId for resolution
    return this.s.getTeacherStats(u.teacherId || u.id);
  }

  @Get('student') @Roles('ADMIN','STUDENT','PARENT')
  getStudentStats(@CurrentUser() u: any) {
    // studentId from JWT; fallback to userId for resolution
    return this.s.getStudentStats(u.studentId || u.id);
  }
}
