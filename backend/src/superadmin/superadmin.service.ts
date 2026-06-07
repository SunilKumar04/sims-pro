import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { CreateSchoolAdminDto } from './dto/create-school-admin.dto';
import { Role, RoleScope, SchoolStatus, SubscriptionStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeDomain(value?: string | null) {
  return value?.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '') || undefined;
}

function normalizeColor(value?: string | null) {
  return value?.trim() || undefined;
}

function schoolCodeFromName(name: string) {
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SCH-${slugify(name).slice(0, 6).toUpperCase() || 'SCH'}-${suffix}`;
}

function tempPassword() {
  return `Temp@${Math.random().toString(36).slice(2, 8)}1`;
}

@Injectable()
export class SuperAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  login(email: string, password: string) {
    return this.authService.superAdminLogin({ email, password });
  }

  async dashboard() {
    const [totalSchools, activeSchools, suspendedSchools, totalStudents, totalTeachers, subscriptions] =
      await Promise.all([
        this.prisma.school.count(),
        this.prisma.school.count({ where: { status: SchoolStatus.ACTIVE } }),
        this.prisma.school.count({ where: { status: SchoolStatus.SUSPENDED } }),
        this.prisma.student.count(),
        this.prisma.teacher.count(),
        this.prisma.subscription.findMany({
          where: { status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE, SubscriptionStatus.PAST_DUE] } },
          select: { amountPaid: true, expiryDate: true, school: { select: { id: true, name: true, schoolCode: true } } },
        }),
      ]);

    const monthlyRevenue = subscriptions.reduce((sum, item) => sum + Number(item.amountPaid ?? 0), 0);
    const expiringSubscriptions = subscriptions.filter((item) => {
      const daysLeft = (item.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return daysLeft <= 30;
    });

    return {
      success: true,
      data: {
        totalSchools,
        activeSchools,
        suspendedSchools,
        totalStudents,
        totalTeachers,
        monthlyRevenue,
        expiringSubscriptions,
      },
    };
  }

  async analytics() {
    const [
      totalSchools,
      activeSchools,
      totalStudents,
      totalTeachers,
      planBreakdown,
      monthlyRevenue,
      expiringSubscriptions,
    ] = await Promise.all([
      this.prisma.school.count(),
      this.prisma.school.count({ where: { status: SchoolStatus.ACTIVE } }),
      this.prisma.student.count(),
      this.prisma.teacher.count(),
      this.prisma.subscription.groupBy({
        by: ['planId'],
        _count: { _all: true },
        _sum: { amountPaid: true },
      }),
      this.prisma.subscription.aggregate({
        _sum: { amountPaid: true },
      }),
      this.prisma.subscription.count({
        where: {
          expiryDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
          status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE, SubscriptionStatus.PAST_DUE] },
        },
      }),
    ]);

    const plans = await this.prisma.plan.findMany({
      where: { id: { in: planBreakdown.map((item) => item.planId) } },
      select: { id: true, name: true, code: true },
    });
    const planMap = new Map(plans.map((plan) => [plan.id, plan]));

    return {
      success: true,
      data: {
        totalSchools,
        activeSchools,
        totalStudents,
        totalTeachers,
        monthlyRevenue: Number(monthlyRevenue._sum.amountPaid ?? 0),
        expiringSubscriptions,
        planBreakdown: planBreakdown.map((item) => ({
          ...item,
          plan: planMap.get(item.planId),
        })),
      },
    };
  }

  async listSchools() {
    const schools = await this.prisma.school.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { plan: true },
        },
      },
    });

    return { success: true, data: schools };
  }

  async listPlans() {
    const plans = await this.prisma.plan.findMany({
      orderBy: { priceMonthly: 'asc' },
      include: { _count: { select: { subscriptions: true } } },
    });
    return { success: true, data: plans };
  }

  async createPlan(dto: CreatePlanDto) {
    const plan = await this.prisma.plan.create({
      data: {
        code: dto.code,
        name: dto.name,
        priceMonthly: dto.priceMonthly,
        priceAnnual: dto.priceAnnual,
        studentLimit: dto.studentLimit,
        teacherLimit: dto.teacherLimit,
        storageLimitMb: dto.storageLimitMb,
        features: dto.features ?? {},
        isActive: dto.isActive ?? true,
      },
    });
    return { success: true, data: plan };
  }

  async updatePlan(id: string, dto: UpdatePlanDto) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');

    const updated = await this.prisma.plan.update({
      where: { id },
      data: {
        code: dto.code,
        name: dto.name,
        priceMonthly: dto.priceMonthly,
        priceAnnual: dto.priceAnnual,
        studentLimit: dto.studentLimit,
        teacherLimit: dto.teacherLimit,
        storageLimitMb: dto.storageLimitMb,
        features: dto.features,
        isActive: dto.isActive,
      },
    });
    return { success: true, data: updated };
  }

  async listSubscriptions() {
    const subscriptions = await this.prisma.subscription.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        plan: true,
        school: { select: { id: true, name: true, schoolCode: true, status: true } },
      },
    });
    return { success: true, data: subscriptions };
  }

  async listSchoolAdmins(schoolId: string) {
    const admins = await this.prisma.user.findMany({
      where: { schoolId, role: Role.SCHOOL_ADMIN },
      select: { id: true, name: true, email: true, phone: true, isActive: true, createdAt: true, lastLogin: true },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: admins };
  }

  async createSchoolAdmin(schoolId: string, dto: CreateSchoolAdminDto) {
    const school = await this.prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) throw new NotFoundException('School not found');

    const exists = await this.prisma.user.findFirst({
      where: { schoolId, email: dto.email },
    });
    if (exists) throw new BadRequestException('Admin email already exists for this school');

    const hashed = await bcrypt.hash(dto.password, 10);
    const admin = await this.prisma.user.create({
      data: {
        schoolId,
        email: dto.email,
        password: hashed,
        name: dto.name,
        phone: dto.phone,
        role: Role.SCHOOL_ADMIN,
        isActive: true,
      },
      select: { id: true, name: true, email: true, phone: true, isActive: true, createdAt: true },
    });
    return { success: true, data: admin };
  }

  async resetSchoolAdminPassword(userId: string, password: string) {
    const admin = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!admin) throw new NotFoundException('School admin not found');
    const hashed = await bcrypt.hash(password, 10);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed, mustChangePwd: true },
      select: { id: true, name: true, email: true, isActive: true },
    });
    return { success: true, data: updated };
  }

  async setSchoolAdminStatus(userId: string, isActive: boolean) {
    const admin = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!admin) throw new NotFoundException('School admin not found');
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: { id: true, name: true, email: true, isActive: true },
    });
    return { success: true, data: updated };
  }

  async getSchool(id: string) {
    const school = await this.prisma.school.findUnique({
      where: { id },
      include: {
        subscriptions: { include: { plan: true }, orderBy: { createdAt: 'desc' } },
        users: { select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true } },
      },
    });
    if (!school) throw new NotFoundException('School not found');
    return { success: true, data: school };
  }

  async createSchool(dto: CreateSchoolDto) {
    const schoolCode = dto.schoolCode?.trim() || schoolCodeFromName(dto.name);
    const temp = dto.tempPassword?.trim() || tempPassword();
    const planCode = dto.planCode?.trim() || 'starter';

    const plan = await this.prisma.plan.findFirst({ where: { code: planCode } });
    if (!plan) throw new BadRequestException(`Plan '${planCode}' does not exist`);

    const school = await this.prisma.$transaction(async (tx) => {
      const createdSchool = await tx.school.create({
        data: {
          schoolCode,
          name: dto.name,
          slug: slugify(dto.name),
          subdomain: normalizeDomain(dto.subdomain),
          customDomain: normalizeDomain(dto.customDomain),
          contactPerson: dto.contactPerson,
          email: dto.email,
          phone: dto.phone,
          address: dto.address,
          status: SchoolStatus.ACTIVE,
          onboardingDone: false,
        },
      });

      await tx.subscription.create({
        data: {
          schoolId: createdSchool.id,
          planId: plan.id,
          startDate: new Date(),
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          status: SubscriptionStatus.ACTIVE,
          autoRenew: false,
          studentLimitSnap: plan.studentLimit,
          teacherLimitSnap: plan.teacherLimit,
        },
      });

      const defaultRoles = [
        { code: 'ADMIN', name: 'School Admin' },
        { code: 'TEACHER', name: 'Teacher' },
        { code: 'STUDENT', name: 'Student' },
        { code: 'PARENT', name: 'Parent' },
        { code: 'ACCOUNTANT', name: 'Accountant' },
      ];

      await Promise.all(defaultRoles.map((role) =>
        tx.accessRole.create({
          data: {
            schoolId: createdSchool.id,
            code: role.code,
            name: role.name,
            scope: RoleScope.SCHOOL,
            isSystem: true,
          },
        }),
      ));

      const hashed = await bcrypt.hash(temp, 10);
      await tx.user.create({
        data: {
          schoolId: createdSchool.id,
          email: dto.adminEmail,
          password: hashed,
          name: dto.contactPerson,
          role: Role.SCHOOL_ADMIN,
          isActive: true,
        },
      });

      await tx.schoolSetting.createMany({
        data: [
          { schoolId: createdSchool.id, key: 'academic_year', value: { label: new Date().getFullYear() } },
          { schoolId: createdSchool.id, key: 'currency', value: { code: 'INR' } },
          ...(dto.logoUrl ? [{ schoolId: createdSchool.id, key: 'logoUrl', value: dto.logoUrl }] : []),
          ...(dto.primaryColor ? [{ schoolId: createdSchool.id, key: 'primaryColor', value: normalizeColor(dto.primaryColor) }] : []),
          ...(dto.secondaryColor ? [{ schoolId: createdSchool.id, key: 'secondaryColor', value: normalizeColor(dto.secondaryColor) }] : []),
          ...(dto.accentColor ? [{ schoolId: createdSchool.id, key: 'accentColor', value: normalizeColor(dto.accentColor) }] : []),
          ...(dto.backgroundColor ? [{ schoolId: createdSchool.id, key: 'backgroundColor', value: normalizeColor(dto.backgroundColor) }] : []),
          ...(dto.themeMode ? [{ schoolId: createdSchool.id, key: 'themeMode', value: dto.themeMode }] : []),
        ],
      });

      await tx.school.update({
        where: { id: createdSchool.id },
        data: { onboardingDone: true },
      });

      return createdSchool;
    });

    return {
      success: true,
      message: 'School created successfully',
      data: {
        school,
        adminCredentials: {
          email: dto.adminEmail,
          tempPassword: temp,
        },
      },
    };
  }

  async updateSchool(id: string, dto: UpdateSchoolDto) {
    const school = await this.prisma.school.findUnique({ where: { id } });
    if (!school) throw new NotFoundException('School not found');

    const updated = await this.prisma.school.update({
      where: { id },
      data: {
        name: dto.name,
        schoolCode: dto.schoolCode,
        subdomain: normalizeDomain(dto.subdomain),
        customDomain: normalizeDomain(dto.customDomain),
        contactPerson: dto.contactPerson,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
      },
    });

    const settingsEntries = [
      ['short', dto.short],
      ['cbseCode', dto.cbseCode],
      ['estd', dto.estd],
      ['board', dto.board],
      ['logoUrl', dto.logoUrl],
      ['primaryColor', dto.primaryColor],
      ['secondaryColor', dto.secondaryColor],
      ['accentColor', dto.accentColor],
      ['backgroundColor', dto.backgroundColor],
      ['themeMode', dto.themeMode],
    ].filter(([, value]) => value !== undefined && value !== null && value !== '');

    await Promise.all(settingsEntries.map(([key, value]) =>
      this.prisma.schoolSetting.upsert({
        where: {
          schoolId_key: {
            schoolId: school.id,
            key,
          },
        },
        update: { value },
        create: { schoolId: school.id, key, value },
      })
    ));

    return { success: true, data: { school: updated, settings: Object.fromEntries(settingsEntries) } };
  }

  async activateSchool(id: string) {
    await this.ensureSchoolExists(id);
    return this.prisma.school.update({ where: { id }, data: { status: SchoolStatus.ACTIVE } });
  }

  async suspendSchool(id: string) {
    await this.ensureSchoolExists(id);
    return this.prisma.school.update({ where: { id }, data: { status: SchoolStatus.SUSPENDED } });
  }

  async deleteSchool(id: string) {
    await this.ensureSchoolExists(id);
    await this.prisma.school.delete({ where: { id } });
    return { success: true, message: 'School deleted successfully' };
  }

  private async ensureSchoolExists(id: string) {
    const school = await this.prisma.school.findUnique({ where: { id } });
    if (!school) throw new NotFoundException('School not found');
  }
}
