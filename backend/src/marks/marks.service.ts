// src/marks/marks.service.ts
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenancy/tenant-context.service';

// ── Grade helper ────────────────────────────────────────────────
const GRADE = (marks: number, max: number): string => {
  const p = max > 0 ? (marks / max) * 100 : 0;
  if (p >= 90) return 'A+';
  if (p >= 80) return 'A';
  if (p >= 70) return 'B+';
  if (p >= 60) return 'B';
  if (p >= 50) return 'C';
  if (p >= 40) return 'D';
  return 'F';
};

const GRADE_COLOR = (g: string) => {
  if (g === 'A+' || g === 'A')  return 'green';
  if (g === 'B+' || g === 'B')  return 'blue';
  if (g === 'C')                 return 'yellow';
  if (g === 'D')                 return 'orange';
  return 'red';
};

// ── Exam type display order ─────────────────────────────────────
const EXAM_ORDER: Record<string, number> = {
  UNIT_TEST: 1, MST1: 1,
  MID_TERM: 2, HALF_YEARLY: 2,
  MST2: 3,
  FINAL: 4, ANNUAL: 4,
  PRACTICALS: 5,
};

@Injectable()
export class MarksService {
  constructor(
    private prisma: PrismaService,
    private readonly tenant: TenantContextService,
  ) {}

  private getSchoolId() {
    const schoolId = this.tenant.get().schoolId;
    if (!schoolId) throw new ForbiddenException('School tenant not found');
    return schoolId;
  }

  // ── Resolve student ID ───────────────────────────────────────
  private async resolveStudentId(raw: string): Promise<string> {
    const schoolId = this.getSchoolId();
    const d = await this.prisma.student.findFirst({ where: { id: raw, schoolId } });
    if (d) return d.id;
    const u = await this.prisma.student.findFirst({ where: { userId: raw, schoolId } });
    return u?.id ?? raw;
  }

  private normalizeExamType(examType?: string) {
    return (examType || 'UNIT_TEST').trim().toUpperCase();
  }

