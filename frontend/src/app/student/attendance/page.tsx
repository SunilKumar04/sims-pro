'use client';
// src/app/student/attendance/page.tsx
// CUIMS-style Student Attendance System — full analytics + prediction
import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import AppShell from '@/components/layout/AppShell';
import { sessionsApi, attendanceApi } from '@/lib/api';
import { getUser } from '@/lib/auth';

// ─────────────────────────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────────────────────────
interface SubjectSummary {
  subject: string;
  present: number;
  absent: number;
  late: number;
  total: number;
  percentage: number;
}
interface PeriodRecord {
  period: number;
  subject: string;
  teacherName: string;
  startTime: string;
  endTime: string;
  room?: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'NOT_MARKED' | 'NO_SESSION' | null;
  remark?: string;
}
interface HistoryItem {
  subject: string;
  date: string;
  period: number;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  remark?: string | null;
}
interface TodayData {
  date: string;
  dayLabel: string;
  totalPeriods: number;
  held: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  periods: PeriodRecord[];
}
interface SummaryData {
  overall: { totalSessions: number; totalPresent: number; percentage: number };
  summary: SubjectSummary[];
  recentHistory: HistoryItem[];
}

type MainTab  = 'today' | 'subjects';
type SubFilter = 'all' | 'risk' | 'safe';

// ─────────────────────────────────────────────────────────────────
//  CONSTANTS & HELPERS
// ─────────────────────────────────────────────────────────────────
const THRESHOLD = 75;
const MONTHS    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WDAYS     = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function pctColor(p: number): string {
  if (p >= THRESHOLD) return '#22c55e';
  if (p >= 60)        return '#f59e0b';
  return '#ef4444';
}
function pctBg(p: number): string {
  if (p >= THRESHOLD) return 'rgba(34,197,94,0.12)';
  if (p >= 60)        return 'rgba(245,158,11,0.12)';
  return 'rgba(239,68,68,0.12)';
}
function pctBorder(p: number): string {
  if (p >= THRESHOLD) return 'rgba(34,197,94,0.3)';
  if (p >= 60)        return 'rgba(245,158,11,0.3)';
  return 'rgba(239,68,68,0.3)';
}
function needMore(present: number, total: number): number {
  if ((present / Math.max(total, 1)) * 100 >= THRESHOLD) return 0;
  return Math.max(0, Math.ceil((THRESHOLD * total - 100 * present) / (100 - THRESHOLD)));
}
function canSkip(present: number, total: number): number {
  const val = Math.floor((present * 100 - THRESHOLD * total) / THRESHOLD);
  return Math.max(0, val);
}

const STATUS_CFG = {
  PRESENT:    { label: 'Present',    color: '#22c55e', bg: 'rgba(34,197,94,0.15)',   border: 'rgba(34,197,94,0.35)',   icon: '✅' },
  ABSENT:     { label: 'Absent',     color: '#ef4444', bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.35)',   icon: '❌' },
  LATE:       { label: 'Late',       color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.35)',  icon: '⏰' },
  NOT_MARKED: { label: 'Pending',    color: '#94a3b8', bg: 'rgba(148,163,184,0.1)',  border: 'rgba(148,163,184,0.2)',  icon: '⏳' },
  NO_SESSION: { label: 'No Class',   color: '#475569', bg: 'rgba(71,85,105,0.1)',    border: 'rgba(71,85,105,0.15)',   icon: '—'  },
} as const;

// ─────────────────────────────────────────────────────────────────
//  SVG RING
// ─────────────────────────────────────────────────────────────────
function Ring({ pct, size = 120, stroke = 9 }: { pct: number; size?: number; stroke?: number }) {
  const r  = (size - stroke) / 2;
  const c  = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(100, pct) / 100);
  const col = pctColor(pct);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
              stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
              stroke={col} strokeWidth={stroke}
              strokeDasharray={c} strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.7s ease' }} />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
