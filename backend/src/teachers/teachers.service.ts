import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenancy/tenant-context.service';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

@Injectable()
export class TeachersService {
  constructor(
    private prisma: PrismaService,
    private readonly tenant: TenantContextService,
  ) {}

  private getSchoolId() {
    const schoolId = this.tenant.get().schoolId;
    if (!schoolId) throw new ForbiddenException('School tenant not found');
    return schoolId;
  }

  async create(dto: any) {
    const schoolId = this.getSchoolId();
    const exists = await this.prisma.user.findFirst({ where: { schoolId, email: dto.email } });
    if (exists) throw new ConflictException('Email already registered');
    const codeExists = await this.prisma.teacher.findFirst({ where: { schoolId, employeeCode: dto.employeeCode } });
    if (codeExists) throw new ConflictException('Employee code already exists');

    const user = await this.prisma.user.create({
      data: {
        schoolId,
        email: dto.email, name: dto.name, role: Role.TEACHER,
        password: await bcrypt.hash(dto.password || 'Teacher@1234', 10),
        teacher: { create: {
          schoolId,
          employeeCode: dto.employeeCode, subject: dto.subject,
          assignedClasses: dto.assignedClasses, phone: dto.phone,
          qualification: dto.qualification, experience: dto.experience,
          salary: dto.salary || 0,
        }},
      },
      include: { teacher: true },
    });
    return { success: true, message: 'Teacher created', data: user };
  }

  async findAll(query: any) {
    const schoolId = this.getSchoolId();
    const where: any = { schoolId };
    if (query.subject) where.subject = query.subject;
    if (query.search) where.user = { name: { contains: query.search, mode: 'insensitive' } };

    const teachers = await this.prisma.teacher.findMany({
      where, include: { user: { select: { name: true, email: true, isActive: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return { success: true, data: teachers };
  }

  async findOne(id: string) {
    const schoolId = this.getSchoolId();
    const t = await this.prisma.teacher.findFirst({
      where: { id, schoolId }, include: { user: { select: { name: true, email: true } }, homework: true },
    });
    if (!t) throw new NotFoundException('Teacher not found');
    return { success: true, data: t };
  }

  async update(id: string, dto: any) {
    const schoolId = this.getSchoolId();
    const t = await this.prisma.teacher.findFirst({ where: { id, schoolId } });
    if (!t) throw new NotFoundException('Teacher not found');
    const updated = await this.prisma.teacher.update({
      where: { id },
      data: { subject: dto.subject, assignedClasses: dto.assignedClasses,
               phone: dto.phone, qualification: dto.qualification,
               experience: dto.experience, salary: dto.salary },
    });
    if (dto.name) await this.prisma.user.update({ where: { id: t.userId }, data: { name: dto.name } });
    return { success: true, message: 'Teacher updated', data: updated };
  }

  async remove(id: string) {
    const schoolId = this.getSchoolId();
    const t = await this.prisma.teacher.findFirst({ where: { id, schoolId } });
    if (!t) throw new NotFoundException('Teacher not found');
    await this.prisma.user.delete({ where: { id: t.userId } });
    return { success: true, message: 'Teacher deleted' };
  }
}
