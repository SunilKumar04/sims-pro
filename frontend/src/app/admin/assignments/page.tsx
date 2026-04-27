'use client';
// src/app/admin/assignments/page.tsx
import React, { useCallback, useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { assignmentsApi, classesApi } from '@/lib/api';
import { toast } from '@/components/ui/Toast';
import { confirm } from '@/components/ui/Confirm';
import type { Assignment, AssignmentSubmission } from '@/types/sims';

const SUBJECTS = ['Mathematics','Physics','Chemistry','Biology','English','Hindi',
                  'History','Geography','Computer Science','Physical Education','Economics','Accountancy'] as const;

// Record<string,…> avoids TS7053 index type errors
const STATUS_CFG: Record<string,{bg:string;text:string;label:string}> = {
  PENDING:   {bg:'rgba(245,158,11,0.12)', text:'#FCD34D', label:'Pending'},
  SUBMITTED: {bg:'rgba(30,144,255,0.12)',  text:'#93C5FD', label:'Submitted'},
  LATE:      {bg:'rgba(239,68,68,0.12)',   text:'#FCA5A5', label:'Late'},
  GRADED:    {bg:'rgba(34,197,94,0.12)',   text:'#86EFAC', label:'Graded'},
};

interface AForm { className:string; subject:string; title:string; description:string; dueDate:string; maxMarks:number }
const BLANK: AForm = { className:'', subject:'Mathematics', title:'', description:'', dueDate:'', maxMarks:10 };

export default function AdminAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes,     setClasses]     = useState<{id:string;name:string}[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [filterCls,   setFilterCls]   = useState('');
  const [modal,       setModal]       = useState(false);
  const [detail,      setDetail]      = useState<Assignment|null>(null);
  const [form,        setForm]        = useState<AForm>(BLANK);
  const [saving,      setSaving]      = useState(false);
  const [grading,     setGrading]     = useState<string|null>(null);
  const [gradeVals,   setGradeVals]   = useState<Record<string,string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ar,cr] = await Promise.all([
        assignmentsApi.getAll(filterCls ? {className:filterCls} : {}),
        classesApi.getAll({}),
      ]);
      setAssignments(ar.data.data ?? []);
      setClasses(cr.data.data ?? []);
    } catch { toast.error('Load Failed',''); }
    finally { setLoading(false); }
  }, [filterCls]);

  useEffect(() => { void load(); }, [load]);

  const f = <K extends keyof AForm>(k:K, v:AForm[K]) => setForm(p => ({...p,[k]:v}));

  const save = async () => {
    if (!form.className || !form.title || !form.dueDate) { toast.warning('Required','Class, title and due date are required'); return; }
    setSaving(true);
    try {
      await assignmentsApi.create(form);
      toast.success('Assignment Created', form.title);
      setModal(false); setForm(BLANK); void load();
    } catch (e:unknown) { toast.error('Error',(e as {message?:string})?.message ?? 'Failed'); }
    finally { setSaving(false); }
  };

  const del = async (a: Assignment) => {
    if (!(await confirm({title:'Delete',message:`Delete "${a.title}"?`,danger:true,confirm:'Delete'}))) return;
    try { await assignmentsApi.delete(a.id); toast.success('Deleted',''); void load(); }
    catch { toast.error('Error','Failed to delete'); }
  };

  const openDetail = async (a: Assignment) => {
    try { const r = await assignmentsApi.getOne(a.id); setDetail(r.data.data as Assignment); }
    catch { toast.error('Error','Could not load submissions'); }
  };

  const grade = async (sub: AssignmentSubmission, maxMarks: number) => {
    const raw = gradeVals[sub.id];
    const marks = raw !== undefined ? Number(raw) : NaN;
    if (isNaN(marks) || marks < 0 || marks > maxMarks) { toast.warning('Invalid','Enter valid marks'); return; }
    setGrading(sub.id);
    try {
      await assignmentsApi.grade(sub.id, { marks });
      toast.success('Graded', `${marks}/${maxMarks}`);
      if (detail) { const r = await assignmentsApi.getOne(detail.id); setDetail(r.data.data as Assignment); }
    } catch (e:unknown) { toast.error('Error',(e as {message?:string})?.message ?? 'Failed'); }
    finally { setGrading(null); }
  };

  const daysLeft = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  const urgColor = (d: string) => { const n = daysLeft(d); return n < 0 ? '#FCA5A5' : n <= 2 ? '#FCD34D' : '#86EFAC'; };

  return (
    <AppShell title="Assignments" subtitle="Manage all class assignments and grade submissions">

      {/* Toolbar */}
      <div className="glass rounded-2xl p-4 mb-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-3">
          <select value={filterCls} onChange={e => setFilterCls(e.target.value)} className="sims-input text-sm" style={{width:150}}>
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <button onClick={() => { setForm({...BLANK,className:filterCls}); setModal(true); }}
                className="px-5 py-2.5 rounded-xl text-sm font-black hover:-translate-y-0.5 transition-all"
                style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
          + Create Assignment
        </button>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        {loading
          ? <div className="p-6 space-y-3">{[...Array(5)].map((_,i) => <div key={i} className="skeleton h-14 rounded-xl"/>)}</div>
          : assignments.length === 0
            ? <div className="text-center py-16"><div className="text-4xl mb-3 opacity-40">📝</div><p className="text-base font-bold text-white">No assignments found</p></div>
            : <div className="overflow-x-auto">
                <table className="sims-table">
                  <thead><tr><th>Title</th><th>Class</th><th>Subject</th><th>Teacher</th><th>Due</th><th>Submissions</th><th>Actions</th></tr></thead>
                  <tbody>
                    {assignments.map(a => {
                      const n = daysLeft(a.dueDate);
                      return (
                        <tr key={a.id}>
                          <td className="font-bold text-white max-w-[200px] truncate">{a.title}</td>
                          <td><span className="px-2 py-0.5 rounded-lg text-xs font-bold" style={{background:'rgba(30,144,255,0.12)',color:'#93C5FD'}}>{a.className}</span></td>
                          <td className="text-white/70">{a.subject}</td>
                          <td className="text-white/60 text-sm">{a.teacher?.user?.name ?? '—'}</td>
                          <td>
                            <span className="text-sm font-semibold" style={{color:urgColor(a.dueDate)}}>
                              {new Date(a.dueDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}
                              <span className="text-xs ml-1 text-white/30">({n < 0 ? `${Math.abs(n)}d ago` : n === 0 ? 'today' : `${n}d`})</span>
                            </span>
                          </td>
                          <td><span className="px-2 py-0.5 rounded-full text-xs" style={{background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.5)'}}>{a._count?.submissions ?? 0}</span></td>
                          <td>
                            <div className="flex gap-1.5">
                              <button onClick={() => void openDetail(a)} className="px-3 py-1.5 rounded-xl text-xs font-bold glass hover:bg-white/10">View</button>
                              <button onClick={() => void del(a)} className="px-3 py-1.5 rounded-xl text-xs font-bold" style={{background:'rgba(239,68,68,0.12)',color:'#FCA5A5',border:'1px solid rgba(239,68,68,0.2)'}}>🗑️</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>}
      </div>

      {/* Create Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)'}}>
          <div className="w-full max-w-lg rounded-3xl p-8 shadow-2xl" style={{background:'#0F2044',border:'1px solid rgba(255,255,255,0.1)'}}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-extrabold text-white">+ Create Assignment</h2>
              <button onClick={() => setModal(false)} className="w-8 h-8 rounded-xl glass flex items-center justify-center text-white/50 text-sm">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-white/40">Title *</label>
                <input value={form.title} onChange={e => f('title',e.target.value)} className="sims-input" placeholder="Assignment title"/>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-white/40">Class *</label>
                  <select value={form.className} onChange={e => f('className',e.target.value)} className="sims-input">
                    <option value="">Select class</option>
                    {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-white/40">Subject</label>
                  <select value={form.subject} onChange={e => f('subject',e.target.value)} className="sims-input">
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-white/40">Due Date *</label>
                  <input type="date" value={form.dueDate} onChange={e => f('dueDate',e.target.value)} className="sims-input"/>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-white/40">Max Marks</label>
                  <input type="number" value={form.maxMarks} onChange={e => f('maxMarks',Number(e.target.value))} className="sims-input" min={1}/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-white/40">Instructions</label>
                <textarea value={form.description} onChange={e => f('description',e.target.value)} className="sims-input resize-none" rows={3} placeholder="Instructions for students…"/>
              </div>
            </div>
            <div className="flex gap-3 mt-6 pt-5" style={{borderTop:'1px solid rgba(255,255,255,0.07)'}}>
              <button onClick={() => setModal(false)} className="flex-1 py-3 rounded-xl text-sm font-bold glass hover:bg-white/10">Cancel</button>
              <button onClick={() => void save()} disabled={saving}
                      className="flex-1 py-3 rounded-xl text-sm font-black disabled:opacity-60 hover:-translate-y-0.5 transition-all"
                      style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
                {saving ? '⏳ Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submissions Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)'}}>
          <div className="w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden" style={{background:'#0F2044',border:'1px solid rgba(255,255,255,0.1)'}}>
            <div className="flex items-center justify-between px-8 py-6" style={{borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
              <div>
                <h2 className="text-xl font-extrabold text-white">{detail.title}</h2>
                <p className="text-xs mt-0.5 text-white/40">{detail.subject} · Class {detail.className} · Max {detail.maxMarks} marks</p>
              </div>
              <button onClick={() => setDetail(null)} className="w-8 h-8 rounded-xl glass flex items-center justify-center text-white/50 text-sm">✕</button>
            </div>
            <div className="overflow-auto max-h-[65vh]">
              {(detail.submissions ?? []).length === 0
                ? <div className="text-center py-16 text-white/40">No submissions yet</div>
                : <table className="sims-table">
                    <thead><tr><th>#</th><th>Student</th><th>Roll</th><th>Submitted</th><th>Status</th><th>Marks</th><th>Grade</th></tr></thead>
                    <tbody>
                      {(detail.submissions ?? []).map((sub,i) => {
                        const cfg = STATUS_CFG[sub.status] ?? STATUS_CFG['PENDING'];
                        return (
                          <tr key={sub.id}>
                            <td className="text-white/30">{i+1}</td>
                            <td className="font-bold text-white">{sub.student?.user?.name ?? '—'}</td>
                            <td className="font-mono text-xs text-white/50">{sub.student?.roll ?? '—'}</td>
                            <td className="text-xs text-white/50">{new Date(sub.submittedAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</td>
                            <td><span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{background:cfg.bg,color:cfg.text}}>{cfg.label}</span></td>
                            <td className="font-bold text-white">{sub.marks !== null ? `${sub.marks}/${detail.maxMarks}` : '—'}</td>
                            <td>
                              {sub.status !== 'GRADED'
                                ? <div className="flex items-center gap-1.5">
                                    <input type="number" min={0} max={detail.maxMarks}
                                           value={gradeVals[sub.id] ?? ''}
                                           onChange={e => setGradeVals(p => ({...p,[sub.id]:e.target.value}))}
                                           className="sims-input text-xs text-center" style={{width:60,padding:'5px 8px'}}
                                           placeholder="0"/>
                                    <button onClick={() => void grade(sub, detail.maxMarks)} disabled={grading === sub.id}
                                            className="px-2.5 py-1.5 rounded-xl text-xs font-bold disabled:opacity-40 hover:-translate-y-0.5 transition-all"
                                            style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
                                      {grading === sub.id ? '⏳' : 'Grade'}
                                    </button>
                                  </div>
                                : <span className="text-xs font-bold text-green-400">✅</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>}
            </div>
            <div className="px-8 py-5" style={{borderTop:'1px solid rgba(255,255,255,0.07)'}}>
              <button onClick={() => setDetail(null)} className="px-6 py-2.5 rounded-xl text-sm font-bold glass hover:bg-white/10">Close</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
