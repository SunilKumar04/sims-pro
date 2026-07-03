// src/report-card/report-card.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenancy/tenant-context.service';
import { ExamType } from '@prisma/client';

// ── Grade helpers ─────────────────────────────────────────────
const GRADE_SYSTEM_DEFAULT = [
  { from: 90, to: 100, grade: 'A+', point: 10 },
  { from: 80, to: 89,  grade: 'A',  point: 9  },
  { from: 70, to: 79,  grade: 'B+', point: 8  },
  { from: 60, to: 69,  grade: 'B',  point: 7  },
  { from: 50, to: 59,  grade: 'C',  point: 6  },
  { from: 40, to: 49,  grade: 'D',  point: 5  },
  { from: 0,  to: 39,  grade: 'F',  point: 0  },
];

function calcGrade(marks: number, maxMarks: number, system: any[] = GRADE_SYSTEM_DEFAULT): string {
  if (maxMarks <= 0) return 'N/A';
  const pct = (marks / maxMarks) * 100;
  for (const row of system) {
    if (pct >= row.from && pct <= row.to) return row.grade;
  }
  return 'F';
}

function calcPct(marks: number, maxMarks: number): number {
  return maxMarks > 0 ? Math.round((marks / maxMarks) * 100) : 0;
}

function isPassed(marks: number, maxMarks: number, passingPct = 40): boolean {
  return calcPct(marks, maxMarks) >= passingPct;
}

@Injectable()
export class ReportCardService {
  constructor(
    private prisma: PrismaService,
    private tenantCtx: TenantContextService,
  ) {}

  private getSchoolId(): string {
    const id = this.tenantCtx.get().schoolId;
    if (!id) throw new NotFoundException('School context not found');
    return id;
  }

  private resolveExamType(raw: string): ExamType {
    const normalized = raw.trim().toUpperCase();
    const valid = Object.values(ExamType);
    if (!valid.includes(normalized as ExamType)) {
      throw new BadRequestException(`Invalid examType: ${raw}. Valid values: ${valid.join(', ')}`);
    }
    return normalized as ExamType;
  }

  // ── Resolve Student ID ───────────────────────────────────────
  private async resolveStudentId(raw: string): Promise<string> {
    const d = await this.prisma.student.findUnique({ where: { id: raw } });
    if (d) return d.id;
    const u = await this.prisma.student.findUnique({ where: { userId: raw } });
    return u?.id ?? raw;
  }

  // ═══════════════════════════════════════
  // TEMPLATE CRUD
  // ═══════════════════════════════════════

