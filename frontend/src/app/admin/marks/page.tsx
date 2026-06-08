'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { classesApi, marksApi, studentsApi } from '@/lib/api';
import { toast } from '@/components/ui/Toast';

const EXAM_TYPES = [
  { value: 'ALL', label: 'All Exams' },
  { value: 'UNIT_TEST', label: 'Unit Test' },
  { value: 'MID_TERM', label: 'Mid-Term' },
  { value: 'FINAL', label: 'Final' },
  { value: 'PRACTICALS', label: 'Practicals' },
];

const EXAM_ORDER: Record<string, number> = {
  UNIT_TEST: 1,
  MID_TERM: 2,
  FINAL: 3,
  PRACTICALS: 4,
};

const PASS_PERCENT = 40;

type MarkRow = {
  id: string;
  studentId: string;
  studentName: string;
  roll: string;
  className: string;
  subject: string;
  examType: string;
  marks: number;
  maxMarks: number;
  grade: string;
  year: number;
};

type StudentSummary = {
  studentId: string;
  studentName: string;
  roll: string;
  records: number;
  totalMarks: number;
  totalMax: number;
  percentage: number;
  passed: number;
  failed: number;
  bestExam: string;
};

type SubjectSummary = {
  subject: string;
  records: number;
  totalMarks: number;
  totalMax: number;
  percentage: number;
  passed: number;
};

function gradeFromPct(pct: number) {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
}

