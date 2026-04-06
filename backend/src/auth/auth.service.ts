// src/auth/auth.service.ts
import {
  Injectable, UnauthorizedException, ConflictException,
  NotFoundException, BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
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
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { student: true, teacher: true },
    });

    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');
    const match = await bcrypt.compare(dto.password, user.password);
    if (!match) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // ── Build JWT payload with related entity IDs ──
    const payload: any = {
      sub:   user.id,
      email: user.email,
      role:  user.role,
      name:  user.name,
    };
    if (user.role === Role.STUDENT && user.student) {
      payload.studentId = user.student.id;
      payload.className = user.student.className;
      payload.roll      = user.student.roll;
    }
    if (user.role === Role.TEACHER && user.teacher) {
      payload.teacherId = user.teacher.id;
      payload.subject   = user.teacher.subject;
    }

    const accessToken = this.jwt.sign(payload);

    // ── Build user profile ──
    const profile: any = {
      id:    user.id,
      name:  user.name,
      email: user.email,
      role:  user.role,
    };
    if (user.student) {
      profile.studentId  = user.student.id;
      profile.className  = user.student.className;
      profile.roll       = user.student.roll;
      profile.parentName = user.student.parentName;
      profile.phone      = user.student.phone;
    }
    if (user.teacher) {
      profile.teacherId       = user.teacher.id;
      profile.subject         = user.teacher.subject;
      profile.employeeCode    = user.teacher.employeeCode;
      profile.assignedClasses = user.teacher.assignedClasses;
    }

    return { success: true, message: 'Login successful', accessToken, user: profile };
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
    const { password: _, refreshToken: __, ...result } = user;
    return result;
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const match = await bcrypt.compare(dto.currentPassword, user.password);
    if (!match) throw new BadRequestException('Current password is incorrect');
    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { password: hashed } });
    return { success: true, message: 'Password changed successfully' };
  }
}
