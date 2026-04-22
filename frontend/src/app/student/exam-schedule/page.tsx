'use client';
// src/app/student/exam-schedule/page.tsx
import React, { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { examsApi } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { toast } from '@/components/ui/Toast';
import type { Exam, ExamCategory, DateSheetEntry } from '@/types/sims';

const EXAM_LABELS: Record<ExamCategory,string> = { MST1:'MST 1', MID_TERM:'Mid Term', MST2:'MST 2', FINAL:'Final Exam' };
const EXAM_COLORS: Record<ExamCategory,{bg:string;text:string;border:string}> = {
  MST1:     {bg:'rgba(30,144,255,0.12)',  text:'#93C5FD', border:'rgba(30,144,255,0.3)'},
  MID_TERM: {bg:'rgba(245,158,11,0.12)',  text:'#FCD34D', border:'rgba(245,158,11,0.3)'},
  MST2:     {bg:'rgba(168,85,247,0.12)',  text:'#D8B4FE', border:'rgba(168,85,247,0.3)'},
  FINAL:    {bg:'rgba(239,68,68,0.12)',   text:'#FCA5A5', border:'rgba(239,68,68,0.3)'},
};
const ec  = (t: string) => EXAM_COLORS[t as ExamCategory] ?? EXAM_COLORS.MST1;
const el  = (t: string) => EXAM_LABELS[t as ExamCategory] ?? t;
const dTo = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);

