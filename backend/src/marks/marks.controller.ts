import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MarksService } from './marks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Marks') @ApiBearerAuth('JWT-Auth')
@UseGuards(JwtAuthGuard, RolesGuard) @Controller('marks')
export class MarksController {
  constructor(private s: MarksService) {}

  @Post('bulk')
  @Roles('ADMIN','TEACHER')
  bulkSave(@Body() dto: any) { return this.s.bulkSave(dto); }

  @Get('class/:className')
  @Roles('ADMIN','TEACHER')
  getByClass(
    @Param('className') cls: string,
    @Query('examType') examType: string,
    @Query('year') year: number,
  ) { return this.s.getByClass(cls, examType || 'UNIT_TEST', year); }

  @Get('student/:studentId')
  @Roles('ADMIN','TEACHER','STUDENT','PARENT')
  getByStudent(@Param('studentId') id: string) { return this.s.getByStudent(id); }

  @Get('student/:studentId/report')
  @Roles('ADMIN','TEACHER','STUDENT','PARENT')
  getReport(
    @Param('studentId') id: string,
    @Query('examType') examType: string,
    @Query('year') year: number,
  ) { return this.s.getStudentReport(id, examType || 'FINAL', year); }

  @Get('me/report')
  @Roles('STUDENT','PARENT')
  getMyReport(@CurrentUser() u: any, @Query('examType') et: string, @Query('year') y: number) {
    const sid = u.studentId || u.id;
    return this.s.getStudentReport(sid, et || 'FINAL', y);
  }
}
