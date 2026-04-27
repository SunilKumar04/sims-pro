import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  private async resolveTeacherId(id: string) {
    const direct = await this.prisma.teacher.findUnique({ where: { id } });
    if (direct) return direct.id;
    const byUser = await this.prisma.teacher.findUnique({ where: { userId: id } });
    if (byUser) return byUser.id;
    const first = await this.prisma.teacher.findFirst();
    return first?.id ?? id;
  }

  private async resolveStudentId(id: string) {
    const direct = await this.prisma.student.findUnique({ where: { id } });
    if (direct) return direct.id;
    const byUser = await this.prisma.student.findUnique({ where: { userId: id } });
    return byUser?.id ?? id;
  }

  async create(dto: any, rawTeacherId: string) {
    const teacherId = await this.resolveTeacherId(rawTeacherId);
    const data = await this.prisma.attendanceSession.upsert({
      where: { className_subject_date_period: { className: dto.className, subject: dto.subject, date: new Date(dto.date), period: dto.period } },
      update: { topic: dto.topic },
      create: { className: dto.className, subject: dto.subject, teacherId, date: new Date(dto.date), period: dto.period, topic: dto.topic },
    });
    return { success: true, data };
  }

  async getToday(rawTeacherId: string) {
    const teacherId = await this.resolveTeacherId(rawTeacherId);
    const now   = new Date();
    const jsDay = now.getDay();
    const dow   = jsDay === 0 ? 1 : jsDay;
    const todayStr = now.toISOString().slice(0, 10);

    const slots = await this.prisma.timetableSlot.findMany({
      where: { teacherId, dayOfWeek: dow },
      include: { teacher: { select: { user: { select: { name: true } } } } },
      orderBy: { period: 'asc' },
    });

    const todayClasses = await Promise.all(slots.map(async slot => {
      const session = await this.prisma.attendanceSession.findUnique({
        where: { className_subject_date_period: { className: slot.className, subject: slot.subject, date: new Date(todayStr), period: slot.period } },
        include: { _count: { select: { records: true } } },
      });
      return { ...slot, hasSession: !!session, session };
    }));

    return { success: true, data: { todayClasses } };
  }

  async getOne(id: string) {
    const data = await this.prisma.attendanceSession.findUnique({
      where: { id },
      include: { _count: { select: { records: true } }, teacher: { select: { user: { select: { name: true } } } } },
    });
    if (!data) throw new NotFoundException('Session not found');
    return { success: true, data };
  }

  async getAll(q: any, rawTeacherId: string) {
    const teacherId = await this.resolveTeacherId(rawTeacherId);
    const data = await this.prisma.attendanceSession.findMany({
      where: { teacherId, ...(q.className && { className: q.className }) },
      include: { _count: { select: { records: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { success: true, data };
  }

  async getSessionStudents(sessionId: string) {
    const session = await this.prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: { records: { include: { student: { select: { id: true, roll: true, user: { select: { name: true } } } } } } },
    });
    if (!session) throw new NotFoundException('Session not found');

    const allStudents = await this.prisma.student.findMany({
      where: { className: session.className },
      include: { user: { select: { name: true } } },
      orderBy: { roll: 'asc' },
    });

    const recordMap: Record<string, any> = {};
    for (const r of session.records) recordMap[r.studentId] = r;

    const students = allStudents.map(s => ({
      studentId: s.id, name: s.user.name, roll: s.roll,
      status: recordMap[s.id]?.status ?? null,
      remark: recordMap[s.id]?.remark ?? '',
    }));

    return { success: true, data: { session, students } };
  }

  async markBulk(sessionId: string, records: { studentId: string; status: string; remark?: string }[]) {
    await Promise.all(records.map(r =>
      this.prisma.subjectAttendance.upsert({
        where: { sessionId_studentId: { sessionId, studentId: r.studentId } },
        update: { status: r.status as any, remark: r.remark ?? '' },
        create: { sessionId, studentId: r.studentId, status: r.status as any, remark: r.remark ?? '' },
      })
    ));
    return { success: true, message: `${records.length} records saved` };
  }

  async lock(sessionId: string) {
    const data = await this.prisma.attendanceSession.update({ where: { id: sessionId }, data: { isLocked: true } });
    return { success: true, data };
  }

  async remove(sessionId: string, user: any) {
    const isAdmin = user?.role === 'ADMIN';
    const teacherId = isAdmin ? null : await this.resolveTeacherId(user?.teacherId || user?.id);
    const session = await this.prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      select: { id: true, teacherId: true },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (!isAdmin && session.teacherId !== teacherId) throw new ForbiddenException('You can only delete your own sessions');

    await this.prisma.attendanceSession.delete({ where: { id: sessionId } });
    return { success: true, message: 'Session removed from history' };
  }

  async getStudentSummary(rawStudentId: string, className?: string) {
    const studentId = await this.resolveStudentId(rawStudentId);

    const records = await this.prisma.subjectAttendance.findMany({
      where: {
        studentId,
        ...(className && { session: { className } }),
      },
      include: { session: { select: { subject: true, date: true, period: true, className: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const subMap: Record<string, { total:number; present:number; absent:number; late:number }> = {};
    for (const r of records) {
      const sub = r.session.subject;
      if (!subMap[sub]) subMap[sub] = { total:0, present:0, absent:0, late:0 };
      subMap[sub].total++;
      if (r.status === 'PRESENT') subMap[sub].present++;
      else if (r.status === 'ABSENT') subMap[sub].absent++;
      else if (r.status === 'LATE') subMap[sub].late++;
    }

    const summary = Object.entries(subMap).map(([subject, d]) => ({
      subject,
      ...d,
      percentage: d.total > 0 ? Math.round((d.present / d.total) * 100) : 0,
    }));

    const totalSessions = records.length;
    const totalPresent  = records.filter(r => r.status === 'PRESENT').length;

    const recentHistory = records.slice(0, 50).map(r => ({
      subject: r.session.subject,
      date:    r.session.date,
      period:  r.session.period,
      status:  r.status,
      remark:  r.remark,
    }));

    return {
      success: true,
      data: {
        summary,
        overall: { totalSessions, totalPresent, percentage: totalSessions > 0 ? Math.round((totalPresent/totalSessions)*100) : 0 },
        recentHistory,
      },
    };
  }

  async getStudentToday(rawStudentId: string, className?: string) {
    const studentId = await this.resolveStudentId(rawStudentId);
    const student   = await this.prisma.student.findUnique({ where: { id: studentId } });
    const cls       = className ?? student?.className ?? '';

    const now      = new Date();
    const jsDay    = now.getDay();
    const dow      = jsDay === 0 ? 1 : jsDay;
    const todayStr = now.toISOString().slice(0, 10);

    const slots = await this.prisma.timetableSlot.findMany({
      where: { className: cls, dayOfWeek: dow },
      include: { teacher: { select: { user: { select: { name: true } } } } },
      orderBy: { period: 'asc' },
    });

    const periods = await Promise.all(slots.map(async (slot) => {
      const session = await this.prisma.attendanceSession.findUnique({
        where: {
          className_subject_date_period: {
            className: cls,
            subject:   slot.subject,
            date:      new Date(todayStr),
            period:    slot.period,
          },
        },
      });

      let status: string | null = null;
      let remark: string | null = null;
      let sessionId: string | null = null;

      if (session) {
        sessionId = session.id;
        const record = await this.prisma.subjectAttendance.findUnique({
          where: { sessionId_studentId: { sessionId: session.id, studentId } },
        });
        status = record?.status ?? null;
        remark = record?.remark ?? null;
      }

      return {
        period:      slot.period,
        subject:     slot.subject,
        teacherName: slot.teacher?.user?.name ?? '—',
        startTime:   slot.startTime,
        endTime:     slot.endTime,
        room:        slot.room,
        sessionId,
        sessionHeld: !!session,
        status,
        remark,
      };
    }));

    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const dayLabel = dayNames[jsDay] ?? 'Today';

    return {
      success: true,
      data: {
        date:     todayStr,
        dayLabel,
        className: cls,
        periods,
        totalPeriods:  periods.length,
        held:          periods.filter(p => p.sessionHeld).length,
        marked:        periods.filter(p => p.status !== null).length,
        presentToday:  periods.filter(p => p.status === 'PRESENT').length,
        absentToday:   periods.filter(p => p.status === 'ABSENT').length,
        lateToday:     periods.filter(p => p.status === 'LATE').length,
      },
    };
  }
}
