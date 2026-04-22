'use client';
// src/app/student/timetable/page.tsx
import React, { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { timetableApi } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { toast } from '@/components/ui/Toast';
import type { TimetableSlot } from '@/types/sims';

const DAYS         = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'] as const;
const PERIOD_START = ['08:00','08:45','09:30','10:30','11:15','12:00','13:30','14:15'] as const;
const PERIOD_END   = ['08:45','09:30','10:15','11:15','12:00','12:45','14:15','15:00'] as const;
const SUB_COLORS: Record<string,string> = {
  Mathematics:'#a5b4fc', Physics:'#93c5fd', Chemistry:'#86efac', Biology:'#6ee7b7',
  English:'#fcd34d', Hindi:'#fca5a5', History:'#d8b4fe', 'Computer Science':'#c7d2fe',
  Geography:'#99f6e4', 'Physical Education':'#fdba74', Economics:'#fbcfe8', Accountancy:'#fef08a',
};
const sc = (s: string) => SUB_COLORS[s] ?? 'rgba(255,255,255,0.55)';

interface TimetableResponse { slots: TimetableSlot[]; grouped: Record<string, TimetableSlot[]> }

export default function StudentTimetable() {
  const user = getUser();
  const cls  = user?.className ?? '';

  const [data,    setData]    = useState<TimetableResponse|null>(null);
  const [loading, setLoading] = useState(true);
  const [view,    setView]    = useState<'today'|'week'>('today');

  useEffect(() => {
    if (!cls) { setLoading(false); return; }
    timetableApi.getClassTimetable(cls)
      .then(r => setData(r.data.data as TimetableResponse))
      .catch(() => toast.error('Load Failed','Could not fetch timetable'))
      .finally(() => setLoading(false));
  }, [cls]);

  const todayDow  = new Date().getDay() || 1;  // 0=Sun → treat as Mon
  const todayLabel = DAYS[todayDow - 1] ?? 'Today';

  // Build byDay from grouped (keys are strings from JSON)
  const byDay: Record<number, TimetableSlot[]> = {};
  for (let d = 1; d <= 6; d++) byDay[d] = [];
  if (data?.grouped) {
    Object.entries(data.grouped).forEach(([k, slots]) => { byDay[Number(k)] = slots; });
  }

  const todaySlots = [...(byDay[todayDow] ?? [])].sort((a,b) => a.period - b.period);
  const subjects   = Array.from(new Set<string>((data?.slots ?? []).map(s => s.subject)));
  const totalSlots = data?.slots.length ?? 0;

  if (loading) {
    return (
      <AppShell title="My Timetable" subtitle="Weekly class schedule">
        <div className="space-y-4">{[...Array(4)].map((_,i) => <div key={i} className="skeleton h-20 rounded-2xl"/>)}</div>
      </AppShell>
    );
  }

  if (!cls) {
    return (
      <AppShell title="My Timetable" subtitle="Weekly class schedule">
        <div className="glass rounded-2xl py-20 text-center"><div className="text-4xl mb-3 opacity-40">⚠️</div><p className="text-white/50">Class not assigned to your profile</p></div>
      </AppShell>
    );
  }

  return (
    <AppShell title="My Timetable" subtitle={`Class ${cls} — weekly schedule`}>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-3">
        {[
          {label:'Periods / Week', val:totalSlots,        col:'#F0C040', bg:'rgba(212,160,23,0.12)', bd:'rgba(212,160,23,0.2)'},
          {label:'Classes Today',  val:todaySlots.length, col:'#86EFAC', bg:'rgba(34,197,94,0.12)',  bd:'rgba(34,197,94,0.2)'},
          {label:'Subjects',       val:subjects.length,   col:'#93C5FD', bg:'rgba(30,144,255,0.12)', bd:'rgba(30,144,255,0.2)'},
        ].map(c => (
          <div key={c.label} className="glass rounded-2xl p-5" style={{border:`1px solid ${c.bd}`}}>
            <div className="text-2xl font-black" style={{color:c.col}}>{c.val}</div>
            <div className="text-xs mt-1 text-white/40">{c.label}</div>
          </div>
        ))}
      </div>

      {/* View toggle */}
      <div className="glass rounded-2xl p-1.5 mb-5 flex flex-wrap gap-1">
        {(['today','week'] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
                  className="flex-1 min-w-[8.5rem] py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={{background:view===v?'rgba(212,160,23,0.15)':'transparent',border:`1px solid ${view===v?'rgba(212,160,23,0.3)':'transparent'}`,color:view===v?'#F0C040':'rgba(255,255,255,0.4)'}}>
            {v === 'today' ? `📅 Today (${todayLabel})` : '🗓️ Full Week'}
          </button>
        ))}
      </div>

      {/* Today */}
      {view === 'today' && (
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-white">{todayLabel}&apos;s Schedule</h3>
            <span className="text-xs text-white/40">{new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}</span>
          </div>
          {todaySlots.length === 0
            ? <div className="text-center py-12"><div className="text-4xl mb-3 opacity-40">🎉</div><p className="font-bold text-white">No classes today</p></div>
            : <div className="space-y-3">
                {todaySlots.map(slot => (
                  <div key={slot.id} className="flex flex-wrap items-start gap-4 p-4 rounded-2xl transition-all hover:-translate-y-0.5 sm:flex-nowrap sm:items-center"
                       style={{background:`${sc(slot.subject)}10`,border:`1px solid ${sc(slot.subject)}30`}}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black flex-shrink-0"
                         style={{background:`${sc(slot.subject)}20`,color:sc(slot.subject)}}>P{slot.period}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-black text-white">{slot.subject}</div>
                      <div className="text-xs mt-0.5 text-white/50">{slot.teacher?.user?.name ?? '—'}{slot.room ? ` · Room ${slot.room}` : ''}</div>
                    </div>
                    <div className="text-left sm:text-right flex-shrink-0">
                      <div className="text-sm font-black" style={{color:sc(slot.subject)}}>{slot.startTime}–{slot.endTime}</div>
                      <div className="text-[10px] text-white/30">{PERIOD_START[slot.period-1]}–{PERIOD_END[slot.period-1]}</div>
                    </div>
                  </div>
                ))}
              </div>}
        </div>
      )}

      {/* Week grid */}
      {view === 'week' && (
        totalSlots === 0
          ? <div className="glass rounded-2xl py-20 text-center"><div className="text-5xl mb-4 opacity-40">🗓️</div><p className="font-bold text-white">Timetable not set up yet</p></div>
          : <div className="space-y-4">
              <div className="glass rounded-2xl p-4 lg:hidden">
                <div className="space-y-4">
                  {DAYS.map((day, index) => {
                    const daySlots = [...(byDay[index + 1] ?? [])].sort((a, b) => a.period - b.period);
                    return (
                      <div key={day} className="rounded-2xl p-4" style={{background:index + 1 === todayDow ? 'rgba(212,160,23,0.08)' : 'rgba(255,255,255,0.03)', border:`1px solid ${index + 1 === todayDow ? 'rgba(212,160,23,0.22)' : 'rgba(255,255,255,0.06)'}`}}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-sm font-black text-white">{day}</div>
                          <div className="text-[11px] font-bold" style={{color:index + 1 === todayDow ? '#F0C040' : 'rgba(255,255,255,0.35)'}}>
                            {daySlots.length} class{daySlots.length === 1 ? '' : 'es'}
                          </div>
                        </div>
                        {daySlots.length === 0 ? (
                          <div className="rounded-xl px-3 py-4 text-center text-xs text-white/35" style={{background:'rgba(255,255,255,0.02)'}}>No classes</div>
                        ) : (
                          <div className="space-y-2">
                            {daySlots.map(slot => (
                              <div key={slot.id} className="rounded-xl p-3" style={{background:`${sc(slot.subject)}15`, border:`1px solid ${sc(slot.subject)}30`}}>
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="text-sm font-bold text-white">{slot.subject}</div>
                                    <div className="text-[11px] text-white/45 mt-0.5">{slot.teacher?.user?.name ?? '—'}{slot.room ? ` · Room ${slot.room}` : ''}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs font-black" style={{color:sc(slot.subject)}}>P{slot.period}</div>
                                    <div className="text-[10px] text-white/35">{slot.startTime}-{slot.endTime}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="glass rounded-2xl overflow-hidden hidden lg:block">
              <div className="overflow-x-auto">
                <table className="w-full" style={{borderCollapse:'collapse',minWidth:900}}>
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white/40"
                          style={{background:'rgba(255,255,255,0.04)',width:110}}>Period</th>
                      {DAYS.map((d,i) => (
                        <th key={d} className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider"
                            style={{background:i+1===todayDow?'rgba(212,160,23,0.12)':'rgba(255,255,255,0.04)',
                                    color:i+1===todayDow?'#F0C040':'rgba(255,255,255,0.4)'}}>
                          {d.slice(0,3)}{i+1===todayDow?' ★':''}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[1,2,3,4,5,6,7,8].map(p => (
                      <tr key={p} style={{borderTop:'1px solid rgba(255,255,255,0.05)'}}>
                        <td className="px-4 py-2" style={{background:'rgba(255,255,255,0.02)'}}>
                          <div className="text-xs font-bold text-white/70">P{p}</div>
                          <div className="text-[10px] text-white/30">{PERIOD_START[p-1]}–{PERIOD_END[p-1]}</div>
                        </td>
                        {DAYS.map((_d,di) => {
                          const d2   = di + 1;
                          const slot = (byDay[d2] ?? []).find(s => s.period === p);
                          return (
                            <td key={d2} className="p-1.5" style={{minWidth:130}}>
                              {slot
                                ? <div className="rounded-xl p-2.5 text-xs" style={{background:`${sc(slot.subject)}15`,border:`1px solid ${sc(slot.subject)}35`}}>
                                    <div className="font-bold truncate" style={{color:sc(slot.subject)}}>{slot.subject}</div>
                                    <div className="text-white/40 text-[11px] truncate">{slot.teacher?.user?.name ?? '—'}</div>
                                    {slot.room && <div className="text-white/25 text-[10px]">{slot.room}</div>}
                                  </div>
                                : <div className="rounded-xl flex items-center justify-center" style={{minHeight:54,border:'1px dashed rgba(255,255,255,0.07)',color:'rgba(255,255,255,0.1)',fontSize:12}}>—</div>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {subjects.length > 0 && (
                <div className="px-6 py-4 flex items-center gap-3 flex-wrap" style={{borderTop:'1px solid rgba(255,255,255,0.07)'}}>
                  <span className="text-xs font-bold text-white/30 uppercase tracking-wider">Subjects:</span>
                  {subjects.map(s => (
                    <div key={s} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm" style={{background:sc(s)}}/>
                      <span className="text-xs text-white/50">{s}</span>
                    </div>
                  ))}
                </div>
              )}
              </div>
            </div>
      )}
    </AppShell>
  );
}
