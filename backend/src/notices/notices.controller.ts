import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NoticesService } from './notices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Notices') @ApiBearerAuth('JWT-Auth')
@UseGuards(JwtAuthGuard, RolesGuard) @Controller('notices')
export class NoticesController {
  constructor(private s: NoticesService) {}
  @Post() @Roles('ADMIN','TEACHER') create(@Body() dto: any) { return this.s.create(dto); }
  @Get() @Roles('ADMIN','TEACHER','STUDENT','PARENT') findAll(@Query() q: any) { return this.s.findAll(q); }
  @Get(':id') @Roles('ADMIN','TEACHER','STUDENT','PARENT') findOne(@Param('id') id: string) { return this.s.findOne(id); }
  @Patch(':id') @Roles('ADMIN','TEACHER') update(@Param('id') id: string, @Body() dto: any) { return this.s.update(id, dto); }
  @Delete(':id') @Roles('ADMIN') remove(@Param('id') id: string) { return this.s.remove(id); }
}
