import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TeachersService } from './teachers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Teachers') @ApiBearerAuth('JWT-Auth')
@UseGuards(JwtAuthGuard, RolesGuard) @Controller('teachers')
export class TeachersController {
  constructor(private s: TeachersService) {}
  @Post() @Roles('ADMIN') create(@Body() dto: any) { return this.s.create(dto); }
  @Get() @Roles('ADMIN','TEACHER') findAll(@Query() q: any) { return this.s.findAll(q); }
  @Get(':id') @Roles('ADMIN','TEACHER') findOne(@Param('id') id: string) { return this.s.findOne(id); }
  @Patch(':id') @Roles('ADMIN') update(@Param('id') id: string, @Body() dto: any) { return this.s.update(id, dto); }
  @Delete(':id') @Roles('ADMIN') remove(@Param('id') id: string) { return this.s.remove(id); }
}
