// src/types/sims.ts

export type ExamCategory    = 'MST1' | 'MID_TERM' | 'MST2' | 'FINAL';
export type AssignmentStatus = 'PENDING' | 'SUBMITTED' | 'LATE' | 'GRADED';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE';

// ── Timetable ─────────────────────────────────────────────
export interface TimetableSlot {
  id:        string;
  className: string;
  subject:   string;
  teacherId: string;
  dayOfWeek: number;   // 1=Mon … 6=Sat
  period:    number;   // 1–8
  startTime: string;
  endTime:   string;
  room:      string;
  teacher:   { user: { name: string } };
}

export interface ClassSubjectTeacher {
  id:             string;
  className:      string;
  subject:        string;
  teacherId:      string;
  periodsPerWeek: number;
  teacher:        { user: { name: string } };
}

// ── Exams ─────────────────────────────────────────────────
export interface DateSheetEntry {
  id:           string;
  examId:       string;
  subject:      string;
  date:         string;
  startTime:    string;
  endTime:      string;
  room:         string;
  maxMarks:     number;
  passingMarks: number;
}

export interface Exam {
  id:           string;
  className:    string;
  examType:     ExamCategory;
  title:        string;
  startDate:    string;
  endDate:      string;
  isPublished:  boolean;
  instructions: string | null;
  dateSheets:   DateSheetEntry[];
  _count?:      { dateSheets: number };
}

// ── Assignments ───────────────────────────────────────────
export interface AssignmentSubmission {
  id:           string;
  assignmentId: string;
  studentId:    string;
  submittedAt:  string;
  fileUrl:      string | null;
  remarks:      string | null;
  marks:        number | null;
  attemptCount: number;
  status:       AssignmentStatus;
  student?:     { user: { name: string }; roll: string };
}

export interface Assignment {
  id:          string;
  teacherId:   string;
  className:   string;
  subject:     string;
  title:       string;
  description: string;
  dueDate:     string;
  maxMarks:    number;
  maxSubmissions: number;
  createdAt:   string;
  teacher:     { user: { name: string } };
  submissions?: AssignmentSubmission[];
  _count?:     { submissions: number };
  // student-side extras
  submission?: AssignmentSubmission | null;
  status?:     AssignmentStatus;
  daysLeft?:   number;
}

export interface SubjectSummary {
  subject:    string;
  total:      number;
  present:    number;
  absent:     number;
  late:       number;
  percentage: number;
}

export interface SubjectAttendanceData {
  summary: SubjectSummary[];
  overall: { totalSessions: number; totalPresent: number; percentage: number };
  recentHistory: Array<{
    subject: string;
    date:    string;
    period:  number;
    status:  AttendanceStatus;
    remark:  string | null;
  }>;
}
