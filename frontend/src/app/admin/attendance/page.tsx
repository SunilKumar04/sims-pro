'use client';

// src/app/admin/attendance/page.tsx
import React, { useCallback, useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { attendanceApi, classesApi, sessionsApi } from '@/lib/api';
import { toast } from '@/components/ui/Toast';

// ── Types ─────────────────────────────────────────────────────────
type StatusFilter = 'ALL' | 'PRESENT' | 'ABSENT' | 'LATE';
type ViewMode     = 'daily' | 'summary' | 'monthly';

interface StudentRecord {
  studentId: string;
  name:      string;
  roll:      string;
  status:    'PRESENT' | 'ABSENT' | 'LATE' | 'NOT_MARKED';
  remark:    string;
}

interface DailySummary {
  total:       number;
  present:     number;
  absent:      number;
  late:        number;
  notMarked:   number;
  percentage:  number;
  alreadyMarked: boolean;
}

interface SummaryStudent {
  studentId:  string;
  name:       string;
  roll:       string;
  total:      number;
  present:    number;
  absent:     number;
  late:       number;
  percentage: number;
}

interface CalendarRecord {
  date: string;
  status: StudentRecord['status'];
}

interface SessionRecord {
  id: string;
  className: string;
  subject: string;
  date: string;
  period: number;
  topic?: string;
}

interface SessionStudentRecord {
  studentId: string;
  name: string;
  roll: string;
  status: StudentRecord['status'] | null;
  remark?: string;
}

interface SessionStudentsPayload {
  session: SessionRecord;
  students: SessionStudentRecord[];
}

// ── Helpers ──────────────────────────────────────────────────────
const pctColor   = (p: number) => p >= 80 ? '#86efac' : p >= 75 ? '#4ade80' : p >= 60 ? '#fcd34d' : '#f87171';
const pctBg      = (p: number) => p >= 80 ? 'rgba(74,222,128,0.12)' : p >= 75 ? 'rgba(74,222,128,0.08)' : p >= 60 ? 'rgba(251,191,36,0.1)' : 'rgba(248,113,113,0.1)';
const pctBorder  = (p: number) => p >= 75 ? 'rgba(74,222,128,0.25)' : p >= 60 ? 'rgba(251,191,36,0.25)' : 'rgba(248,113,113,0.25)';
const today      = () => new Date().toISOString().slice(0, 10);
const fmtDate    = (d: string) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
const MONTHS     = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_SHORT = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const STATUS_CFG = {
  PRESENT:    { color: '#86efac', bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.3)',  icon: '✓', label: 'Present'    },
  ABSENT:     { color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)', icon: '✗', label: 'Absent'     },
  LATE:       { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)',  icon: '◷', label: 'Late'       },
  NOT_MARKED: { color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)', icon: '–', label: 'Not Marked' },
} as const;
const ALL_CLASSES = '__ALL__';

function getMonthDates(month: number, year: number) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayStr = today();

  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }).filter((date) => date <= todayStr);
}

function mergeSessionStatuses(statuses: Array<StudentRecord['status'] | null | undefined>): StudentRecord['status'] {
  const filtered = statuses.filter(Boolean) as StudentRecord['status'][];
  if (filtered.length === 0) return 'NOT_MARKED';
  if (filtered.includes('ABSENT')) return 'ABSENT';
  if (filtered.includes('LATE')) return 'LATE';
  return 'PRESENT';
}

function buildDailySummary(data: StudentRecord[]): DailySummary {
  const total = data.length;
  const present = data.filter((rec) => rec.status === 'PRESENT').length;
  const absent = data.filter((rec) => rec.status === 'ABSENT').length;
  const late = data.filter((rec) => rec.status === 'LATE').length;
  const notMarked = data.filter((rec) => rec.status === 'NOT_MARKED').length;
  const held = total - notMarked;

  return {
    total,
    present,
    absent,
    late,
    notMarked,
    alreadyMarked: held > 0,
    percentage: total > 0 ? Math.round(((present + late) / total) * 100) : 0,
  };
}

// ── Mini progress bar ─────────────────────────────────────────────
function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginTop: 4 }}>
      <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: color, borderRadius: 99, transition: 'width 0.5s' }} />
    </div>
  );
}

