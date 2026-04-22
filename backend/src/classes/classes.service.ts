import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: any) {
    const exists = await this.prisma.class.findUnique({ where: { name: dto.name } });
    if (exists) throw new ConflictException(`Class ${dto.name} already exists`);
    const cls = await this.prisma.class.create({ data: dto });
    return { success: true, message: 'Class created', data: cls };
  }

  async findAll(query: any) {
    const where: any = {};
    if (query.grade) where.grade = query.grade;
    const classes = await this.prisma.class.findMany({ where, orderBy: { name: 'asc' } });
    return { success: true, data: classes };
  }

  async findOne(id: string) {
    const cls = await this.prisma.class.findUnique({ where: { id } });
    if (!cls) throw new NotFoundException('Class not found');
    return { success: true, data: cls };
  }

  async update(id: string, dto: any) {
    const cls = await this.prisma.class.findUnique({ where: { id } });
    if (!cls) throw new NotFoundException('Class not found');
    const updated = await this.prisma.class.update({ where: { id }, data: dto });
    return { success: true, message: 'Class updated', data: updated };
  }

  async remove(id: string) {
    const cls = await this.prisma.class.findUnique({ where: { id } });
    if (!cls) throw new NotFoundException('Class not found');
    await this.prisma.class.delete({ where: { id } });
    return { success: true, message: 'Class deleted' };
  }
}
