import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TimetableService } from './timetable.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Timetable') @ApiBearerAuth('JWT-Auth')
@UseGuards(JwtAuthGuard, RolesGuard) @Controller('timetable')
export class TimetableController {
  constructor(private s: TimetableService) {}
  @Post('mapping')           @Roles('ADMIN')                    createMapping(@Body() dto: any)                   { return this.s.createMapping(dto); }
  @Get('mapping')            @Roles('ADMIN','TEACHER','STUDENT') getMappings(@Query('className') cls?: string)    { return this.s.getMappings(cls); }
  @Delete('mapping/:id')     @Roles('ADMIN')                    deleteMapping(@Param('id') id: string)            { return this.s.deleteMapping(id); }
  @Post('slot')              @Roles('ADMIN')                    upsertSlot(@Body() dto: any)                      { return this.s.upsertSlot(dto); }
  @Get('class/:className')   @Roles('ADMIN','TEACHER','STUDENT') getClassTimetable(@Param('className') cls: string){ return this.s.getClassTimetable(cls); }
  @Get('teacher/me')         @Roles('ADMIN','TEACHER')           getMyTimetable(@CurrentUser() u: any)            { return this.s.getTeacherTimetable(u.teacherId || u.id); }
  @Get('teacher/:teacherId') @Roles('ADMIN')                    getTeacherTimetable(@Param('teacherId') id: string){ return this.s.getTeacherTimetable(id); }
  @Delete('slot/:id')        @Roles('ADMIN')                    deleteSlot(@Param('id') id: string)               { return this.s.deleteSlot(id); }
}
