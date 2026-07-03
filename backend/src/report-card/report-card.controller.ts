// src/report-card/report-card.controller.ts
import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReportCardService } from './report-card.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Report Card')
@ApiBearerAuth('JWT-Auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('report-card')
export class ReportCardController {
  constructor(private svc: ReportCardService) {}

  // ── Templates ──────────────────────────────────────────
  @Get('templates')
  @Roles('ADMIN', 'TEACHER')
  getTemplates() {
    return this.svc.getTemplates();
  }

  @Get('templates/:id')
  @Roles('ADMIN', 'TEACHER')
  getTemplate(@Param('id') id: string) {
    return this.svc.getTemplate(id);
  }

  @Post('templates')
  @Roles('ADMIN')
  createTemplate(@Body() dto: any) {
    return this.svc.createTemplate(dto);
  }

  @Put('templates/:id')
  @Roles('ADMIN')
  updateTemplate(@Param('id') id: string, @Body() dto: any) {
    return this.svc.updateTemplate(id, dto);
  }

  @Delete('templates/:id')
  @Roles('ADMIN')
  deleteTemplate(@Param('id') id: string) {
    return this.svc.deleteTemplate(id);
  }

  @Post('templates/:id/duplicate')
  @Roles('ADMIN')
  duplicateTemplate(@Param('id') id: string) {
    return this.svc.duplicateTemplate(id);
  }

  // ── Marksheet Data ─────────────────────────────────────
  @Get('marksheet/student/:studentId')
  @Roles('ADMIN', 'TEACHER', 'STUDENT', 'PARENT')
  getMarksheetData(
    @Param('studentId') studentId: string,
    @Query('examType') examType: string,
    @Query('year') year: string,
    @Query('templateId') templateId?: string,
  ) {
    return this.svc.getMarksheetData(studentId, examType || 'FINAL', Number(year) || new Date().getFullYear(), templateId);
  }

  @Get('marksheet/me')
  @Roles('STUDENT', 'PARENT')
  getMyMarksheet(
    @CurrentUser() u: any,
    @Query('examType') examType: string,
    @Query('year') year: string,
    @Query('templateId') templateId?: string,
  ) {
    const sid = u.studentId || u.id;
    return this.svc.getMarksheetData(sid, examType || 'FINAL', Number(year) || new Date().getFullYear(), templateId);
  }

  @Get('marksheet/bulk')
  @Roles('ADMIN', 'TEACHER')
  getBulkMarksheetData(
    @Query('className') className: string,
    @Query('examType')  examType: string,
    @Query('year')      year: string,
    @Query('templateId') templateId?: string,
  ) {
    return this.svc.getBulkMarksheetData(
      className,
      examType || 'FINAL',
      Number(year) || new Date().getFullYear(),
      templateId,
    );
  }

  // ── Generated History ──────────────────────────────────
  @Post('marksheet/record')
  @Roles('ADMIN', 'TEACHER')
  recordGenerated(@Body() dto: any) {
    return this.svc.recordGenerated(dto);
  }

  @Get('marksheet/history')
  @Roles('ADMIN', 'TEACHER')
  getHistory(@Query() params: any) {
    return this.svc.getGeneratedHistory(params);
  }
}
