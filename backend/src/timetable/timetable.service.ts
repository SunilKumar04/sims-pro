import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const INCLUDE_TEACHER = { teacher: { select: { id: true, userId: true, user: { select: { name: true } } } } };

@Injectable()
export class TimetableService {
  constructor(private prisma: PrismaService) {}

  async createMapping(dto: any) {
    const data = await this.prisma.classSubjectTeacher.upsert({
      where: { className_subject: { className: dto.className, subject: dto.subject } },
      update: { teacherId: dto.teacherId, periodsPerWeek: dto.periodsPerWeek ?? 5 },
      create: { className: dto.className, subject: dto.subject, teacherId: dto.teacherId, periodsPerWeek: dto.periodsPerWeek ?? 5 },
      include: INCLUDE_TEACHER,
    });
    return { success: true, data };
  }

  async getMappings(className?: string) {
    const data = await this.prisma.classSubjectTeacher.findMany({
      where: className ? { className } : {},
      include: INCLUDE_TEACHER,
      orderBy: [{ className: 'asc' }, { subject: 'asc' }],
    });
    return { success: true, data };
  }

  async deleteMapping(id: string) {
    await this.prisma.classSubjectTeacher.delete({ where: { id } });
    return { success: true };
  }

  async upsertSlot(dto: any) {
    const data = await this.prisma.timetableSlot.upsert({
      where: { className_dayOfWeek_period: { className: dto.className, dayOfWeek: dto.dayOfWeek, period: dto.period } },
      update: { subject: dto.subject, teacherId: dto.teacherId, startTime: dto.startTime ?? '', endTime: dto.endTime ?? '', room: dto.room ?? '' },
      create: { className: dto.className, subject: dto.subject, teacherId: dto.teacherId, dayOfWeek: dto.dayOfWeek, period: dto.period, startTime: dto.startTime ?? '', endTime: dto.endTime ?? '', room: dto.room ?? '' },
      include: INCLUDE_TEACHER,
    });
    return { success: true, data };
  }

  async getClassTimetable(className: string) {
    const slots = await this.prisma.timetableSlot.findMany({
      where: { className },
      include: INCLUDE_TEACHER,
      orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }],
    });
    // Group by dayOfWeek
    const grouped: Record<number, any[]> = {};
    for (const s of slots) { (grouped[s.dayOfWeek] ??= []).push(s); }
    return { success: true, data: { slots, grouped } };
  }

  async getTeacherTimetable(teacherIdOrUserId: string) {
    // Try direct, then resolve via userId
    let tid = teacherIdOrUserId;
    const direct = await this.prisma.teacher.findUnique({ where: { id: teacherIdOrUserId } });
    if (!direct) {
      const byUser = await this.prisma.teacher.findUnique({ where: { userId: teacherIdOrUserId } });
      if (byUser) tid = byUser.id;
    }

    const now    = new Date();
    // JS getDay(): 0=Sun,1=Mon…6=Sat → map to our 1=Mon..6=Sat
    const jsDay  = now.getDay();
    const todayDow = jsDay === 0 ? 1 : jsDay;

    const allSlots = await this.prisma.timetableSlot.findMany({
      where: { teacherId: tid },
      include: INCLUDE_TEACHER,
      orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }],
    });
    const todaySlots = allSlots.filter(s => s.dayOfWeek === todayDow);
    return { success: true, data: { allSlots, todaySlots, todayDow } };
  }

  async deleteSlot(id: string) {
    await this.prisma.timetableSlot.delete({ where: { id } });
    return { success: true };
  }
}
