import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AssignmentsService } from './assignments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Assignments') @ApiBearerAuth('JWT-Auth')
@UseGuards(JwtAuthGuard, RolesGuard) @Controller('assignments')
export class AssignmentsController {
  constructor(private s: AssignmentsService) {}
  @Post()                      @Roles('ADMIN','TEACHER')          create(@Body() dto: any, @CurrentUser() u: any)                  { return this.s.create(dto, u.teacherId || u.id); }
  @Get()                       @Roles('ADMIN','TEACHER')          getAll(@Query() q: any)                                          { return this.s.getAll(q); }
  @Get('student')              @Roles('STUDENT','PARENT')         getStudentAssignments(@CurrentUser() u: any, @Query('className') cls?: string) { return this.s.getStudentAssignments(u.studentId || u.id, cls); }
  @Get(':id')                  @Roles('ADMIN','TEACHER','STUDENT') getOne(@Param('id') id: string)                                 { return this.s.getOne(id); }
  @Patch(':id')                @Roles('ADMIN','TEACHER')          update(@Param('id') id: string, @Body() dto: any)                { return this.s.update(id, dto); }
  @Delete(':id')               @Roles('ADMIN','TEACHER')          remove(@Param('id') id: string)                                  { return this.s.remove(id); }
  @Post(':id/submit')          @Roles('STUDENT','PARENT')         submit(@Param('id') id: string, @Body() dto: any, @CurrentUser() u: any) { return this.s.submit(id, u.studentId || u.id, dto); }
  @Patch('submissions/:subId/grade') @Roles('ADMIN','TEACHER')   grade(@Param('subId') subId: string, @Body() dto: any)           { return this.s.grade(subId, dto); }
}
