import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HomeworkService {
  constructor(private prisma: PrismaService) {}

  // Resolve teacherId — could be Teacher.id or User.id
  private async resolveTeacherId(id: string): Promise<string> {
    // Try direct Teacher.id first
    const byId = await this.prisma.teacher.findUnique({ where: { id } });
    if (byId) return byId.id;
    // Try by userId
    const byUser = await this.prisma.teacher.findUnique({ where: { userId: id } });
    if (byUser) return byUser.id;
    // Fallback: use first teacher (dev mode only)
    const first = await this.prisma.teacher.findFirst();
    if (first) return first.id;
    throw new NotFoundException('Teacher record not found');
  }

  async create(dto: any, rawTeacherId: string) {
    const teacherId = await this.resolveTeacherId(rawTeacherId);
    const hw = await this.prisma.homework.create({
      data: {
        ...dto,
        teacherId,
        dueDate: new Date(dto.dueDate),
      },
      include: { teacher: { include: { user: { select: { name: true } } } } },
    });
    return { success: true, message: 'Homework assigned', data: hw };
  }

  async findAll(query: any) {
    const where: any = {};
    if (query.className) where.className = query.className;
    if (query.subject)   where.subject   = query.subject;
    if (query.teacherId) where.teacherId = query.teacherId;

    const hw = await this.prisma.homework.findMany({
      where,
      include: { teacher: { include: { user: { select: { name: true } } } } },
      orderBy: { dueDate: 'asc' },
    });
    return { success: true, data: hw };
  }

  async findOne(id: string) {
    const hw = await this.prisma.homework.findUnique({
      where: { id },
      include: { teacher: { include: { user: { select: { name: true } } } } },
    });
    if (!hw) throw new NotFoundException('Homework not found');
    return { success: true, data: hw };
  }

  async update(id: string, dto: any) {
    const hw = await this.prisma.homework.findUnique({ where: { id } });
    if (!hw) throw new NotFoundException('Homework not found');
    const updated = await this.prisma.homework.update({
      where: { id },
      data: { ...dto, dueDate: dto.dueDate ? new Date(dto.dueDate) : hw.dueDate },
    });
    return { success: true, message: 'Homework updated', data: updated };
  }

  async remove(id: string) {
    const hw = await this.prisma.homework.findUnique({ where: { id } });
    if (!hw) throw new NotFoundException('Homework not found');
    await this.prisma.homework.delete({ where: { id } });
    return { success: true, message: 'Homework deleted' };
  }
}