  private async resolveStudentOrThrow(rawStudentId: string) {
    const studentId = await this.resolveStudentId(rawStudentId);
    const schoolId = this.getSchoolId();
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: { user: { select: { name: true, email: true } } },
    });

    if (!student) throw new NotFoundException('Student not found');
    return student;
  }

  private buildGroupedMarks(marks: any[]) {
    return marks.reduce((acc: Record<string, any[]>, mark) => {
      const examType = String(mark.examType);
      if (!acc[examType]) acc[examType] = [];
      acc[examType].push(mark);
      return acc;
    }, {});
  }

  async bulkSave(dto: {
    className: string;
    examType?: string;
    year?: number;
    records: { studentId: string; subject: string; marks: number; maxMarks?: number; grade?: string }[];
  }) {
    const schoolId = this.getSchoolId();
    const examType = this.normalizeExamType(dto.examType);
    const year = Number(dto.year) || new Date().getFullYear();
    const results: any[] = [];

    for (const record of dto.records ?? []) {
      const studentId = await this.resolveStudentId(record.studentId);
      const student = await this.prisma.student.findFirst({ where: { id: studentId, schoolId } });
      if (!student) throw new NotFoundException(`Student not found: ${record.studentId}`);

      const marks = Number(record.marks) || 0;
      const maxMarks = Number(record.maxMarks) || 100;
      const grade = record.grade ?? GRADE(marks, maxMarks);

      const existing = await this.prisma.mark.findFirst({
        where: {
          schoolId,
          studentId,
          subject: record.subject,
          examType: examType as any,
          year,
        },
        orderBy: { createdAt: 'desc' },
      });

      const payload = {
        schoolId,
        studentId,
        subject: record.subject,
        examType: examType as any,
        marks,
        maxMarks,
        grade,
        className: dto.className || student.className,
        year,
      };

      const data = existing
        ? await this.prisma.mark.update({ where: { id: existing.id }, data: payload })
        : await this.prisma.mark.create({ data: payload });

      results.push(data);
    }

    return { success: true, data: results };
  }

  async getByClass(className: string, examType = 'UNIT_TEST', year?: number) {
    const schoolId = this.getSchoolId();
    const targetYear = Number(year) || new Date().getFullYear();
    const normalizedExamType = this.normalizeExamType(examType);

    const data = await this.prisma.mark.findMany({
      where: { schoolId, className, examType: normalizedExamType as any, year: targetYear },
      include: { student: { include: { user: { select: { name: true } } } } },
      orderBy: [{ subject: 'asc' }, { student: { roll: 'asc' } }],
    });

    return { success: true, data };
  }

  async getByStudent(rawStudentId: string) {
    const student = await this.resolveStudentOrThrow(rawStudentId);
    const marks = await this.prisma.mark.findMany({
      where: { schoolId: student.schoolId ?? this.getSchoolId(), studentId: student.id },
      orderBy: [{ year: 'desc' }, { examType: 'asc' }, { subject: 'asc' }],
    });

    return {
      success: true,
      data: {
        student: {
          id: student.id,
          name: student.user.name,
          email: student.user.email,
          roll: student.roll,
          className: student.className,
        },
        grouped: this.buildGroupedMarks(marks),
        marks,
      },
    };
  }

  async getStudentReport(rawStudentId: string, examType?: string, year?: number) {
    const student = await this.resolveStudentOrThrow(rawStudentId);
    const targetYear = Number(year) || new Date().getFullYear();
    const normalizedExamType = this.normalizeExamType(examType || 'FINAL');

    const examMarks = await this.prisma.mark.findMany({
      where: {
        schoolId: student.schoolId ?? this.getSchoolId(),
        studentId: student.id,
        examType: normalizedExamType as any,
        year: targetYear,
      },
      orderBy: { subject: 'asc' },
    });

    const totalMarks = examMarks.reduce((sum, mark) => sum + mark.marks, 0);
    const totalMax = examMarks.reduce((sum, mark) => sum + mark.maxMarks, 0);
    const percentage = totalMax > 0 ? Math.round((totalMarks / totalMax) * 100) : 0;

    const rankPool = await this.prisma.mark.findMany({
      where: { schoolId: student.schoolId ?? this.getSchoolId(), className: student.className, examType: normalizedExamType as any, year: targetYear },
    });

    const studentTotals: Record<string, number> = {};
    const studentMaxes: Record<string, number> = {};
    rankPool.forEach(mark => {
      studentTotals[mark.studentId] = (studentTotals[mark.studentId] ?? 0) + mark.marks;
      studentMaxes[mark.studentId] = (studentMaxes[mark.studentId] ?? 0) + mark.maxMarks;
    });

    const sorted = Object.entries(studentTotals)
      .map(([sid, total]) => ({ sid, pct: studentMaxes[sid] > 0 ? (total / studentMaxes[sid]) * 100 : 0 }))
      .sort((a, b) => b.pct - a.pct);

    const rankIndex = sorted.findIndex(entry => entry.sid === student.id);
    const rank = rankIndex >= 0 ? rankIndex + 1 : null;
    const classAvg = sorted.length > 0
      ? Math.round(sorted.reduce((sum, entry) => sum + entry.pct, 0) / sorted.length)
      : 0;

    return {
      success: true,
      data: {
        student: {
          id: student.id,
          name: student.user.name,
          email: student.user.email,
          roll: student.roll,
          className: student.className,
        },
        examType: normalizedExamType,
        year: targetYear,
        totals: {
          marks: totalMarks,
          maxMarks: totalMax,
          percentage,
          grade: GRADE(totalMarks, totalMax),
          gradeColor: GRADE_COLOR(GRADE(totalMarks, totalMax)),
        },
        rank,
        classAvg,
        subjects: examMarks.map(mark => ({
          id: mark.id,
          subject: mark.subject,
          marks: mark.marks,
          maxMarks: mark.maxMarks,
          grade: mark.grade ?? GRADE(mark.marks, mark.maxMarks),
          percentage: mark.maxMarks > 0 ? Math.round((mark.marks / mark.maxMarks) * 100) : 0,
          isPassed: mark.maxMarks > 0 ? (mark.marks / mark.maxMarks) * 100 >= 40 : false,
        })),
        hasData: examMarks.length > 0,
      },
    };
  }

  // ── Get all marks for a student ──────────────────────────────
  async getStudentMarks(rawStudentId: string) {
    const student = await this.resolveStudentOrThrow(rawStudentId);
    const marks = await this.prisma.mark.findMany({
      where: { schoolId: student.schoolId ?? this.getSchoolId(), studentId: student.id },
      orderBy: [{ subject: 'asc' }, { year: 'desc' }],
    });

    return {
      success: true,
      data: { student, marks },
    };
  }

  // ── Summary for profile card ─────────────────────────────────
  async getStudentSummary(rawStudentId: string) {
    const student = await this.resolveStudentOrThrow(rawStudentId);
    const marks = await this.prisma.mark.findMany({
      where: { schoolId: student.schoolId ?? this.getSchoolId(), studentId: student.id },
      orderBy: { updatedAt: 'desc' },
    });
    if (!marks.length) return { success: true, data: this.emptyStats(student) };

    // Latest exam type
    const latestExamType = marks[0]?.examType ?? '';

    // Use latest year marks for stats
    const years        = [...new Set(marks.map(m => m.year))].sort((a, b) => b - a);
    const latestYear   = years[0];
    const latestMarks  = marks.filter(m => m.year === latestYear);

    // Latest exam marks
    const examTypes    = [...new Set(latestMarks.map(m => m.examType))]
      .sort((a, b) => (EXAM_ORDER[b] ?? 0) - (EXAM_ORDER[a] ?? 0));
    const lastExam     = examTypes[0] ?? '';
    const lastExamMarks= latestMarks.filter(m => m.examType === lastExam);

    const totalMarks   = lastExamMarks.reduce((a, m) => a + m.marks,    0);
    const totalMax     = lastExamMarks.reduce((a, m) => a + m.maxMarks, 0);
    const overallPct   = totalMax > 0 ? Math.round((totalMarks / totalMax) * 100) : 0;

    const subjects     = [...new Set(latestMarks.map(m => m.subject))];
    const passed       = lastExamMarks.filter(m => m.maxMarks > 0 && (m.marks / m.maxMarks) * 100 >= 40).length;
    const failed       = lastExamMarks.length - passed;

    // Class rank (compare with all students in same class, same exam, same year)
    const classMarks = await this.prisma.mark.findMany({
      where: { schoolId: student.schoolId ?? this.getSchoolId(), className: student.className, year: latestYear },
    });

    const studentTotals: Record<string, number> = {};
    const studentMaxes:  Record<string, number> = {};
    classMarks.forEach(m => {
      studentTotals[m.studentId] = (studentTotals[m.studentId] ?? 0) + m.marks;
      studentMaxes[m.studentId]  = (studentMaxes[m.studentId]  ?? 0) + m.maxMarks;
    });

    const sortedStudents = Object.entries(studentTotals)
      .map(([sid, tot]) => ({ sid, pct: studentMaxes[sid] > 0 ? (tot / studentMaxes[sid]) * 100 : 0 }))
      .sort((a, b) => b.pct - a.pct);

    const rankIdx = sortedStudents.findIndex(s => s.sid === student.id);
    const rank    = rankIdx >= 0 ? rankIdx + 1 : null;
    const classAvg= sortedStudents.length > 0
      ? Math.round(sortedStudents.reduce((a, s) => a + s.pct, 0) / sortedStudents.length)
      : 0;

    return {
      success: true,
      data: {
        student:         { id: student.id, name: student.user.name, roll: student.roll, className: student.className },
        overallPct,
        rank,
        classAvg,
        totalSubjects:   subjects.length,
        passedSubjects:  passed,
        failedSubjects:  failed,
        lastExamType:    lastExam,
        latestYear,
        hasData:         true,
      },
    };
  }

  // ── Full report card ─────────────────────────────────────────
  async getReportCard(rawStudentId: string) {
    const student = await this.resolveStudentOrThrow(rawStudentId);
    const allMarks = await this.prisma.mark.findMany({
      where:   { schoolId: student.schoolId ?? this.getSchoolId(), studentId: student.id },
      orderBy: [{ year: 'desc' }, { subject: 'asc' }],
    });

    const years = [...new Set(allMarks.map(m => m.year))].sort((a, b) => b - a);

    // Build report per year
    const reports = await Promise.all(years.map(async year => {
      const yearMarks  = allMarks.filter(m => m.year === year);
      const examTypes  = [...new Set(yearMarks.map(m => m.examType))]
        .sort((a, b) => (EXAM_ORDER[a] ?? 99) - (EXAM_ORDER[b] ?? 99));
      const subjects   = [...new Set(yearMarks.map(m => m.subject))].sort();

      // Subject-wise table: { subject, examType: { marks, maxMarks, grade, pct } }
      const subjectTable = subjects.map(subject => {
        const subMarks = yearMarks.filter(m => m.subject === subject);
        const byExam: Record<string, { marks: number; maxMarks: number; grade: string; pct: number }> = {};
        let totalM = 0, totalMax = 0;

        examTypes.forEach(et => {
          const em = subMarks.find(m => m.examType === et);
          if (em) {
            const p = em.maxMarks > 0 ? (em.marks / em.maxMarks) * 100 : 0;
            byExam[et] = { marks: em.marks, maxMarks: em.maxMarks, grade: em.grade ?? GRADE(em.marks, em.maxMarks), pct: Math.round(p) };
            totalM   += em.marks;
            totalMax += em.maxMarks;
          }
        });

        const overallPct = totalMax > 0 ? Math.round((totalM / totalMax) * 100) : 0;
        return {
          subject,
          byExam,
          totalMarks:   totalM,
          totalMax,
          overallPct,
          grade:        GRADE(totalM, totalMax),
          gradeColor:   GRADE_COLOR(GRADE(totalM, totalMax)),
          isPassed:     overallPct >= 40,
        };
      });

      // Exam-wise summary
      const examSummary = examTypes.map(et => {
        const etMarks  = yearMarks.filter(m => m.examType === et);
        const total    = etMarks.reduce((a, m) => a + m.marks,    0);
        const max      = etMarks.reduce((a, m) => a + m.maxMarks, 0);
        const pct      = max > 0 ? Math.round((total / max) * 100) : 0;
        return { examType: et, totalMarks: total, maxMarks: max, percentage: pct,
                 grade: GRADE(total, max), passed: pct >= 40, subjectCount: etMarks.length };
      });

      // Class rank for latest exam in this year
      const lastET    = examTypes[examTypes.length - 1];
      const classData = await this.prisma.mark.findMany({
        where: { schoolId: student.schoolId ?? this.getSchoolId(), className: student.className, examType: lastET, year },
      });
      const cTotals: Record<string, number> = {};
      const cMaxes:  Record<string, number> = {};
      classData.forEach(m => {
        cTotals[m.studentId] = (cTotals[m.studentId] ?? 0) + m.marks;
        cMaxes[m.studentId]  = (cMaxes[m.studentId]  ?? 0) + m.maxMarks;
      });
      const sorted   = Object.entries(cTotals)
        .map(([sid, t]) => ({ sid, pct: cMaxes[sid] > 0 ? (t / cMaxes[sid]) * 100 : 0 }))
        .sort((a, b) => b.pct - a.pct);
      const rank     = sorted.findIndex(s => s.sid === student.id) + 1 || null;
      const classAvg = sorted.length > 0
        ? Math.round(sorted.reduce((a, s) => a + s.pct, 0) / sorted.length)
        : 0;

      // Trend: percentage per exam type
      const trend = examTypes.map(et => {
        const etM = yearMarks.filter(m => m.examType === et);
        const t   = etM.reduce((a, m) => a + m.marks,    0);
        const mx  = etM.reduce((a, m) => a + m.maxMarks, 0);
        return { name: et.replace('_', ' '), pct: mx > 0 ? Math.round((t / mx) * 100) : 0 };
      });

      return { year, examTypes, subjectTable, examSummary, rank, classAvg, trend };
    }));

    return {
      success: true,
      data: {
        student: {
          id:          student.id,
          name:        student.user.name,
          email:       student.user.email,
          roll:        student.roll,
          className:   student.className,
          admissionNo: (student as any).admissionNo ?? null,
          phone:       student.phone,
          parentName:  student.parentName,
        },
        reports,
        hasData: allMarks.length > 0,
      },
    };
  }

  private emptyStats(student: any) {
    return {
      student:       { id: student.id, name: student.user.name, roll: student.roll, className: student.className },
      overallPct:    0, rank: null, classAvg: 0,
      totalSubjects: 0, passedSubjects: 0, failedSubjects: 0,
      lastExamType:  '', latestYear: new Date().getFullYear(), hasData: false,
    };
  }
}
