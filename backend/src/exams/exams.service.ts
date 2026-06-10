// src/exams/exams.service.ts
import { ForbiddenException, Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenancy/tenant-context.service';

// ── Prisma include for Exam (without invigilators on dateSheets) ──────────
const INCLUDE_ENTRIES = {
  dateSheets: {
    orderBy: { date: 'asc' as const },
  },
  _count: { select: { dateSheets: true } },
};

// ── Include WITH invigilators (used only where model exists) ─────────────
const INCLUDE_ENTRIES_WITH_INV = {
  dateSheets: {
    orderBy: { date: 'asc' as const },
    include: {
      invigilators: {
        include: {
          teacher: { select: { id: true, employeeCode: true, user: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'asc' as const },
      },
    },
  },
  _count: { select: { dateSheets: true } },
};

@Injectable()
export class ExamsService {
  constructor(
    private prisma: PrismaService,
    private readonly tenant: TenantContextService,
  ) {}

  private getSchoolId() {
    const schoolId = this.tenant.get().schoolId;
    if (!schoolId) throw new ForbiddenException('School tenant not found');
    return schoolId;
  }

  private async resolveTeacherId(rawTeacherId: string) {
    const schoolId = this.getSchoolId();
    const candidateIds = [rawTeacherId, this.tenant.get().userId].filter((value): value is string => !!value);

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

  async create(dto: any) {
    const schoolId = this.getSchoolId();
    const exists = await this.prisma.exam.findFirst({
      where: { schoolId, className: dto.className, examType: dto.examType },
    });
    if (exists) throw new ConflictException(`${dto.examType} exam already exists for class ${dto.className}`);

    const data = await this.prisma.exam.create({
      data: {
        schoolId,
        className:    dto.className,
        examType:     dto.examType,
        title:        dto.title,
        startDate:    new Date(dto.startDate),
        endDate:      new Date(dto.endDate),
        instructions: dto.instructions ?? null,
      },
      include: INCLUDE_ENTRIES,
    });
    return { success: true, data };
  }

  async update(id: string, dto: any) {
    const schoolId = this.getSchoolId();
    const exam = await this.prisma.exam.findFirst({ where: { id, schoolId } });
    if (!exam) throw new NotFoundException('Exam not found');
    const data = await this.prisma.exam.update({
      where: { id },
      data: {
        ...(dto.title      && { title:     dto.title }),
        ...(dto.startDate  && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate    && { endDate:   new Date(dto.endDate) }),
        ...(dto.instructions !== undefined && { instructions: dto.instructions }),
      },
      include: INCLUDE_ENTRIES,
    });
    return { success: true, data };
  }

  async remove(id: string) {
    const exam = await this.prisma.exam.findFirst({ where: { id, schoolId: this.getSchoolId() } });
    if (!exam) throw new NotFoundException('Exam not found');
    await this.prisma.exam.delete({ where: { id } });
    return { success: true };
  }

  async getAll(q: any) {
    const schoolId = this.getSchoolId();
    const data = await this.prisma.exam.findMany({
      where:   { schoolId, ...(q.className ? { className: q.className } : {}) },
      include: INCLUDE_ENTRIES,
      orderBy: [{ className: 'asc' }, { examType: 'asc' }],
    });
    return { success: true, data };
  }

  async getByClass(className: string) {
    const schoolId = this.getSchoolId();
    const data = await this.prisma.exam.findMany({
      where:   { schoolId, className },
      include: INCLUDE_ENTRIES,
      orderBy: { examType: 'asc' },
    });
    return { success: true, data };
  }

  async getDatesheet(className: string, examType: string) {
    const schoolId = this.getSchoolId();
    const exam = await this.prisma.exam.findFirst({
      where:   { schoolId, className, examType: examType as any },
      include: INCLUDE_ENTRIES,
    });
    if (!exam) throw new NotFoundException('Exam not found');
    return { success: true, data: exam };
  }

  // ── Get all exams for a given date (admin exam-day view) ───────────────
  async getExamsByDate(dateStr?: string) {
    const schoolId = this.getSchoolId();
    const target = dateStr ? new Date(dateStr) : new Date();
    target.setHours(0, 0, 0, 0);

    // Try to include invigilators — fall back gracefully if model not migrated
    let entries: any[] = [];
    try {
      entries = await (this.prisma as any).dateSheetEntry.findMany({
        where: { schoolId, date: target },
        include: {
          exam: true,
          invigilators: {
            include: {
              teacher: { select: { id: true, employeeCode: true, user: { select: { name: true } } } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: [{ startTime: 'asc' }, { room: 'asc' }],
      });
    } catch {
      // Invigilator table not yet migrated — return entries without invigilators
      entries = await this.prisma.dateSheetEntry.findMany({
        where:   { schoolId, date: target },
        include: { exam: true },
        orderBy: [{ startTime: 'asc' }, { room: 'asc' }],
      });
      entries = entries.map(e => ({ ...e, invigilators: [] }));
    }

    return {
      success: true,
      data: {
        date:    target.toISOString().slice(0, 10),
        entries,
        total:   entries.length,
        covered: entries.filter((e: any) => (e.invigilators ?? []).length > 0).length,
      },
    };
  }

  async addEntry(examId: string, dto: any) {
    const schoolId = this.getSchoolId();
    const exists = await this.prisma.dateSheetEntry.findFirst({
      where: { schoolId, examId, subject: dto.subject },
    });

    if (exists) {
      const data = await this.prisma.dateSheetEntry.update({
        where: { id: exists.id },
        data: {
          date:         new Date(dto.date),
          startTime:    dto.startTime,
          endTime:      dto.endTime,
          room:         dto.room ?? '',
          maxMarks:     dto.maxMarks ?? 100,
          passingMarks: dto.passingMarks ?? 33,
        },
      });
      return { success: true, data };
    }

    const data = await this.prisma.dateSheetEntry.create({
      data: {
        schoolId,
        examId,
        subject:      dto.subject,
        date:         new Date(dto.date),
        startTime:    dto.startTime,
        endTime:      dto.endTime,
        room:         dto.room ?? '',
        maxMarks:     dto.maxMarks ?? 100,
        passingMarks: dto.passingMarks ?? 33,
      },
    });
    return { success: true, data };
  }

  async addBulkEntries(examId: string, entries: any[]) {
    const results = await Promise.all(entries.map(e => this.addEntry(examId, e)));
    return { success: true, data: results };
  }

  async deleteEntry(entryId: string) {
    const entry = await this.prisma.dateSheetEntry.findFirst({ where: { id: entryId, schoolId: this.getSchoolId() } });
    if (!entry) throw new NotFoundException('Date sheet entry not found');
    await this.prisma.dateSheetEntry.delete({ where: { id: entryId } });
    return { success: true };
  }

  async publish(id: string, pub: boolean) {
    const exam = await this.prisma.exam.findFirst({ where: { id, schoolId: this.getSchoolId() } });
    if (!exam) throw new NotFoundException('Exam not found');
    const data = await this.prisma.exam.update({
      where:   { id },
      data:    { isPublished: pub },
      include: INCLUDE_ENTRIES,
    });
    return { success: true, data };
  }

  // ── Assign invigilator (graceful if model not migrated) ────────────────
  async assignInvigilator(dateSheetEntryId: string, dto: { teacherId: string; role?: string }) {
    const schoolId = this.getSchoolId();
    const entry = await this.prisma.dateSheetEntry.findFirst({ where: { id: dateSheetEntryId, schoolId } });
    if (!entry) throw new NotFoundException('Date sheet entry not found');

    const teacherId = await this.resolveTeacherId(dto.teacherId);

    try {
      const data = await (this.prisma as any).examInvigilator.upsert({
        where:  { schoolId_dateSheetEntryId_teacherId: { schoolId, dateSheetEntryId, teacherId } },
        update: { role: dto.role ?? 'INVIGILATOR' },
        create: { schoolId, dateSheetEntryId, teacherId, role: dto.role ?? 'INVIGILATOR' },
        include: {
          teacher: { select: { id: true, employeeCode: true, user: { select: { name: true } } } },
        },
      });
      return { success: true, data };
    } catch (err: any) {
      if (err.message?.includes('does not exist')) {
        throw new NotFoundException('ExamInvigilator table not found — run: npx prisma migrate dev --name add_exam_invigilators');
      }
      throw err;
    }
  }

  async removeInvigilator(invId: string) {
    try {
      const schoolId = this.getSchoolId();
      const invigilator = await (this.prisma as any).examInvigilator.findFirst({ where: { id: invId, schoolId } });
      if (!invigilator) throw new NotFoundException('Invigilator not found');
      await (this.prisma as any).examInvigilator.delete({ where: { id: invId } });
    } catch (err: any) {
      if (err.message?.includes('does not exist')) {
        throw new NotFoundException('ExamInvigilator table not found — run migration first');
      }
      throw err;
    }
    return { success: true };
  }

  // ── Get all exam duties assigned to a teacher ──────────────────────────
  async getMyDuties(rawTeacherId: string) {
    const schoolId = this.getSchoolId();
    const teacherId = await this.resolveTeacherId(rawTeacherId);

    let duties: any[] = [];
    try {
      duties = await (this.prisma as any).examInvigilator.findMany({
        where: { teacherId, schoolId },
        include: {
          dateSheetEntry: {
            include: {
              exam: true,
              invigilators: {
                include: {
                  teacher: { select: { id: true, employeeCode: true, user: { select: { name: true } } } },
                },
              },
            },
          },
        },
        orderBy: { dateSheetEntry: { date: 'asc' } },
      });
    } catch {
      // Table not migrated yet — return empty
      duties = [];
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const upcoming = duties.filter(d => new Date(d.dateSheetEntry.date) >= now);
    const past     = duties.filter(d => new Date(d.dateSheetEntry.date) < now);

    return {
      success: true,
      data: { all: duties, upcoming, past, total: duties.length, nextDuty: upcoming[0] ?? null },
    };
  }
}
