import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FeeStatus } from '@prisma/client';
import { TenantContextService } from '../tenancy/tenant-context.service';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private readonly tenant: TenantContextService,
  ) {}

  private getSchoolId() {
    const schoolId = this.tenant.get().schoolId;
    if (!schoolId) throw new ForbiddenException('School tenant not found');
    return schoolId;
  }

  /* ── helpers ─────────────────────────────────── */
  private async resolveTeacherId(id: string): Promise<string | null> {
    if (!id) return null;
    const schoolId = this.getSchoolId();
    const byId   = await this.prisma.teacher.findFirst({ where: { id, schoolId } });
    if (byId) return byId.id;
    const byUser = await this.prisma.teacher.findFirst({ where: { userId: id, schoolId } });
    return byUser?.id ?? null;
  }

  private async resolveStudentId(id: string): Promise<string | null> {
    if (!id) return null;
    const schoolId = this.getSchoolId();
    const byId   = await this.prisma.student.findFirst({ where: { id, schoolId } });
    if (byId) return byId.id;
    const byUser = await this.prisma.student.findFirst({ where: { userId: id, schoolId } });
    return byUser?.id ?? null;
  }

  /* ── ADMIN ─────────────────────────────────── */
  async getAdminStats() {
    const schoolId = this.getSchoolId();
    const [students, teachers, classes, fees, notices, homework] = await Promise.all([
      this.prisma.student.count({ where: { schoolId } }),
      this.prisma.teacher.count({ where: { schoolId } }),
      this.prisma.class.count({ where: { schoolId } }),
      this.prisma.fee.findMany({ where: { schoolId } }),
      this.prisma.notice.count({ where: { schoolId, isPublished: true } }),
      this.prisma.homework.count({ where: { schoolId } }),
    ]);

    const totalCollected = fees.filter(f => f.status === FeeStatus.PAID).reduce((a, f) => a + f.paid, 0);
    const totalPending   = fees.filter(f => f.status !== FeeStatus.PAID).reduce((a, f) => a + (f.amount - f.paid), 0);

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const currentYear = new Date().getFullYear();
    const monthlyFees = months.map((month, i) => ({
      month,
      amount: fees
        .filter(f => f.paidDate && new Date(f.paidDate).getMonth() === i && new Date(f.paidDate).getFullYear() === currentYear)
        .reduce((a, f) => a + f.paid, 0),
    }));

    const today = new Date(); today.setHours(0,0,0,0);
    const todayAttend = await this.prisma.attendance.findMany({ where: { schoolId, date: today } });
    const presentToday = todayAttend.filter(a => a.status === 'PRESENT').length;

    return {
      success: true,
      data: {
        overview: { students, teachers, classes, notices, homework },
        fees: {
          paid:           fees.filter(f => f.status === FeeStatus.PAID).length,
          pending:        fees.filter(f => f.status === FeeStatus.PENDING).length,
          partial:        fees.filter(f => f.status === FeeStatus.PARTIAL).length,
          totalCollected, totalPending,
          collectionRate: fees.length > 0
            ? Math.round((fees.filter(f => f.status === FeeStatus.PAID).length / fees.length) * 100)
            : 0,
        },
        monthlyFees,
        attendance: {
          today:   todayAttend.length,
          present: presentToday,
          absent:  todayAttend.length - presentToday,
          rate:    todayAttend.length > 0 ? Math.round((presentToday / todayAttend.length) * 100) : 0,
        },
      },
    };
  }

  /* ── TEACHER ─────────────────────────────────── */
  async getTeacherStats(rawId: string) {
    const schoolId = this.getSchoolId();
    const teacherId = await this.resolveTeacherId(rawId);
    if (!teacherId) {
      return { success: true, data: { classes: 0, students: 0, homework: 0, subject: 'N/A' } };
    }

    const teacher = await this.prisma.teacher.findFirst({ where: { id: teacherId, schoolId } });
    const classes = teacher?.assignedClasses?.split(',').map(c => c.trim()).filter(Boolean) ?? [];

    const [homeworkCount, studentCount, attendanceToday] = await Promise.all([
      this.prisma.homework.count({ where: { schoolId, teacherId } }),
      this.prisma.student.count({ where: { schoolId, className: { in: classes } } }),
      this.prisma.attendance.findMany({
        where: {
          teacherId,
          schoolId,
          date: (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })(),
        },
      }),
    ]);

    const present = attendanceToday.filter(a => a.status === 'PRESENT').length;

    return {
      success: true,
      data: {
        classes:          classes.length,
        classNames:       classes,
        students:         studentCount,
        homework:         homeworkCount,
        subject:          teacher?.subject || 'N/A',
        attendanceToday: {
          marked:  attendanceToday.length,
          present,
          absent:  attendanceToday.length - present,
        },
      },
    };
  }

  /* ── STUDENT ─────────────────────────────────── */
  async getStudentStats(rawId: string) {
    const schoolId = this.getSchoolId();
    const studentId = await this.resolveStudentId(rawId);
    if (!studentId) {
      return { success: true, data: { attendance: { percentage: 0, present: 0, absent: 0, total: 0 }, fees: { status:'PENDING', amount:0, paid:0, balance:0 }, homework: 0 } };
    }

    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: { fees: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [attendanceThisMonth, homeworkCount] = await Promise.all([
      this.prisma.attendance.findMany({
        where: { schoolId, studentId, date: { gte: monthStart } },
      }),
      this.prisma.homework.count({ where: { schoolId, className: student?.className } }),
    ]);

    const present = attendanceThisMonth.filter(a => a.status === 'PRESENT').length;
    const total   = attendanceThisMonth.length;
    const latestFee = student?.fees[0];

    return {
      success: true,
      data: {
        className:  student?.className,
        roll:       student?.roll,
        attendance: {
          present,
          absent:     total - present,
          total,
          percentage: total > 0 ? Math.round((present / total) * 100) : 0,
        },
        fees: {
          status:  latestFee?.status  || 'PENDING',
          amount:  latestFee?.amount  || 0,
          paid:    latestFee?.paid    || 0,
          balance: latestFee ? (latestFee.amount - latestFee.paid) : 0,
        },
        homework: homeworkCount,
      },
    };
  }
}
