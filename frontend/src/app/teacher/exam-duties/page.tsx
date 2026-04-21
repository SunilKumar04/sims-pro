'use client';
// src/app/teacher/exam-duties/page.tsx
import React, { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { examsApi } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { toast } from '@/components/ui/Toast';

// ── Config ─────────────────────────────────────────────────────────────
const EXAM_LABELS: Record<string,string> = {
  MST1:'MST 1', MID_TERM:'Mid Term', MST2:'MST 2', FINAL:'Final Exam',
};
const EXAM_COLORS: Record<string,{bg:string;text:string;border:string}> = {
  MST1:     {bg:'rgba(30,144,255,0.12)',  text:'#93C5FD', border:'rgba(30,144,255,0.3)' },
  MID_TERM: {bg:'rgba(245,158,11,0.12)',  text:'#FCD34D', border:'rgba(245,158,11,0.3)' },
  MST2:     {bg:'rgba(168,85,247,0.12)',  text:'#D8B4FE', border:'rgba(168,85,247,0.3)' },
  FINAL:    {bg:'rgba(239,68,68,0.12)',   text:'#FCA5A5', border:'rgba(239,68,68,0.3)'  },
};
const ROLE_CFG: Record<string,{bg:string;text:string;border:string;icon:string;label:string}> = {
  HEAD_EXAMINER: {bg:'rgba(212,160,23,0.18)', text:'#F0C040', border:'rgba(212,160,23,0.4)', icon:'👑', label:'Head Examiner'},
  INVIGILATOR:   {bg:'rgba(30,144,255,0.15)', text:'#93C5FD', border:'rgba(30,144,255,0.4)', icon:'👁️', label:'Invigilator'},
  FLYING_SQUAD:  {bg:'rgba(168,85,247,0.15)', text:'#D8B4FE', border:'rgba(168,85,247,0.4)', icon:'🦅', label:'Flying Squad'},
};
const ec = (t: string) => EXAM_COLORS[t] ?? EXAM_COLORS.FINAL;
const el = (t: string) => EXAM_LABELS[t] ?? t;
const rc = (r: string) => ROLE_CFG[r] ?? ROLE_CFG.INVIGILATOR;

type Tab = 'upcoming' | 'past' | 'all';

export default function TeacherExamDuties() {
  const user = getUser();

  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState<Tab>('upcoming');
  const [selDuty, setSelDuty] = useState<any>(null);   // for detail modal

  useEffect(() => {
    examsApi.getMyDuties()
      .then(r => setData(r.data.data))
      .catch(() => toast.error('Load Failed', 'Could not fetch exam duties'))
      .finally(() => setLoading(false));
  }, []);

  const duties: any[] = tab === 'upcoming' ? (data?.upcoming ?? [])
                       : tab === 'past'    ? (data?.past     ?? [])
                       :                     (data?.all      ?? []);

  const now        = new Date();
  const nextDuty   = data?.nextDuty;
  const nextDate   = nextDuty ? new Date(nextDuty.dateSheetEntry.date) : null;
  const daysToNext = nextDate ? Math.ceil((nextDate.getTime() - now.getTime()) / 86400000) : null;

  return (
    <AppShell title="My Exam Duties" subtitle="Assigned examiner and invigilator responsibilities">

      {loading ? (
        <div className="space-y-4">{[...Array(3)].map((_,i)=><div key={i} className="skeleton h-32 rounded-2xl"/>)}</div>
      ) : (

        <>
          {/* ── Summary banner ── */}
          <div className="rounded-2xl p-6 mb-6 flex items-center gap-6 flex-wrap"
               style={{background:'linear-gradient(135deg,#0F2044,#162952)', border:'1px solid rgba(212,160,23,0.2)'}}>
            <div className="text-5xl flex-shrink-0">📋</div>
            <div className="flex-1">
              <div className="text-xl font-black text-white mb-1">
                {user?.name?.split(' ')[0]}&apos;s Exam Duties
              </div>
              <div className="flex items-center gap-6 flex-wrap">
                {[
                  {val: data?.upcoming?.length ?? 0, label:'Upcoming',     col:'#F0C040'},
                  {val: data?.past?.length ?? 0,     label:'Completed',    col:'#86EFAC'},
                  {val: data?.total ?? 0,            label:'Total Duties', col:'rgba(255,255,255,0.7)'},
                ].map((item, i, arr) => (
                  <React.Fragment key={item.label}>
                    <div className="text-center">
                      <div className="text-2xl font-black" style={{color:item.col}}>{item.val}</div>
                      <div className="text-xs mt-0.5 text-white/40">{item.label}</div>
                    </div>
                    {i < arr.length - 1 && <div style={{width:1,height:28,background:'rgba(255,255,255,0.1)'}}/>}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Next duty countdown */}
            {nextDuty && daysToNext !== null && (
              <div className="flex-shrink-0 px-5 py-4 rounded-2xl text-center"
                   style={{background:'rgba(212,160,23,0.12)',border:'1px solid rgba(212,160,23,0.3)'}}>
                <div className="text-3xl font-black text-yellow-400">
                  {daysToNext === 0 ? 'Today!' : daysToNext === 1 ? 'Tomorrow' : `${daysToNext}d`}
                </div>
                <div className="text-xs text-white/50 mt-1">to next duty</div>
                <div className="text-xs font-bold text-yellow-400 mt-0.5">
                  {nextDuty.dateSheetEntry.subject}
                </div>
              </div>
            )}
          </div>

          {/* ── Today's duties alert ── */}
          {(data?.upcoming ?? []).filter((d:any) => {
            const dd = new Date(d.dateSheetEntry.date);
            return dd.toDateString() === now.toDateString();
          }).length > 0 && (
            <div className="rounded-2xl p-4 mb-5 flex items-start gap-3"
                 style={{background:'rgba(34,197,94,0.08)',border:'1px solid rgba(34,197,94,0.25)'}}>
              <span className="text-xl flex-shrink-0">🔔</span>
              <div>
                <div className="text-sm font-bold text-green-400">You have exam duty TODAY</div>
                <div className="text-xs text-white/50 mt-0.5">
                  {(data?.upcoming ?? [])
                    .filter((d:any) => new Date(d.dateSheetEntry.date).toDateString() === now.toDateString())
                    .map((d:any) => `${d.dateSheetEntry.subject} (${d.role.replace('_',' ')}) — ${d.dateSheetEntry.startTime}`)
                    .join(', ')
                  }
                </div>
              </div>
            </div>
          )}

          {/* ── Tabs ── */}
          <div className="glass rounded-2xl p-1.5 mb-5 flex gap-1">
            {([
              {id:'upcoming' as Tab, icon:'📅', label:`Upcoming (${data?.upcoming?.length ?? 0})`},
              {id:'past'     as Tab, icon:'✅', label:`Completed (${data?.past?.length ?? 0})`},
              {id:'all'      as Tab, icon:'📋', label:`All (${data?.total ?? 0})`},
            ]).map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                      style={{
                        background:tab===t.id?'rgba(212,160,23,0.15)':'transparent',
                        border:`1px solid ${tab===t.id?'rgba(212,160,23,0.3)':'transparent'}`,
                        color:tab===t.id?'#F0C040':'rgba(255,255,255,0.4)',
                      }}>
                {t.icon} <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>

          {/* ── Duties list ── */}
          {duties.length === 0 ? (
            <div className="glass rounded-2xl py-20 text-center">
              <div className="text-5xl mb-4 opacity-30">{tab === 'upcoming' ? '📅' : '✅'}</div>
              <p className="text-base font-bold text-white">
                {tab === 'upcoming' ? 'No upcoming duties' : tab === 'past' ? 'No completed duties' : 'No duties assigned yet'}
              </p>
              <p className="text-sm mt-1 text-white/40">
                {tab === 'upcoming' ? 'The admin will assign you exam duties before each exam' : ''}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {duties.map((duty: any) => {
                const entry    = duty.dateSheetEntry;
                const exam     = entry.exam;
                const roleCfg  = rc(duty.role);
                const examCfg  = ec(exam.examType);
                const examDate = new Date(entry.date);
                const isPast   = examDate < now;
                const isToday  = examDate.toDateString() === now.toDateString();
                const daysLeft = Math.ceil((examDate.getTime() - now.getTime()) / 86400000);

                // Co-examiners (others assigned to same entry)
                const others = (entry.invigilators ?? []).filter(
                  (inv: any) => inv.teacher?.user?.name !== user?.name
                );

                return (
                  <div key={duty.id}
                       className="glass rounded-2xl overflow-hidden hover:-translate-y-0.5 transition-all cursor-pointer"
                       style={{border:`1px solid ${isPast ? 'rgba(255,255,255,0.07)' : roleCfg.border}`, opacity: isPast ? 0.8 : 1}}
                       onClick={() => setSelDuty(duty)}>

                    {/* Card header */}
                    <div className="px-5 py-4 flex items-start justify-between gap-4"
                         style={{background: isPast ? 'rgba(255,255,255,0.02)' : roleCfg.bg, borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
                      <div>
                        {/* Role + exam type badges */}
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="px-3 py-1 rounded-full text-xs font-black"
                                style={{background:roleCfg.bg,color:roleCfg.text,border:`1px solid ${roleCfg.border}`}}>
                            {roleCfg.icon} {roleCfg.label}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                                style={{background:examCfg.bg,color:examCfg.text,border:`1px solid ${examCfg.border}`}}>
                            {el(exam.examType)}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg text-xs font-bold"
                                style={{background:'rgba(30,144,255,0.12)',color:'#93C5FD'}}>
                            Class {exam.className}
                          </span>
                          {isToday && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black animate-pulse"
                                  style={{background:'rgba(34,197,94,0.2)',color:'#86EFAC',border:'1px solid rgba(34,197,94,0.4)'}}>
                              🔔 Today
                            </span>
                          )}
                          {isPast && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                                  style={{background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.3)'}}>
                              ✅ Done
                            </span>
                          )}
                        </div>
                        <div className="text-lg font-black text-white">{entry.subject}</div>
                        <div className="text-xs text-white/40 mt-0.5">{exam.title}</div>
                      </div>

                      {/* Date + countdown */}
                      <div className="text-right flex-shrink-0">
                        <div className="text-base font-black"
                             style={{color: isToday ? '#86EFAC' : isPast ? 'rgba(255,255,255,0.3)' : '#F0C040'}}>
                          {examDate.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                        </div>
                        <div className="text-xs mt-0.5"
                             style={{color: isToday ? '#86EFAC' : isPast ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.45)'}}>
                          {isToday ? 'Today!' : isPast ? `${Math.abs(daysLeft)}d ago` : `in ${daysLeft}d`}
                        </div>
                        <div className="text-xs text-white/40 mt-0.5">
                          {examDate.toLocaleDateString('en-IN',{weekday:'short'})}
                        </div>
                      </div>
                    </div>

                    {/* Card body */}
                    <div className="px-5 py-3 flex items-center gap-6 flex-wrap">
                      <div className="flex items-center gap-2 text-xs text-white/50">
                        <span>⏱</span>
                        <span className="font-semibold text-white">{entry.startTime} – {entry.endTime}</span>
                      </div>
                      {entry.room && (
                        <div className="flex items-center gap-2 text-xs text-white/50">
                          <span>📍</span>
                          <span className="font-semibold text-white">Room {entry.room}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-white/50">
                        <span>✏️</span>
                        <span>Max {entry.maxMarks} marks · Pass {entry.passingMarks}</span>
                      </div>
                      {others.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-white/50">
                          <span>👥</span>
                          <span>{others.map((o:any) => o.teacher?.user?.name).join(', ')}</span>
                        </div>
                      )}
                      <div className="flex-1 text-right text-xs text-white/25">
                        Tap to view details →
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Detail Modal ── */}
      {selDuty && (() => {
        const entry   = selDuty.dateSheetEntry;
        const exam    = entry.exam;
        const roleCfg = rc(selDuty.role);
        const examCfg = ec(exam.examType);
        const allInvs = entry.invigilators ?? [];
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
               style={{background:'rgba(0,0,0,0.78)',backdropFilter:'blur(10px)'}}>
            <div className="w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
                 style={{background:'#0F2044',border:'1px solid rgba(255,255,255,0.1)'}}>

              {/* Header */}
              <div className="px-7 py-6 flex items-start justify-between"
                   style={{background:roleCfg.bg,borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
                <div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="px-3 py-1 rounded-full text-xs font-black"
                          style={{background:roleCfg.bg,color:roleCfg.text,border:`1px solid ${roleCfg.border}`}}>
                      {roleCfg.icon} {roleCfg.label}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                          style={{background:examCfg.bg,color:examCfg.text,border:`1px solid ${examCfg.border}`}}>
                      {el(exam.examType)}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-white">{entry.subject}</h2>
                  <p className="text-xs mt-0.5 text-white/50">{exam.title} · Class {exam.className}</p>
                </div>
                <button onClick={() => setSelDuty(null)}
                        className="w-8 h-8 rounded-xl glass flex items-center justify-center text-white/50 hover:text-white flex-shrink-0">✕</button>
              </div>

              {/* Details */}
              <div className="px-7 py-6 space-y-0">
                {[
                  ['📅 Date',      new Date(entry.date).toLocaleDateString('en-IN',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})],
                  ['⏱ Time',      `${entry.startTime} – ${entry.endTime}`],
                  ['📍 Room',      entry.room || 'Not specified'],
                  ['✏️ Max Marks', `${entry.maxMarks} (Pass: ${entry.passingMarks})`],
                  ['📋 Exam',      exam.title],
                  ['🏫 Class',     exam.className],
                ].map(([k, v]) => (
                  <div key={k as string} className="flex items-center justify-between py-3"
                       style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                    <span className="text-sm text-white/50">{k}</span>
                    <span className="text-sm font-bold text-white text-right">{v}</span>
                  </div>
                ))}

                {exam.instructions && (
                  <div className="py-3" style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                    <div className="text-xs font-bold text-white/40 mb-1">📌 Instructions</div>
                    <p className="text-sm text-white/60 leading-relaxed">{exam.instructions}</p>
                  </div>
                )}

                {/* All examiners for this slot */}
                {allInvs.length > 0 && (
                  <div className="py-3">
                    <div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">👥 All Assigned Examiners</div>
                    <div className="space-y-2">
                      {allInvs.map((inv: any) => {
                        const cfg     = rc(inv.role);
                        const isMe    = inv.teacher?.user?.name === user?.name;
                        return (
                          <div key={inv.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                               style={{background: isMe ? `${cfg.bg}` : 'rgba(255,255,255,0.03)', border:`1px solid ${isMe ? cfg.border : 'rgba(255,255,255,0.06)'}`}}>
                            <span className="text-lg flex-shrink-0">{cfg.icon}</span>
                            <div className="flex-1">
                              <div className="text-sm font-bold" style={{color: isMe ? cfg.text : 'rgba(255,255,255,0.8)'}}>
                                {inv.teacher?.user?.name ?? '—'} {isMe && <span className="text-xs">(You)</span>}
                              </div>
                              <div className="text-xs text-white/35">{cfg.label}</div>
                            </div>
                            {inv.teacher?.employeeCode && (
                              <span className="text-xs font-mono text-white/30">{inv.teacher.employeeCode}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-7 pb-6">
                <button onClick={() => setSelDuty(null)}
                        className="w-full py-3 rounded-xl text-sm font-bold glass hover:bg-white/10">
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </AppShell>
  );
}
