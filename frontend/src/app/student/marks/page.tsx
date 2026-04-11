'use client';
// src/app/student/marks/page.tsx — reads from PostgreSQL via marksApi
import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { marksApi } from '@/lib/api';
import { getUser } from '@/lib/auth';

const EXAM_MAP: Record<string, string> = {
  UNIT_TEST:'Unit Test', MID_TERM:'Mid-Term', FINAL:'Final Exam', PRACTICALS:'Practicals',
};

function gradeStyle(g: string): { col: string; bg: string } {
  if (g==='A+'||g==='A') return { col:'#86EFAC', bg:'rgba(34,197,94,0.15)'  };
  if (g==='B+'||g==='B') return { col:'#FCD34D', bg:'rgba(245,158,11,0.15)' };
  if (g==='C')           return { col:'#FDBA74', bg:'rgba(249,115,22,0.15)' };
  return                        { col:'#FCA5A5', bg:'rgba(239,68,68,0.15)'  };
}

export default function StudentMarks() {
  const [grouped,  setGrouped]  = useState<Record<string, any[]>>({});
  const [examType, setExamType] = useState('');
  const [loading,  setLoading]  = useState(true);
  const [empty,    setEmpty]    = useState(false);
  const user = getUser();

  useEffect(() => {
    const sid = user?.studentId || user?.id;
    if (!sid) { setLoading(false); setEmpty(true); return; }

    marksApi.getByStudent(sid)
      .then(res => {
        const g = res.data.data?.grouped || {};
        setGrouped(g);
        const types = Object.keys(g);
        if (types.length > 0) setExamType(types[0]);
        else setEmpty(true);
      })
      .catch(() => setEmpty(true))
      .finally(() => setLoading(false));
  }, []);

  const examTypes   = Object.keys(grouped);
  const currentMarks = examType ? (grouped[examType] || []) : [];
  const total       = currentMarks.reduce((a, m) => a + m.marks, 0);
  const maxTotal    = currentMarks.reduce((a, m) => a + m.maxMarks, 0);
  const pct         = maxTotal > 0 ? Math.round((total/maxTotal)*100) : 0;
  const overallGrade= currentMarks[0]?.grade || '—';
  const gs          = gradeStyle(overallGrade);
  const passAll     = currentMarks.every(m => (m.marks/m.maxMarks)*100 >= 40);

  return (
    <AppShell title="My Marks" subtitle="Exam results from database">

      {loading ? (
        <div className="space-y-4">
          <div className="skeleton h-32 rounded-2xl"/>
          <div className="skeleton h-64 rounded-2xl"/>
        </div>
      ) : empty ? (
        <div className="glass rounded-2xl py-24 text-center">
          <div className="text-5xl mb-4 opacity-40">📝</div>
          <h3 className="text-lg font-bold text-white mb-2">No marks recorded yet</h3>
          <p className="text-sm" style={{color:'rgba(255,255,255,0.4)'}}>
            Marks will appear here after your teacher enters them via the Teacher Portal.
          </p>
        </div>
      ) : (
        <>
          {/* EXAM TYPE SELECTOR */}
          <div className="glass rounded-2xl p-4 mb-6 flex items-center gap-2 flex-wrap">
            {examTypes.map(e => (
              <button key={e} onClick={() => setExamType(e)}
                      className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
                      style={{
                        background: examType===e ? 'rgba(212,160,23,0.2)' : 'rgba(255,255,255,0.04)',
                        border:`1px solid ${examType===e?'rgba(212,160,23,0.4)':'rgba(255,255,255,0.08)'}`,
                        color: examType===e ? '#F0C040' : 'rgba(255,255,255,0.4)',
                      }}>
                {EXAM_MAP[e] || e}
              </button>
            ))}
          </div>

          {/* REPORT CARD HEADER */}
          <div className="glass rounded-2xl p-6 mb-6" style={{border:'1px solid rgba(212,160,23,0.2)'}}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{color:'rgba(255,255,255,0.4)'}}>
                  Report Card — {EXAM_MAP[examType]||examType}
                </div>
                <div className="text-lg font-extrabold text-white">{user?.name || 'Student'}</div>
                <div className="text-sm mt-0.5" style={{color:'rgba(255,255,255,0.45)'}}>
                  Class {user?.className} {user?.roll && `· Roll: ${user.roll}`}
                </div>
              </div>
              <div className="flex gap-8">
                <div className="text-center">
                  <div className="text-4xl font-black" style={{color:gs.col}}>{overallGrade}</div>
                  <div className="text-xs mt-1" style={{color:'rgba(255,255,255,0.4)'}}>Overall Grade</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-black text-white">{pct}%</div>
                  <div className="text-xs mt-1" style={{color:'rgba(255,255,255,0.4)'}}>Percentage</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-black text-white">{total}<span className="text-base text-white/40">/{maxTotal}</span></div>
                  <div className="text-xs mt-1" style={{color:'rgba(255,255,255,0.4)'}}>Total Marks</div>
                </div>
                <div className="flex items-center">
                  <span className="px-4 py-2 rounded-xl text-sm font-black"
                        style={{
                          background: passAll?'rgba(34,197,94,0.15)':'rgba(239,68,68,0.15)',
                          border:`1px solid ${passAll?'rgba(34,197,94,0.3)':'rgba(239,68,68,0.3)'}`,
                          color: passAll?'#86EFAC':'#FCA5A5',
                        }}>
                    {passAll ? '✅ PASS' : '❌ FAIL'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SUBJECT-WISE TABLE */}
          <div className="glass rounded-2xl overflow-hidden mb-6">
            <div className="px-6 py-4" style={{borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
              <h3 className="text-sm font-bold text-white">Subject-wise Results</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="sims-table">
                <thead>
                  <tr><th>Subject</th><th>Marks</th><th>Max</th><th>%</th><th>Grade</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {currentMarks.map(m => {
                    const p = Math.round((m.marks/m.maxMarks)*100);
                    const g = gradeStyle(m.grade||'C');
                    const pass = p>=40;
                    return (
                      <tr key={m.id || m.subject}>
                        <td className="font-bold text-white">{m.subject}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-black text-white">{m.marks}</span>
                            <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.07)'}}>
                              <div className="h-full rounded-full" style={{width:`${p}%`,background:g.col}}/>
                            </div>
                          </div>
                        </td>
                        <td style={{color:'rgba(255,255,255,0.4)'}}>{m.maxMarks}</td>
                        <td><span className="font-bold" style={{color:g.col}}>{p}%</span></td>
                        <td><span className="px-2.5 py-1 rounded-full text-xs font-black" style={{background:g.bg,color:g.col}}>{m.grade}</span></td>
                        <td>
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold"
                                style={{background:pass?'rgba(34,197,94,0.12)':'rgba(239,68,68,0.12)',color:pass?'#86EFAC':'#FCA5A5'}}>
                            {pass?'Pass':'Fail'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ALL EXAMS COMPARISON */}
          {examTypes.length > 1 && (
            <div className="glass rounded-2xl p-6">
              <h3 className="text-sm font-bold text-white mb-4">📊 All Exams Comparison</h3>
              <div className="overflow-x-auto">
                <table className="sims-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      {examTypes.map(e=><th key={e}>{EXAM_MAP[e]||e}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {[...new Set(Object.values(grouped).flat().map((m:any)=>m.subject))].map(sub=>(
                      <tr key={sub as string}>
                        <td className="font-bold text-white">{sub}</td>
                        {examTypes.map(e=>{
                          const m = (grouped[e]||[]).find((x:any)=>x.subject===sub);
                          const g = m ? gradeStyle(m.grade||'C') : null;
                          return (
                            <td key={e}>
                              {m ? <span className="font-bold" style={{color:g?.col||'#fff'}}>{m.marks}/{m.maxMarks}</span>
                                 : <span style={{color:'rgba(255,255,255,0.2)'}}>—</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
