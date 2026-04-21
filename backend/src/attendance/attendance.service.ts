// src/attendance/attendance.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceStatus } from '@prisma/client';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  private async resolveTeacherId(raw: string): Promise<string> {
    const direct = await this.prisma.teacher.findUnique({ where: { id: raw } });
    if (direct) return direct.id;
    const byUser = await this.prisma.teacher.findUnique({ where: { userId: raw } });
    if (byUser) return byUser.id;
    const first = await this.prisma.teacher.findFirst();
    return first?.id ?? raw;
  }

  private async resolveStudentId(raw: string): Promise<string> {
    const direct = await this.prisma.student.findUnique({ where: { id: raw } });
    if (direct) return direct.id;
    const byUser = await this.prisma.student.findUnique({ where: { userId: raw } });
    return byUser?.id ?? raw;
  }

  async markBulk(dto: {
    className: string;
    date: string;
    teacherId: string;
    records: { studentId: string; status: string; remark?: string }[];
  }) {
    const date      = new Date(dto.date);
    const teacherId = await this.resolveTeacherId(dto.teacherId);
    const results   = [];

    for (const rec of dto.records) {
      const att = await this.prisma.attendance.upsert({
        where:  { studentId_date: { studentId: rec.studentId, date } },
        update: { status: rec.status as AttendanceStatus, remark: rec.remark ?? '', teacherId },
        create: { studentId: rec.studentId, teacherId, date, status: rec.status as AttendanceStatus, remark: rec.remark ?? '' },
      });
      results.push(att);
    }
    return { success: true, message: `Attendance saved for ${results.length} students`, data: results };
  }

  async getByClass(className: string, date: string) {
    const targetDate = new Date(date);

    const students = await this.prisma.student.findMany({
      where:   { className },
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
    const studentId = await this.resolveStudentId(rawStudentId);
    const now = new Date();
    const m   = Number(month) || now.getMonth() + 1;
    const y   = Number(year)  || now.getFullYear();

    const startDate = new Date(y, m - 1, 1);
    const endDate   = new Date(y, m, 0);

    const records = await this.prisma.attendance.findMany({
      where:   { studentId, date: { gte: startDate, lte: endDate } },
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
    const students = await this.prisma.student.findMany({
      where:   { className },
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