//  PREDICTOR SLIDER
// ─────────────────────────────────────────────────────────────────
function PredictorBar({
  present, total,
}: { present: number; total: number }) {
  const [extra, setExtra] = useState(10);
  const newPct  = total + extra > 0
    ? Math.round(((present + extra) / (total + extra)) * 100)
    : 0;
  const curPct  = total > 0 ? Math.round((present / total) * 100) : 0;
  const crossed = curPct < THRESHOLD && newPct >= THRESHOLD;
  const col     = pctColor(newPct);

  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 16, border: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          What-if Predictor
        </span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>+{extra} classes</span>
      </div>

      <input type="range" min={0} max={30} value={extra}
             onChange={e => setExtra(Number(e.target.value))}
             style={{ width: '100%', accentColor: col, marginBottom: 10, cursor: 'pointer' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: pctColor(curPct) }}>{curPct}%</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Now</div>
        </div>
        <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.2)' }}>→</div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: col }}>{newPct}%</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>After +{extra}</div>
        </div>
        {extra > 0 && (
          <div style={{
            flex: 2, padding: '6px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700,
            background: crossed ? 'rgba(34,197,94,0.12)' : pctBg(newPct),
            color: crossed ? '#22c55e' : col,
            border: `1px solid ${crossed ? 'rgba(34,197,94,0.3)' : pctBorder(newPct)}`,
          }}>
            {crossed
              ? '🎉 Will reach 75%!'
              : newPct >= THRESHOLD
                ? `✅ Safe (+${newPct - curPct}%)`
                : `⚠️ Still ${THRESHOLD - newPct}% short`}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  MINI CALENDAR (inside modal)
// ─────────────────────────────────────────────────────────────────
function MiniCalendar({
  history, subject,
}: { history: HistoryItem[]; subject: string }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());
  const [dayDetail, setDayDetail] = useState<{ date: string; items: HistoryItem[] } | null>(null);

  const subHistory = history.filter(h => h.subject === subject);

  const dateMap = useMemo(() => {
    const m: Record<string, HistoryItem[]> = {};
    subHistory.forEach(h => {
      const d = new Date(h.date);
      const key = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
      if (!m[key]) m[key] = [];
      m[key].push(h);
    });
    return m;
  }, [subHistory]);

  const firstDay    = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const CAL_COL: Record<string, string> = {
    PRESENT: '#22c55e', ABSENT: '#ef4444', LATE: '#f59e0b',
  };
  const CAL_BG: Record<string, string> = {
    PRESENT: 'rgba(34,197,94,0.18)', ABSENT: 'rgba(239,68,68,0.18)', LATE: 'rgba(245,158,11,0.18)',
  };

  const prevM = () => { if (month === 1) { setMonth(12); setYear(y => y-1); } else setMonth(m => m-1); };
  const nextM = () => {
    const nm = month === 12 ? 1 : month+1;
    const ny = month === 12 ? year+1 : year;
    if (new Date(ny, nm-1, 1) <= now) { setMonth(nm); setYear(ny); }
  };

  return (
    <div>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={prevM} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 8, width: 30, height: 30, color: 'white', cursor: 'pointer', fontSize: 14 }}>‹</button>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{MONTHS[month-1]} {year}</span>
        <button onClick={nextM} disabled={new Date(year, month, 1) > now}
                style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 8, width: 30, height: 30, color: new Date(year, month, 1) > now ? 'rgba(255,255,255,0.2)' : 'white', cursor: new Date(year, month, 1) > now ? 'not-allowed' : 'pointer', fontSize: 14 }}>›</button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 6 }}>
        {WDAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', padding: '2px 0' }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
        {[...Array(firstDay)].map((_,i) => <div key={`e${i}`}/>)}
        {[...Array(daysInMonth)].map((_,i) => {
          const day    = i + 1;
          const key    = `${year}-${month}-${day}`;
          const items  = dateMap[key] ?? [];
          const isFuture = new Date(year, month-1, day) > now;
          const isToday  = day===now.getDate() && month===now.getMonth()+1 && year===now.getFullYear();

          // Dominant status
          const st = items.length > 0
            ? (items.find(x => x.status==='PRESENT') ? 'PRESENT' : items.find(x=>x.status==='LATE') ? 'LATE' : 'ABSENT')
            : null;

          return (
            <div key={day}
                 onClick={() => {
                   if (isFuture) return;
                   if (items.length > 0) setDayDetail({ date: key, items });
                 }}
                 style={{
                   borderRadius: 8,
                   minHeight: 32,
                   display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                   background: st ? CAL_BG[st] : isToday ? 'rgba(212,160,23,0.15)' : 'transparent',
                   border: isToday ? '1.5px solid rgba(212,160,23,0.5)' : '1px solid transparent',
                   cursor: items.length > 0 ? 'pointer' : isFuture ? 'default' : 'default',
                   opacity: isFuture ? 0.3 : 1,
                 }}>
              <span style={{ fontSize: 12, fontWeight: isToday ? 800 : 500, color: st ? CAL_COL[st] : isToday ? '#F0C040' : 'rgba(255,255,255,0.6)' }}>{day}</span>
              {st && <div style={{ width: 4, height: 4, borderRadius: '50%', background: CAL_COL[st], marginTop: 1 }}/>}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginTop: 12, justifyContent: 'center' }}>
        {(['PRESENT','ABSENT','LATE'] as const).map(s => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: CAL_BG[s], border: `1px solid ${CAL_COL[s]}` }}/>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{s[0]+s.slice(1).toLowerCase()}</span>
          </div>
        ))}
      </div>

      {/* Day detail pop-up */}
      {dayDetail && (
        <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>
              {new Date(dayDetail.date.replace(/-/g,'/')).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
            </span>
            <button onClick={() => setDayDetail(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 14 }}>✕</button>
          </div>
          {dayDetail.items.map((item, i) => {
            const sc = STATUS_CFG[item.status];
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <span style={{ fontSize: 14 }}>{sc.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'white' }}>Period {item.period}</div>
                  {item.remark && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{item.remark}</div>}
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: sc.color }}>{sc.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  SUBJECT DETAIL MODAL (bottom sheet)
// ─────────────────────────────────────────────────────────────────
function SubjectModal({
  sub, history, onClose,
}: { sub: SubjectSummary; history: HistoryItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const need = needMore(sub.present, sub.total);
  const skip = canSkip(sub.present, sub.total);
  const col  = pctColor(sub.percentage);
  const bg   = pctBg(sub.percentage);
  const bd   = pctBorder(sub.percentage);

  // Streak
  const streak = useMemo(() => {
    const hist = history.filter(h => h.subject === sub.subject).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let s = 0;
    for (const h of hist) {
      if (h.status === 'PRESENT' || h.status === 'LATE') s++;
      else break;
    }
    return s;
  }, [history, sub.subject]);

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) onClose();
  };

  return (
    <div onClick={handleBackdrop} style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div ref={ref} style={{
        width: '100%', maxWidth: 520,
        background: '#0B1B33',
        borderRadius: '24px 24px 0 0',
        border: '1px solid rgba(255,255,255,0.1)',
        maxHeight: '92vh',
        overflowY: 'auto',
        paddingBottom: 32,
      }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.15)' }}/>
        </div>

        {/* Header */}
        <div style={{ padding: '8px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'white' }}>{sub.subject}</h2>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 10, width: 32, height: 32, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 14 }}>✕</button>
          </div>
        </div>

        <div style={{ padding: '16px 20px' }}>

          {/* Big % + ring */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, padding: 16, borderRadius: 16, background: bg, border: `1px solid ${bd}` }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <Ring pct={sub.percentage} size={80} stroke={7} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 900, color: col }}>{sub.percentage}%</span>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                {[
                  { label: 'Present', val: sub.present,               color: '#22c55e' },
                  { label: 'Absent',  val: sub.absent,                color: '#ef4444' },
                  { label: 'Late',    val: sub.late,                  color: '#f59e0b' },
                  { label: 'Streak',  val: `🔥${streak}`,            color: '#fb923c' },
                ].map(x => (
                  <div key={x.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: x.color }}>{x.val}</div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>{x.label}</div>
                  </div>
                ))}
              </div>
              {/* Eligibility */}
              <div style={{ fontSize: 12, fontWeight: 700, color: col }}>
                {sub.percentage >= THRESHOLD
                  ? skip > 0
                    ? `✅ Can skip ${skip} more class${skip !== 1 ? 'es' : ''}`
                    : '✅ Just at limit — don\'t miss any'
                  : `⚠️ Need ${need} more class${need !== 1 ? 'es' : ''} to reach 75%`}
              </div>
            </div>
          </div>

          {/* 75% progress bar */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Attendance</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: col }}>{sub.percentage}%</span>
            </div>
            <div style={{ position: 'relative', height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'visible' }}>
              <div style={{ height: '100%', width: `${Math.min(100, sub.percentage)}%`, background: col, borderRadius: 99, transition: 'width 0.5s ease' }}/>
              {/* 75% marker */}
              <div style={{
                position: 'absolute', left: '75%', top: -3, bottom: -3,
                width: 2, background: '#F0C040', borderRadius: 1,
              }}/>
              <div style={{ position: 'absolute', left: 'calc(75% + 4px)', top: -18, fontSize: 9, color: '#F0C040', fontWeight: 700, whiteSpace: 'nowrap' }}>75%</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{sub.present}/{sub.total} classes</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Need {Math.ceil(sub.total * 0.75)} to pass</span>
            </div>
          </div>

          {/* What-if predictor */}
          <PredictorBar present={sub.present} total={sub.total} />

          {/* Calendar */}
          <div style={{ marginTop: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 14, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>📅 Calendar</div>
            <MiniCalendar history={history} subject={sub.subject} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  MOCK DATA (fallback when API not available)
// ─────────────────────────────────────────────────────────────────
const MOCK_SUMMARY: SummaryData = {
  overall: { totalSessions: 180, totalPresent: 142, percentage: 79 },
  summary: [
    { subject: 'Mathematics',       present: 34, absent: 6,  late: 2, total: 42, percentage: 86 },
    { subject: 'Physics',           present: 22, absent: 10, late: 1, total: 33, percentage: 67 },
    { subject: 'Chemistry',         present: 28, absent: 4,  late: 0, total: 32, percentage: 88 },
    { subject: 'English',           present: 30, absent: 2,  late: 1, total: 33, percentage: 94 },
    { subject: 'Computer Science',  present: 20, absent: 8,  late: 0, total: 28, percentage: 71 },
    { subject: 'Physical Education',present: 8,  absent: 4,  late: 0, total: 12, percentage: 67 },
  ],
  recentHistory: [
    { subject: 'Mathematics',  date: new Date(Date.now()-86400000*0).toISOString(), period: 1, status: 'PRESENT' },
    { subject: 'Physics',      date: new Date(Date.now()-86400000*0).toISOString(), period: 2, status: 'ABSENT' },
    { subject: 'Chemistry',    date: new Date(Date.now()-86400000*1).toISOString(), period: 3, status: 'PRESENT' },
    { subject: 'Mathematics',  date: new Date(Date.now()-86400000*2).toISOString(), period: 1, status: 'PRESENT' },
    { subject: 'Physics',      date: new Date(Date.now()-86400000*2).toISOString(), period: 2, status: 'LATE', remark: 'Arrived 5 min late' },
    { subject: 'English',      date: new Date(Date.now()-86400000*3).toISOString(), period: 4, status: 'PRESENT' },
    { subject: 'Computer Science', date: new Date(Date.now()-86400000*4).toISOString(), period: 5, status: 'ABSENT', remark: 'Medical leave' },
    { subject: 'Chemistry',    date: new Date(Date.now()-86400000*5).toISOString(), period: 3, status: 'PRESENT' },
    { subject: 'Physics',      date: new Date(Date.now()-86400000*6).toISOString(), period: 2, status: 'PRESENT' },
    { subject: 'Mathematics',  date: new Date(Date.now()-86400000*7).toISOString(), period: 1, status: 'ABSENT' },
  ],
};

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MOCK_TODAY: TodayData = {
  date: new Date().toISOString().slice(0,10),
  dayLabel: DAY_NAMES[new Date().getDay()],
  totalPeriods: 6, held: 4, presentToday: 3, absentToday: 1, lateToday: 0,
  periods: [
    { period:1, subject:'Mathematics',       teacherName:'Dr. Priya Sharma',   startTime:'08:00', endTime:'08:45', room:'R-101', status:'PRESENT' },
    { period:2, subject:'Physics',           teacherName:'Mr. Arun Kumar',     startTime:'08:45', endTime:'09:30', room:'R-204', status:'ABSENT'  },
    { period:3, subject:'Chemistry',         teacherName:'Ms. Sunita Rao',     startTime:'09:30', endTime:'10:15', room:'Lab-1', status:'PRESENT' },
    { period:4, subject:'English',           teacherName:'Ms. Kavita Joshi',   startTime:'10:30', endTime:'11:15', room:'R-102', status:'PRESENT' },
    { period:5, subject:'Computer Science',  teacherName:'Mr. Sunil Mehta',    startTime:'11:15', endTime:'12:00', room:'Lab-2', status:'NOT_MARKED' },
    { period:6, subject:'Physical Education',teacherName:'Mr. Vikram Singh',   startTime:'13:30', endTime:'14:15', room:'Ground', status:'NO_SESSION' },
  ],
};

// ─────────────────────────────────────────────────────────────────
//  MAIN PAGE
// ─────────────────────────────────────────────────────────────────
export default function StudentAttendancePage() {
  const user = getUser();
  const cls  = user?.className ?? '';

  const [summary,    setSummary]    = useState<SummaryData>(MOCK_SUMMARY);
  const [todayData,  setTodayData]  = useState<TodayData>(MOCK_TODAY);
  const [tab,        setTab]        = useState<MainTab>('today');
  const [subFilter,  setSubFilter]  = useState<SubFilter>('all');
  const [selSub,     setSelSub]     = useState<SubjectSummary | null>(null);
  const [loading,    setLoading]    = useState(true);

  // ── Load from API ──────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      sessionsApi.getStudentToday().catch(() => null),
      sessionsApi.getMyStudentSummary(cls || undefined).catch(() => null),
    ]).then(([todayRes, sumRes]) => {
      if (!mounted) return;
      if (todayRes.status === 'fulfilled' && todayRes.value?.data?.data) {
        const d = todayRes.value.data.data;
        setTodayData({
          date:         d.date,
          dayLabel:     d.dayLabel,
          totalPeriods: d.totalPeriods,
          held:         d.held,
          presentToday: d.presentToday,
          absentToday:  d.absentToday,
          lateToday:    d.lateToday ?? 0,
          periods:      d.periods ?? [],
        });
      }
      if (sumRes.status === 'fulfilled' && sumRes.value?.data?.data) {
        const d = sumRes.value.data.data;
        setSummary({
          overall:       d.overall,
          summary:       d.summary ?? [],
          recentHistory: d.recentHistory ?? [],
        });
      }
    }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [cls]);

  // ── Derived ────────────────────────────────────────────────────
  const ov      = summary.overall;
  const ovPct   = ov.percentage;
  const ovCol   = pctColor(ovPct);
  const need75  = needMore(ov.totalPresent, ov.totalSessions);
  const skip75  = canSkip(ov.totalPresent, ov.totalSessions);

  const filteredSubs = summary.summary.filter(s => {
    if (subFilter === 'risk') return s.percentage < THRESHOLD;
    if (subFilter === 'safe') return s.percentage >= THRESHOLD;
    return true;
  });

  const SUB_COL: Record<string,string> = {
    Mathematics:'#a5b4fc', Physics:'#93c5fd', Chemistry:'#86efac', Biology:'#6ee7b7',
    English:'#fcd34d', Hindi:'#fca5a5', History:'#d8b4fe', 'Computer Science':'#c7d2fe',
    'Physical Education':'#fdba74', Economics:'#fbcfe8', Accountancy:'#fef08a',
  };
  const sc = (s: string) => SUB_COL[s] ?? '#aaaaaa';

  // ── Skeleton ───────────────────────────────────────────────────
  if (loading) return (
    <AppShell title="My Attendance" subtitle="Loading…">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[...Array(5)].map((_,i) => (
          <div key={i} className="skeleton" style={{ height: 72, borderRadius: 16 }}/>
        ))}
      </div>
    </AppShell>
  );

  return (
    <AppShell title="My Attendance" subtitle="Analytics, predictions & subject-wise tracking">

      {/* ─────── OVERALL CARD ─────── */}
      <div style={{
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        background: `linear-gradient(135deg, #0F2044, #162952)`,
        border: `1px solid ${pctBorder(ovPct)}`,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background glow */}
        <div style={{ position: 'absolute', right: -30, top: -30, width: 160, height: 160, borderRadius: '50%', background: `${ovCol}10`, pointerEvents: 'none' }}/>

        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          {/* Ring */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Ring pct={ovPct} size={110} stroke={9} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: ovCol, lineHeight: 1 }}>{ovPct}%</span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Overall</span>
            </div>
          </div>

          {/* Stats */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
              {[
                { val: ov.totalSessions, label: 'Total',   color: 'rgba(255,255,255,0.8)' },
                { val: ov.totalPresent,  label: 'Present', color: '#22c55e' },
                { val: ov.totalSessions - ov.totalPresent, label: 'Absent', color: '#ef4444' },
              ].map(x => (
                <div key={x.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: x.color, lineHeight: 1 }}>{x.val}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{x.label}</div>
                </div>
              ))}
            </div>

            {/* Eligibility badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
              background: pctBg(ovPct), color: ovCol, border: `1px solid ${pctBorder(ovPct)}`,
            }}>
              {ovPct >= THRESHOLD
                ? skip75 > 0
                  ? `✅ Can skip ${skip75} more class${skip75 !== 1 ? 'es' : ''}`
                  : '✅ Just at 75% limit'
                : `⚠️ Need ${need75} more class${need75 !== 1 ? 'es' : ''} for 75%`}
            </div>
          </div>
        </div>

        {/* Progress bar with 75% marker */}
        <div style={{ marginTop: 14, position: 'relative' }}>
          <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.07)' }}>
            <div style={{ height: '100%', width: `${Math.min(100, ovPct)}%`, background: ovCol, borderRadius: 99, transition: 'width 0.6s ease' }}/>
          </div>
          {/* 75% marker */}
          <div style={{ position: 'absolute', left: '75%', top: -3, height: 12, width: 2, background: '#F0C040', transform: 'translateX(-50%)', borderRadius: 1 }}/>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>0%</span>
            <span style={{ position: 'absolute', left: '75%', fontSize: 9, fontWeight: 700, color: '#F0C040', transform: 'translateX(-50%)' }}>75%</span>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>100%</span>
          </div>
        </div>
      </div>

      {/* ─────── TABS ─────── */}
      <div style={{
        display: 'flex', gap: 6, marginBottom: 16,
        background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 5,
        border: '1px solid rgba(255,255,255,0.07)',
      }}>
        {([['today','📅 Today','today'],['subjects','🎯 Subjects','subjects']] as [MainTab,string,string][]).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
                  style={{
                    flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                    fontWeight: 700, fontSize: 13, transition: 'all 0.15s',
                    background: tab === id ? 'rgba(212,160,23,0.18)' : 'transparent',
                    color:      tab === id ? '#F0C040' : 'rgba(255,255,255,0.45)',
                    outline: tab === id ? '1px solid rgba(212,160,23,0.3)' : 'none',
                  }}>
            {label}
          </button>
        ))}
      </div>

      {/* ════════════════ TODAY TAB ════════════════ */}
      {tab === 'today' && (
        <div>
          {/* Mini stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
            {[
              { label: 'Periods', val: todayData.totalPeriods, col: '#F0C040', bg: 'rgba(212,160,23,0.1)',  bd: 'rgba(212,160,23,0.2)' },
              { label: 'Held',    val: todayData.held,         col: '#93C5FD', bg: 'rgba(30,144,255,0.1)', bd: 'rgba(30,144,255,0.2)' },
              { label: 'Present', val: todayData.presentToday, col: '#22c55e', bg: 'rgba(34,197,94,0.1)',  bd: 'rgba(34,197,94,0.2)'  },
              { label: 'Absent',  val: todayData.absentToday,  col: '#ef4444', bg: 'rgba(239,68,68,0.1)',  bd: 'rgba(239,68,68,0.2)'  },
            ].map(c => (
              <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.bd}`, borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: c.col, lineHeight: 1 }}>{c.val}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginTop: 3 }}>{c.label}</div>
              </div>
            ))}
          </div>

          {/* Date label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)' }}>
            <span style={{ fontSize: 12 }}>📅</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
              <strong style={{ color: '#F0C040' }}>{todayData.dayLabel}</strong>
              {', '}{new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}
              {cls && <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: 6 }}>· Class {cls}</span>}
            </span>
          </div>

          {/* Period cards */}
          {todayData.periods.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'rgba(255,255,255,0.35)' }}>
              <div style={{ fontSize: 40, marginBottom: 10, opacity: 0.4 }}>📅</div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>No classes today</p>
              <p style={{ fontSize: 12 }}>{todayData.dayLabel}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {todayData.periods.map(p => {
                const status = p.status ?? 'NO_SESSION';
                const cfg    = STATUS_CFG[status as keyof typeof STATUS_CFG] ?? STATUS_CFG.NO_SESSION;
                const color  = sc(p.subject);
                return (
                  <div key={p.period} style={{
                    borderRadius: 16, padding: '14px 16px',
                    background: cfg.bg, border: `1px solid ${cfg.border}`,
                    display: 'flex', alignItems: 'center', gap: 14,
                    transition: 'transform 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'}>
                    {/* Period badge */}
                    <div style={{
                      width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: `${color}20`, border: `1px solid ${color}35`,
                      fontSize: 13, fontWeight: 900, color,
                    }}>P{p.period}</div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'white', marginBottom: 2 }}>{p.subject}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                        {p.teacherName}
                        {p.room && <span style={{ marginLeft: 8, color: 'rgba(255,255,255,0.25)' }}>📍 {p.room}</span>}
                      </div>
                    </div>

                    {/* Time + status */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
                        {p.startTime}–{p.endTime}
                      </div>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 9px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                        background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                      }}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════════ SUBJECTS TAB ════════════════ */}
      {tab === 'subjects' && (
        <div>
          {/* Filter chips */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {([
              ['all',     'All',     summary.summary.length],
              ['risk',    '⚠️ At Risk', summary.summary.filter(s=>s.percentage<THRESHOLD).length],
              ['safe',    '✅ Safe',  summary.summary.filter(s=>s.percentage>=THRESHOLD).length],
            ] as [SubFilter,string,number][]).map(([id, label, count]) => (
              <button key={id} onClick={() => setSubFilter(id)}
                      style={{
                        padding: '7px 14px', borderRadius: 99, border: 'none', cursor: 'pointer',
                        fontSize: 12, fontWeight: 700,
                        background: subFilter===id ? 'rgba(212,160,23,0.18)' : 'rgba(255,255,255,0.05)',
                        color:      subFilter===id ? '#F0C040' : 'rgba(255,255,255,0.45)',
                        outline:    subFilter===id ? '1px solid rgba(212,160,23,0.35)' : 'none',
                        transition: 'all 0.15s',
                      }}>
                {label} <span style={{ opacity: 0.6, fontSize: 11 }}>({count})</span>
              </button>
            ))}
          </div>

          {/* Subject cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredSubs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
                No subjects match this filter
              </div>
            ) : filteredSubs.map(s => {
              const col  = pctColor(s.percentage);
              const bg   = pctBg(s.percentage);
              const bd   = pctBorder(s.percentage);
              const need = needMore(s.present, s.total);
              const skip = canSkip(s.present, s.total);
              const barW = Math.min(100, s.percentage);

              return (
                <div key={s.subject}
                     onClick={() => setSelSub(s)}
                     style={{
                       borderRadius: 16, padding: '14px 16px',
                       background: 'rgba(255,255,255,0.03)',
                       border: `1px solid ${bd}`,
                       cursor: 'pointer',
                       transition: 'transform 0.15s, box-shadow 0.15s',
                     }}
                     onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px ${col}15`; }}
                     onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Subject colour dot */}
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: sc(s.subject), flexShrink: 0 }}/>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{s.subject}</span>
                        <span style={{ fontSize: 18, fontWeight: 900, color: col, flexShrink: 0 }}>{s.percentage}%</span>
                      </div>

                      {/* Mini bar */}
                      <div style={{ position: 'relative', height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.07)', marginBottom: 6 }}>
                        <div style={{ height: '100%', width: `${barW}%`, background: col, borderRadius: 99 }}/>
                        <div style={{ position: 'absolute', left: '75%', top: -1, height: 7, width: 1.5, background: '#F0C040' }}/>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                          {s.present}/{s.total} attended
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          padding: '2px 8px', borderRadius: 99,
                          background: bg, color: col,
                        }}>
                          {s.percentage >= THRESHOLD
                            ? skip > 0 ? `Can skip ${skip}` : '✓ Safe'
                            : `Need ${need} more`}
                        </span>
                      </div>
                    </div>

                    <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>›</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick stats row */}
          {filteredSubs.length > 0 && (
            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {[
                { label: 'Avg Attendance', val: `${Math.round(filteredSubs.reduce((a,s)=>a+s.percentage,0)/filteredSubs.length)}%`, col: pctColor(Math.round(filteredSubs.reduce((a,s)=>a+s.percentage,0)/filteredSubs.length)) },
                { label: 'Safe Subjects',  val: filteredSubs.filter(s=>s.percentage>=THRESHOLD).length, col: '#22c55e' },
                { label: 'At Risk',        val: filteredSubs.filter(s=>s.percentage<THRESHOLD).length,  col: '#ef4444' },
              ].map(c => (
                <div key={c.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: c.col }}>{c.val}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginTop: 2 }}>{c.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════ SUBJECT MODAL ════════════════ */}
      {selSub && (
        <SubjectModal
          sub={selSub}
          history={summary.recentHistory}
          onClose={() => setSelSub(null)}
        />
      )}
    </AppShell>
  );
}