function gradeStyle(grade: string) {
  if (grade === 'A+' || grade === 'A') return { color: '#86EFAC', bg: 'rgba(34,197,94,0.15)' };
  if (grade === 'B+' || grade === 'B') return { color: '#FCD34D', bg: 'rgba(245,158,11,0.15)' };
  if (grade === 'C') return { color: '#FDBA74', bg: 'rgba(249,115,22,0.15)' };
  if (grade === 'D') return { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' };
  return { color: '#FCA5A5', bg: 'rgba(239,68,68,0.15)' };
}

function pctColor(pct: number) {
  if (pct >= 85) return '#86EFAC';
  if (pct >= 70) return '#FCD34D';
  if (pct >= 50) return '#FDBA74';
  return '#FCA5A5';
}

function normalizeMarks(payload: any, fallbackExam: string, studentIndex: Map<string, any>): MarkRow[] {
  const raw = Array.isArray(payload)
    ? payload
    : payload?.data && Array.isArray(payload.data)
      ? payload.data
      : payload?.marks && Array.isArray(payload.marks)
        ? payload.marks
        : payload?.records && Array.isArray(payload.records)
          ? payload.records
          : payload?.items && Array.isArray(payload.items)
            ? payload.items
            : payload?.grouped && typeof payload.grouped === 'object'
              ? Object.entries(payload.grouped).flatMap(([examType, rows]: [string, any]) =>
                  (rows || []).map((row: any) => ({ ...row, examType: row.examType || examType })),
                )
              : [];

  return raw.map((mark: any) => {
    const student = studentIndex.get(mark.studentId) || {};
    const marks = Number(mark.marks ?? 0);
    const maxMarks = Number(mark.maxMarks ?? 100);
    const pct = maxMarks > 0 ? Math.round((marks / maxMarks) * 100) : 0;

    return {
      id: String(mark.id || `${mark.studentId}-${mark.subject}-${mark.examType || fallbackExam}-${mark.year || ''}`),
      studentId: String(mark.studentId || ''),
      studentName: String(mark.student?.user?.name || mark.student?.name || student.name || mark.studentName || 'Unknown'),
      roll: String(mark.student?.roll || student.roll || mark.roll || '—'),
      className: String(mark.className || student.className || ''),
      subject: String(mark.subject || '—'),
      examType: String(mark.examType || fallbackExam),
      marks,
      maxMarks,
      grade: String(mark.grade || gradeFromPct(pct)),
      year: Number(mark.year || new Date().getFullYear()),
    };
  });
}

export default function AdminMarksPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [className, setClassName] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [examFilter, setExamFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<MarkRow[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [error, setError] = useState('');

  const loadClasses = useCallback(async () => {
    try {
      const res = await classesApi.getAll({});
      const list = res.data.data || [];
      setClasses(list);
      setClassName((current) => current || list[0]?.name || '');
    } catch {
      setClasses([]);
    }
  }, []);

  const loadMarks = useCallback(async () => {
    if (!className) {
      setRows([]);
      setStudents([]);
      setLoading(false);
      return;
    }

    const selectedClass = className;
    setError('');
    setLoading(true);
    try {
      const [studentsRes, markResponses] = await Promise.all([
        studentsApi.getAll({ className: selectedClass }),
        Promise.all(
          EXAM_TYPES.filter((item) => item.value !== 'ALL').map((item) =>
            marksApi
              .getByClass(selectedClass, item.value, year)
              .catch(() => null),
          ),
        ),
      ]);

      const studentList = studentsRes.data.data || [];
      setStudents(studentList);
      const studentIndex = new Map<string, any>(
        studentList.map((student: any) => [
          student.id,
          {
            name: student.user?.name || student.name || 'Unknown',
            roll: student.roll || '—',
            className: student.className || selectedClass,
          },
        ]),
      );

      const normalized = markResponses.flatMap((response, index) => {
        const examType = EXAM_TYPES[index + 1]?.value || 'UNIT_TEST';
        return normalizeMarks(response?.data?.data ?? response?.data ?? [], examType, studentIndex);
      });

      setRows(
        normalized
          .filter((item) => item.year === year)
          .sort((a, b) => {
            const subjectSort = a.subject.localeCompare(b.subject);
            if (subjectSort !== 0) return subjectSort;
            const examSort = (EXAM_ORDER[a.examType] || 99) - (EXAM_ORDER[b.examType] || 99);
            if (examSort !== 0) return examSort;
            return a.roll.localeCompare(b.roll);
          }),
      );
    } catch (e: any) {
      setRows([]);
      setStudents([]);
      setError(e?.message || 'Could not load marks');
      toast.error('Failed to load marks', e?.message || 'Please try again');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [className, year]);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    void loadMarks();
  }, [loadMarks]);

  const subjects = useMemo(
    () => Array.from(new Set(rows.map((row) => row.subject))).sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const matchesExam = examFilter === 'ALL' || row.examType === examFilter;
      const matchesSubject = subjectFilter === 'ALL' || row.subject === subjectFilter;
      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        row.studentName.toLowerCase().includes(query) ||
        row.roll.toLowerCase().includes(query) ||
        row.subject.toLowerCase().includes(query);
      return matchesExam && matchesSubject && matchesSearch;
    });
  }, [rows, examFilter, search, subjectFilter]);

  const examSummaries = useMemo(() => {
    const map = new Map<string, { examType: string; records: number; totalMarks: number; totalMax: number; passed: number }>();
    rows.forEach((row) => {
      const current = map.get(row.examType) || { examType: row.examType, records: 0, totalMarks: 0, totalMax: 0, passed: 0 };
      current.records += 1;
      current.totalMarks += row.marks;
      current.totalMax += row.maxMarks;
      if (row.maxMarks > 0 && (row.marks / row.maxMarks) * 100 >= PASS_PERCENT) current.passed += 1;
      map.set(row.examType, current);
    });
    return Array.from(map.values())
      .map((item) => ({
        ...item,
        percentage: item.totalMax > 0 ? Math.round((item.totalMarks / item.totalMax) * 100) : 0,
      }))
      .sort((a, b) => (EXAM_ORDER[a.examType] || 99) - (EXAM_ORDER[b.examType] || 99));
  }, [rows]);

  const studentSummaries = useMemo(() => {
    const map = new Map<string, StudentSummary>();
    rows.forEach((row) => {
      const current = map.get(row.studentId) || {
        studentId: row.studentId,
        studentName: row.studentName,
        roll: row.roll,
        records: 0,
        totalMarks: 0,
        totalMax: 0,
        percentage: 0,
        passed: 0,
        failed: 0,
        bestExam: row.examType,
      };

      current.records += 1;
      current.totalMarks += row.marks;
      current.totalMax += row.maxMarks;
      if (row.maxMarks > 0 && (row.marks / row.maxMarks) * 100 >= PASS_PERCENT) current.passed += 1;
      else current.failed += 1;
      if (row.maxMarks > 0 && row.marks / row.maxMarks > (rows.find((item) => item.studentId === row.studentId && item.examType === current.bestExam)?.marks || 0) / (rows.find((item) => item.studentId === row.studentId && item.examType === current.bestExam)?.maxMarks || 1)) {
        current.bestExam = row.examType;
      }
      map.set(row.studentId, current);
    });

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        percentage: item.totalMax > 0 ? Math.round((item.totalMarks / item.totalMax) * 100) : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage || a.roll.localeCompare(b.roll));
  }, [rows]);

  const subjectSummaries = useMemo(() => {
    const map = new Map<string, SubjectSummary>();
    rows.forEach((row) => {
      const current = map.get(row.subject) || {
        subject: row.subject,
        records: 0,
        totalMarks: 0,
        totalMax: 0,
        percentage: 0,
        passed: 0,
      };

      current.records += 1;
      current.totalMarks += row.marks;
      current.totalMax += row.maxMarks;
      if (row.maxMarks > 0 && (row.marks / row.maxMarks) * 100 >= PASS_PERCENT) current.passed += 1;
      map.set(row.subject, current);
    });

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        percentage: item.totalMax > 0 ? Math.round((item.totalMarks / item.totalMax) * 100) : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage || a.subject.localeCompare(b.subject));
  }, [rows]);

  useEffect(() => {
    if (subjectFilter === 'ALL') return;
    if (!subjects.includes(subjectFilter)) setSubjectFilter('ALL');
  }, [subjects, subjectFilter]);

  const overallPct = rows.reduce((acc, row) => acc + row.marks, 0);
  const overallMax = rows.reduce((acc, row) => acc + row.maxMarks, 0);
  const classPct = overallMax > 0 ? Math.round((overallPct / overallMax) * 100) : 0;
  const passRate = rows.length > 0 ? Math.round((rows.filter((row) => row.maxMarks > 0 && (row.marks / row.maxMarks) * 100 >= PASS_PERCENT).length / rows.length) * 100) : 0;
  const averageStudentPct = studentSummaries.length > 0 ? Math.round(studentSummaries.reduce((acc, item) => acc + item.percentage, 0) / studentSummaries.length) : 0;
  const topPerformers = studentSummaries.slice(0, 5);

  return (
    <AppShell title="Marks View" subtitle="Class-wise marks dashboard and exam analysis">
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Students', value: studentSummaries.length, icon: '👨‍🎓', col: '#F0C040', bg: 'rgba(212,160,23,0.12)', bd: 'rgba(212,160,23,0.22)' },
          { label: 'Records', value: rows.length, icon: '🧾', col: '#93C5FD', bg: 'rgba(30,144,255,0.12)', bd: 'rgba(30,144,255,0.22)' },
          { label: 'Class Average', value: `${classPct}%`, icon: '📈', col: pctColor(classPct), bg: 'rgba(255,255,255,0.05)', bd: 'rgba(255,255,255,0.08)' },
          { label: 'Pass Rate', value: `${passRate}%`, icon: '✅', col: '#86EFAC', bg: 'rgba(34,197,94,0.12)', bd: 'rgba(34,197,94,0.22)' },
        ].map((card) => (
          <div key={card.label} className="glass rounded-2xl p-5 sm:p-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl text-xl" style={{ background: card.bg, border: `1px solid ${card.bd}` }}>
              {card.icon}
            </div>
            <div className="text-2xl font-black sm:text-3xl" style={{ color: card.col }}>{card.value}</div>
            <div className="mt-1 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>{card.label}</div>
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-4 sm:p-5 mb-5">
        <div className="grid gap-3 xl:grid-cols-[220px_180px_1fr_180px] xl:items-end">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>Class</label>
            <select value={className} onChange={(e) => setClassName(e.target.value)} className="sims-input text-sm w-full">
              <option value="">Select class</option>
              {classes.map((item) => (
                <option key={item.id || item.name} value={item.name}>{item.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value) || new Date().getFullYear())}
              className="sims-input text-sm w-full"
              min={2000}
              max={2100}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>Search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, roll, subject..."
              className="sims-input text-sm w-full"
            />
          </div>

          <button
            onClick={() => {
              setRefreshing(true);
              void loadMarks();
            }}
            className="w-full rounded-xl px-4 py-2.5 text-sm font-black transition-all hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg,#D4A017,#F0C040)', color: '#0A1628' }}
          >
            {refreshing ? 'Refreshing…' : 'Refresh Marks'}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {EXAM_TYPES.map((item) => (
            <button
              key={item.value}
              onClick={() => setExamFilter(item.value)}
              className="rounded-full px-4 py-2 text-xs font-bold transition-all"
              style={{
                background: examFilter === item.value ? 'rgba(212,160,23,0.18)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${examFilter === item.value ? 'rgba(212,160,23,0.35)' : 'rgba(255,255,255,0.08)'}`,
                color: examFilter === item.value ? '#F0C040' : 'rgba(255,255,255,0.45)',
              }}
            >
              {item.label}
            </button>
          ))}

          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="sims-input text-xs ml-auto"
            style={{ width: 180, padding: '8px 12px' }}
          >
            <option value="ALL">All Subjects</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="skeleton h-32 rounded-2xl" />
          <div className="skeleton h-80 rounded-2xl" />
        </div>
      ) : error ? (
        <div className="glass rounded-2xl py-20 text-center">
          <div className="text-5xl mb-4 opacity-40">📝</div>
          <h3 className="mb-2 text-lg font-bold text-white">Could not load marks</h3>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{error}</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="glass rounded-2xl py-20 text-center">
          <div className="text-5xl mb-4 opacity-40">📝</div>
          <h3 className="mb-2 text-lg font-bold text-white">No marks found</h3>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Select a class to review exam marks, averages, and subject performance.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="space-y-6">
            <div className="glass rounded-2xl p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white">Mark Register</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {className ? `Class ${className} · ${year}` : 'Choose a class to inspect marks'}
                  </p>
                </div>
                <div className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Showing {filtered.length} of {rows.length}
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="hidden grid-cols-[48px_1.4fr_90px_1fr_100px_90px_90px_78px] gap-0 bg-white/5 px-4 py-3 md:grid">
                  {['#', 'Student', 'Roll', 'Subject', 'Exam', 'Marks', '%', 'Grade'].map((header) => (
                    <div key={header} className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {header}
                    </div>
                  ))}
                </div>

                <div className="divide-y divide-white/5">
                  {filtered.map((row, index) => {
                    const pct = row.maxMarks > 0 ? Math.round((row.marks / row.maxMarks) * 100) : 0;
                    const style = gradeStyle(row.grade);
                    const passed = pct >= PASS_PERCENT;

                    return (
                      <div
                        key={row.id}
                        className="grid gap-3 px-4 py-4 md:grid-cols-[48px_1.4fr_90px_1fr_100px_90px_90px_78px] md:items-center"
                        style={{ background: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}
                      >
                        <div className="text-xs text-white/30">{index + 1}</div>

                        <div>
                          <div className="font-bold text-white">{row.studentName}</div>
                          <div className="mt-1 text-xs text-white/35 md:hidden">
                            {row.roll} · {row.subject} · {row.examType}
                          </div>
                        </div>

                        <div className="font-mono text-xs text-white/45">{row.roll}</div>

                        <div className="font-semibold text-white/80">{row.subject}</div>

                        <div className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.55)' }}>
                          {row.examType.replaceAll('_', ' ')}
                        </div>

                        <div className="font-bold text-white">{row.marks}/{row.maxMarks}</div>

                        <div className="font-bold" style={{ color: pctColor(pct) }}>{pct}%</div>

                        <div className="flex items-center gap-2">
                          <span
                            className="rounded-full px-2.5 py-1 text-xs font-black"
                            style={{ background: style.bg, color: style.color }}
                          >
                            {row.grade}
                          </span>
                          <span
                            className="hidden rounded-full px-2 py-1 text-[10px] font-bold md:inline-flex"
                            style={{
                              background: passed ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                              color: passed ? '#86EFAC' : '#FCA5A5',
                            }}
                          >
                            {passed ? 'Pass' : 'Fail'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="glass rounded-2xl p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-bold text-white">Subject Summary</h3>
                  <span className="text-xs font-bold text-white/35">{subjectSummaries.length} subjects</span>
                </div>
                <div className="space-y-3">
                  {subjectSummaries.slice(0, 6).map((item) => {
                    const col = pctColor(item.percentage);
                    return (
                      <div key={item.subject} className="rounded-2xl p-3.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div>
                            <div className="font-bold text-white">{item.subject}</div>
                            <div className="text-xs text-white/35">{item.records} records · {item.passed} passed</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-black" style={{ color: col }}>{item.percentage}%</div>
                            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/25">Average</div>
                          </div>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/5">
                          <div className="h-full rounded-full" style={{ width: `${item.percentage}%`, background: col }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="glass rounded-2xl p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-bold text-white">Top Performers</h3>
                  <span className="text-xs font-bold text-white/35">By overall percentage</span>
                </div>
                <div className="space-y-3">
                  {topPerformers.map((student, index) => {
                    const col = pctColor(student.percentage);
                    return (
                      <div key={student.studentId} className="flex items-center justify-between rounded-2xl p-3.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="min-w-0">
                          <div className="font-bold text-white">{index + 1}. {student.studentName}</div>
                          <div className="mt-1 text-xs text-white/35">Roll {student.roll} · {student.records} records</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-black" style={{ color: col }}>{student.percentage}%</div>
                          <div className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: col }}>{student.bestExam.replaceAll('_', ' ')}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass rounded-2xl p-5 sm:p-6">
              <h3 className="mb-4 text-base font-bold text-white">Exam Overview</h3>
              <div className="space-y-3">
                {examSummaries.map((item) => {
                  const col = pctColor(item.percentage);
                  return (
                    <div key={item.examType} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div>
                          <div className="font-bold text-white">{item.examType.replaceAll('_', ' ')}</div>
                          <div className="text-xs text-white/35">{item.records} records · {item.passed} passed</div>
                        </div>
                        <div className="text-right">
                          <div className="text-base font-black" style={{ color: col }}>{item.percentage}%</div>
                        </div>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/5">
                        <div className="h-full rounded-full" style={{ width: `${item.percentage}%`, background: col }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="glass rounded-2xl p-5 sm:p-6">
              <h3 className="mb-4 text-base font-bold text-white">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Avg. Student %', value: `${averageStudentPct}%`, color: '#F0C040' },
                  { label: 'Subject Count', value: subjectSummaries.length, color: '#93C5FD' },
                  { label: 'Passing Records', value: rows.filter((row) => row.maxMarks > 0 && (row.marks / row.maxMarks) * 100 >= PASS_PERCENT).length, color: '#86EFAC' },
                  { label: 'Failing Records', value: rows.filter((row) => row.maxMarks > 0 && (row.marks / row.maxMarks) * 100 < PASS_PERCENT).length, color: '#FCA5A5' },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="text-2xl font-black" style={{ color: item.color }}>{item.value}</div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass rounded-2xl p-5 sm:p-6">
              <h3 className="mb-4 text-base font-bold text-white">Loaded Students</h3>
              <div className="space-y-2">
                {students.slice(0, 8).map((student: any) => (
                  <div key={student.id} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-white">{student.user?.name || student.name || 'Unknown'}</div>
                      <div className="text-xs text-white/35">{student.roll} · {student.className}</div>
                    </div>
                    <span className="rounded-full px-2.5 py-1 text-[10px] font-bold text-white/60" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      ID
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
