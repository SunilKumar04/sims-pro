'use client';
// src/app/student/attendance/page.tsx
// Unified attendance hub: Today | Subject-wise | Calendar | Estimator
import React, { useCallback, useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { sessionsApi, attendanceApi } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { toast } from '@/components/ui/Toast';

const SC: Record<string,{bg:string;text:string;border:string;icon:string}> = {
  PRESENT:    {bg:'rgba(34,197,94,0.15)',  text:'#86EFAC', border:'rgba(34,197,94,0.3)',   icon:'✅'},
  ABSENT:     {bg:'rgba(239,68,68,0.15)',  text:'#FCA5A5', border:'rgba(239,68,68,0.3)',   icon:'❌'},
  LATE:       {bg:'rgba(245,158,11,0.15)', text:'#FCD34D', border:'rgba(245,158,11,0.3)',  icon:'⏰'},
  NOT_MARKED: {bg:'rgba(255,255,255,0.04)',text:'rgba(255,255,255,0.3)',border:'rgba(255,255,255,0.1)',icon:'⏳'},
  NO_SESSION: {bg:'rgba(255,255,255,0.02)',text:'rgba(255,255,255,0.2)',border:'rgba(255,255,255,0.05)',icon:'—'},
};
const SUB_COL: Record<string,string> = {
  Mathematics:'#a5b4fc',Physics:'#93c5fd',Chemistry:'#86efac',Biology:'#6ee7b7',
  English:'#fcd34d',Hindi:'#fca5a5',History:'#d8b4fe','Computer Science':'#c7d2fe',
  Geography:'#99f6e4','Physical Education':'#fdba74',Economics:'#fbcfe8',Accountancy:'#fef08a',
};
const sc   = (s: string) => SUB_COL[s] ?? '#aaaaaa';
const pctC = (p: number) => p >= 75 ? '#86EFAC' : p >= 60 ? '#FCD34D' : '#FCA5A5';
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_L = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

type Tab = 'today' | 'subjects' | 'calendar' | 'estimator';

function Ring({ pct, color, size=72 }: {pct:number;color:string;size?:number}) {
  const r = (size/2) - 6;
  const c2 = 2*Math.PI*r;
  return (
    <svg width={size} height={size} style={{transform:'rotate(-90deg)'}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={6}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
              strokeDasharray={c2} strokeDashoffset={c2*(1-Math.min(1,pct/100))} strokeLinecap="round"/>
    </svg>
  );
}

function MiniBar({pct,color}:{pct:number;color:string}) {
  return (
    <div style={{height:4,borderRadius:99,background:'rgba(255,255,255,0.08)',overflow:'hidden'}}>
      <div style={{height:'100%',width:`${Math.min(100,pct)}%`,background:color,borderRadius:99,transition:'width 0.4s'}}/>
    </div>
  );
}

export default function StudentAttendance() {
  const user      = getUser();
  const cls       = user?.className ?? '';
  const studentId = user?.studentId ?? user?.id ?? '';
  const now       = new Date();

  const [tab,      setTab]      = useState<Tab>('today');
  const [today,    setToday]    = useState<any>(null);
  const [todayLoad,setTodayLoad]= useState(true);
  const [summary,  setSummary]  = useState<any>(null);
  const [sumLoad,  setSumLoad]  = useState(true);
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [calYear,  setCalYear]  = useState(now.getFullYear());
  const [calRecs,  setCalRecs]  = useState<any[]>([]);
  const [calLoad,  setCalLoad]  = useState(false);
  const [estDays,  setEstDays]  = useState(30);

  useEffect(() => {
    sessionsApi.getStudentToday()
      .then(r => setToday(r.data.data))
      .catch(() => setToday(null))
      .finally(() => setTodayLoad(false));

    sessionsApi.getMyStudentSummary(cls || undefined)
      .then(r => setSummary(r.data.data))
      .catch(() => setSummary(null))
      .finally(() => setSumLoad(false));
  }, [cls]);

  const loadCal = useCallback(() => {
    if (!studentId) return;
    setCalLoad(true);
    attendanceApi.getByStudent(studentId, calMonth, calYear)
      .then(r => setCalRecs(r.data.data ?? []))
      .catch(() => toast.error('Error','Could not load calendar'))
      .finally(() => setCalLoad(false));
  }, [studentId, calMonth, calYear]);

  useEffect(() => {
    if (tab === 'calendar') loadCal();
  }, [tab, loadCal]);

  const overall      = summary?.overall ?? { totalSessions:0, totalPresent:0, percentage:0 };
  const subSummary   = (summary?.summary ?? []) as any[];
  const recentHist   = (summary?.recentHistory ?? []) as any[];
  const ovPct        = overall.percentage ?? 0;
  const ovColor      = pctC(ovPct);

  const totalSessions     = overall.totalSessions ?? 0;
  const totalPresent      = overall.totalPresent ?? 0;
  const periodsPerDay     = today?.totalPeriods ?? 6;
  const futureSessions    = estDays * periodsPerDay;
  const newPct = (totalSessions + futureSessions) > 0
    ? Math.round(((totalPresent + futureSessions) / (totalSessions + futureSessions)) * 100)
    : 0;
  const newPctColor = pctC(newPct);

  const sessionsFor75 = (): number => {
    if (ovPct >= 75) return 0;
    const x = Math.ceil((0.75 * totalSessions - totalPresent) / 0.25);
    return Math.max(0, x);
  };
  const daysFor75 = periodsPerDay > 0 ? Math.ceil(sessionsFor75() / periodsPerDay) : 0;

  const calDateMap: Record<string,string> = {};
  calRecs.forEach(r => {
    const d = new Date(r.date);
    calDateMap[`${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`] = r.status;
  });
  const calPresent = calRecs.filter(r => r.status === 'PRESENT').length;
  const calAbsent  = calRecs.filter(r => r.status === 'ABSENT').length;
  const calLate    = calRecs.filter(r => r.status === 'LATE').length;
  const firstDay   = new Date(calYear, calMonth-1, 1).getDay();
  const daysInMon  = new Date(calYear, calMonth, 0).getDate();

  const CAL_BG: Record<string,string> = {
    PRESENT:'rgba(34,197,94,0.18)',ABSENT:'rgba(239,68,68,0.18)',LATE:'rgba(245,158,11,0.18)',
  };
  const CAL_C: Record<string,string> = { PRESENT:'#86EFAC', ABSENT:'#FCA5A5', LATE:'#FCD34D' };

  const TABS: {id:Tab;icon:string;label:string}[] = [
    {id:'today',     icon:'📅', label:"Today's Classes"},
    {id:'subjects',  icon:'🎯', label:'By Subject'},
    {id:'calendar',  icon:'🗓️', label:'Calendar'},
    {id:'estimator', icon:'📈', label:'Estimator'},
  ];

  return (
    <AppShell title="My Attendance" subtitle="Track your attendance, analyse patterns and plan ahead">
      <div className="rounded-2xl p-5 mb-5 flex items-start gap-5 flex-wrap"
           style={{background:'linear-gradient(135deg,#0F2044,#162952)',border:`1px solid ${ovColor}30`}}>
        <div className="relative flex-shrink-0">
          <Ring pct={ovPct} color={ovColor} size={80}/>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-black" style={{color:ovColor}}>{ovPct}%</span>
            <span className="text-[9px] text-white/40">overall</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-lg font-black text-white mb-1">
            {user?.name?.split(' ')[0]}'s Attendance
            {cls && <span className="text-sm font-normal text-white/50 ml-2">· Class {cls}</span>}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center sm:gap-5">
            {[
              {val:overall.totalPresent ?? 0,  label:'Present',  col:'#86EFAC'},
              {val:(overall.totalSessions ?? 0) - (overall.totalPresent ?? 0), label:'Absent', col:'#FCA5A5'},
              {val:overall.totalSessions ?? 0, label:'Total',    col:'rgba(255,255,255,0.7)'},
              {val:subSummary.length,          label:'Subjects', col:'#93C5FD'},
            ].map(item => (
              <div key={item.label} className="rounded-2xl px-3 py-3 text-center sm:bg-transparent sm:px-0 sm:py-0" style={{background:'rgba(255,255,255,0.05)'}}>
                  <div className="text-xl font-black" style={{color:item.col}}>{item.val}</div>
                  <div className="text-[10px] text-white/40">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
        {ovPct > 0 && ovPct < 75 && (
          <div className="px-4 py-3 rounded-xl flex-shrink-0 text-xs"
               style={{background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.3)',color:'#FCA5A5',maxWidth:220}}>
            ⚠️ Below 75% — attend at least <strong>{daysFor75} more day{daysFor75!==1?'s':''}</strong> to reach the minimum
          </div>
        )}
        {ovPct >= 75 && ovPct > 0 && (
          <div className="px-4 py-3 rounded-xl flex-shrink-0 text-xs"
               style={{background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.2)',color:'#86EFAC'}}>
            ✅ Above 75% — you're eligible for exams!
          </div>
        )}
      </div>

      <div className="glass rounded-2xl p-1.5 mb-5 flex gap-1 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
                  className="flex-1 min-w-[4.5rem] py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  style={{
                    background:tab===t.id?'rgba(212,160,23,0.2)':'transparent',
                    border:`1px solid ${tab===t.id?'rgba(212,160,23,0.35)':'transparent'}`,
                    color:tab===t.id?'#F0C040':'rgba(255,255,255,0.4)',
                  }}>
            <span>{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'today' && (
        <div>
          {todayLoad ? (
            <div className="space-y-3">{[...Array(5)].map((_,i)=><div key={i} className="skeleton h-20 rounded-2xl"/>)}</div>
          ) : !today || today.totalPeriods === 0 ? (
            <div className="glass rounded-2xl py-20 text-center">
              <div className="text-5xl mb-4 opacity-30">🗓️</div>
              <p className="text-base font-bold text-white mb-1">No classes scheduled for today</p>
              <p className="text-sm text-white/40">{today?.dayLabel ?? ''}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4 lg:grid-cols-4">
                {[
                  {label:'Total Periods', val:today.totalPeriods,    col:'#F0C040', bd:'rgba(212,160,23,0.2)'},
                  {label:'Sessions Held',  val:today.held,            col:'#93C5FD', bd:'rgba(30,144,255,0.2)'},
                  {label:'You Present',    val:today.presentToday,    col:'#86EFAC', bd:'rgba(34,197,94,0.2)'},
                  {label:'You Absent',     val:today.absentToday,     col:'#FCA5A5', bd:'rgba(239,68,68,0.2)'},
                ].map(c => (
                  <div key={c.label} className="glass rounded-2xl p-4" style={{border:`1px solid ${c.bd}`}}>
                    <div className="text-2xl font-black" style={{color:c.col}}>{c.val}</div>
                    <div className="text-xs mt-0.5 text-white/40">{c.label}</div>
                  </div>
                ))}
              </div>

              <div className="glass rounded-2xl p-4 mb-4 text-xs text-white/50 flex items-center gap-2"
                   style={{border:'1px solid rgba(255,255,255,0.07)'}}>
                <span>📅</span>
                <span>
                  <strong className="text-yellow-400">{today.dayLabel}</strong>,{' '}
                  {new Date(today.date).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}
                  {' · '} Class {cls}
                  {today.held < today.totalPeriods && (
                    <span className="ml-2 text-white/35">
                      ({today.totalPeriods - today.held} session{today.totalPeriods-today.held!==1?'s':''} not yet started)
                    </span>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {today.periods.map((p: any) => {
                  const status = p.status ?? (p.sessionHeld ? 'NOT_MARKED' : 'NO_SESSION');
                  const cfg    = SC[status] ?? SC.NO_SESSION;
                  const color  = sc(p.subject);
                  return (
                    <div key={p.period} className="glass rounded-2xl p-4 hover:-translate-y-0.5 transition-all"
                         style={{border:`1px solid ${cfg.border}`,background:cfg.bg}}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base font-black flex-shrink-0"
                               style={{background:`${color}20`,color}}>
                            P{p.period}
                          </div>
                          <div>
                            <div className="text-sm font-black text-white leading-tight">{p.subject}</div>
                            <div className="text-[10px] text-white/40 mt-0.5">{p.teacherName}</div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-lg">{cfg.icon}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{background:cfg.bg,color:cfg.text,border:`1px solid ${cfg.border}`}}>
                            {status === 'NO_SESSION' ? 'Not Held' : status === 'NOT_MARKED' ? 'Pending' : status}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-white/30 pt-2"
                           style={{borderTop:'1px solid rgba(255,255,255,0.05)'}}>
                        <span>⏱ {p.startTime} – {p.endTime}</span>
                        {p.room && <span>📍 {p.room}</span>}
                      </div>
                      {p.remark && (
                        <div className="text-[10px] mt-1.5 text-white/40 italic">"{p.remark}"</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'subjects' && (
        <div>
          {sumLoad ? (
            <div className="space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="skeleton h-16 rounded-2xl"/>)}</div>
          ) : subSummary.length === 0 ? (
            <div className="glass rounded-2xl py-20 text-center">
              <div className="text-5xl mb-4 opacity-30">🎯</div>
              <p className="font-bold text-white">No subject data yet</p>
              <p className="text-sm mt-1 text-white/40">Your teacher hasn't started any sessions</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
              <div className="space-y-3 xl:col-span-2">
                {subSummary.map((s: any) => {
                  const pct  = s.percentage ?? 0;
                  const col  = pctC(pct);
                  const sCol = sc(s.subject);
                  const need75 = pct < 75
                    ? Math.max(0, Math.ceil((0.75 * s.total - s.present) / 0.25))
                    : 0;
                  return (
                    <div key={s.subject} className="glass rounded-2xl p-4 hover:-translate-y-0.5 transition-all"
                         style={{border:`1px solid ${pct<75?'rgba(239,68,68,0.2)':'rgba(255,255,255,0.07)'}`}}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{background:sCol}}/>
                        <span className="text-sm font-black text-white flex-1">{s.subject}</span>
                        <div className="text-right flex-shrink-0">
                          <span className="text-xl font-black" style={{color:col}}>{pct}%</span>
                        </div>
                      </div>
                      <MiniBar pct={pct} color={col}/>
                      <div className="mt-2 flex flex-col gap-2 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex gap-3 flex-wrap">
                          <span>✅ {s.present} present</span>
                          <span>❌ {s.absent} absent</span>
                          {s.late > 0 && <span>⏰ {s.late} late</span>}
                          <span className="text-white/25">/ {s.total} total</span>
                        </div>
                        {pct < 75 && (
                          <span className="text-red-400 font-bold text-[10px]">
                            Need {need75} more to reach 75%
                          </span>
                        )}
                        {pct >= 75 && <span className="text-green-400 text-[10px] font-bold">✓ OK</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="glass rounded-2xl overflow-hidden xl:col-span-1" style={{maxHeight:'65vh',overflowY:'auto'}}>
                <div className="sticky top-0 px-4 py-3 z-10"
                     style={{background:'rgba(15,32,68,0.95)',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
                  <div className="text-xs font-bold text-white">Recent History</div>
                </div>
                <div className="divide-y" style={{borderColor:'rgba(255,255,255,0.05)'}}>
                  {recentHist.slice(0,30).map((h:any, i:number) => {
                    const cfg = SC[h.status] ?? SC.NOT_MARKED;
                    return (
                      <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                        <span className="text-sm flex-shrink-0">{cfg.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-white truncate">{h.subject}</div>
                          <div className="text-[10px] text-white/35">
                            {new Date(h.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})} · P{h.period}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold flex-shrink-0" style={{color:cfg.text}}>{h.status}</span>
                      </div>
                    );
                  })}
                  {recentHist.length === 0 && (
                    <div className="px-4 py-8 text-center text-xs text-white/30">No history yet</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'calendar' && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 gap-4 flex-wrap"
               style={{borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
            <div className="flex items-center gap-4">
              <button onClick={() => { if(calMonth===1){setCalMonth(12);setCalYear(y=>y-1);}else setCalMonth(m=>m-1); }}
                      className="w-9 h-9 rounded-xl glass flex items-center justify-center hover:bg-white/10 text-white">‹</button>
              <div className="text-base font-black text-white">{MONTHS[calMonth-1]} {calYear}</div>
              <button onClick={() => {
                        const nm=calMonth===12?1:calMonth+1, ny=calMonth===12?calYear+1:calYear;
                        if(new Date(ny,nm-1,1)<=now){setCalMonth(nm);setCalYear(ny);}
                      }}
                      disabled={new Date(calYear,calMonth,1)>now}
                      className="w-9 h-9 rounded-xl glass flex items-center justify-center hover:bg-white/10 text-white disabled:opacity-30">›</button>
            </div>
            <div className="flex items-center gap-4 text-xs text-white/50">
              <span><strong className="text-green-400">{calPresent}</strong> P</span>
              <span><strong className="text-red-400">{calAbsent}</strong> A</span>
              <span><strong className="text-yellow-400">{calLate}</strong> L</span>
              <span><strong className="text-white">{calRecs.length}</strong> total</span>
            </div>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-7 mb-2">
              {DAYS_L.map(d => (
                <div key={d} className="text-center text-xs font-bold py-2" style={{color:'rgba(255,255,255,0.3)'}}>{d}</div>
              ))}
            </div>
            {calLoad
              ? <div className="grid grid-cols-7 gap-1">{[...Array(35)].map((_,i)=><div key={i} className="skeleton h-11 rounded-xl"/>)}</div>
              : <div className="grid grid-cols-7 gap-1">
                  {[...Array(firstDay)].map((_,i) => <div key={`e${i}`}/>)}
                  {[...Array(daysInMon)].map((_,i) => {
                    const day     = i+1;
                    const key     = `${calYear}-${calMonth}-${day}`;
                    const status  = calDateMap[key];
                    const isToday = day===now.getDate()&&calMonth===now.getMonth()+1&&calYear===now.getFullYear();
                    const isWE    = new Date(calYear,calMonth-1,day).getDay()%6===0;
                    return (
                      <div key={day} className="relative flex flex-col items-center justify-center rounded-xl py-1.5 transition-all"
                           style={{
                             minHeight:44,
                             background:status?CAL_BG[status]:isWE?'rgba(255,255,255,0.015)':'transparent',
                             border:isToday?'2px solid #F0C040':'1px solid transparent',
                           }}>
                        <span className="text-sm font-bold"
                              style={{color:status?CAL_C[status]:isWE?'rgba(255,255,255,0.18)':'rgba(255,255,255,0.65)'}}>
                          {day}
                        </span>
                        {status && (
                          <span className="text-[8px] font-black mt-0.5" style={{color:CAL_C[status]}}>
                            {status[0]}
                          </span>
                        )}
                        {isToday && <span className="absolute top-0.5 right-1 text-[8px] font-black text-yellow-400">★</span>}
                      </div>
                    );
                  })}
                </div>}
            <div className="flex items-center justify-center gap-4 flex-wrap mt-4 pt-4"
                 style={{borderTop:'1px solid rgba(255,255,255,0.06)'}}>
              {[['PRESENT','#86EFAC','rgba(34,197,94,0.18)','Present'],
                ['ABSENT','#FCA5A5','rgba(239,68,68,0.18)','Absent'],
                ['LATE','#FCD34D','rgba(245,158,11,0.18)','Late']].map(([s,c,bg,lbl]) => (
                <div key={s} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-md" style={{background:bg,border:`1px solid ${c}`}}/>
                  <span className="text-xs text-white/45">{lbl}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'estimator' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {label:'Sessions Attended', val:totalPresent,      col:'#86EFAC', bg:'rgba(34,197,94,0.1)',   bd:'rgba(34,197,94,0.2)'},
              {label:'Total Sessions',    val:totalSessions,     col:'#93C5FD', bg:'rgba(30,144,255,0.1)',  bd:'rgba(30,144,255,0.2)'},
              {label:'Current %',         val:`${ovPct}%`,       col:ovColor,   bg:`${ovColor}18`,          bd:`${ovColor}35`},
            ].map(c => (
              <div key={c.label} className="glass rounded-2xl p-5" style={{border:`1px solid ${c.bd}`}}>
                <div className="text-2xl font-black" style={{color:c.col}}>{c.val}</div>
                <div className="text-xs mt-1 text-white/40">{c.label}</div>
              </div>
            ))}
          </div>

          <div className="glass rounded-2xl p-7">
            <h3 className="text-base font-bold text-white mb-1">📈 Attendance Estimator</h3>
            <p className="text-xs text-white/40 mb-6">
              Adjust the slider to see how your attendance percentage will change if you attend all sessions for the next N days.
            </p>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-white/40">Future days to attend</label>
                <span className="text-2xl font-black text-yellow-400">{estDays} days</span>
              </div>
              <input type="range" min={1} max={180} value={estDays} onChange={e => setEstDays(Number(e.target.value))}
                     className="w-full" style={{accentColor:'#F0C040'}}/>
              <div className="flex justify-between text-[10px] text-white/25 mt-1">
                <span>1 day</span><span>1 month</span><span>3 months</span><span>6 months</span>
              </div>
            </div>

            <div className="flex flex-col items-stretch gap-6 p-5 rounded-2xl mb-5 sm:flex-row sm:items-center"
                 style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)'}}>
              <div className="flex-1">
                <div className="text-xs text-white/40 mb-1">Your current attendance</div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-3xl font-black" style={{color:ovColor}}>{ovPct}%</div>
                  <div className="text-sm text-white/30">({totalPresent}/{totalSessions})</div>
                </div>
                <MiniBar pct={ovPct} color={ovColor}/>
              </div>
              <div className="text-3xl text-white/20 flex-shrink-0 self-center">→</div>
              <div className="flex-1">
                <div className="text-xs text-white/40 mb-1">After attending {estDays} more days</div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-3xl font-black" style={{color:newPctColor}}>{newPct}%</div>
                  <div className="text-sm text-white/30">
                    ({totalPresent + futureSessions}/{totalSessions + futureSessions})
                  </div>
                </div>
                <MiniBar pct={newPct} color={newPctColor}/>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="px-4 py-2.5 rounded-xl text-sm font-bold"
                   style={{background:newPct>ovPct?'rgba(34,197,94,0.12)':'rgba(255,255,255,0.05)',
                           color:newPct>ovPct?'#86EFAC':'rgba(255,255,255,0.5)',
                           border:`1px solid ${newPct>ovPct?'rgba(34,197,94,0.25)':'rgba(255,255,255,0.1)'}`}}>
                {newPct > ovPct ? `↑ +${newPct-ovPct}%` : newPct < ovPct ? `↓ ${newPct-ovPct}%` : '= No change'} in {estDays} days
              </div>
              {newPct >= 75 && ovPct < 75 && (
                <div className="px-4 py-2.5 rounded-xl text-sm font-bold"
                     style={{background:'rgba(34,197,94,0.12)',color:'#86EFAC',border:'1px solid rgba(34,197,94,0.25)'}}>
                  ✅ Will reach 75% in {estDays} days!
                </div>
              )}
              {newPct < 75 && (
                <div className="text-xs text-white/40">
                  Still {75 - newPct}% below minimum after {estDays} days
                </div>
              )}
            </div>
          </div>

          {ovPct < 75 && totalSessions > 0 && (
            <div className="glass rounded-2xl p-6" style={{border:'1px solid rgba(245,158,11,0.2)'}}>
              <h3 className="text-sm font-bold text-white mb-3">⏱ Days needed to reach 75%</h3>
              <div className="flex items-center gap-5 flex-wrap">
                <div className="text-center">
                  <div className="text-4xl font-black text-yellow-400">{daysFor75}</div>
                  <div className="text-xs mt-1 text-white/40">school days</div>
                </div>
                <div className="w-px h-12 bg-white/10"/>
                <div className="text-sm text-white/50 max-w-xs leading-relaxed">
                  You need to attend <strong className="text-yellow-400">{sessionsFor75()}</strong> more sessions
                  (~<strong className="text-yellow-400">{daysFor75} school days</strong>) without any absence to reach the 75% minimum.
                </div>
              </div>
            </div>
          )}

          {subSummary.filter((s:any) => s.percentage < 75).length > 0 && (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="px-5 py-4" style={{borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
                <h3 className="text-sm font-bold text-white">⚠️ Subjects Below 75%</h3>
                <p className="text-xs mt-0.5 text-white/40">Sessions needed per subject to reach minimum</p>
              </div>
              <div className="divide-y" style={{borderColor:'rgba(255,255,255,0.05)'}}>
                {subSummary.filter((s:any) => s.percentage < 75).map((s:any) => {
                  const need = Math.max(0, Math.ceil((0.75 * s.total - s.present) / 0.25));
                  const col  = sc(s.subject);
                  return (
                    <div key={s.subject} className="px-5 py-4 flex items-center gap-4">
                      <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{background:col}}/>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white">{s.subject}</div>
                        <div className="text-xs text-white/40 mt-0.5">{s.present}/{s.total} sessions attended</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-base font-black text-red-400">{s.percentage}%</div>
                        <div className="text-[10px] text-white/40 mt-0.5">Need {need} more</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {recentHist.length > 0 && (() => {
            let streak = 0;
            for (const h of recentHist) {
              if (h.status === 'PRESENT' || h.status === 'LATE') streak++;
              else break;
            }
            if (streak < 2) return null;
            return (
              <div className="glass rounded-2xl p-5 flex items-center gap-4"
                   style={{border:'1px solid rgba(251,191,36,0.2)'}}>
                <div className="text-4xl flex-shrink-0">🔥</div>
                <div>
                  <div className="text-base font-black text-white">
                    {streak}-session attendance streak!
                  </div>
                  <p className="text-xs mt-0.5 text-white/40">
                    Keep it up — {streak} sessions in a row without absence
                  </p>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </AppShell>
  );
}
