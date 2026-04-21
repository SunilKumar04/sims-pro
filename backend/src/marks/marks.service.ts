import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function calcGrade(marks: number, max: number): string {
  const p = (marks / max) * 100;
  if (p >= 90) return 'A+';
  if (p >= 80) return 'A';
  if (p >= 70) return 'B+';
  if (p >= 60) return 'B';
  if (p >= 40) return 'C';
  return 'F';
}

@Injectable()
export class MarksService {
  constructor(private prisma: PrismaService) {}

  // Resolve studentId — accepts User.id or Student.id
  private async resolveStudentId(id: string): Promise<string | null> {
    const byId   = await this.prisma.student.findUnique({ where: { id } });
    if (byId) return byId.id;
    const byUser = await this.prisma.student.findUnique({ where: { userId: id } });
    if (byUser) return byUser.id;
    return null;
  }

  async bulkSave(dto: {
    className: string;
    examType: string;
    year: number;
    records: { studentId: string; subject: string; marks: number; maxMarks: number }[];
  }) {
    const results = [];
    const year    = dto.year || new Date().getFullYear();

    for (const rec of dto.records) {
      const grade = calcGrade(rec.marks, rec.maxMarks || 100);
      try {
        const mark = await this.prisma.mark.upsert({
          where: {
            studentId_subject_examType_year: {
              studentId: rec.studentId,
              subject:   rec.subject,
              examType:  dto.examType as any,
              year,
            },
          },
          update: { marks: rec.marks, maxMarks: rec.maxMarks || 100, grade },
          create: {
            studentId: rec.studentId,
            subject:   rec.subject,
            examType:  dto.examType as any,
            marks:     rec.marks,
            maxMarks:  rec.maxMarks || 100,
            grade,
            className: dto.className,
            year,
          },
        });
        results.push(mark);
      } catch (e) { /* skip invalid */ }
    }

    return { success: true, message: `Saved ${results.length} mark records`, data: results };
  }

  async getByClass(className: string, examType: string, year?: number) {
    const y = year || new Date().getFullYear();
    const marks = await this.prisma.mark.findMany({
      where: { className, examType: examType as any, year: y },
      include: { student: { include: { user: { select: { name: true } } } } },
      orderBy: { student: { roll: 'asc' } },
    });

    return { success: true, data: marks };
  }

  async getByStudent(rawStudentId: string) {
    const studentId = await this.resolveStudentId(rawStudentId);
    if (!studentId) return { success: false, message: 'Student not found', data: [] };

    const marks = await this.prisma.mark.findMany({
      where: { studentId },
      orderBy: [{ examType: 'asc' }, { subject: 'asc' }],
    });

    // Group by examType
    const grouped = marks.reduce((acc: any, m) => {
      if (!acc[m.examType]) acc[m.examType] = [];
      acc[m.examType].push(m);
      return acc;
    }, {});

    return { success: true, data: { marks, grouped } };
  }

  async getStudentReport(rawStudentId: string, examType: string, year?: number) {
    const studentId = await this.resolveStudentId(rawStudentId);
    if (!studentId) return { success: false, message: 'Student not found', data: [] };

    const y = year || new Date().getFullYear();
    const marks = await this.prisma.mark.findMany({
      where: { studentId, examType: examType as any, year: y },
      orderBy: { subject: 'asc' },
    });

    const total    = marks.reduce((a, m) => a + m.marks, 0);
    const maxTotal = marks.reduce((a, m) => a + m.maxMarks, 0);
    const pct      = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
    const grade    = calcGrade(pct, 100);
    const passed   = marks.every(m => (m.marks / m.maxMarks) * 100 >= 40);

    return {
      success: true,
      data: { marks, summary: { total, maxTotal, percentage: pct, grade, passed } },
    };
  }
}