export default function StudentExamSchedule() {
  const user = getUser();
  const cls  = user?.className ?? '';

  const [exams,   setExams]   = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [selType, setSelType] = useState<ExamCategory|''>('');
  const [selExam, setSelExam] = useState<Exam|null>(null);

  useEffect(() => {
    if (!cls) { setLoading(false); return; }
    examsApi.getByClass(cls)
      .then(r => {
        const all   = (r.data.data ?? []) as Exam[];
        const pubs  = all.filter(e => e.isPublished);
        setExams(pubs);
        if (pubs.length > 0) {
          const next = pubs.find(e => dTo(e.startDate) >= 0) ?? pubs[0];
          setSelType(next.examType);
          setSelExam(next);
        }
      })
      .catch(() => toast.error('Load Failed','Could not fetch exam schedule'))
      .finally(() => setLoading(false));
  }, [cls]);

  // Sync selExam when selType changes
  useEffect(() => {
    if (!selType) { setSelExam(null); return; }
    setSelExam(exams.find(e => e.examType === selType) ?? null);
  }, [selType, exams]);

  const entries: DateSheetEntry[] = [...(selExam?.dateSheets ?? [])].sort(
    (a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const startDays = selExam ? dTo(selExam.startDate) : null;
  const cdColor   = startDays === null ? '#fff' : startDays < 0 ? '#86EFAC' : startDays <= 7 ? '#FCA5A5' : startDays <= 14 ? '#FCD34D' : '#93C5FD';

  if (loading) {
    return (
      <AppShell title="Exam Schedule" subtitle="Date sheet &amp; countdown">
        <div className="space-y-4">{[...Array(3)].map((_,i) => <div key={i} className="skeleton h-20 rounded-2xl"/>)}</div>
      </AppShell>
    );
  }

  if (!cls) {
    return (
      <AppShell title="Exam Schedule" subtitle="Date sheet &amp; countdown">
        <div className="glass rounded-2xl py-20 text-center"><div className="text-4xl mb-3 opacity-40">⚠️</div><p className="text-white/50">Class not found in your profile</p></div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Exam Schedule" subtitle={`Class ${cls} — published date sheets`}>

      {exams.length === 0 ? (
        <div className="glass rounded-2xl py-20 text-center">
          <div className="text-5xl mb-4 opacity-40">📋</div>
          <p className="text-lg font-bold text-white mb-2">No Exams Published Yet</p>
          <p className="text-sm text-white/40">Your teacher will publish the date sheet once the schedule is finalised.</p>
        </div>
      ) : (
        <>
          {/* Exam type tabs */}
          <div className="sims-mobile-scroll mb-6 sm:grid sm:grid-cols-2 sm:gap-3 xl:grid-cols-4">
            {exams.map(exam => {
              const clr = ec(exam.examType);
              const n   = dTo(exam.startDate);
              const sel = selType === exam.examType;
              return (
                <button key={exam.id} onClick={() => setSelType(exam.examType)}
                        className="glass min-w-[15rem] rounded-2xl p-4 text-left hover:-translate-y-0.5 transition-all sm:min-w-0"
                        style={{border:sel ? `2px solid ${clr.border}` : '1px solid rgba(255,255,255,0.07)',background:sel ? clr.bg : 'rgba(255,255,255,0.03)'}}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black" style={{background:clr.bg,color:clr.text,border:`1px solid ${clr.border}`}}>{el(exam.examType)}</span>
                    {sel && <span className="text-yellow-400">★</span>}
                  </div>
                  <div className="text-sm font-bold text-white truncate">{exam.title}</div>
                  <div className="text-xs mt-1" style={{color:n < 0 ? '#86EFAC' : n <= 7 ? '#FCA5A5' : 'rgba(255,255,255,0.4)'}}>
                    {n < 0 ? 'Completed' : n === 0 ? 'Starts today!' : `${n} days away`}
                  </div>
                </button>
              );
            })}
          </div>

          {selExam && (
            <>
              {/* Countdown banner */}
              {startDays !== null && (
                <div className="rounded-2xl p-5 mb-5 flex items-center gap-5 flex-wrap"
                     style={{background:startDays<0?'rgba(34,197,94,0.08)':startDays<=7?'rgba(239,68,68,0.08)':'rgba(30,144,255,0.08)',border:`1px solid ${cdColor}30`}}>
                  <div className="text-5xl font-black text-center flex-shrink-0" style={{color:cdColor, minWidth:80}}>
                    {startDays < 0 ? '✅' : startDays}
                    {startDays >= 0 && <div className="text-xs font-normal text-white/40">days</div>}
                  </div>
                  <div className="w-px h-12 bg-white/10"/>
                  <div>
                    <div className="text-base font-black text-white">{selExam.title}</div>
                    <div className="text-sm mt-0.5 text-white/50">
                      {startDays < 0 ? 'This exam has been completed' : startDays === 0 ? 'Exam starts today — all the best!' : `Starts ${new Date(selExam.startDate).toLocaleDateString('en-IN',{weekday:'long',day:'2-digit',month:'long'})}`}
                    </div>
                    {selExam.instructions && <div className="text-xs mt-1.5 text-white/40">📌 {selExam.instructions}</div>}
                  </div>
                </div>
              )}

              {/* Date sheet */}
              {entries.length === 0
                ? <div className="glass rounded-2xl py-12 text-center"><div className="text-4xl mb-3 opacity-40">📝</div><p className="font-bold text-white">Date sheet not added yet</p></div>
                : <div className="glass rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 flex items-center justify-between" style={{borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
                      <div>
                        <h3 className="text-sm font-bold text-white">{selExam.title} — Date Sheet</h3>
                        <p className="text-xs mt-0.5 text-white/40">{entries.length} subjects · Class {cls}</p>
                      </div>
                      <button onClick={() => window.print()} className="px-4 py-2 rounded-xl text-xs font-bold glass hover:bg-white/10">🖨️ Print</button>
                    </div>
                    <div className="space-y-3 p-4 md:hidden">
                      {entries.map((entry,i) => {
                        const dn = dTo(entry.date);
                        const past = dn < 0;
                        const today = dn === 0;
                        return (
                          <div key={entry.id} className="rounded-2xl p-4" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',opacity:past ? 0.6 : 1}}>
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div>
                                <div className="text-sm font-black text-white">{i + 1}. {entry.subject}</div>
                                <div className="text-xs mt-1 text-white/40">{new Date(entry.date).toLocaleDateString('en-IN',{weekday:'short',day:'2-digit',month:'short',year:'numeric'})}</div>
                              </div>
                              <div>
                                {past  && <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{background:'rgba(34,197,94,0.1)',color:'#86EFAC'}}>Done</span>}
                                {today && <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{background:'rgba(239,68,68,0.12)',color:'#FCA5A5'}}>Today!</span>}
                                {!past && !today && <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.4)'}}>{dn}d</span>}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="rounded-xl p-2" style={{background:'rgba(255,255,255,0.04)'}}>
                                <div className="text-white/30">Time</div>
                                <div className="mt-1 text-white/75">{entry.startTime} - {entry.endTime}</div>
                              </div>
                              <div className="rounded-xl p-2" style={{background:'rgba(255,255,255,0.04)'}}>
                                <div className="text-white/30">Room</div>
                                <div className="mt-1 text-white/75">{entry.room || '—'}</div>
                              </div>
                              <div className="rounded-xl p-2" style={{background:'rgba(255,255,255,0.04)'}}>
                                <div className="text-white/30">Max Marks</div>
                                <div className="mt-1 text-white/75">{entry.maxMarks}</div>
                              </div>
                              <div className="rounded-xl p-2" style={{background:'rgba(255,255,255,0.04)'}}>
                                <div className="text-white/30">Pass Marks</div>
                                <div className="mt-1 text-yellow-300">{entry.passingMarks}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="hidden overflow-x-auto md:block">
                      <table className="sims-table">
                        <thead>
                          <tr><th>#</th><th>Subject</th><th>Date</th><th>Day</th><th>Time</th><th>Room</th><th>Max Marks</th><th>Pass Marks</th><th>Status</th></tr>
                        </thead>
                        <tbody>
                          {entries.map((entry,i) => {
                            const dn    = dTo(entry.date);
                            const past  = dn < 0;
                            const today = dn === 0;
                            return (
                              <tr key={entry.id} style={{opacity:past ? 0.6 : 1}}>
                                <td className="text-white/30">{i+1}</td>
                                <td className="font-black text-white">{entry.subject}</td>
                                <td className="font-semibold" style={{color:today?'#FCD34D':past?'rgba(255,255,255,0.45)':'rgba(255,255,255,0.7)'}}>
                                  {new Date(entry.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                                </td>
                                <td className="text-white/50">{new Date(entry.date).toLocaleDateString('en-IN',{weekday:'short'})}</td>
                                <td className="font-mono text-xs text-white/60">{entry.startTime} – {entry.endTime}</td>
                                <td>
                                  {entry.room
                                    ? <span className="px-2 py-0.5 rounded-lg text-xs font-bold font-mono" style={{background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.5)'}}>{entry.room}</span>
                                    : <span className="text-white/25">—</span>}
                                </td>
                                <td className="font-bold text-white">{entry.maxMarks}</td>
                                <td className="font-semibold" style={{color:'#FCD34D'}}>{entry.passingMarks}</td>
                                <td>
                                  {past  && <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{background:'rgba(34,197,94,0.1)',color:'#86EFAC'}}>Done</span>}
                                  {today && <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{background:'rgba(239,68,68,0.12)',color:'#FCA5A5'}}>Today!</span>}
                                  {!past && !today && <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.4)'}}>{dn}d</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>}
            </>
          )}
        </>
      )}
    </AppShell>
  );
}
