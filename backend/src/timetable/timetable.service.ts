import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenancy/tenant-context.service';

const INCLUDE_TEACHER = { teacher: { select: { id: true, userId: true, user: { select: { name: true } } } } };

@Injectable()
export class TimetableService {
  constructor(
    private prisma: PrismaService,
    private readonly tenant: TenantContextService,
  ) {}

  private getSchoolId() {
    const schoolId = this.tenant.get().schoolId;
    if (!schoolId) throw new ForbiddenException('School tenant not found');
    return schoolId;
  }

  async createMapping(dto: any) {
    const schoolId = this.getSchoolId();
    const data = await this.prisma.classSubjectTeacher.upsert({
      where: { schoolId_className_subject: { schoolId, className: dto.className, subject: dto.subject } },
      update: { teacherId: dto.teacherId, periodsPerWeek: dto.periodsPerWeek ?? 5, schoolId },
      create: { schoolId, className: dto.className, subject: dto.subject, teacherId: dto.teacherId, periodsPerWeek: dto.periodsPerWeek ?? 5 },
      include: INCLUDE_TEACHER,
    });
    return { success: true, data };
  }

  async getMappings(className?: string) {
    const schoolId = this.getSchoolId();
    const data = await this.prisma.classSubjectTeacher.findMany({
      where: { schoolId, ...(className ? { className } : {}) },
      include: INCLUDE_TEACHER,
      orderBy: [{ className: 'asc' }, { subject: 'asc' }],
    });
    return { success: true, data };
  }

  async deleteMapping(id: string) {
    const mapping = await this.prisma.classSubjectTeacher.findFirst({ where: { id, schoolId: this.getSchoolId() } });
    if (!mapping) throw new NotFoundException('Mapping not found');
    await this.prisma.classSubjectTeacher.delete({ where: { id } });
    return { success: true };
  }

  async upsertSlot(dto: any) {
    const schoolId = this.getSchoolId();
    const data = await this.prisma.timetableSlot.upsert({
      where: { schoolId_className_dayOfWeek_period: { schoolId, className: dto.className, dayOfWeek: dto.dayOfWeek, period: dto.period } },
      update: { schoolId, subject: dto.subject, teacherId: dto.teacherId, startTime: dto.startTime ?? '', endTime: dto.endTime ?? '', room: dto.room ?? '' },
      create: { schoolId, className: dto.className, subject: dto.subject, teacherId: dto.teacherId, dayOfWeek: dto.dayOfWeek, period: dto.period, startTime: dto.startTime ?? '', endTime: dto.endTime ?? '', room: dto.room ?? '' },
      include: INCLUDE_TEACHER,
    });
    return { success: true, data };
  }

  async getClassTimetable(className: string) {
    const schoolId = this.getSchoolId();
    const slots = await this.prisma.timetableSlot.findMany({
      where: { schoolId, className },
      include: INCLUDE_TEACHER,
      orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }],
    });
    // Group by dayOfWeek
    const grouped: Record<number, any[]> = {};
    for (const s of slots) { (grouped[s.dayOfWeek] ??= []).push(s); }
    return { success: true, data: { slots, grouped } };
  }

  async getTeacherTimetable(teacherIdOrUserId: string) {
    const schoolId = this.getSchoolId();
    // Try direct, then resolve via userId
    let tid = teacherIdOrUserId;
    const direct = await this.prisma.teacher.findFirst({ where: { id: teacherIdOrUserId, schoolId } });
    if (!direct) {
      const byUser = await this.prisma.teacher.findFirst({ where: { userId: teacherIdOrUserId, schoolId } });
      if (byUser) tid = byUser.id;
    }

    const now    = new Date();
    // JS getDay(): 0=Sun,1=Mon…6=Sat → map to our 1=Mon..6=Sat
    const jsDay  = now.getDay();
    const todayDow = jsDay === 0 ? 1 : jsDay;

    const allSlots = await this.prisma.timetableSlot.findMany({
      where: { schoolId, teacherId: tid },
      include: INCLUDE_TEACHER,
      orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }],
    });
    const todaySlots = allSlots.filter(s => s.dayOfWeek === todayDow);
    return { success: true, data: { allSlots, todaySlots, todayDow } };
  }

  async deleteSlot(id: string) {
    const slot = await this.prisma.timetableSlot.findFirst({ where: { id, schoolId: this.getSchoolId() } });
    if (!slot) throw new NotFoundException('Timetable slot not found');
    await this.prisma.timetableSlot.delete({ where: { id } });
    return { success: true };
  }
}