// ── Calendar heat map ────────────────────────────────────────────
function CalendarHeatmap({
  records, month, year,
  onPrevMonth, onNextMonth,
}: {
  records:     CalendarRecord[];
  month:       number;
  year:        number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  const dateMap: Record<string, string[]> = {};
  records.forEach(r => {
    const d = r.date.slice(0, 10);
    if (!dateMap[d]) dateMap[d] = [];
    dateMap[d].push(r.status);
  });

  const getColor = (statuses: string[]) => {
    if (!statuses?.length) return null;
    const p = statuses.filter(s => s === 'PRESENT').length;
    const t = statuses.length;
    const pct = (p / t) * 100;
    return pctColor(pct);
  };

  const firstDow   = new Date(year, month - 1, 1).getDay();
  const daysInMon  = new Date(year, month, 0).getDate();
  const todayStr   = today();
  const nowDate    = new Date();

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={onPrevMonth}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>‹</button>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{MONTHS[month - 1]} {year}</span>
        <button onClick={onNextMonth}
                disabled={new Date(year, month, 1) > nowDate}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, width: 32, height: 32, cursor: 'pointer',
                  color: new Date(year, month, 1) > nowDate ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)', fontSize: 16 }}>›</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
        {DAYS_SHORT.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', paddingBottom: 4 }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMon }).map((_, i) => {
          const day     = i + 1;
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const recs    = dateMap[dateStr];
          const col     = recs ? getColor(recs) : null;
          const isFuture= dateStr > todayStr;
          const isToday = dateStr === todayStr;

          return (
            <div key={day}
                 title={recs ? `${recs.filter(s => s === 'PRESENT').length}/${recs.length} present` : ''}
                 style={{
                   aspectRatio: '1', borderRadius: 6,
                   background: col ? `${col}20` : isFuture ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
                   border: isToday ? '2px solid rgba(255,255,255,0.5)' : col ? `1px solid ${col}40` : '1px solid transparent',
                   display: 'flex', alignItems: 'center', justifyContent: 'center',
                   fontSize: 11, fontWeight: isToday ? 800 : 500,
                   color: col ? col : isFuture ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.4)',
                   opacity: isFuture ? 0.4 : 1,
                 }}>
              {day}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 10, justifyContent: 'center' }}>
        {[['#86efac', 'High (≥80%)'], ['#fcd34d', 'Medium (60–79%)'], ['#f87171', 'Low (<60%)']] .map(([c, l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: `${c}30`, border: `1px solid ${c}60` }} />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function AdminAttendancePage() {
  const [view,        setView]        = useState<ViewMode>('daily');
  const [classes,     setClasses]     = useState<{ id: string; name: string }[]>([]);
  const [selClass,    setSelClass]    = useState(ALL_CLASSES);
  const [subjects,    setSubjects]    = useState<string[]>([]);
  const [selSubject,  setSelSubject]  = useState('ALL');
  const [selDate,     setSelDate]     = useState(today());
  const [statusFilter,setStatusFilter]= useState<StatusFilter>('ALL');
  const [search,      setSearch]      = useState('');

  // Daily view
  const [dailyRecs,   setDailyRecs]   = useState<StudentRecord[]>([]);
  const [dailySumm,   setDailySumm]   = useState<DailySummary | null>(null);
  const [dailyLoad,   setDailyLoad]   = useState(false);

  // Summary view
  const [summaryData, setSummaryData] = useState<SummaryStudent[]>([]);
  const [summLoad,    setSummLoad]    = useState(false);

  // Monthly calendar
  const [calMonth,    setCalMonth]    = useState(new Date().getMonth() + 1);
  const [calYear,     setCalYear]     = useState(new Date().getFullYear());
  const [calRecords,  setCalRecords]  = useState<CalendarRecord[]>([]);
  const [calLoad,     setCalLoad]     = useState(false);

  const fetchSessions = useCallback(async (params: Record<string, string | number>) => {
    const response = await sessionsApi.getSessions({ ...params, take: 500 });
    return (response.data.data ?? []) as SessionRecord[];
  }, []);

  const fetchSessionStudents = useCallback(async (sessions: SessionRecord[]) => {
    const responses = await Promise.all(sessions.map((session) => sessionsApi.getSessionStudents(session.id)));
    return responses.map((response, index) => ({
      session: sessions[index],
      students: (response.data.data?.students ?? []) as SessionStudentRecord[],
    })) as SessionStudentsPayload[];
  }, []);

  const fetchAllClassDaily = useCallback(async (date: string) => {
    const responses = await Promise.all(classes.map(async (cls) => {
      const response = await attendanceApi.getByClass(cls.name, date);
      return response.data.data ?? [];
    }));

    const merged = new Map<string, StudentRecord>();
    responses.flat().forEach((record: StudentRecord) => {
      const current = merged.get(record.studentId);
      if (!current) {
        merged.set(record.studentId, record);
        return;
      }

      merged.set(record.studentId, {
        ...current,
        status: mergeSessionStatuses([current.status, record.status]),
        remark: [current.remark, record.remark].filter(Boolean).join(' · ') || '—',
      });
    });

    const data = Array.from(merged.values()).sort((a, b) => a.roll.localeCompare(b.roll));
    return { data, summary: buildDailySummary(data) };
  }, [classes]);

  const fetchAllClassSummary = useCallback(async () => {
    const responses = await Promise.all(classes.map((cls) => attendanceApi.getClassSummary(cls.name)));
    const merged = new Map<string, SummaryStudent>();

    responses.forEach((response) => {
      (response.data.data ?? []).forEach((student: SummaryStudent) => {
        const current = merged.get(student.studentId) ?? {
          studentId: student.studentId,
          name: student.name,
          roll: student.roll,
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          percentage: 0,
        };

        current.total += student.total;
        current.present += student.present;
        current.absent += student.absent;
        current.late += student.late;
        merged.set(student.studentId, current);
      });
    });

    return Array.from(merged.values())
      .map((student) => ({
        ...student,
        percentage: student.total > 0 ? Math.round(((student.present + student.late) / student.total) * 100) : 0,
      }))
      .sort((a, b) => a.roll.localeCompare(b.roll));
  }, [classes]);

  const fetchAllClassCalendar = useCallback(async (month: number, year: number) => {
    const dates = getMonthDates(month, year);
    const responses = await Promise.all(
      dates.map(async (date) => {
        const classResponses = await Promise.all(classes.map((cls) => attendanceApi.getByClass(cls.name, date)));
        return classResponses.flatMap((response) => {
          const dailyRecords = (response.data.data ?? []) as StudentRecord[];
          return dailyRecords
            .filter((record) => record.status !== 'NOT_MARKED')
            .map((record) => ({
              date,
              status: record.status,
            }));
        });
      }),
    );

    return responses.flat();
  }, [classes]);

  // ── Load classes ───────────────────────────────────────────
  useEffect(() => {
    classesApi.getAll({})
      .then(r => {
        const list = r.data.data ?? [];
        setClasses(list);
        if (list.length > 0) setSelClass((current) => current === ALL_CLASSES || !current ? list[0].name : current);
      })
      .catch(() => toast.error('Error', 'Could not load classes'));
  }, []);

  useEffect(() => {
    if (!selClass || selClass === ALL_CLASSES) {
      setSubjects([]);
      setSelSubject('ALL');
      return;
    }

    let active = true;

    fetchSessions({ className: selClass })
      .then((list) => {
        if (!active) return;
        const nextSubjects = Array.from(new Set(list.map((session) => session.subject).filter(Boolean))).sort();
        setSubjects(nextSubjects);
        setSelSubject((current) => (current === 'ALL' || nextSubjects.includes(current) ? current : 'ALL'));
      })
      .catch(() => {
        if (!active) return;
        setSubjects([]);
        setSelSubject('ALL');
      });

    return () => {
      active = false;
    };
  }, [selClass, fetchSessions]);

  // ── Load daily attendance ──────────────────────────────────
  const loadDaily = useCallback(async () => {
    if (!selClass) return;
    setDailyLoad(true);
    try {
      if (selClass === ALL_CLASSES) {
        const merged = await fetchAllClassDaily(selDate);
        setDailyRecs(merged.data);
        setDailySumm(merged.summary);
        return;
      }

      if (selSubject !== 'ALL') {
        const sessions = await fetchSessions({ className: selClass, subject: selSubject, date: selDate });
        const sessionPayloads = await fetchSessionStudents(sessions);
        const studentMap = new Map<string, StudentRecord>();

        sessionPayloads.forEach(({ session, students }) => {
          students.forEach((student) => {
            const current = studentMap.get(student.studentId);
            const statuses = [current?.status, student.status];
            const nextStatus = mergeSessionStatuses(statuses);
            const periodLabel = `P${session.period}`;
            const nextRemark = [current?.remark, student.remark, periodLabel]
              .filter(Boolean)
              .join(' · ');

            studentMap.set(student.studentId, {
              studentId: student.studentId,
              name: student.name,
              roll: student.roll,
              status: nextStatus,
              remark: nextRemark || '—',
            });
          });
        });

        const merged = Array.from(studentMap.values()).sort((a, b) => a.roll.localeCompare(b.roll));
        setDailyRecs(merged);
        setDailySumm(buildDailySummary(merged));
        return;
      }

      const r = await attendanceApi.getByClass(selClass, selDate);
      const data = (r.data.data ?? []) as StudentRecord[];
      const summary = r.data.summary ?? {};
      const total = summary.total ?? data.length;
      const present = summary.present ?? data.filter((rec) => rec.status === 'PRESENT').length;
      const absent = summary.absent ?? data.filter((rec) => rec.status === 'ABSENT').length;
      const late = summary.late ?? data.filter((rec) => rec.status === 'LATE').length;
      const notMarked = summary.notMarked ?? Math.max(total - present - absent - late, 0);
      const held = summary.held ?? total - notMarked;

      setDailyRecs(data);
      setDailySumm({
        total,
        present,
        absent,
        late,
        notMarked,
        alreadyMarked: summary.alreadyMarked ?? held > 0,
        percentage: total > 0 ? Math.round(((present + late) / total) * 100) : 0,
      });
    } catch {
      toast.error('Error', 'Could not load attendance');
    } finally { setDailyLoad(false); }
  }, [selClass, selDate, selSubject, fetchSessions, fetchSessionStudents, fetchAllClassDaily]);

  // ── Load class summary (30-day) ────────────────────────────
  const loadSummary = useCallback(async () => {
    if (!selClass) return;
    setSummLoad(true);
    try {
      if (selClass === ALL_CLASSES) {
        setSummaryData(await fetchAllClassSummary());
        return;
      }

      if (selSubject !== 'ALL') {
        const sessions = await fetchSessions({ className: selClass, subject: selSubject });
        const sessionPayloads = await fetchSessionStudents(sessions);
        const summaryMap = new Map<string, SummaryStudent>();

        sessionPayloads.forEach(({ students }) => {
          students.forEach((student) => {
            const current = summaryMap.get(student.studentId) ?? {
              studentId: student.studentId,
              name: student.name,
              roll: student.roll,
              total: 0,
              present: 0,
              absent: 0,
              late: 0,
              percentage: 0,
            };

            if (student.status) {
              current.total += 1;
              if (student.status === 'PRESENT') current.present += 1;
              if (student.status === 'ABSENT') current.absent += 1;
              if (student.status === 'LATE') current.late += 1;
            }

            summaryMap.set(student.studentId, current);
          });
        });

        const merged = Array.from(summaryMap.values())
          .map((student) => ({
            ...student,
            percentage: student.total > 0 ? Math.round(((student.present + student.late) / student.total) * 100) : 0,
          }))
          .sort((a, b) => a.roll.localeCompare(b.roll));

        setSummaryData(merged);
        return;
      }

      const r = await attendanceApi.getClassSummary(selClass);
      setSummaryData(r.data.data ?? []);
    } catch {
      toast.error('Error', 'Could not load summary');
    } finally { setSummLoad(false); }
  }, [selClass, selSubject, fetchSessions, fetchSessionStudents, fetchAllClassSummary]);

  // ── Load calendar records ──────────────────────────────────
  const loadCalendar = useCallback(async () => {
    if (!selClass) return;
    setCalLoad(true);
    try {
      if (selClass === ALL_CLASSES) {
        setCalRecords(await fetchAllClassCalendar(calMonth, calYear));
        return;
      }

      if (selSubject !== 'ALL') {
        const dateFrom = `${calYear}-${String(calMonth).padStart(2, '0')}-01`;
        const dateTo = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(new Date(calYear, calMonth, 0).getDate()).padStart(2, '0')}`;
        const sessions = await fetchSessions({ className: selClass, subject: selSubject, dateFrom, dateTo });
        const sessionPayloads = await fetchSessionStudents(sessions);
        const records = sessionPayloads.flatMap(({ session, students }) =>
          students
            .filter((student) => student.status && student.status !== 'NOT_MARKED')
            .map((student) => ({
              date: session.date.slice(0, 10),
              status: student.status as Exclude<StudentRecord['status'], 'NOT_MARKED'>,
            })),
        );

        setCalRecords(records);
        return;
      }

      const dates = getMonthDates(calMonth, calYear);
      const responses = await Promise.all(
        dates.map(async (date) => {
          const response = await attendanceApi.getByClass(selClass, date);
          const dailyRecords = (response.data.data ?? []) as StudentRecord[];

          return dailyRecords
            .filter((record) => record.status !== 'NOT_MARKED')
            .map((record) => ({
              date,
              status: record.status,
            }));
        }),
      );

      setCalRecords(responses.flat());
    } catch {
      setCalRecords([]);
    } finally { setCalLoad(false); }
  }, [selClass, selSubject, calMonth, calYear, fetchSessions, fetchSessionStudents, fetchAllClassCalendar]);

  useEffect(() => {
    if (view === 'daily')   loadDaily();
    if (view === 'summary') loadSummary();
    if (view === 'monthly') loadCalendar();
  }, [view, selClass, selDate, loadDaily, loadSummary, loadCalendar]);

  // ── Filtered daily records ─────────────────────────────────
  const filtered = dailyRecs
    .filter(r => statusFilter === 'ALL' || r.status === statusFilter)
    .filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.roll.toLowerCase().includes(search.toLowerCase()));

  // ── Overall stats across all classes ──────────────────────
  const ovPct = dailySumm
    ? dailySumm.total > 0
      ? Math.round(((dailySumm.present + dailySumm.late) / dailySumm.total) * 100)
      : 0
    : 0;

  const TABS: { id: ViewMode; icon: string; label: string }[] = [
    { id: 'daily',   icon: '📅', label: 'Daily View'    },
    { id: 'summary', icon: '📊', label: '30-Day Summary' },
    { id: 'monthly', icon: '🗓️', label: 'Monthly Calendar' },
  ];

  // ── Shared styles ──────────────────────────────────────────
  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border:     '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding:    16,
  };

  return (
    <AppShell title="Attendance Management" subtitle="View, track and analyse attendance across all classes">

      {/* ── CONTROLS ROW ── */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap',
        padding: '14px 16px', borderRadius: 16, marginBottom: 20,
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>

        {/* Class picker */}
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700,
            color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>
            Class
          </label>
          <select value={selClass} onChange={e => setSelClass(e.target.value)} className="sims-input"
                  style={{ width: 130, fontSize: 13 }}>
            <option value={ALL_CLASSES}>All Classes</option>
            {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700,
            color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>
            Subject
          </label>
          <select value={selSubject} onChange={e => setSelSubject(e.target.value)} className="sims-input"
                  disabled={selClass === ALL_CLASSES}
                  style={{ width: 170, fontSize: 13, opacity: selClass === ALL_CLASSES ? 0.6 : 1 }}>
            <option value="ALL">All Subjects</option>
            {subjects.map(subject => <option key={subject} value={subject}>{subject}</option>)}
          </select>
        </div>

        {/* Date picker (daily view) */}
        {view === 'daily' && (
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700,
              color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>
              Date
            </label>
            <input type="date" value={selDate} max={today()} onChange={e => setSelDate(e.target.value)}
                   className="sims-input" style={{ fontSize: 13 }} />
          </div>
        )}

        {/* View tabs */}
        <div style={{ marginLeft: 'auto' }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700,
            color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>
            View
          </label>
          <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)',
            borderRadius: 12, padding: 3, border: '1px solid rgba(255,255,255,0.07)' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setView(t.id)}
                      style={{ padding: '7px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
                        fontSize: 12, fontWeight: 700, transition: 'all 0.2s',
                        background: view === t.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                        color: view === t.id ? 'white' : 'rgba(255,255,255,0.4)',
                        boxShadow: view === t.id ? '0 1px 8px rgba(0,0,0,0.3)' : 'none' }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════ DAILY VIEW ══════════════════ */}
      {view === 'daily' && (
        <>
          {/* Stats row */}
          {dailySumm && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Total Students', val: dailySumm.total,      color: 'rgba(255,255,255,0.7)', bg: 'rgba(255,255,255,0.04)', bd: 'rgba(255,255,255,0.08)' },
                { label: 'Present',        val: dailySumm.present,    color: '#86efac', bg: 'rgba(74,222,128,0.1)',   bd: 'rgba(74,222,128,0.25)'  },
                { label: 'Absent',         val: dailySumm.absent,     color: '#f87171', bg: 'rgba(248,113,113,0.1)', bd: 'rgba(248,113,113,0.25)' },
                { label: 'Late',           val: dailySumm.late,       color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  bd: 'rgba(251,191,36,0.25)'  },
                { label: 'Not Marked',     val: dailySumm.notMarked ?? (dailySumm.total - dailySumm.present - dailySumm.absent - dailySumm.late),
                  color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', bd: 'rgba(148,163,184,0.2)' },
                { label: 'Attendance %',   val: `${ovPct}%`,          color: pctColor(ovPct), bg: pctBg(ovPct), bd: pctBorder(ovPct) },
              ].map(c => (
                <div key={c.label} style={{ textAlign: 'center', padding: '14px 8px', borderRadius: 14,
                  background: c.bg, border: `1px solid ${c.bd}` }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: c.color, lineHeight: 1 }}>{c.val}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 3,
                    textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Already marked badge */}
          {dailySumm?.alreadyMarked && (
            <div style={{ marginBottom: 14, padding: '9px 14px', borderRadius: 10, fontSize: 12,
              background: 'rgba(30,144,255,0.08)', border: '1px solid rgba(30,144,255,0.2)',
              color: '#93c5fd', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>ℹ️</span>
              <span>Attendance has already been marked for this date · {fmtDate(selDate)}</span>
            </div>
          )}

          {/* Filter + search */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Status filter pills */}
            <div style={{ display: 'flex', gap: 5, background: 'rgba(255,255,255,0.04)',
              borderRadius: 12, padding: 3, border: '1px solid rgba(255,255,255,0.07)' }}>
              {(['ALL','PRESENT','ABSENT','LATE'] as StatusFilter[]).map(f => {
                const count = f === 'ALL' ? dailyRecs.length : dailyRecs.filter(r => r.status === f).length;
                return (
                  <button key={f} onClick={() => setStatusFilter(f)}
                          style={{ padding: '6px 12px', borderRadius: 9, border: 'none', cursor: 'pointer',
                            fontSize: 11, fontWeight: 700, transition: 'all 0.2s',
                            background: statusFilter === f ? 'rgba(255,255,255,0.1)' : 'transparent',
                            color: statusFilter === f ? 'white' : 'rgba(255,255,255,0.4)' }}>
                    {f === 'ALL' ? `All (${count})` : `${STATUS_CFG[f].icon} ${f.charAt(0)+f.slice(1).toLowerCase()} (${count})`}
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                fontSize: 14, color: 'rgba(255,255,255,0.25)' }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)}
                     placeholder="Search by name or roll…"
                     className="sims-input"
                     style={{ paddingLeft: 36, fontSize: 13 }} />
            </div>

            {/* Export hint */}
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginLeft: 'auto' }}>
              Showing {filtered.length} of {dailyRecs.length} students
            </div>
          </div>

          {/* Student table */}
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 90px 100px 1fr',
              gap: 0, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(255,255,255,0.03)' }}>
              {['#', 'Student', 'Roll', 'Status', 'Remark'].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)',
                  textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</div>
              ))}
            </div>

            {dailyLoad ? (
              <div style={{ padding: 20 }}>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 48, borderRadius: 10, marginBottom: 8 }} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.3 }}>📋</div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
                  {!selClass ? 'Select a class to view attendance' : selSubject === 'ALL' ? 'No records found' : `No ${selSubject} session records found`}
                </div>
              </div>
            ) : (
              filtered.map((rec, i) => {
                const cfg = STATUS_CFG[rec.status] ?? STATUS_CFG.NOT_MARKED;
                return (
                  <div key={rec.studentId}
                       style={{ display: 'grid', gridTemplateColumns: '50px 1fr 90px 100px 1fr',
                         gap: 0, padding: '12px 16px', alignItems: 'center',
                         borderBottom: '1px solid rgba(255,255,255,0.04)',
                         background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                         transition: 'background 0.15s' }}
                       onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'}
                       onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}>

                    {/* Index */}
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>{i + 1}</div>

                    {/* Name */}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{rec.name}</div>
                    </div>

                    {/* Roll */}
                    <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'rgba(255,255,255,0.45)' }}>
                      {rec.roll}
                    </div>

                    {/* Status badge */}
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px',
                        borderRadius: 99, background: cfg.bg, color: cfg.color,
                        border: `1px solid ${cfg.border}`, whiteSpace: 'nowrap' }}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </div>

                    {/* Remark */}
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {rec.remark || '—'}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* ══════════════════ 30-DAY SUMMARY VIEW ══════════════════ */}
      {view === 'summary' && (
        <>
          {/* Class-level summary bar */}
          {summaryData.length > 0 && (() => {
            const totalStudents    = summaryData.length;
            const avgPct           = Math.round(summaryData.reduce((a, s) => a + s.percentage, 0) / totalStudents);
            const atRisk           = summaryData.filter(s => s.percentage < 75).length;
            const safe             = summaryData.filter(s => s.percentage >= 75).length;
            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
                {[
                  { label: 'Total Students', val: totalStudents, color: 'rgba(255,255,255,0.7)', bg: 'rgba(255,255,255,0.04)', bd: 'rgba(255,255,255,0.1)' },
                  { label: 'Avg Attendance',  val: `${avgPct}%`,  color: pctColor(avgPct),        bg: pctBg(avgPct),           bd: pctBorder(avgPct)       },
                  { label: 'Safe (≥75%)',     val: safe,          color: '#86efac',               bg: 'rgba(74,222,128,0.1)',   bd: 'rgba(74,222,128,0.25)' },
                  { label: 'At Risk (<75%)',  val: atRisk,        color: atRisk > 0 ? '#f87171' : '#86efac', bg: atRisk > 0 ? 'rgba(248,113,113,0.1)' : 'rgba(74,222,128,0.1)', bd: atRisk > 0 ? 'rgba(248,113,113,0.25)' : 'rgba(74,222,128,0.25)' },
                ].map(c => (
                  <div key={c.label} style={{ textAlign: 'center', padding: '14px 8px', borderRadius: 14,
                    background: c.bg, border: `1px solid ${c.bd}` }}>
                    <div style={{ fontSize: 26, fontWeight: 900, color: c.color, lineHeight: 1 }}>{c.val}</div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 3,
                      textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c.label}</div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Student summary table */}
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>
                  Class {selClass} {selSubject === 'ALL' ? '— 30-Day Attendance Summary' : `— ${selSubject} Attendance Summary`}
                </span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 10 }}>
                  Sorted by attendance % (low to high)
                </span>
              </div>
            </div>

            {summLoad ? (
              <div style={{ padding: 20 }}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 56, borderRadius: 10, marginBottom: 8 }} />
                ))}
              </div>
            ) : summaryData.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 36, opacity: 0.3, marginBottom: 10 }}>📊</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
                  {!selClass ? 'Select a class to view summary' : selSubject === 'ALL' ? 'No attendance data found' : `No ${selSubject} attendance data found`}
                </div>
              </div>
            ) : (
              // Sort by percentage ascending (at-risk first)
              [...summaryData].sort((a, b) => a.percentage - b.percentage).map((s, i) => {
                const col = pctColor(s.percentage);
                return (
                  <div key={s.studentId}
                       style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                         background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {/* Rank */}
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', width: 24, flexShrink: 0 }}>
                        {i + 1}
                      </div>

                      {/* Name + roll */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{s.name}</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
                          Roll: {s.roll}
                        </div>
                      </div>

                      {/* Stats */}
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexShrink: 0 }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#86efac' }}>{s.present}</div>
                          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Present</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#f87171' }}>{s.absent}</div>
                          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Absent</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.5)' }}>{s.total}</div>
                          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Total</div>
                        </div>
                      </div>

                      {/* Percentage + bar */}
                      <div style={{ width: 100, flexShrink: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: col }}>{s.percentage}%</span>
                          <span style={{ fontSize: 10, color: col, fontWeight: 600 }}>
                            {s.percentage >= 75 ? '✓' : `Need ${Math.ceil((0.75 * s.total - s.present) / 0.25)} more`}
                          </span>
                        </div>
                        <Bar pct={s.percentage} color={col} />
                        {/* 75% marker */}
                        <div style={{ position: 'relative', height: 0 }}>
                          <div style={{ position: 'absolute', bottom: 10, left: '75%',
                            transform: 'translateX(-50%)', width: 1, height: 8,
                            background: 'rgba(255,255,255,0.25)', borderRadius: 1 }} />
                        </div>
                      </div>

                      {/* Status badge */}
                      <div style={{ width: 72, textAlign: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px',
                          borderRadius: 99, background: pctBg(s.percentage), color: col,
                          border: `1px solid ${pctBorder(s.percentage)}` }}>
                          {s.percentage >= 80 ? '✅ Good' : s.percentage >= 75 ? '✓ OK' : s.percentage >= 60 ? '⚠ Low' : '❌ Critical'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* ══════════════════ MONTHLY CALENDAR VIEW ══════════════════ */}
      {view === 'monthly' && (
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20 }}>

          {/* Calendar */}
          <div style={{ ...card }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 3 }}>
                Class {selClass} {selSubject === 'ALL' ? '— Attendance Heatmap' : `— ${selSubject} Heatmap`}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                Colour intensity shows daily attendance %
              </div>
            </div>

            {calLoad ? (
              <div className="skeleton" style={{ height: 280, borderRadius: 12 }} />
            ) : (
              <CalendarHeatmap
                records={calRecords}
                month={calMonth}
                year={calYear}
                onPrevMonth={() => {
                  if (calMonth === 1) { setCalMonth(12); setCalYear(y => y - 1); }
                  else setCalMonth(m => m - 1);
                }}
                onNextMonth={() => {
                  const nm = calMonth === 12 ? 1 : calMonth + 1;
                  const ny = calMonth === 12 ? calYear + 1 : calYear;
                  setCalMonth(nm); setCalYear(ny);
                }}
              />
            )}
          </div>

          {/* Monthly stats panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Monthly summary stats */}
            <div style={{ ...card }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 14 }}>
                {MONTHS[calMonth - 1]} {calYear} — Quick Stats
              </div>
              {calRecords.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                  No data for this month
                </div>
              ) : (() => {
                const present  = calRecords.filter(r => r.status === 'PRESENT').length;
                const absent   = calRecords.filter(r => r.status === 'ABSENT').length;
                const late     = calRecords.filter(r => r.status === 'LATE').length;
                const total    = calRecords.length;
                const pct      = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
                const col      = pctColor(pct);
                const uniqueDates = [...new Set(calRecords.map(r => r.date.slice(0, 10)))].length;

                return (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 14 }}>
                      {[
                        { label: 'Working Days', val: uniqueDates,  col: 'rgba(255,255,255,0.7)' },
                        { label: 'Avg Present %', val: `${pct}%`,  col },
                        { label: 'Total Present', val: present,    col: '#86efac' },
                        { label: 'Total Absent',  val: absent,     col: '#f87171' },
                      ].map(s => (
                        <div key={s.label} style={{ padding: '10px 12px', borderRadius: 10,
                          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                          <div style={{ fontSize: 20, fontWeight: 900, color: s.col, lineHeight: 1 }}>{s.val}</div>
                          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2,
                            textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Attendance bar */}
                    <div style={{ padding: '10px 12px', borderRadius: 10,
                      background: pctBg(pct), border: `1px solid ${pctBorder(pct)}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: col }}>Monthly Average</span>
                        <span style={{ fontSize: 14, fontWeight: 900, color: col }}>{pct}%</span>
                      </div>
                      <div style={{ position: 'relative' }}>
                        <Bar pct={pct} color={col} />
                        {/* 75% marker line */}
                        <div style={{ position: 'absolute', top: -3, left: '75%', transform: 'translateX(-50%)',
                          width: 2, height: 10, background: 'rgba(255,255,255,0.4)', borderRadius: 1 }} />
                      </div>
                      <div style={{ fontSize: 11, marginTop: 6, color: col }}>
                        {pct >= 75 ? `✓ On track — ${pct - 75}% above minimum` : `⚠ ${75 - pct}% below 75% target`}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Worst days this month */}
            {calRecords.length > 0 && (() => {
              const byDate: Record<string, { p: number; t: number }> = {};
              calRecords.forEach(r => {
                const d = r.date.slice(0, 10);
                if (!byDate[d]) byDate[d] = { p: 0, t: 0 };
                byDate[d].t++;
                if (r.status === 'PRESENT' || r.status === 'LATE') byDate[d].p++;
              });
              const worst = Object.entries(byDate)
                .map(([date, v]) => ({ date, pct: v.t > 0 ? Math.round((v.p / v.t) * 100) : 0 }))
                .sort((a, b) => a.pct - b.pct)
                .slice(0, 5);

              return (
                <div style={{ ...card }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 12 }}>
                    📉 Days with Lowest Attendance
                  </div>
                  {worst.map((w, i) => {
                    const col = pctColor(w.pct);
                    return (
                      <div key={w.date} style={{ display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 0', borderBottom: i < worst.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', width: 16 }}>{i + 1}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.65)', flex: 1 }}>
                          {new Date(w.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
                        </span>
                        <div style={{ width: 80 }}>
                          <Bar pct={w.pct} color={col} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 800, color: col, width: 40, textAlign: 'right' }}>
                          {w.pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </AppShell>
  );
}
