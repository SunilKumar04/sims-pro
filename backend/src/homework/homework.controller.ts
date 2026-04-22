import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { HomeworkService } from './homework.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Homework') @ApiBearerAuth('JWT-Auth')
@UseGuards(JwtAuthGuard, RolesGuard) @Controller('homework')
export class HomeworkController {
  constructor(private s: HomeworkService) {}

  @Post()
  @Roles('ADMIN','TEACHER')
  create(@Body() dto: any, @CurrentUser() u: any) {
    const teacherId = u.teacherId || u.id;
    if (!teacherId) throw new BadRequestException('Teacher ID not found in token');
    return this.s.create(dto, teacherId);
  }

  @Get()
  @Roles('ADMIN','TEACHER','STUDENT')
  findAll(@Query() q: any) { return this.s.findAll(q); }

  @Get(':id')
  @Roles('ADMIN','TEACHER','STUDENT')
  findOne(@Param('id') id: string) { return this.s.findOne(id); }

  @Patch(':id')
  @Roles('ADMIN','TEACHER')
  update(@Param('id') id: string, @Body() dto: any) { return this.s.update(id, dto); }

  @Delete(':id')
  @Roles('ADMIN','TEACHER')
  remove(@Param('id') id: string) { return this.s.remove(id); }
}
