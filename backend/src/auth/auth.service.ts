// src/auth/auth.service.ts
import {
  Injectable, UnauthorizedException, ConflictException,
  NotFoundException, BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenancy/tenant-context.service';
import { TenantResolutionService } from '../tenancy/tenant-resolution.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private readonly tenantContext: TenantContextService,
    private readonly tenantResolver: TenantResolutionService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');
    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new UnauthorizedException('Invalid credentials');
    const { password: _, ...result } = user;
    return result;
  }

  async login(dto: LoginDto) {
    const tenant = this.tenantContext.get();
    const portalTenant = !tenant.schoolId && dto.portalSlug
      ? await this.tenantResolver.resolveSchoolBySlug(dto.portalSlug)
      : null;
    const resolvedSchoolId = tenant.schoolId ?? portalTenant?.school?.id;

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { student: true, teacher: true },
    });
    if (!user || !user.isActive || user.role === Role.SUPER_ADMIN) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (resolvedSchoolId && user.schoolId && user.schoolId !== resolvedSchoolId) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const match = await bcrypt.compare(dto.password, user.password);
    if (!match) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

    return this.issueTokens(user, 'school', user.schoolId ?? resolvedSchoolId ?? undefined);
  }

  async superAdminLogin(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !user.isActive || user.role !== Role.SUPER_ADMIN) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const match = await bcrypt.compare(dto.password, user.password);
    if (!match) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
    return this.issueTokens(user, 'superadmin');
  }

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already registered');
    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { email: dto.email, password: hashed, name: dto.name, role: dto.role || Role.STUDENT },
    });
    const { password: _, ...result } = user;
    return { success: true, message: 'User registered successfully', user: result };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { student: true, teacher: true },
    });
    if (!user) throw new NotFoundException('User not found');
    const { password: _, refreshToken: __, resetToken: ___, resetTokenExpiry: ____, ...rest } = user;

    let profile: Record<string, any> = { id: rest.id, name: rest.name, email: rest.email, role: rest.role };
    if (user.role === Role.STUDENT && user.student) {
      profile = { ...profile, studentId: user.student.id, className: user.student.className, roll: user.student.roll };
    } else if (user.teacher) {
      profile = { ...profile, teacherId: user.teacher.id, employeeCode: user.teacher.employeeCode };
    }
    return profile;
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const match = await bcrypt.compare(dto.currentPassword, user.password);
    if (!match) throw new BadRequestException('Current password is incorrect');
    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    return { success: true, message: 'Password changed successfully' };
  }

  async getCurrentSchool(user: { schoolId?: string }) {
    const tenantSchoolId = this.tenantContext.get().schoolId ?? user?.schoolId;
    if (!tenantSchoolId) throw new BadRequestException('School tenant not found');

    const tenant = await this.tenantResolver.resolveSchoolById(tenantSchoolId);
    if (!tenant?.school) throw new NotFoundException('School not found');

    return {
      success: true,
      data: {
        school: tenant.school,
        settings: tenant.settings ?? {},
        branding: tenant.branding ?? this.tenantResolver.buildSchoolBranding(tenant.settings ?? {}),
      },
    };
  }

  async updateCurrentSchool(user: { schoolId?: string }, dto: any) {
    const tenantSchoolId = this.tenantContext.get().schoolId ?? user?.schoolId;
    if (!tenantSchoolId) throw new BadRequestException('School tenant not found');

    const school = await this.prisma.school.findUnique({
      where: { id: tenantSchoolId },
    });
    if (!school) throw new NotFoundException('School not found');

    const schoolData = {
      name: dto.name ?? school.name,
      schoolCode: dto.schoolCode ?? school.schoolCode,
      subdomain: dto.subdomain ?? school.subdomain,
      customDomain: dto.customDomain ?? school.customDomain,
      contactPerson: dto.principal ?? dto.contactPerson ?? school.contactPerson,
      email: dto.email ?? school.email,
      phone: dto.phone ?? school.phone,
      address: dto.address ?? school.address,
    };

    const updatedSchool = await this.prisma.school.update({
      where: { id: school.id },
      data: schoolData,
    });

    const settingsEntries = [
      ['short', dto.short],
      ['cbseCode', dto.cbseCode],
      ['estd', dto.estd],
      ['board', dto.board],
      ['feeStructure', dto.feeStructure],
    ].filter(([, value]) => value !== undefined && value !== null && value !== '');

    await Promise.all(settingsEntries.map(([key, value]) =>
      this.prisma.schoolSetting.upsert({
        where: {
          schoolId_key: {
            schoolId: school.id,
            key,
          },
        },
        update: { value },
        create: { schoolId: school.id, key, value },
      })
    ));

    return {
      success: true,
      data: {
        school: updatedSchool,
        settings: Object.fromEntries(settingsEntries),
      },
    };
  }

  // ── Forgot Password ───────────────────────────────────────────
  // Generates a 6-digit OTP-style reset token valid for 15 minutes.
  // In a real deployment wire this to an email service.
  // For now it returns the token in the response (dev mode) and logs it.
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    // Always return success — never leak whether email exists
    if (!user || !user.isActive) {
      return {
        success: true,
        message: 'If that email is registered, a reset code has been sent.',
      };
    }

    // Generate 6-digit code
    const token  = crypto.randomInt(100000, 999999).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.prisma.user.update({
      where: { id: user.id },
      data:  { resetToken: token, resetTokenExpiry: expiry },
    });

    // ── TODO: replace this with a real email service ──
    // e.g. await this.mailerService.sendMail({ to: user.email, subject: 'Reset Code', text: `Your code: ${token}` });
    console.log(`\n🔑 RESET CODE for ${user.email}: ${token} (valid 15 min)\n`);

    return {
      success: true,
      message: 'Reset code generated. Check server logs (or email if configured).',
      // Remove `resetToken` from response in production!
      resetToken: process.env.NODE_ENV !== 'production' ? token : undefined,
    };
  }

  // ── Reset Password with token ─────────────────────────────────
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: { resetToken: dto.token },
    });

    if (!user) throw new BadRequestException('Invalid or expired reset code');

    if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      // Clear expired token
      await this.prisma.user.update({ where: { id: user.id }, data: { resetToken: null, resetTokenExpiry: null } });
      throw new BadRequestException('Reset code has expired. Please request a new one.');
    }

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data:  { password: hashed, resetToken: null, resetTokenExpiry: null },
    });

    return { success: true, message: 'Password reset successfully. You can now log in.' };
  }

  private async issueTokens(user: any, scope: 'school' | 'superadmin' = 'school', schoolIdOverride?: string) {
    const effectiveSchoolId = schoolIdOverride ?? user.schoolId ?? this.tenantContext.get().schoolId ?? undefined;
    let profile: Record<string, any> = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      schoolId: effectiveSchoolId,
      scope,
    };

    if (user.role === Role.STUDENT && user.student) {
      profile = {
        ...profile,
        studentId: user.student.id,
        className: user.student.className,
        roll: user.student.roll,
        parentName: user.student.parentName,
        phone: user.student.phone,
      };
    } else if ((user.role === Role.TEACHER || user.role === Role.ADMIN) && user.teacher) {
      profile = {
        ...profile,
        teacherId: user.teacher.id,
        employeeCode: user.teacher.employeeCode,
        subject: user.teacher.subject,
        assignedClasses: user.teacher.assignedClasses,
      };
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      scope,
      schoolId: effectiveSchoolId,
      studentId: user.student?.id ?? undefined,
      teacherId: user.teacher?.id ?? undefined,
      className: user.student?.className ?? undefined,
      roll: user.student?.roll ?? undefined,
    };

    const accessToken = this.jwt.sign(payload);
    const school = effectiveSchoolId ? await this.tenantResolver.resolveSchoolById(effectiveSchoolId) : null;
    return {
      success: true,
      message: 'Login successful',
      accessToken,
      user: profile,
      school: school?.school ?? null,
      settings: school?.settings ?? {},
      branding: school?.branding ?? (school?.settings ? this.tenantResolver.buildSchoolBranding(school.settings) : undefined),
    };
  }
}
