import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FeesService } from './fees.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Fees') @ApiBearerAuth('JWT-Auth')
@UseGuards(JwtAuthGuard, RolesGuard) @Controller('fees')
export class FeesController {
  constructor(private s: FeesService) {}
  @Post() @Roles('ADMIN') create(@Body() dto: any) { return this.s.create(dto); }
  @Get() @Roles('ADMIN') findAll(@Query() q: any) { return this.s.findAll(q); }
  @Get('monthly-stats') @Roles('ADMIN') getMonthlyStats() { return this.s.getMonthlyStats(); }
  @Get('student/:studentId') @Roles('ADMIN','STUDENT','PARENT') findByStudent(@Param('studentId') id: string) { return this.s.findByStudent(id); }
  @Patch(':id/mark-paid') @Roles('ADMIN') markPaid(@Param('id') id: string) { return this.s.markPaid(id); }
  @Patch(':id/payment') @Roles('ADMIN') updatePayment(@Param('id') id: string, @Body() dto: any) { return this.s.updatePayment(id, dto); }
}
