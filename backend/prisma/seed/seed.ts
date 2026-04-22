// prisma/seed/seed.ts
import { PrismaClient, Role, FeeStatus, Priority } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Admin User ───
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@gnpss.edu.in' },
    update: {},
    create: {
      email: 'admin@gnpss.edu.in',
      password: await bcrypt.hash('Admin@1234', 10),
      role: Role.ADMIN,
      name: 'Dr. R.K. Sharma',
    },
  });
  console.log('✅ Admin created:', adminUser.email);

  // ─── Teachers ───
  const teachersData = [
    { name: 'Dr. Sunita Rao', email: 'sunita@gnpss.edu.in', subject: 'Mathematics', code: 'EMP001', classes: '10A, 10B', phone: '9876500001', qual: 'PhD Mathematics', exp: '12 years', salary: 48000 },
    { name: 'Mr. Arun Kumar', email: 'arun@gnpss.edu.in', subject: 'Physics', code: 'EMP002', classes: '9A, 9B', phone: '9876500002', qual: 'M.Sc Physics', exp: '8 years', salary: 40000 },
    { name: 'Ms. Kavita Joshi', email: 'kavita@gnpss.edu.in', subject: 'English', code: 'EMP003', classes: '8A, 8B', phone: '9876500003', qual: 'MA English', exp: '6 years', salary: 36000 },
    { name: 'Mr. Rahul Mehta', email: 'rahul@gnpss.edu.in', subject: 'Chemistry', code: 'EMP004', classes: '10A, 9A', phone: '9876500004', qual: 'M.Sc Chemistry', exp: '10 years', salary: 42000 },
  ];

  const teachers = [];
  for (const t of teachersData) {
    const user = await prisma.user.upsert({
      where: { email: t.email },
      update: {},
      create: {
        email: t.email,
        password: await bcrypt.hash('Teacher@1234', 10),
        role: Role.TEACHER,
        name: t.name,
        teacher: {
          create: {
            employeeCode: t.code,
            subject: t.subject,
            assignedClasses: t.classes,
            phone: t.phone,
            qualification: t.qual,
            experience: t.exp,
            salary: t.salary,
          },
        },
      },
      include: { teacher: true },
    });
    teachers.push(user.teacher);
    console.log('✅ Teacher created:', t.name);
  }

  // ─── Classes ───
  const classesData = [
    { name: '10A', teacherName: 'Dr. Sunita Rao', room: 'R-101', subject: 'Mathematics', grade: '10', section: 'A', studentCount: 34 },
    { name: '10B', teacherName: 'Mr. Arun Kumar', room: 'R-102', subject: 'Physics', grade: '10', section: 'B', studentCount: 32 },
    { name: '9A', teacherName: 'Ms. Kavita Joshi', room: 'R-201', subject: 'English', grade: '9', section: 'A', studentCount: 36 },
    { name: '9B', teacherName: 'Mr. Rahul Mehta', room: 'R-202', subject: 'Chemistry', grade: '9', section: 'B', studentCount: 30 },
    { name: '8A', teacherName: 'Dr. Sunita Rao', room: 'R-301', subject: 'Mathematics', grade: '8', section: 'A', studentCount: 33 },
    { name: '8B', teacherName: 'Mr. Arun Kumar', room: 'R-302', subject: 'Physics', grade: '8', section: 'B', studentCount: 31 },
  ];

  for (const c of classesData) {
    await prisma.class.upsert({
      where: { name: c.name },
      update: {},
      create: c,
    });
  }
  console.log('✅ Classes seeded');

  // ─── Students ───
  const studentsData = [
    { name: 'Aarav Sharma', email: 'aarav@student.gnpss.edu.in', roll: 'S001', cls: '10A', phone: '9876543210', parent: 'Rajesh Sharma', parentPhone: '9876543200', dob: new Date('2009-03-15'), addr: 'Civil Lines, Ludhiana' },
    { name: 'Priya Singh', email: 'priya@student.gnpss.edu.in', roll: 'S002', cls: '10B', phone: '9876543211', parent: 'Mohan Singh', parentPhone: '9876543201', dob: new Date('2009-07-22'), addr: 'Model Town, Jalandhar' },
    { name: 'Rohan Patel', email: 'rohan@student.gnpss.edu.in', roll: 'S003', cls: '9A', phone: '9876543212', parent: 'Suresh Patel', parentPhone: '9876543202', dob: new Date('2010-01-10'), addr: 'Sarabha Nagar, Ludhiana' },
    { name: 'Anjali Gupta', email: 'anjali@student.gnpss.edu.in', roll: 'S004', cls: '9B', phone: '9876543213', parent: 'Ramesh Gupta', parentPhone: '9876543203', dob: new Date('2010-05-18'), addr: 'BRS Nagar, Ludhiana' },
    { name: 'Vikram Nair', email: 'vikram@student.gnpss.edu.in', roll: 'S005', cls: '8A', phone: '9876543214', parent: 'Krishna Nair', parentPhone: '9876543204', dob: new Date('2011-09-05'), addr: 'Sector 32, Chandigarh' },
    { name: 'Meera Reddy', email: 'meera@student.gnpss.edu.in', roll: 'S006', cls: '8B', phone: '9876543215', parent: 'Venkat Reddy', parentPhone: '9876543205', dob: new Date('2011-11-30'), addr: 'Dugri Road, Ludhiana' },
    { name: 'Harpreet Kaur', email: 'harpreet@student.gnpss.edu.in', roll: 'S007', cls: '10A', phone: '9876543216', parent: 'Gurpreet Singh', parentPhone: '9876543206', dob: new Date('2009-04-12'), addr: 'Patiala Road, Ludhiana' },
  ];

  const students = [];
  const feeAmounts = { '10': 15000, '9': 13500, '8': 12000 };

  for (const s of studentsData) {
    const grade = s.cls.replace(/[AB]$/, '');
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        email: s.email,
        password: await bcrypt.hash('Student@1234', 10),
        role: Role.STUDENT,
        name: s.name,
        student: {
          create: {
            roll: s.roll,
            className: s.cls,
            phone: s.phone,
            parentName: s.parent,
            parentPhone: s.parentPhone,
            address: s.addr,
            dob: s.dob,
          },
        },
      },
      include: { student: true },
    });
    students.push(user.student);
    console.log('✅ Student created:', s.name);

    // Create fee record
    const amt = feeAmounts[grade] || 15000;
    const isPaid = ['S001', 'S003', 'S005', 'S007'].includes(s.roll);
    const isPartial = s.roll === 'S004';

    await prisma.fee.upsert({
      where: {
        id: `fee-${user.student.id}`,
      },
      update: {},
      create: {
        id: `fee-${user.student.id}`,
        studentId: user.student.id,
        term: 'Term 1 – 2024',
        tuition: amt - 3000,
        transport: 2000,
        lab: grade === '10' ? 1000 : 500,
        sports: 500,
        amount: amt,
        paid: isPaid ? amt : isPartial ? amt / 2 : 0,
        status: isPaid ? FeeStatus.PAID : isPartial ? FeeStatus.PARTIAL : FeeStatus.PENDING,
        paidDate: isPaid ? new Date('2024-01-10') : isPartial ? new Date('2024-01-15') : null,
        receiptNo: isPaid ? `REC-2024-${s.roll}` : null,
      },
    });
  }

  // ─── Notices ───
  const noticesData = [
    { title: 'Annual Sports Day – Registration Open', body: 'All students are invited to register for Annual Sports Day on 15th April. Register at the sports office before 10th April.', target: 'All', priority: Priority.HIGH },
    { title: 'Parent-Teacher Meeting – March 30', body: 'PTM scheduled for all classes on March 30, 2024. Parents are requested to attend between 9 AM – 1 PM with student diary.', target: 'Parents', priority: Priority.MEDIUM },
    { title: 'Holiday Notice – Holi', body: 'School will remain closed on 25th March on account of Holi festival. Classes resume on 26th March 2024.', target: 'All', priority: Priority.LOW },
    { title: 'Board Exam Schedule Released', body: 'CBSE Board Exam schedule for Class 10 & 12 released. Students must download admit cards from student portal immediately.', target: 'Students', priority: Priority.HIGH },
    { title: 'Term 2 Fee Deadline – 31st March', body: 'Last date for Term 2 fee payment is 31st March 2024. Late fee of ₹100/day will be charged after deadline.', target: 'Parents', priority: Priority.HIGH },
  ];

  for (const n of noticesData) {
    await prisma.notice.create({ data: n });
  }
  console.log('✅ Notices seeded');

  // ─── Homework ───
  if (teachers[0]) {
    await prisma.homework.createMany({
      data: [
        { teacherId: teachers[0].id, subject: 'Mathematics', className: '10A', title: 'Chapter 5 – Quadratic Equations', description: 'Solve exercises 5.1 to 5.4 from NCERT textbook. Show all steps.', dueDate: new Date('2024-03-25') },
        { teacherId: teachers[1].id, subject: 'Physics', className: '9A', title: 'Laws of Motion – Numericals', description: 'Complete all numerical problems from Chapter 5. Diagrams mandatory.', dueDate: new Date('2024-03-26') },
        { teacherId: teachers[2].id, subject: 'English', className: '8A', title: 'Essay Writing', description: 'Write a 300-word essay on "My Favourite Season". Focus on vocabulary.', dueDate: new Date('2024-03-27') },
      ],
    });
    console.log('✅ Homework seeded');
  }

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📋 Login Credentials:');
  console.log('─────────────────────────────────────');
  console.log('Admin:   admin@gnpss.edu.in / Admin@1234');
  console.log('Teacher: sunita@gnpss.edu.in / Teacher@1234');
  console.log('Student: aarav@student.gnpss.edu.in / Student@1234');
  console.log('─────────────────────────────────────');
}

main()
  .catch((e) => { console.error('❌ Seed error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
