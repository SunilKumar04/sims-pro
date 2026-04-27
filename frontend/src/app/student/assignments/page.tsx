'use client';
// src/app/student/assignments/page.tsx
import React, { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { assignmentsApi } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { toast } from '@/components/ui/Toast';
import type { Assignment } from '@/types/sims';

const STATUS_CFG: Record<string,{bg:string;text:string;label:string;icon:string}> = {
  PENDING:   {bg:'rgba(245,158,11,0.12)', text:'#FCD34D', label:'Pending',   icon:'⏳'},
  SUBMITTED: {bg:'rgba(30,144,255,0.12)',  text:'#93C5FD', label:'Submitted', icon:'📤'},
  LATE:      {bg:'rgba(239,68,68,0.12)',   text:'#FCA5A5', label:'Late',      icon:'⚠️'},
  GRADED:    {bg:'rgba(34,197,94,0.12)',   text:'#86EFAC', label:'Graded',    icon:'✅'},
};
const SUB_COLORS: Record<string,string> = {
  Mathematics:'#a5b4fc', Physics:'#93c5fd', Chemistry:'#86efac', Biology:'#6ee7b7',
  English:'#fcd34d', Hindi:'#fca5a5', History:'#d8b4fe', 'Computer Science':'#c7d2fe',
};
const sc = (s: string) => SUB_COLORS[s] ?? 'rgba(255,255,255,0.5)';

type FilterTab = 'all' | 'PENDING' | 'SUBMITTED' | 'LATE' | 'GRADED';

export default function StudentAssignments() {
  const user = getUser();
  const cls  = user?.className ?? '';

  const [assignments,   setAssignments]   = useState<Assignment[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [tab,           setTab]           = useState<FilterTab>('all');
  const [submitModal,   setSubmitModal]   = useState<Assignment|null>(null);
  const [submitRemarks, setSubmitRemarks] = useState('');
  const [submitting,    setSubmitting]    = useState(false);

  const load = () => {
    if (!cls) { setLoading(false); return; }
    setLoading(true);
    assignmentsApi.getStudentAssignments(cls)
      .then(r => setAssignments(r.data.data ?? []))
      .catch(() => toast.error('Load Failed',''))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [cls]);   // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    if (!submitModal) return;
    setSubmitting(true);
    try {
      await assignmentsApi.submit(submitModal.id, { remarks: submitRemarks });
      toast.success('Submitted', submitModal.title);
      setSubmitModal(null); setSubmitRemarks('');
      load();
    } catch (e:unknown) { toast.error('Failed',(e as {message?:string})?.message ?? ''); }
    finally { setSubmitting(false); }
  };

  const daysLeft = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);

  const displayed = tab === 'all' ? assignments : assignments.filter(a => (a.status ?? 'PENDING') === tab);
  const counts = {
    all:       assignments.length,
    PENDING:   assignments.filter(a => (a.status ?? 'PENDING') === 'PENDING').length,
    SUBMITTED: assignments.filter(a => a.status === 'SUBMITTED').length,
    LATE:      assignments.filter(a => a.status === 'LATE').length,
    GRADED:    assignments.filter(a => a.status === 'GRADED').length,
  };

  return (
    <AppShell title="My Assignments" subtitle="Track and submit assignments">

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 xl:grid-cols-4">
        {([['PENDING','⏳','rgba(245,158,11,0.12)','rgba(245,158,11,0.2)','#FCD34D'],
           ['SUBMITTED','📤','rgba(30,144,255,0.12)','rgba(30,144,255,0.2)','#93C5FD'],
           ['LATE','⚠️','rgba(239,68,68,0.12)','rgba(239,68,68,0.2)','#FCA5A5'],
           ['GRADED','✅','rgba(34,197,94,0.12)','rgba(34,197,94,0.2)','#86EFAC']] as const).map(([s,icon,bg,bd,col]) => (
          <div key={s} className="glass rounded-2xl p-5" style={{border:`1px solid ${bd}`}}>
            <div className="text-2xl font-black" style={{color:col}}>{counts[s]}</div>
            <div className="text-xs mt-1 text-white/40">{icon} {STATUS_CFG[s].label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="glass rounded-2xl p-1.5 mb-5 flex gap-1 flex-wrap">
        {([['all','All'],['PENDING','⏳ Pending'],['SUBMITTED','📤 Submitted'],['LATE','⚠️ Late'],['GRADED','✅ Graded']] as [FilterTab,string][]).map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)}
                  className="flex-1 min-w-[8rem] py-2 rounded-xl text-xs font-bold transition-all"
                  style={{background:tab===id?'rgba(212,160,23,0.15)':'transparent',border:`1px solid ${tab===id?'rgba(212,160,23,0.3)':'transparent'}`,color:tab===id?'#F0C040':'rgba(255,255,255,0.4)'}}>
            {label} ({id === 'all' ? counts.all : counts[id as Exclude<FilterTab,'all'>]})
          </button>
        ))}
      </div>

      {/* List */}
      {loading
        ? <div className="space-y-3">{[...Array(4)].map((_,i) => <div key={i} className="skeleton h-28 rounded-2xl"/>)}</div>
        : displayed.length === 0
          ? <div className="glass rounded-2xl py-20 text-center">
              <div className="text-5xl mb-4 opacity-40">🎉</div>
              <p className="font-bold text-white">{tab === 'all' ? 'No assignments yet' : `No ${tab.toLowerCase()} assignments`}</p>
            </div>
          : <div className="space-y-3">
              {displayed.map(a => {
                const status = a.status ?? 'PENDING';
                const cfg    = STATUS_CFG[status] ?? STATUS_CFG['PENDING'];
                const n      = daysLeft(a.dueDate);
                const canSubmit = status === 'PENDING' || status === 'LATE';
                const dugColor  = n < 0 ? '#FCA5A5' : n <= 2 ? '#FCD34D' : 'rgba(255,255,255,0.6)';
                return (
                  <div key={a.id} className="glass rounded-2xl p-5 hover:-translate-y-0.5 transition-all"
                       style={{border:status==='LATE'?'1px solid rgba(239,68,68,0.2)':'1px solid rgba(255,255,255,0.07)'}}>
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                           style={{background:`${sc(a.subject)}15`,border:`1px solid ${sc(a.subject)}30`}}>📝</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col gap-3 mb-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="text-sm font-bold text-white">{a.title}</h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{background:`${sc(a.subject)}15`,color:sc(a.subject)}}>{a.subject}</span>
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{background:cfg.bg,color:cfg.text}}>{cfg.icon} {cfg.label}</span>
                              <span className="text-xs text-white/35">by {a.teacher?.user?.name ?? '—'}</span>
                            </div>
                          </div>
                          {status === 'GRADED' && a.submission?.marks !== null && a.submission?.marks !== undefined && (
                            <div className="flex-shrink-0 text-right">
                              <div className="text-xl font-black text-green-400">{a.submission.marks}<span className="text-sm text-white/30">/{a.maxMarks}</span></div>
                              <div className="text-xs text-white/40">scored</div>
                            </div>
                          )}
                        </div>
                        {a.description && <p className="text-xs text-white/50 mb-3 line-clamp-2">{a.description}</p>}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3 text-xs text-white/35 flex-wrap">
                            <span>Due: <strong style={{color:dugColor}}>
                              {new Date(a.dueDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}
                              {' '}({n < 0 ? `${Math.abs(n)}d ago` : n === 0 ? 'today' : `${n}d left`})
                            </strong></span>
                            <span>·</span>
                            <span>Max: <strong className="text-white">{a.maxMarks}</strong></span>
                          </div>
                          {canSubmit && (
                            <button onClick={() => { setSubmitModal(a); setSubmitRemarks(''); }}
                                    className="px-4 py-2 rounded-xl text-xs font-black flex-shrink-0 hover:-translate-y-0.5 transition-all"
                                    style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
                              📤 Submit
                            </button>
                          )}
                          {a.submission && status !== 'GRADED' && (
                            <span className="text-xs text-white/35">Submitted {new Date(a.submission.submittedAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>}

      {/* Submit Modal */}
      {submitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)'}}>
          <div className="w-full max-w-md rounded-3xl p-5 shadow-2xl sm:p-8" style={{background:'#0F2044',border:'1px solid rgba(255,255,255,0.1)'}}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-extrabold text-white">📤 Submit Assignment</h2>
                <p className="text-xs mt-0.5 text-white/40">{submitModal.title}</p>
              </div>
              <button onClick={() => setSubmitModal(null)} className="w-8 h-8 rounded-xl glass flex items-center justify-center text-white/50 text-sm">✕</button>
            </div>
            <div className="p-4 rounded-xl mb-5" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}>
              <div className="text-sm font-bold text-white mb-1">{submitModal.subject} · Class {submitModal.className}</div>
              <div className="text-xs text-white/40">
                Due: {new Date(submitModal.dueDate).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})} · Max: {submitModal.maxMarks} marks
              </div>
              {submitModal.description && <p className="text-xs mt-2 text-white/50 leading-relaxed">{submitModal.description}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-white/40">Remarks / Notes</label>
              <textarea value={submitRemarks} onChange={e => setSubmitRemarks(e.target.value)}
                        className="sims-input resize-none" rows={4} placeholder="Optional notes about your submission…"/>
            </div>
            {daysLeft(submitModal.dueDate) < 0 && (
              <div className="mt-3 px-4 py-3 rounded-xl text-xs" style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',color:'#FCA5A5'}}>
                ⚠️ This assignment is past due — it will be marked as a late submission.
              </div>
            )}
            <div className="flex gap-3 mt-5 pt-5" style={{borderTop:'1px solid rgba(255,255,255,0.07)'}}>
              <button onClick={() => setSubmitModal(null)} className="flex-1 py-3 rounded-xl text-sm font-bold glass hover:bg-white/10">Cancel</button>
              <button onClick={() => void submit()} disabled={submitting}
                      className="flex-1 py-3 rounded-xl text-sm font-black disabled:opacity-60 hover:-translate-y-0.5 transition-all"
                      style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
                {submitting ? '⏳ Submitting…' : '📤 Submit Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
