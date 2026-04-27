// src/exams/exams.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ExamsService } from './exams.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Exams') @ApiBearerAuth('JWT-Auth')
@UseGuards(JwtAuthGuard, RolesGuard) @Controller('exams')
export class ExamsController {
  constructor(private s: ExamsService) {}

  // ── Exam CRUD ──
  @Post()     @Roles('ADMIN') create(@Body() dto: any)                          { return this.s.create(dto); }
  @Patch(':id')@Roles('ADMIN') update(@Param('id') id: string, @Body() dto: any){ return this.s.update(id, dto); }
  @Delete(':id')@Roles('ADMIN')remove(@Param('id') id: string)                  { return this.s.remove(id); }
  @Get()      @Roles('ADMIN') getAll(@Query() q: any)                           { return this.s.getAll(q); }

  // ── Exam day (admin view with all subjects + invigilators for a date) ──
  @Get('today')@Roles('ADMIN') getToday(@Query('date') date?: string)           { return this.s.getExamsByDate(date); }

  // ── Teacher: my assigned exam duties ──────────────────────────────────
  @Get('my-duties')
  @Roles('ADMIN','TEACHER')
  getMyDuties(@CurrentUser() u: any) {
    return this.s.getMyDuties(u.teacherId || u.id);
  }

  // ── Class / student facing ──
  @Get('class/:className')
  @Roles('ADMIN','TEACHER','STUDENT','PARENT')
  getByClass(@Param('className') cls: string) { return this.s.getByClass(cls); }

  @Get('class/:className/datesheet')
  @Roles('ADMIN','TEACHER','STUDENT','PARENT')
  getDatesheet(@Param('className') cls: string, @Query('examType') et: string) {
    return this.s.getDatesheet(cls, et);
  }

  // ── Date sheet entries ──
  @Post(':id/entries')     @Roles('ADMIN') addEntry(@Param('id') id: string, @Body() dto: any)          { return this.s.addEntry(id, dto); }
  @Post(':id/entries/bulk')@Roles('ADMIN') addBulk(@Param('id') id: string, @Body() body: any)          { return this.s.addBulkEntries(id, body.entries); }
  @Delete('entries/:entryId')@Roles('ADMIN') deleteEntry(@Param('entryId') id: string)                  { return this.s.deleteEntry(id); }
  @Patch(':id/publish')    @Roles('ADMIN') publish(@Param('id') id: string, @Body() body: any)          { return this.s.publish(id, body.publish !== false); }

  // ── Invigilators ──
  @Post('entries/:entryId/invigilators')
  @Roles('ADMIN')
  assignInvigilator(@Param('entryId') id: string, @Body() dto: any) { return this.s.assignInvigilator(id, dto); }

  @Delete('invigilators/:invId')
  @Roles('ADMIN')
  removeInvigilator(@Param('invId') id: string) { return this.s.removeInvigilator(id); }
}
