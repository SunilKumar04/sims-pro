import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenancy/tenant-context.service';

@Injectable()
export class ClassesService {
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
    const exists = await this.prisma.class.findFirst({ where: { schoolId, name: dto.name } });
    if (exists) throw new ConflictException(`Class ${dto.name} already exists`);
    const cls = await this.prisma.class.create({ data: { ...dto, schoolId } });
    return { success: true, message: 'Class created', data: cls };
  }

  async findAll(query: any) {
    const where: any = { schoolId: this.getSchoolId() };
    if (query.grade) where.grade = query.grade;
    const classes = await this.prisma.class.findMany({ where, orderBy: { name: 'asc' } });
    return { success: true, data: classes };
  }

  async findOne(id: string) {
    const cls = await this.prisma.class.findFirst({ where: { id, schoolId: this.getSchoolId() } });
    if (!cls) throw new NotFoundException('Class not found');
    return { success: true, data: cls };
  }

  async update(id: string, dto: any) {
    const cls = await this.prisma.class.findFirst({ where: { id, schoolId: this.getSchoolId() } });
    if (!cls) throw new NotFoundException('Class not found');
    const updated = await this.prisma.class.update({ where: { id }, data: dto });
    return { success: true, message: 'Class updated', data: updated };
  }

  async remove(id: string) {
    const cls = await this.prisma.class.findFirst({ where: { id, schoolId: this.getSchoolId() } });
    if (!cls) throw new NotFoundException('Class not found');
    await this.prisma.class.delete({ where: { id } });
    return { success: true, message: 'Class deleted' };
  }
}
