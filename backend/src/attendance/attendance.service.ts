// src/attendance/attendance.service.ts
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceStatus } from '@prisma/client';
import { TenantContextService } from '../tenancy/tenant-context.service';

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private readonly tenant: TenantContextService,
  ) {}

  private getSchoolId() {
    const schoolId = this.tenant.get().schoolId;
    if (!schoolId) throw new ForbiddenException('School tenant not found');
    return schoolId;
  }

  private async resolveTeacherId(raw: string): Promise<string> {
    const schoolId = this.getSchoolId();
    const candidateIds = [raw, this.tenant.get().userId].filter((value): value is string => !!value);

    for (const candidate of candidateIds) {
      const direct = await this.prisma.teacher.findFirst({ where: { id: candidate, schoolId } });
      if (direct) return direct.id;
      const byUser = await this.prisma.teacher.findFirst({ where: { userId: candidate, schoolId } });
      if (byUser) return byUser.id;
    }

    const first = await this.prisma.teacher.findFirst({ where: { schoolId } });
    if (first) return first.id;
    throw new NotFoundException('Teacher record not found');
  }

  private async resolveStudentId(raw: string): Promise<string> {
    const schoolId = this.getSchoolId();
    const direct = await this.prisma.student.findFirst({ where: { id: raw, schoolId } });
    if (direct) return direct.id;
    const byUser = await this.prisma.student.findFirst({ where: { userId: raw, schoolId } });
    if (byUser) return byUser.id;
    throw new NotFoundException('Student record not found');
  }

  async markBulk(dto: {
    className: string;
    date: string;
    teacherId: string;
    records: { studentId: string; status: string; remark?: string }[];
  }) {
    const schoolId = this.getSchoolId();
    const date      = new Date(dto.date);
    const teacherId = await this.resolveTeacherId(dto.teacherId);
    const results   = [];

    for (const rec of dto.records) {
      const studentId = await this.resolveStudentId(rec.studentId);
      const existing = await this.prisma.attendance.findFirst({
        where: schoolId
          ? {
              studentId,
              date,
              OR: [{ schoolId }, { schoolId: null }],
            }
          : { studentId, date },
        orderBy: { createdAt: 'desc' },
      });

      const payload = {
        status: rec.status as AttendanceStatus,
        remark: rec.remark ?? '',
        teacherId,
        schoolId,
        date,
        studentId,
      };

      const att = existing
        ? await this.prisma.attendance.update({ where: { id: existing.id }, data: payload })
        : await this.prisma.attendance.create({ data: payload });
      results.push(att);
    }
    return { success: true, message: `Attendance saved for ${results.length} students`, data: results };
  }

  async getByClass(className: string, date: string) {
    const schoolId = this.getSchoolId();
    const targetDate = new Date(date);
    const schoolClause = schoolId ? [{ schoolId }, { schoolId: null }] : undefined;

    const students = await this.prisma.student.findMany({
      where:   schoolClause ? { className, OR: schoolClause } : { className },
      include: {
        user:       { select: { name: true } },
        attendance: { where: { date: targetDate }, take: 1 },
      },
      orderBy: { roll: 'asc' },
    });

    const data = students.map(s => ({
      studentId: s.id,
      name:      s.user.name,
      roll:      s.roll,
      status:    s.attendance[0]?.status ?? 'NOT_MARKED',
      remark:    s.attendance[0]?.remark ?? '',
    }));

    const held   = data.filter(d => d.status !== 'NOT_MARKED').length;
    const present= data.filter(d => d.status === 'PRESENT').length;
    const absent = data.filter(d => d.status === 'ABSENT').length;
    const late   = data.filter(d => d.status === 'LATE').length;

    return {
      success: true,
      data,
      summary: { total: data.length, held, present, absent, late, alreadyMarked: held > 0 },
    };
  }

  async getStudentAttendance(rawStudentId: string, month?: number, year?: number) {
    const schoolId = this.getSchoolId();
    const studentId = await this.resolveStudentId(rawStudentId);
    const now = new Date();
    const m   = Number(month) || now.getMonth() + 1;
    const y   = Number(year)  || now.getFullYear();
    const schoolClause = schoolId ? [{ schoolId }, { schoolId: null }] : undefined;

    const startDate = new Date(y, m - 1, 1);
    const endDate   = new Date(y, m, 0);

    const records = await this.prisma.attendance.findMany({
      where:   schoolClause ? { studentId, OR: schoolClause, date: { gte: startDate, lte: endDate } } : { studentId, date: { gte: startDate, lte: endDate } },
      orderBy: { date: 'asc' },
    });

    const present = records.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
    const absent  = records.filter(r => r.status === 'ABSENT').length;
    const total   = records.length;

    return {
      success: true,
      data: records,
      summary: { present, absent, total, percentage: total > 0 ? Math.round((present / total) * 100) : 0 },
    };
  }

  async getClassSummary(className: string) {
    const schoolId = this.getSchoolId();
    const schoolClause = schoolId ? [{ schoolId }, { schoolId: null }] : undefined;
    const students = await this.prisma.student.findMany({
      where:   schoolClause ? { className, OR: schoolClause } : { className },
      include: {
        user:       { select: { name: true } },
        attendance: { orderBy: { date: 'desc' } },
      },
      orderBy: { roll: 'asc' },
    });

    const data = students.map(s => {
      const total   = s.attendance.length;
      const present = s.attendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
      const absent  = s.attendance.filter(a => a.status === 'ABSENT').length;
      return {
        studentId: s.id,
        name:      s.user.name,
        roll:      s.roll,
        total, present, absent,
        percentage: total > 0 ? Math.round((present / total) * 100) : 0,
      };
    });

    return { success: true, data };
  }
}
