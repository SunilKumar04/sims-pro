import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Attendance') @ApiBearerAuth('JWT-Auth')
@UseGuards(JwtAuthGuard, RolesGuard) @Controller('attendance')
export class AttendanceController {
  constructor(private s: AttendanceService) {}
  @Post('bulk') @Roles('ADMIN','TEACHER') markBulk(@Body() dto: any) { return this.s.markBulk(dto); }
  @Get('class/:className') @Roles('ADMIN','TEACHER') getByClass(@Param('className') cls: string, @Query('date') date: string) { return this.s.getByClass(cls, date || new Date().toISOString().slice(0,10)); }
  @Get('student/:studentId') @Roles('ADMIN','TEACHER','STUDENT','PARENT') getStudent(@Param('studentId') id: string, @Query('month') m: number, @Query('year') y: number) { return this.s.getStudentAttendance(id, m, y); }
  @Get('class/:className/summary') @Roles('ADMIN','TEACHER') getSummary(@Param('className') cls: string) { return this.s.getClassSummary(cls); }
}
