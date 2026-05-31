import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FeeStatus } from '@prisma/client';
import { buildInitialFeeData } from './fee-defaults';
import { TenantContextService } from '../tenancy/tenant-context.service';

@Injectable()
export class FeesService {
  constructor(
    private prisma: PrismaService,
    private readonly tenant: TenantContextService,
  ) {}

  private getSchoolId() {
    const schoolId = this.tenant.get().schoolId;
    if (!schoolId) throw new ForbiddenException('School tenant not found');
    return schoolId;
  }

  private async resolveStudentId(id: string): Promise<string | null> {
    const schoolId = this.getSchoolId();
    const byId = await this.prisma.student.findFirst({ where: { id, schoolId } });
    if (byId) return byId.id;
    const byUser = await this.prisma.student.findFirst({ where: { userId: id, schoolId } });
    return byUser?.id ?? null;
  }

  private async ensureMissingFeeRecords() {
    const schoolId = this.getSchoolId();
    const studentsWithoutFees = await this.prisma.student.findMany({
      where: { schoolId, fees: { none: {} } },
      select: { id: true, className: true },
    });

    if (studentsWithoutFees.length === 0) return;

    await this.prisma.fee.createMany({
      data: studentsWithoutFees.map((student) => buildInitialFeeData(student.id, student.className, schoolId)),
    });
  }

  private async ensureStudentFeeRecord(studentId: string) {
    const schoolId = this.getSchoolId();
    const existingFee = await this.prisma.fee.findFirst({
      where: { studentId, schoolId },
      select: { id: true },
    });
    if (existingFee) return;

    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: { id: true, className: true },
    });
    if (!student) return;

    await this.prisma.fee.create({
      data: buildInitialFeeData(student.id, student.className, schoolId),
    });
  }

  async findAll(query: any) {
    await this.ensureMissingFeeRecords();
    const schoolId = this.getSchoolId();

    const where: any = { schoolId };
    if (query.status) where.status = query.status.toUpperCase();
    if (query.term)   where.term   = { contains: query.term, mode: 'insensitive' };

    const fees = await this.prisma.fee.findMany({
      where,
      include: {
        student: { include: { user: { select: { name: true, email: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = fees.map(f => ({
      id:          f.id,
      studentId:   f.studentId,
      studentName: f.student.user.name,
      className:   f.student.className,
      roll:        f.student.roll,
      term:        f.term,
      amount:      f.amount,
      paid:        f.paid,
      balance:     f.amount - f.paid,
      status:      f.status,
      paidDate:    f.paidDate,
      receiptNo:   f.receiptNo,
    }));

    const summary = {
      total:         fees.length,
      totalAmount:   fees.reduce((a, f) => a + f.amount, 0),
      totalPaid:     fees.reduce((a, f) => a + f.paid, 0),
      totalPending:  fees.filter(f=>f.status!==FeeStatus.PAID).reduce((a,f)=>a+(f.amount-f.paid),0),
      paid:          fees.filter(f => f.status === FeeStatus.PAID).length,
      pending:       fees.filter(f => f.status === FeeStatus.PENDING).length,
      partial:       fees.filter(f => f.status === FeeStatus.PARTIAL).length,
    };

    return { success: true, data, summary };
  }

  async findByStudent(rawStudentId: string) {
    const studentId = await this.resolveStudentId(rawStudentId);
    if (!studentId) return { success: true, data: [] };

    await this.ensureStudentFeeRecord(studentId);

    const fees = await this.prisma.fee.findMany({
      where: { studentId, schoolId: this.getSchoolId() },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: fees };
  }

  async markPaid(id: string) {
    const schoolId = this.getSchoolId();
    const fee = await this.prisma.fee.findFirst({ where: { id, schoolId } });
    if (!fee) throw new NotFoundException('Fee record not found');

    const receiptNo = `REC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const updated   = await this.prisma.fee.update({
      where: { id },
      data:  { paid: fee.amount, status: FeeStatus.PAID, paidDate: new Date(), receiptNo },
    });
    return { success: true, message: 'Fee marked as paid', data: updated };
  }

  async updatePayment(id: string, dto: any) {
    const schoolId = this.getSchoolId();
    const fee = await this.prisma.fee.findFirst({ where: { id, schoolId } });
    if (!fee) throw new NotFoundException('Fee record not found');

    const paid   = dto.paid;
    const status: FeeStatus =
      paid >= fee.amount ? FeeStatus.PAID :
      paid > 0           ? FeeStatus.PARTIAL :
                           FeeStatus.PENDING;

    const updated = await this.prisma.fee.update({
      where: { id },
      data: {
        paid,
        status,
        paidDate: paid > 0 ? new Date() : null,
        receiptNo: status === FeeStatus.PAID
          ? `REC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`
          : fee.receiptNo,
        remarks: dto.remarks,
      },
    });
    return { success: true, message: 'Payment updated', data: updated };
  }

  async create(dto: any) {
    const fee = await this.prisma.fee.create({ data: { ...dto, schoolId: this.getSchoolId() } });
    return { success: true, message: 'Fee record created', data: fee };
  }

  async getMonthlyStats() {
    const schoolId = this.getSchoolId();
    const months      = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const currentYear = new Date().getFullYear();
    const fees        = await this.prisma.fee.findMany({
      where: { schoolId, status: FeeStatus.PAID, paidDate: { not: null } },
    });
    const byMonth = months.map((m, i) => ({
      month:  m,
      amount: fees
        .filter(f => f.paidDate && new Date(f.paidDate).getMonth() === i && new Date(f.paidDate).getFullYear() === currentYear)
        .reduce((a, f) => a + f.paid, 0),
    }));
    return { success: true, data: byMonth };
  }
}
