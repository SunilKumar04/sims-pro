import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceStatus } from '@prisma/client';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  private async resolveTeacherId(id: string): Promise<string> {
    if (!id) {
      const first = await this.prisma.teacher.findFirst();
      return first?.id || id;
    }
    const byId   = await this.prisma.teacher.findUnique({ where: { id } });
    if (byId) return byId.id;
    const byUser = await this.prisma.teacher.findUnique({ where: { userId: id } });
    if (byUser) return byUser.id;
    const first  = await this.prisma.teacher.findFirst();
    return first?.id || id;
  }

  private async resolveStudentId(id: string): Promise<string> {
    if (!id) return id;
    const byId   = await this.prisma.student.findUnique({ where: { id } });
    if (byId) return byId.id;
    const byUser = await this.prisma.student.findUnique({ where: { userId: id } });
    if (byUser) return byUser.id;
    return id;
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
      try {
        const att = await this.prisma.attendance.upsert({
          where: { studentId_date: { studentId: rec.studentId, date } },
          update: { status: rec.status as AttendanceStatus, remark: rec.remark, teacherId },
          create: {
            studentId: rec.studentId,
            teacherId,
            date,
            status: rec.status as AttendanceStatus,
            remark: rec.remark,
          },
        });
        results.push(att);
      } catch (e) {
        // Skip invalid studentIds silently
      }
    }
    return {
      success: true,
      message: `Attendance saved for ${results.length} students`,
      data: results,
    };
  }

  async getByClass(className: string, date: string) {
    const students = await this.prisma.student.findMany({
      where: { className },
      include: {
        user: { select: { name: true } },
        attendance: { where: { date: new Date(date) }, take: 1 },
      },
      orderBy: { roll: 'asc' },
    });

    return {
      success: true,
      data: students.map(s => ({
        studentId: s.id,
        name:      s.user.name,
        roll:      s.roll,
        status:    s.attendance[0]?.status || 'NOT_MARKED',
        remark:    s.attendance[0]?.remark || '',
      })),
    };
  }

  async getStudentAttendance(rawStudentId: string, month?: number, year?: number) {
    const studentId = await this.resolveStudentId(rawStudentId);
    const now   = new Date();
    const m     = month  ?? now.getMonth() + 1;
    const y     = year   ?? now.getFullYear();
    const start = new Date(y, m - 1, 1);
    const end   = new Date(y, m, 0);

    const records = await this.prisma.attendance.findMany({
      where: { studentId, date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    });

    const present = records.filter(r => r.status === 'PRESENT').length;
    const absent  = records.filter(r => r.status === 'ABSENT').length;
    const late    = records.filter(r => r.status === 'LATE').length;
    const total   = records.length;

    return {
      success: true,
      data: {
        records,
        summary: {
          present, absent, late, total,
          percentage: total > 0 ? Math.round((present / total) * 100) : 0,
        },
      },
    };
  }

  async getClassSummary(className: string) {
    const today         = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const records = await this.prisma.attendance.findMany({
      where: { student: { className }, date: { gte: thirtyDaysAgo } },
      include: { student: { include: { user: { select: { name: true } } } } },
    });

    const summary = records.reduce((acc: any, r) => {
      if (!acc[r.studentId]) {
        acc[r.studentId] = { name: r.student.user.name, present: 0, absent: 0, late: 0, total: 0 };
      }
      acc[r.studentId].total++;
      if (r.status === 'PRESENT')     acc[r.studentId].present++;
      else if (r.status === 'ABSENT') acc[r.studentId].absent++;
      else if (r.status === 'LATE')   acc[r.studentId].late++;
      return acc;
    }, {});

    return { success: true, data: Object.values(summary) };
  }
}
