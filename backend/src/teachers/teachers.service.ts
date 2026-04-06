import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

@Injectable()
export class TeachersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: any) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already registered');
    const codeExists = await this.prisma.teacher.findUnique({ where: { employeeCode: dto.employeeCode } });
    if (codeExists) throw new ConflictException('Employee code already exists');

    const user = await this.prisma.user.create({
      data: {
        email: dto.email, name: dto.name, role: Role.TEACHER,
        password: await bcrypt.hash(dto.password || 'Teacher@1234', 10),
        teacher: { create: {
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
    const where: any = {};
    if (query.subject) where.subject = query.subject;
    if (query.search) where.user = { name: { contains: query.search, mode: 'insensitive' } };

    const teachers = await this.prisma.teacher.findMany({
      where, include: { user: { select: { name: true, email: true, isActive: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return { success: true, data: teachers };
  }

  async findOne(id: string) {
    const t = await this.prisma.teacher.findUnique({
      where: { id }, include: { user: { select: { name: true, email: true } }, homework: true },
    });
    if (!t) throw new NotFoundException('Teacher not found');
    return { success: true, data: t };
  }

  async update(id: string, dto: any) {
    const t = await this.prisma.teacher.findUnique({ where: { id } });
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
    const t = await this.prisma.teacher.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Teacher not found');
    await this.prisma.user.delete({ where: { id: t.userId } });
    return { success: true, message: 'Teacher deleted' };
  }
}
