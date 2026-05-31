import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenancy/tenant-context.service';

@Injectable()
export class NoticesService {
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
    const notice = await this.prisma.notice.create({ data: { ...dto, schoolId: this.getSchoolId() } });
    return { success: true, message: 'Notice published', data: notice };
  }

  async findAll(query: any) {
    const where: any = { isPublished: true, schoolId: this.getSchoolId() };
    if (query.target && query.target !== 'All') {
      where.OR = [{ target: query.target }, { target: 'All' }];
    }
    if (query.priority) where.priority = query.priority.toUpperCase();

    const notices = await this.prisma.notice.findMany({
      where,
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      take: query.limit ? parseInt(query.limit) : 50,
    });
    return { success: true, data: notices };
  }

  async findOne(id: string) {
    const n = await this.prisma.notice.findFirst({ where: { id, schoolId: this.getSchoolId() } });
    if (!n) throw new NotFoundException('Notice not found');
    return { success: true, data: n };
  }

  async update(id: string, dto: any) {
    const n = await this.prisma.notice.findFirst({ where: { id, schoolId: this.getSchoolId() } });
    if (!n) throw new NotFoundException('Notice not found');
    const updated = await this.prisma.notice.update({ where: { id }, data: dto });
    return { success: true, message: 'Notice updated', data: updated };
  }

  async remove(id: string) {
    const n = await this.prisma.notice.findFirst({ where: { id, schoolId: this.getSchoolId() } });
    if (!n) throw new NotFoundException('Notice not found');
    await this.prisma.notice.delete({ where: { id } });
    return { success: true, message: 'Notice deleted' };
  }
}