  async getTemplates() {
    const schoolId = this.getSchoolId();
    const data = await this.prisma.reportCardTemplate.findMany({
      where: { schoolId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return { success: true, data };
  }

  async getTemplate(id: string) {
    const schoolId = this.getSchoolId();
    const data = await this.prisma.reportCardTemplate.findFirst({
      where: { id, schoolId },
    });
    if (!data) throw new NotFoundException('Template not found');
    return { success: true, data };
  }

  async createTemplate(dto: any) {
    const schoolId = this.getSchoolId();

    // Get school info for defaults
    const school = await this.prisma.school.findUnique({ where: { id: schoolId } });

    const data = await this.prisma.reportCardTemplate.create({
      data: {
        schoolId,
        name:           dto.name ?? 'New Template',
        description:    dto.description ?? null,
        isDefault:      dto.isDefault ?? false,
        isActive:       dto.isActive ?? true,
        // Branding
        logoUrl:        dto.logoUrl ?? null,
        schoolName:     dto.schoolName ?? school?.name ?? null,
        schoolAddress:  dto.schoolAddress ?? school?.address ?? null,
        schoolPhone:    dto.schoolPhone ?? school?.phone ?? null,
        schoolEmail:    dto.schoolEmail ?? school?.email ?? null,
        schoolWebsite:  dto.schoolWebsite ?? null,
        affiliationNo:  dto.affiliationNo ?? null,
        academicSession: dto.academicSession ?? null,
        schoolMotto:    dto.schoolMotto ?? null,
        // Header
        reportTitle:    dto.reportTitle ?? 'REPORT CARD',
        headerBgColor:  dto.headerBgColor ?? '#1a3a6b',
        headerTextColor: dto.headerTextColor ?? '#ffffff',
        fontFamily:     dto.fontFamily ?? 'Arial, sans-serif',
        headerAlignment: dto.headerAlignment ?? 'center',
        // Layout
        paperSize:      dto.paperSize ?? 'A4',
        orientation:    dto.orientation ?? 'PORTRAIT',
        marginTop:      dto.marginTop ?? 15,
        marginBottom:   dto.marginBottom ?? 15,
        marginLeft:     dto.marginLeft ?? 15,
        marginRight:    dto.marginRight ?? 15,
        // Fields
        ...(dto.studentFields  && { studentFields: dto.studentFields }),
        ...(dto.tableColumns   && { tableColumns:  dto.tableColumns  }),
        ...(dto.sectionLayout  && { sectionLayout: dto.sectionLayout }),
        ...(dto.gradingSystem  && { gradingSystem: dto.gradingSystem }),
        // Result
        showTotal:       dto.showTotal ?? true,
        showPercentage:  dto.showPercentage ?? true,
        showGrade:       dto.showGrade ?? true,
        showRank:        dto.showRank ?? true,
        showResult:      dto.showResult ?? true,
        showAttendance:  dto.showAttendance ?? false,
        showPromotion:   dto.showPromotion ?? false,
        showTeacherRemarks:   dto.showTeacherRemarks ?? true,
        showPrincipalRemarks: dto.showPrincipalRemarks ?? true,
        passingPercentage: dto.passingPercentage ?? 40,
        // Footer
        principalSignatureUrl:    dto.principalSignatureUrl ?? null,
        classTeacherSignatureUrl: dto.classTeacherSignatureUrl ?? null,
        schoolSealUrl:   dto.schoolSealUrl ?? null,
        footerNote:      dto.footerNote ?? null,
        showQrCode:      dto.showQrCode ?? false,
        showGeneratedDate: dto.showGeneratedDate ?? true,
        showWatermark:   dto.showWatermark ?? false,
        watermarkText:   dto.watermarkText ?? null,
      },
    });

    // If set as default, unset others
    if (dto.isDefault) {
      await this.prisma.reportCardTemplate.updateMany({
        where: { schoolId, id: { not: data.id } },
        data: { isDefault: false },
      });
    }

    return { success: true, data };
  }

  async updateTemplate(id: string, dto: any) {
    const schoolId = this.getSchoolId();
    const existing = await this.prisma.reportCardTemplate.findFirst({ where: { id, schoolId } });
    if (!existing) throw new NotFoundException('Template not found');

    const data = await this.prisma.reportCardTemplate.update({
      where: { id },
      data: {
        ...(dto.name             !== undefined && { name: dto.name }),
        ...(dto.description      !== undefined && { description: dto.description }),
        ...(dto.isDefault        !== undefined && { isDefault: dto.isDefault }),
        ...(dto.isActive         !== undefined && { isActive: dto.isActive }),
        ...(dto.logoUrl          !== undefined && { logoUrl: dto.logoUrl }),
        ...(dto.schoolName       !== undefined && { schoolName: dto.schoolName }),
        ...(dto.schoolAddress    !== undefined && { schoolAddress: dto.schoolAddress }),
        ...(dto.schoolPhone      !== undefined && { schoolPhone: dto.schoolPhone }),
        ...(dto.schoolEmail      !== undefined && { schoolEmail: dto.schoolEmail }),
        ...(dto.schoolWebsite    !== undefined && { schoolWebsite: dto.schoolWebsite }),
        ...(dto.affiliationNo    !== undefined && { affiliationNo: dto.affiliationNo }),
        ...(dto.academicSession  !== undefined && { academicSession: dto.academicSession }),
        ...(dto.schoolMotto      !== undefined && { schoolMotto: dto.schoolMotto }),
        ...(dto.reportTitle      !== undefined && { reportTitle: dto.reportTitle }),
        ...(dto.headerBgColor    !== undefined && { headerBgColor: dto.headerBgColor }),
        ...(dto.headerTextColor  !== undefined && { headerTextColor: dto.headerTextColor }),
        ...(dto.fontFamily       !== undefined && { fontFamily: dto.fontFamily }),
        ...(dto.headerAlignment  !== undefined && { headerAlignment: dto.headerAlignment }),
        ...(dto.paperSize        !== undefined && { paperSize: dto.paperSize }),
        ...(dto.orientation      !== undefined && { orientation: dto.orientation }),
        ...(dto.marginTop        !== undefined && { marginTop: dto.marginTop }),
        ...(dto.marginBottom     !== undefined && { marginBottom: dto.marginBottom }),
        ...(dto.marginLeft       !== undefined && { marginLeft: dto.marginLeft }),
        ...(dto.marginRight      !== undefined && { marginRight: dto.marginRight }),
        ...(dto.studentFields    !== undefined && { studentFields: dto.studentFields }),
        ...(dto.tableColumns     !== undefined && { tableColumns: dto.tableColumns }),
        ...(dto.sectionLayout    !== undefined && { sectionLayout: dto.sectionLayout }),
        ...(dto.gradingSystem    !== undefined && { gradingSystem: dto.gradingSystem }),
        ...(dto.showTotal        !== undefined && { showTotal: dto.showTotal }),
        ...(dto.showPercentage   !== undefined && { showPercentage: dto.showPercentage }),
        ...(dto.showGrade        !== undefined && { showGrade: dto.showGrade }),
        ...(dto.showRank         !== undefined && { showRank: dto.showRank }),
        ...(dto.showResult       !== undefined && { showResult: dto.showResult }),
        ...(dto.showAttendance   !== undefined && { showAttendance: dto.showAttendance }),
        ...(dto.showPromotion    !== undefined && { showPromotion: dto.showPromotion }),
        ...(dto.showTeacherRemarks    !== undefined && { showTeacherRemarks: dto.showTeacherRemarks }),
        ...(dto.showPrincipalRemarks  !== undefined && { showPrincipalRemarks: dto.showPrincipalRemarks }),
        ...(dto.passingPercentage     !== undefined && { passingPercentage: dto.passingPercentage }),
        ...(dto.principalSignatureUrl !== undefined && { principalSignatureUrl: dto.principalSignatureUrl }),
        ...(dto.classTeacherSignatureUrl !== undefined && { classTeacherSignatureUrl: dto.classTeacherSignatureUrl }),
        ...(dto.schoolSealUrl    !== undefined && { schoolSealUrl: dto.schoolSealUrl }),
        ...(dto.footerNote       !== undefined && { footerNote: dto.footerNote }),
        ...(dto.showQrCode       !== undefined && { showQrCode: dto.showQrCode }),
        ...(dto.showGeneratedDate !== undefined && { showGeneratedDate: dto.showGeneratedDate }),
        ...(dto.showWatermark    !== undefined && { showWatermark: dto.showWatermark }),
        ...(dto.watermarkText    !== undefined && { watermarkText: dto.watermarkText }),
      },
    });

    // Handle default flag
    if (dto.isDefault === true) {
      await this.prisma.reportCardTemplate.updateMany({
        where: { schoolId, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return { success: true, data };
  }

  async deleteTemplate(id: string) {
    const schoolId = this.getSchoolId();
    const existing = await this.prisma.reportCardTemplate.findFirst({ where: { id, schoolId } });
    if (!existing) throw new NotFoundException('Template not found');
    await this.prisma.reportCardTemplate.delete({ where: { id } });
    return { success: true };
  }

  async duplicateTemplate(id: string) {
    const schoolId = this.getSchoolId();
    const tpl = await this.prisma.reportCardTemplate.findFirst({ where: { id, schoolId } });
    if (!tpl) throw new NotFoundException('Template not found');

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = tpl;
    const data = await this.prisma.reportCardTemplate.create({
      data: { ...rest, name: `${rest.name} (Copy)`, isDefault: false },
    });
    return { success: true, data };
  }

  // ═══════════════════════════════════════
  // MARKSHEET DATA
  // ═══════════════════════════════════════

  /** Build full marksheet data for one student */
  async getMarksheetData(rawStudentId: string, examType: string, year: number, templateId?: string) {
    const schoolId = this.getSchoolId();
    const studentId = await this.resolveStudentId(rawStudentId);

    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { user: { select: { name: true, email: true } } },
    });
    if (!student) throw new NotFoundException('Student not found');

    // Template
    let template = null;
    if (templateId) {
      template = await this.prisma.reportCardTemplate.findFirst({ where: { id: templateId, schoolId } });
    }
    if (!template) {
      template = await this.prisma.reportCardTemplate.findFirst({ where: { schoolId, isDefault: true } });
    }
    if (!template) {
      template = await this.prisma.reportCardTemplate.findFirst({ where: { schoolId } });
    }

    const examTypeEnum = this.resolveExamType(examType);

    // Marks for this student, exam, year
    const marks = await this.prisma.mark.findMany({
      where: { studentId, examType: examTypeEnum, year },
      orderBy: { subject: 'asc' },
    });

    // Grading system from template or default
    const gradingSystem = (template?.gradingSystem as any[]) ?? GRADE_SYSTEM_DEFAULT;
    const passingPct    = template?.passingPercentage ?? 40;

    const subjects = marks.map(m => ({
      subject:      m.subject,
      marksObtained: m.marks,
      maxMarks:     m.maxMarks,
      passingMarks: Math.ceil(m.maxMarks * (passingPct / 100)),
      grade:        calcGrade(m.marks, m.maxMarks, gradingSystem),
      percentage:   calcPct(m.marks, m.maxMarks),
      isPassed:     isPassed(m.marks, m.maxMarks, passingPct),
    }));

    const totalMarks   = subjects.reduce((s, r) => s + r.marksObtained, 0);
    const totalMax     = subjects.reduce((s, r) => s + r.maxMarks, 0);
    const percentage   = calcPct(totalMarks, totalMax);
    const overallGrade = calcGrade(totalMarks, totalMax, gradingSystem);
    const allPassed    = subjects.length > 0 && subjects.every(s => s.isPassed);
    const result       = allPassed ? 'PASS' : 'FAIL';

    // Class rank
    const classMarks = await this.prisma.mark.findMany({
      where: { className: student.className, examType: examTypeEnum, year, schoolId },
    });
    const studentTotals: Record<string, number> = {};
    const studentMax:    Record<string, number> = {};
    classMarks.forEach(m => {
      studentTotals[m.studentId] = (studentTotals[m.studentId] ?? 0) + m.marks;
      studentMax[m.studentId]    = (studentMax[m.studentId]    ?? 0) + m.maxMarks;
    });
    const sorted = Object.entries(studentTotals)
      .map(([sid, total]) => ({ sid, pct: studentMax[sid] > 0 ? (total / studentMax[sid]) * 100 : 0 }))
      .sort((a, b) => b.pct - a.pct);
    const rank = sorted.findIndex(e => e.sid === studentId) + 1 || null;

    // Attendance (if needed)
    const attendance = await this.prisma.attendance.findMany({
      where: { studentId, schoolId },
    });
    const totalDays    = attendance.length;
    const presentDays  = attendance.filter(a => a.status === 'PRESENT').length;
    const attendancePct = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    // School info from template or school
    const school = await this.prisma.school.findUnique({ where: { id: schoolId } });

    return {
      success: true,
      data: {
        template,
        school: {
          name:       template?.schoolName     ?? school?.name,
          address:    template?.schoolAddress  ?? school?.address,
          phone:      template?.schoolPhone    ?? school?.phone,
          email:      template?.schoolEmail    ?? school?.email,
          website:    template?.schoolWebsite  ?? null,
          logoUrl:    template?.logoUrl        ?? null,
          affiliationNo: template?.affiliationNo ?? null,
          motto:      template?.schoolMotto    ?? null,
          session:    template?.academicSession ?? null,
        },
        student: {
          id:          student.id,
          name:        student.user.name,
          roll:        student.roll,
          admissionNo: student.admissionNo,
          className:   student.className,
          dob:         student.dob,
          gender:      student.gender,
          fatherName:  student.fatherName,
          motherName:  student.motherName,
          photoUrl:    student.photoUrl,
          email:       student.user.email,
        },
        exam: {
          type:  examTypeEnum,
          year,
        },
        subjects,
        summary: {
          totalMarks,
          totalMax,
          percentage,
          grade: overallGrade,
          result,
          rank,
          classSize: sorted.length,
          allPassed,
        },
        attendance: {
          total:   totalDays,
          present: presentDays,
          absent:  totalDays - presentDays,
          percentage: attendancePct,
        },
        hasData: marks.length > 0,
      },
    };
  }

  /** Generate marksheet for a class (bulk data) */
  async getBulkMarksheetData(className: string, examType: string, year: number, templateId?: string) {
    const schoolId  = this.getSchoolId();
    const examTypeEnum = this.resolveExamType(examType);

    const students = await this.prisma.student.findMany({
      where: { schoolId, className },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { roll: 'asc' },
    });

    if (students.length === 0) {
      return { success: true, data: { students: [], templateId, className, examType, year } };
    }

    // Template
    let template = null;
    if (templateId) {
      template = await this.prisma.reportCardTemplate.findFirst({ where: { id: templateId, schoolId } });
    }
    if (!template) {
      template = await this.prisma.reportCardTemplate.findFirst({ where: { schoolId, isDefault: true } });
    }
    if (!template) {
      template = await this.prisma.reportCardTemplate.findFirst({ where: { schoolId } });
    }

    const gradingSystem = (template?.gradingSystem as any[]) ?? GRADE_SYSTEM_DEFAULT;
    const passingPct    = template?.passingPercentage ?? 40;

    // All marks for this class
    const allMarks = await this.prisma.mark.findMany({
      where: { schoolId, className, examType: examTypeEnum, year },
    });

    // Build rank map
    const studentTotals: Record<string, number> = {};
    const studentMax:    Record<string, number> = {};
    allMarks.forEach(m => {
      studentTotals[m.studentId] = (studentTotals[m.studentId] ?? 0) + m.marks;
      studentMax[m.studentId]    = (studentMax[m.studentId]    ?? 0) + m.maxMarks;
    });
    const sorted = Object.entries(studentTotals)
      .map(([sid, total]) => ({ sid, pct: studentMax[sid] > 0 ? (total / studentMax[sid]) * 100 : 0 }))
      .sort((a, b) => b.pct - a.pct);
    const rankMap = new Map(sorted.map((e, i) => [e.sid, i + 1]));

    const result = students.map(student => {
      const marks    = allMarks.filter(m => m.studentId === student.id);
      const subjects = marks.map(m => ({
        subject:       m.subject,
        marksObtained: m.marks,
        maxMarks:      m.maxMarks,
        passingMarks:  Math.ceil(m.maxMarks * (passingPct / 100)),
        grade:         calcGrade(m.marks, m.maxMarks, gradingSystem),
        percentage:    calcPct(m.marks, m.maxMarks),
        isPassed:      isPassed(m.marks, m.maxMarks, passingPct),
      }));
      const totalMarks   = subjects.reduce((s, r) => s + r.marksObtained, 0);
      const totalMax     = subjects.reduce((s, r) => s + r.maxMarks, 0);
      const pct          = calcPct(totalMarks, totalMax);
      const allPassed    = subjects.length > 0 && subjects.every(s => s.isPassed);

      return {
        student: {
          id:          student.id,
          name:        student.user.name,
          roll:        student.roll,
          admissionNo: student.admissionNo,
          className:   student.className,
          dob:         student.dob,
          gender:      student.gender,
          fatherName:  student.fatherName,
          motherName:  student.motherName,
          photoUrl:    student.photoUrl,
        },
        subjects,
        summary: {
          totalMarks,
          totalMax,
          percentage: pct,
          grade: calcGrade(totalMarks, totalMax, gradingSystem),
          result: allPassed ? 'PASS' : 'FAIL',
          rank: rankMap.get(student.id) ?? null,
          classSize: sorted.length,
        },
        hasData: marks.length > 0,
      };
    });

    const school = await this.prisma.school.findUnique({ where: { id: schoolId } });

    return {
      success: true,
      data: {
        template,
        school: {
          name:    template?.schoolName  ?? school?.name,
          address: template?.schoolAddress ?? school?.address,
          phone:   template?.schoolPhone ?? school?.phone,
          email:   template?.schoolEmail ?? school?.email,
          logoUrl: template?.logoUrl     ?? null,
          affiliationNo: template?.affiliationNo ?? null,
          motto:   template?.schoolMotto ?? null,
          session: template?.academicSession ?? null,
        },
        exam: { type: examTypeEnum, year },
        className,
        students: result,
        totalStudents: result.length,
        generated: new Date().toISOString(),
      },
    };
  }

  /** Record a generated marksheet */
  async recordGenerated(dto: any) {
    const schoolId  = this.getSchoolId();
    const studentId = await this.resolveStudentId(dto.studentId);

    const data = await this.prisma.generatedMarksheet.create({
      data: {
        schoolId,
        studentId,
        templateId:   dto.templateId,
        examType:     dto.examType,
        academicYear: dto.academicYear ?? new Date().getFullYear(),
        className:    dto.className,
        pdfUrl:       dto.pdfUrl ?? null,
        includePhoto: dto.includePhoto ?? true,
        includeQrCode: dto.includeQrCode ?? false,
      },
    });
    return { success: true, data };
  }

  async getGeneratedHistory(params: any) {
    const schoolId = this.getSchoolId();
    const data = await this.prisma.generatedMarksheet.findMany({
      where: {
        schoolId,
        ...(params.studentId && { studentId: params.studentId }),
        ...(params.className && { className: params.className }),
        ...(params.examType  && { examType:  params.examType  }),
      },
      include: {
        student:  { include: { user: { select: { name: true } } } },
        template: { select: { id: true, name: true } },
      },
      orderBy: { generatedAt: 'desc' },
      take: Number(params.limit) || 50,
    });
    return { success: true, data };
  }
}
