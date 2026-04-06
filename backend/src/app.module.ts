import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { StudentsModule } from './students/students.module';
import { TeachersModule } from './teachers/teachers.module';
import { ClassesModule } from './classes/classes.module';
import { FeesModule } from './fees/fees.module';
import { NoticesModule } from './notices/notices.module';
import { HomeworkModule } from './homework/homework.module';
import { AttendanceModule } from './attendance/attendance.module';
import { MarksModule } from './marks/marks.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    StudentsModule,
    TeachersModule,
    ClassesModule,
    FeesModule,
    NoticesModule,
    HomeworkModule,
    AttendanceModule,
    MarksModule,       // ← NEW
    DashboardModule,
  ],
})
export class AppModule {}
