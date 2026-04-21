import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Sessions') @ApiBearerAuth('JWT-Auth')
@UseGuards(JwtAuthGuard, RolesGuard) @Controller('sessions')
export class SessionsController {
  constructor(private s: SessionsService) {}

  @Post()
  @Roles('ADMIN', 'TEACHER')
  create(@Body() dto: any, @CurrentUser() u: any) { return this.s.create(dto, u.teacherId || u.id); }

  @Get('today')
  @Roles('ADMIN', 'TEACHER')
  getToday(@CurrentUser() u: any) { return this.s.getToday(u.teacherId || u.id); }

  @Get('student/today')
  @Roles('STUDENT', 'PARENT')
  getStudentToday(@CurrentUser() u: any) { return this.s.getStudentToday(u.studentId || u.id, u.className); }

  @Get('student/summary')
  @Roles('STUDENT', 'PARENT')
  getMyStudentSummary(@CurrentUser() u: any, @Query('className') cls?: string) {
    return this.s.getStudentSummary(u.studentId || u.id, cls || u.className);
  }

  @Get('student/:id/summary')
  @Roles('ADMIN', 'TEACHER', 'STUDENT', 'PARENT')
  getStudentSummary(@Param('id') id: string, @Query('className') cls?: string) {
    return this.s.getStudentSummary(id, cls);
  }

  @Get(':id/students')
  @Roles('ADMIN', 'TEACHER')
  getSessionStudents(@Param('id') id: string) { return this.s.getSessionStudents(id); }

  @Post(':id/mark')
  @Roles('ADMIN', 'TEACHER')
  markBulk(@Param('id') id: string, @Body('records') records: any[]) { return this.s.markBulk(id, records || []); }

  @Patch(':id/lock')
  @Roles('ADMIN', 'TEACHER')
  lock(@Param('id') id: string) { return this.s.lock(id); }

  @Get(':id')
  @Roles('ADMIN', 'TEACHER')
  getOne(@Param('id') id: string) { return this.s.getOne(id); }

  @Get()
  @Roles('ADMIN', 'TEACHER')
  getAll(@Query() q: any, @CurrentUser() u: any) { return this.s.getAll(q, u.teacherId || u.id); }
}
