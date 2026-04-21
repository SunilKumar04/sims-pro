// src/students/students.service.ts
import {
  Injectable, NotFoundException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { QueryStudentDto } from './dto/query-student.dto';
import { buildInitialFeeData } from '../fees/fee-defaults';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateStudentDto) {
    // Check roll uniqueness
    const rollExists = await this.prisma.student.findUnique({ where: { roll: dto.roll } });
    if (rollExists) throw new ConflictException(`Roll number ${dto.roll} already exists`);

    const emailExists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (emailExists) throw new ConflictException('Email already registered');

    const hashed = await bcrypt.hash(dto.password || 'Student@1234', 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: dto.email,
          password: hashed,
          name: dto.name,
          role: Role.STUDENT,
          student: {
            create: {
              roll: dto.roll,
              className: dto.className,
              phone: dto.phone,
              parentName: dto.parentName,
              parentPhone: dto.parentPhone || '',
              address: dto.address,
              dob: new Date(dto.dob),
            },
          },
        },
        include: { student: true },
      });

      if (createdUser.student?.id) {
        await tx.fee.create({
          data: buildInitialFeeData(createdUser.student.id, createdUser.student.className),
        });
      }

      return createdUser;
    });

    return { success: true, message: 'Student created successfully', data: this.formatStudent(user) };
  }

  async findAll(query: QueryStudentDto) {
    const { className, feeStatus, search, page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (className) where.className = className;
    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { roll: { contains: search, mode: 'insensitive' } },
        { parentName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [students, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        include: { user: { select: { name: true, email: true, isActive: true } }, fees: { orderBy: { createdAt: 'desc' }, take: 1 } },
        skip,
        take: limit,
        orderBy: { roll: 'asc' },
      }),
      this.prisma.student.count({ where }),
    ]);

    const data = students
      .filter(s => !feeStatus || s.fees[0]?.status === feeStatus.toUpperCase())
      .map(s => ({
        id: s.id,
        name: s.user.name,
        email: s.user.email,
        roll: s.roll,
        className: s.className,
        phone: s.phone,
        parentName: s.parentName,
        parentPhone: s.parentPhone,
        address: s.address,
        dob: s.dob,
        isActive: s.user.isActive,
        feeStatus: s.fees[0]?.status || 'PENDING',
        createdAt: s.createdAt,
      }));

    return { success: true, data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const s = await this.prisma.student.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true, isActive: true } },
        fees: true,
        attendance: { orderBy: { date: 'desc' }, take: 30 },
        marks: true,
      },
    });
    if (!s) throw new NotFoundException('Student not found');
    return { success: true, data: s };
  }

  async update(id: string, dto: UpdateStudentDto) {
    const s = await this.prisma.student.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Student not found');

    const updateData: any = {};
    if (dto.className) updateData.className = dto.className;
    if (dto.phone) updateData.phone = dto.phone;
    if (dto.parentName) updateData.parentName = dto.parentName;
    if (dto.parentPhone) updateData.parentPhone = dto.parentPhone;
    if (dto.address) updateData.address = dto.address;
    if (dto.dob) updateData.dob = new Date(dto.dob);

    const student = await this.prisma.student.update({
      where: { id },
      data: updateData,
      include: { user: { select: { name: true, email: true } } },
    });

    // Update name in user if provided
    if (dto.name) {
      await this.prisma.user.update({ where: { id: s.userId }, data: { name: dto.name } });
    }

    return { success: true, message: 'Student updated', data: student };
  }

  async remove(id: string) {
    const s = await this.prisma.student.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Student not found');
    await this.prisma.user.delete({ where: { id: s.userId } });
    return { success: true, message: 'Student deleted successfully' };
  }

  async getStats() {
    const [total, byClass, feeStats] = await Promise.all([
      this.prisma.student.count(),
      this.prisma.student.groupBy({ by: ['className'], _count: true }),
      this.prisma.fee.groupBy({ by: ['status'], _count: true, _sum: { paid: true, amount: true } }),
    ]);
    return { success: true, data: { total, byClass, feeStats } };
  }

  private formatStudent(user: any) {
    return {
      id: user.student?.id,
      name: user.name,
      email: user.email,
      role: user.role,
      ...user.student,
    };
  }
}
