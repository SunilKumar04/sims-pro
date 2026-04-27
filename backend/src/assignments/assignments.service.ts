import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const INCLUDE_TEACHER = { teacher: { select: { id: true, user: { select: { name: true } } } } };
const INCLUDE_SUB     = { include: { student: { select: { roll: true, user: { select: { name: true } } } } } };

@Injectable()
export class AssignmentsService {
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
    const maxSubmissions = Number(dto.maxSubmissions);
    const data = await this.prisma.assignment.create({
      data: {
        teacherId,
        className: dto.className,
        subject: dto.subject,
        title: dto.title,
        description: dto.description ?? '',
        dueDate: new Date(dto.dueDate),
        maxMarks: dto.maxMarks ?? 10,
        maxSubmissions: Number.isFinite(maxSubmissions) && maxSubmissions > 0 ? Math.floor(maxSubmissions) : 1,
      },
      include: { ...INCLUDE_TEACHER, _count: { select: { submissions: true } } },
    });
    return { success: true, data };
  }

  async getAll(q: any) {
    const data = await this.prisma.assignment.findMany({
      where: { ...(q.className && { className: q.className }), ...(q.subject && { subject: q.subject }) },
      include: { ...INCLUDE_TEACHER, _count: { select: { submissions: true } } },
      orderBy: { dueDate: 'asc' },
    });
    return { success: true, data };
  }

  async getOne(id: string) {
    const data = await this.prisma.assignment.findUnique({
      where: { id },
      include: { ...INCLUDE_TEACHER, submissions: { ...INCLUDE_SUB, orderBy: { submittedAt: 'asc' } } },
    });
    if (!data) throw new NotFoundException('Assignment not found');
    return { success: true, data };
  }

  async update(id: string, dto: any) {
    const data = await this.prisma.assignment.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.dueDate && { dueDate: new Date(dto.dueDate) }),
        ...(dto.maxMarks && { maxMarks: dto.maxMarks }),
        ...(dto.maxSubmissions !== undefined && { maxSubmissions: Math.max(1, Math.floor(Number(dto.maxSubmissions) || 1)) }),
      },
      include: INCLUDE_TEACHER,
    });
    return { success: true, data };
  }

  async remove(id: string) {
    await this.prisma.assignment.delete({ where: { id } });
    return { success: true };
  }

  async getStudentAssignments(rawStudentId: string, className?: string) {
    const studentId = await this.resolveStudentId(rawStudentId);
    const student   = await this.prisma.student.findUnique({ where: { id: studentId } });
    const cls       = className ?? student?.className ?? '';

    const assignments = await this.prisma.assignment.findMany({
      where: { className: cls },
      include: { ...INCLUDE_TEACHER, submissions: { where: { studentId } } },
      orderBy: { dueDate: 'asc' },
    });

    const now = Date.now();
    const data = assignments.map(a => {
      const sub    = a.submissions[0] ?? null;
      const daysLeft = Math.ceil((a.dueDate.getTime() - now) / 86400000);
      let status: string = sub?.status ?? 'PENDING';
      if (!sub && daysLeft < 0) status = 'LATE';
      return { ...a, submission: sub, status, daysLeft, isOverdue: daysLeft < 0 };
    });
    return { success: true, data };
  }

  async submit(assignmentId: string, rawStudentId: string, dto: any) {
    const studentId  = await this.resolveStudentId(rawStudentId);
    const assignment = await this.prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found');

    const isLate   = new Date() > assignment.dueDate;
    const existing = await this.prisma.assignmentSubmission.findMany({
      where: { assignmentId, studentId },
      orderBy: { submittedAt: 'desc' },
    });

    const latest = existing[0] ?? null;
    const attemptsUsed = existing.length > 0
      ? Math.max(...existing.map(x => x.attemptCount ?? 1))
      : 0;

    if (attemptsUsed >= assignment.maxSubmissions) {
      throw new ForbiddenException(`Submission limit reached. Allowed attempts: ${assignment.maxSubmissions}`);
    }

    const nextAttempt = attemptsUsed + 1;

    if (latest) {
      const data = await this.prisma.assignmentSubmission.update({
        where: { id: latest.id },
        data: {
          remarks: dto.remarks ?? '',
          fileUrl: dto.fileUrl ?? null,
          submittedAt: new Date(),
          status: isLate ? 'LATE' : 'SUBMITTED',
          attemptCount: nextAttempt,
        },
      });

      if (existing.length > 1) {
        await this.prisma.assignmentSubmission.deleteMany({
          where: { assignmentId, studentId, NOT: { id: latest.id } },
        });
      }

      return { success: true, data };
    }

    const data = await this.prisma.assignmentSubmission.create({
      data: {
        assignmentId,
        studentId,
        remarks: dto.remarks ?? '',
        fileUrl: dto.fileUrl ?? null,
        status: isLate ? 'LATE' : 'SUBMITTED',
        attemptCount: 1,
      },
    });
    return { success: true, data };
  }

  async grade(submissionId: string, dto: { marks: number }) {
    const data = await this.prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: { marks: dto.marks, status: 'GRADED', gradedAt: new Date() },
    });
    return { success: true, data };
  }
}
