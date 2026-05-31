import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SuperAdminService } from './superadmin.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { CreateSchoolAdminDto } from './dto/create-school-admin.dto';

@ApiTags('Super Admin')
@Controller('superadmin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-Auth')
export class SuperAdminController {
  constructor(private readonly service: SuperAdminService) {}

  @Get('dashboard')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Get SaaS dashboard metrics' })
  dashboard() {
    return this.service.dashboard();
  }

  @Get('analytics')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Get SaaS analytics' })
  analytics() {
    return this.service.analytics();
  }

  @Get('schools')
  @Roles('SUPER_ADMIN')
  listSchools() {
    return this.service.listSchools();
  }

  @Get('plans')
  @Roles('SUPER_ADMIN')
  listPlans() {
    return this.service.listPlans();
  }

  @Get('subscriptions')
  @Roles('SUPER_ADMIN')
  listSubscriptions() {
    return this.service.listSubscriptions();
  }

  @Get('schools/:id')
  @Roles('SUPER_ADMIN')
  getSchool(@Param('id') id: string) {
    return this.service.getSchool(id);
  }

  @Post('schools')
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  createSchool(@Body() dto: CreateSchoolDto) {
    return this.service.createSchool(dto);
  }

  @Patch('schools/:id')
  @Roles('SUPER_ADMIN')
  updateSchool(@Param('id') id: string, @Body() dto: UpdateSchoolDto) {
    return this.service.updateSchool(id, dto);
  }

  @Patch('schools/:id/activate')
  @Roles('SUPER_ADMIN')
  activate(@Param('id') id: string) {
    return this.service.activateSchool(id);
  }

  @Patch('schools/:id/suspend')
  @Roles('SUPER_ADMIN')
  suspend(@Param('id') id: string) {
    return this.service.suspendSchool(id);
  }

  @Delete('schools/:id')
  @Roles('SUPER_ADMIN')
  remove(@Param('id') id: string) {
    return this.service.deleteSchool(id);
  }

  @Get('schools/:schoolId/admins')
  @Roles('SUPER_ADMIN')
  schoolAdmins(@Param('schoolId') schoolId: string) {
    return this.service.listSchoolAdmins(schoolId);
  }

  @Post('schools/:schoolId/admins')
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  createSchoolAdmin(@Param('schoolId') schoolId: string, @Body() dto: CreateSchoolAdminDto) {
    return this.service.createSchoolAdmin(schoolId, dto);
  }

  @Patch('school-admins/:userId/password')
  @Roles('SUPER_ADMIN')
  resetSchoolAdminPassword(@Param('userId') userId: string, @Body() body: { password: string }) {
    return this.service.resetSchoolAdminPassword(userId, body.password);
  }

  @Patch('school-admins/:userId/status')
  @Roles('SUPER_ADMIN')
  setSchoolAdminStatus(@Param('userId') userId: string, @Body() body: { isActive: boolean }) {
    return this.service.setSchoolAdminStatus(userId, body.isActive);
  }

  @Post('plans')
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  createPlan(@Body() dto: CreatePlanDto) {
    return this.service.createPlan(dto);
  }

  @Patch('plans/:id')
  @Roles('SUPER_ADMIN')
  updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.service.updatePlan(id, dto);
  }
}
