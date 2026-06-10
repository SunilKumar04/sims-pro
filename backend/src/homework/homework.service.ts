import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenancy/tenant-context.service';

@Injectable()
export class HomeworkService {
  constructor(
    private prisma: PrismaService,
    private readonly tenant: TenantContextService,
  ) {}

  private getSchoolId() {
    const schoolId = this.tenant.get().schoolId;
    if (!schoolId) throw new ForbiddenException('School tenant not found');
    return schoolId;
  }

  // Resolve teacherId — could be Teacher.id or User.id
  private async resolveTeacherId(id: string): Promise<string> {
    const schoolId = this.getSchoolId();
    const candidateIds = [id, this.tenant.get().userId].filter((value): value is string => !!value);

    for (const candidate of candidateIds) {
      const byId = await this.prisma.teacher.findFirst({ where: { id: candidate, schoolId } });
      if (byId) return byId.id;
      const byUser = await this.prisma.teacher.findFirst({ where: { userId: candidate, schoolId } });
      if (byUser) return byUser.id;
    }

    const first = await this.prisma.teacher.findFirst({ where: { schoolId } });
    if (first) return first.id;
    throw new NotFoundException('Teacher record not found');
  }

  async create(dto: any, rawTeacherId: string) {
    const schoolId = this.getSchoolId();
    const teacherId = await this.resolveTeacherId(rawTeacherId);
    const hw = await this.prisma.homework.create({
      data: {
        schoolId,
        ...dto,
        teacherId,
        description: dto.description ?? '',
        dueDate: new Date(dto.dueDate),
      },
      include: { teacher: { include: { user: { select: { name: true } } } } },
    });
    return { success: true, message: 'Homework assigned', data: hw };
  }

  async findAll(query: any) {
    const where: any = { schoolId: this.getSchoolId() };
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
    const schoolId = this.getSchoolId();
    const hw = await this.prisma.homework.findFirst({
      where: { id, schoolId },
      include: { teacher: { include: { user: { select: { name: true } } } } },
    });
    if (!hw) throw new NotFoundException('Homework not found');
    return { success: true, data: hw };
  }

  async update(id: string, dto: any) {
    const hw = await this.prisma.homework.findFirst({ where: { id, schoolId: this.getSchoolId() } });
    if (!hw) throw new NotFoundException('Homework not found');
    const updated = await this.prisma.homework.update({
      where: { id },
      data: { ...dto, dueDate: dto.dueDate ? new Date(dto.dueDate) : hw.dueDate },
    });
    return { success: true, message: 'Homework updated', data: updated };
  }

  async remove(id: string) {
    const hw = await this.prisma.homework.findFirst({ where: { id, schoolId: this.getSchoolId() } });
    if (!hw) throw new NotFoundException('Homework not found');
    await this.prisma.homework.delete({ where: { id } });
    return { success: true, message: 'Homework deleted' };
  }
}
