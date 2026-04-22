// src/students/students.controller.ts
import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { QueryStudentDto } from './dto/query-student.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Students')
@ApiBearerAuth('JWT-Auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('students')
export class StudentsController {
  constructor(private service: StudentsService) {}

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new student (Admin only)' })
  create(@Body() dto: CreateStudentDto) { return this.service.create(dto); }

  @Get()
  @Roles('ADMIN', 'TEACHER')
  @ApiOperation({ summary: 'Get all students with filters' })
  findAll(@Query() query: QueryStudentDto) { return this.service.findAll(query); }

  @Get('stats')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get student statistics' })
  getStats() { return this.service.getStats(); }

  @Get(':id')
  @Roles('ADMIN', 'TEACHER', 'STUDENT')
  @ApiOperation({ summary: 'Get student by ID' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update student details' })
  update(@Param('id') id: string, @Body() dto: UpdateStudentDto) { return this.service.update(id, dto); }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete student' })
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
