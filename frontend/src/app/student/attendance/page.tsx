'use client';
// src/app/student/attendance/page.tsx
// Reads attendance directly saved by teachers — always fresh from DB
import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { attendanceApi, authApi } from '@/lib/api';
import { getUser } from '@/lib/auth';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

type Status = 'PRESENT'|'ABSENT'|'LATE'|'HOLIDAY'|'FUTURE'|'NONE';

const STATUS_STYLE: Record<Status,{bg:string;text:string}> = {
  PRESENT: {bg:'rgba(34,197,94,0.2)',    text:'#86EFAC'},
  ABSENT:  {bg:'rgba(239,68,68,0.2)',    text:'#FCA5A5'},
  LATE:    {bg:'rgba(245,158,11,0.2)',   text:'#FCD34D'},
  HOLIDAY: {bg:'rgba(255,255,255,0.04)', text:'rgba(255,255,255,0.2)'},
  FUTURE:  {bg:'transparent',            text:'rgba(255,255,255,0.12)'},
  NONE:    {bg:'rgba(255,255,255,0.04)', text:'rgba(255,255,255,0.22)'},
};

export default function StudentAttendance() {
  const [month,     setMonth]     = useState(new Date().getMonth());
  const [year,      setYear]      = useState(new Date().getFullYear());
  const [records,   setRecords]   = useState<Record<number,Status>>({});
  const [summary,   setSummary]   = useState({ present:0, absent:0, late:0, total:0, percentage:0 });
  const [loading,   setLoading]   = useState(false);
  const [studentId, setStudentId] = useState<string|null>(null);

  // ── Step 1: resolve studentId reliably (from JWT or API) ──
  useEffect(() => {
    const local = getUser();
    if (local?.studentId) {
      setStudentId(local.studentId);
      return;
    }
    // Fallback: call /auth/me to get fresh profile with studentId
    authApi.getMe().then(res => {
      const profile = res.data;
      const sid = profile?.student?.id || profile?.studentId;
      if (sid) {
        setStudentId(sid);
        // Also update localStorage so future page loads skip the API call
        const stored = getUser();
        if (stored) {
          localStorage.setItem('sims_user', JSON.stringify({ ...stored, studentId: sid }));
        }
      }
    }).catch(() => {
      // Last resort: use user.id — backend will resolve via userId lookup
      const u = getUser();
      if (u?.id) setStudentId(u.id);
    });
  }, []);

  // ── Step 2: load attendance when studentId or month/year changes ──
  useEffect(() => {
    if (!studentId) return;
    setLoading(true);

    attendanceApi.getByStudent(studentId, month + 1, year)
      .then(res => {
        const data  = res.data?.data;
        const recs: any[] = data?.records || [];
        const sum         = data?.summary  || {};

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const map: Record<number,Status> = {};

        for (let d = 1; d <= daysInMonth; d++) {
          const date    = new Date(year, month, d);
          const dow     = date.getDay();
          const isFuture = date > new Date();
          if (isFuture)         map[d] = 'FUTURE';
          else if (dow===0||dow===6) map[d] = 'HOLIDAY';
          else                  map[d] = 'NONE';
        }

        // Overlay real DB records
        recs.forEach((r: any) => {
          const d = new Date(r.date).getDate();
          map[d] = r.status as Status;
        });

        setRecords(map);
        setSummary({
          present:    sum.present    || 0,
          absent:     sum.absent     || 0,
          late:       sum.late       || 0,
          total:      sum.total      || 0,
          percentage: sum.percentage || 0,
        });
      })
      .catch(() => {
        // Show empty calendar — no fake data
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const map: Record<number,Status> = {};
        for (let d = 1; d <= daysInMonth; d++) {
          const date = new Date(year, month, d);
          const dow  = date.getDay();
          if (date > new Date())        map[d] = 'FUTURE';
          else if (dow===0||dow===6)    map[d] = 'HOLIDAY';
          else                          map[d] = 'NONE';
        }
        setRecords(map);
        setSummary({ present:0, absent:0, late:0, total:0, percentage:0 });
      })
      .finally(() => setLoading(false));
  }, [studentId, month, year]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay    = new Date(year, month, 1).getDay();
  const pctColor    = summary.percentage >= 75 ? '#86EFAC' : summary.percentage >= 60 ? '#FCD34D' : '#FCA5A5';
  const prevMonth   = () => { if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextMonth   = () => { if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); };
  const isToday     = (d: number) => {
    const t = new Date();
    return d===t.getDate() && month===t.getMonth() && year===t.getFullYear();
  };

  return (
    <AppShell title="My Attendance" subtitle="Monthly attendance — updated in real time by your teacher">

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          {label:'Present',    value:summary.present,    col:'#86EFAC', bg:'rgba(34,197,94,0.12)',  bd:'rgba(34,197,94,0.2)' },
          {label:'Absent',     value:summary.absent,     col:'#FCA5A5', bg:'rgba(239,68,68,0.12)',  bd:'rgba(239,68,68,0.2)' },
          {label:'Late',       value:summary.late,       col:'#FCD34D', bg:'rgba(245,158,11,0.12)', bd:'rgba(245,158,11,0.2)'},
          {label:'Total Days', value:summary.total,      col:'rgba(255,255,255,0.7)', bg:'rgba(255,255,255,0.05)', bd:'rgba(255,255,255,0.1)'},
          {label:'Rate',       value:`${summary.percentage}%`, col:pctColor, bg:`${pctColor}18`, bd:`${pctColor}35`},
        ].map(c => (
          <div key={c.label} className="glass rounded-2xl p-4 text-center hover:-translate-y-0.5 transition-transform" style={{border:`1px solid ${c.bd}`}}>
            <div className="text-2xl font-black mb-0.5" style={{color:c.col}}>{c.value}</div>
            <div className="text-xs" style={{color:'rgba(255,255,255,0.4)'}}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* CALENDAR */}
      <div className="glass rounded-2xl p-6 mb-6">
        {/* Nav */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={prevMonth} className="w-9 h-9 rounded-xl glass flex items-center justify-center hover:bg-white/10 transition-all">←</button>
          <div className="text-center">
            <div className="text-base font-black text-white">{MONTHS[month]} {year}</div>
            <div className="text-xs mt-0.5" style={{color:'rgba(255,255,255,0.4)'}}>
              {loading ? 'Loading...' : `${summary.present} present · ${summary.absent} absent · ${summary.percentage}% rate`}
            </div>
          </div>
          <button onClick={nextMonth} className="w-9 h-9 rounded-xl glass flex items-center justify-center hover:bg-white/10 transition-all">→</button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs font-bold py-1.5 rounded-lg"
                 style={{color:'rgba(255,255,255,0.3)',background:'rgba(255,255,255,0.03)'}}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7 gap-1.5">
          {[...Array(firstDay)].map((_,i) => <div key={`e${i}`}/>)}
          {[...Array(daysInMonth)].map((_,i) => {
            const day    = i + 1;
            const status = records[day] || 'NONE';
            const ss     = STATUS_STYLE[status];
            const today  = isToday(day);
            return (
              <div key={day}
                   className="aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all hover:scale-105 cursor-default"
                   style={{
                     background: today ? 'linear-gradient(135deg,#D4A017,#F0C040)' : ss.bg,
                     color: today ? '#0A1628' : ss.text,
                     border: today ? 'none' : `1px solid ${ss.text}20`,
                     opacity: loading ? 0.5 : 1,
                   }}>
                <span className="text-sm font-black">{day}</span>
                {!today && !['FUTURE','NONE','HOLIDAY'].includes(status) && (
                  <span className="text-[9px] mt-0.5 opacity-80">
                    {status==='PRESENT'?'P':status==='ABSENT'?'A':'L'}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-5 pt-4 flex-wrap" style={{borderTop:'1px solid rgba(255,255,255,0.07)'}}>
          {([
            ['PRESENT','Present'],['ABSENT','Absent'],['LATE','Late'],
            ['HOLIDAY','Weekend/Holiday'],['NONE','Not marked yet']
          ] as [Status,string][]).map(([s,l]) => {
            const ss = STATUS_STYLE[s];
            return (
              <div key={s} className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded" style={{background:ss.bg,border:`1px solid ${ss.text}40`}}/>
                <span className="text-xs" style={{color:'rgba(255,255,255,0.4)'}}>{l}</span>
              </div>
            );
          })}
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded" style={{background:'linear-gradient(135deg,#D4A017,#F0C040)'}}/>
            <span className="text-xs" style={{color:'rgba(255,255,255,0.4)'}}>Today</span>
          </div>
        </div>
      </div>

      {/* INFO BOX */}
      {!loading && summary.total === 0 && (
        <div className="glass rounded-2xl p-5 flex items-start gap-4 mb-4"
             style={{border:'1px solid rgba(30,144,255,0.25)'}}>
          <span className="text-2xl">ℹ️</span>
          <div>
            <div className="text-sm font-bold text-blue-300 mb-1">No Attendance Recorded Yet</div>
            <p className="text-xs leading-relaxed" style={{color:'rgba(255,255,255,0.5)'}}>
              Your teacher hasn&apos;t marked attendance for this month yet, or marks are being entered.
              Attendance will appear automatically once your teacher saves it from the Teacher Portal.
            </p>
          </div>
        </div>
      )}

      {/* LOW ATTENDANCE WARNING */}
      {!loading && summary.total > 0 && summary.percentage < 75 && (
        <div className="rounded-2xl p-5 flex items-start gap-4"
             style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)'}}>
          <span className="text-2xl">⚠️</span>
          <div>
            <div className="text-sm font-bold mb-1" style={{color:'#FCA5A5'}}>
              Attendance Below 75% — Action Required
            </div>
            <p className="text-xs leading-relaxed" style={{color:'rgba(255,255,255,0.5)'}}>
              Your current attendance is <strong className="text-red-300">{summary.percentage}%</strong>.
              A minimum of 75% is required to appear in examinations.
              Please speak with your class teacher immediately.
            </p>
          </div>
        </div>
      )}
    </AppShell>
  );
}
