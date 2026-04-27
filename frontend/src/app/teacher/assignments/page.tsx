'use client';
// src/app/teacher/assignments/page.tsx
import React, { useCallback, useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { assignmentsApi, timetableApi } from '@/lib/api';
import { toast } from '@/components/ui/Toast';
import { confirm } from '@/components/ui/Confirm';
import { getUser } from '@/lib/auth';
import type { Assignment, AssignmentSubmission, ClassSubjectTeacher } from '@/types/sims';

const SUBJECTS = ['Mathematics','Physics','Chemistry','Biology','English','Hindi',
                  'History','Geography','Computer Science','Physical Education'] as const;

const STATUS_CFG: Record<string,{bg:string;text:string;label:string}> = {
  PENDING:   {bg:'rgba(245,158,11,0.12)', text:'#FCD34D', label:'Pending'},
  SUBMITTED: {bg:'rgba(30,144,255,0.12)',  text:'#93C5FD', label:'Submitted'},
  LATE:      {bg:'rgba(239,68,68,0.12)',   text:'#FCA5A5', label:'Late'},
  GRADED:    {bg:'rgba(34,197,94,0.12)',   text:'#86EFAC', label:'Graded'},
};

interface AForm { className:string; subject:string; title:string; description:string; dueDate:string; maxMarks:number; maxSubmissions:number }
const BLANK: AForm = { className:'', subject:'', title:'', description:'', dueDate:'', maxMarks:10, maxSubmissions:1 };

export default function TeacherAssignments() {
  const user = getUser();
  const tid  = user?.teacherId ?? user?.id ?? '';

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [mappings,    setMappings]    = useState<ClassSubjectTeacher[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [filterCls,   setFilterCls]   = useState('');
  const [modal,       setModal]       = useState(false);
  const [editingId,   setEditingId]   = useState<string|null>(null);
  const [detail,      setDetail]      = useState<Assignment|null>(null);
  const [form,        setForm]        = useState<AForm>(BLANK);
  const [saving,      setSaving]      = useState(false);
  const [grading,     setGrading]     = useState<string|null>(null);
  const [gradeVals,   setGradeVals]   = useState<Record<string,string>>({});

  const myClasses  = Array.from(new Set<string>(mappings.map(m => m.className)));
  const mySubjects = (cls: string) => mappings.filter(m => m.className === cls).map(m => m.subject);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ar, mr] = await Promise.all([
        assignmentsApi.getAll(filterCls ? {className:filterCls} : {}),
        timetableApi.getMappings(),
      ]);
      setAssignments(ar.data.data ?? []);
      const all = (mr.data.data ?? []) as ClassSubjectTeacher[];
      setMappings(all.filter(m => m.teacherId === tid || m.teacher?.user?.name === user?.name));
    } catch { toast.error('Load Failed',''); }
    finally { setLoading(false); }
  }, [filterCls, tid, user?.name]);

  useEffect(() => { void load(); }, [load]);

  const f = <K extends keyof AForm>(k:K, v:AForm[K]) => setForm(p => ({...p,[k]:v}));

  const save = async () => {
    if (!form.className || !form.subject || !form.title || !form.dueDate) {
      toast.warning('Required','Class, subject, title and due date are required'); return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await assignmentsApi.update(editingId, form);
        toast.success('Assignment Updated', form.title);
      } else {
        await assignmentsApi.create(form);
        toast.success('Assignment Created', form.title);
      }
      setModal(false); setForm(BLANK); void load();
      setEditingId(null);
    } catch (e:unknown) { toast.error('Error',(e as {message?:string})?.message ?? 'Failed'); }
    finally { setSaving(false); }
  };

  const editAssignment = (a: Assignment) => {
    setEditingId(a.id);
    setForm({
      className: a.className,
      subject: a.subject,
      title: a.title,
      description: a.description ?? '',
      dueDate: a.dueDate?.slice(0,10) ?? '',
      maxMarks: a.maxMarks ?? 10,
      maxSubmissions: a.maxSubmissions ?? 1,
    });
    setModal(true);
  };

  const del = async (a: Assignment) => {
    if (!(await confirm({title:'Delete',message:`Delete "${a.title}"?`,danger:true,confirm:'Delete'}))) return;
    try { await assignmentsApi.delete(a.id); toast.success('Deleted',''); void load(); }
    catch { toast.error('Error','Failed'); }
  };

  const openDetail = async (a: Assignment) => {
    try {
      const r = await assignmentsApi.getOne(a.id);
      const data = r.data.data as Assignment;
      setDetail(data);
      const initialGrades: Record<string, string> = {};
      (data.submissions ?? []).forEach(sub => {
        if (sub.marks !== null && sub.marks !== undefined) initialGrades[sub.id] = String(sub.marks);
      });
      setGradeVals(initialGrades);
    }
    catch { toast.error('Error','Could not load'); }
  };

  const grade = async (sub: AssignmentSubmission, maxMarks: number) => {
    const raw = gradeVals[sub.id];
    const marks = raw !== undefined ? Number(raw) : NaN;
    if (isNaN(marks) || marks < 0 || marks > maxMarks) { toast.warning('Invalid','Enter valid marks'); return; }
    setGrading(sub.id);
    try {
      await assignmentsApi.grade(sub.id, { marks });
      toast.success(sub.status === 'GRADED' ? 'Grade Updated' : 'Graded', `${marks}/${maxMarks}`);
      if (detail) {
        const r = await assignmentsApi.getOne(detail.id);
        const data = r.data.data as Assignment;
        setDetail(data);
        const refreshedGrades: Record<string, string> = {};
        (data.submissions ?? []).forEach(item => {
          if (item.marks !== null && item.marks !== undefined) refreshedGrades[item.id] = String(item.marks);
        });
        setGradeVals(refreshedGrades);
      }
    } catch (e:unknown) { toast.error('Error',(e as {message?:string})?.message ?? 'Failed'); }
    finally { setGrading(null); }
  };

  const daysLeft = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  const urgColor = (d: string) => { const n = daysLeft(d); return n < 0 ? '#FCA5A5' : n <= 2 ? '#FCD34D' : '#86EFAC'; };

  return (
    <AppShell title="My Assignments" subtitle="Create, track and grade assignments">

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-3">
        {[
          {label:'Total',     val:assignments.length,                                              col:'#F0C040', bg:'rgba(212,160,23,0.12)', bd:'rgba(212,160,23,0.2)'},
          {label:'Overdue',   val:assignments.filter(a => daysLeft(a.dueDate) < 0).length,        col:'#FCA5A5', bg:'rgba(239,68,68,0.12)',   bd:'rgba(239,68,68,0.2)'},
          {label:'Due in 7d', val:assignments.filter(a => { const n = daysLeft(a.dueDate); return n >= 0 && n <= 7; }).length, col:'#FCD34D', bg:'rgba(245,158,11,0.12)', bd:'rgba(245,158,11,0.2)'},
        ].map(c => (
          <div key={c.label} className="glass rounded-2xl p-5" style={{border:`1px solid ${c.bd}`}}>
            <div className="text-2xl font-black" style={{color:c.col}}>{c.val}</div>
            <div className="text-xs mt-1 text-white/40">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="glass rounded-2xl p-4 mb-5 flex flex-wrap items-center justify-between gap-4">
        <select value={filterCls} onChange={e => setFilterCls(e.target.value)} className="sims-input text-sm" style={{width:150}}>
          <option value="">All Classes</option>
          {myClasses.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={() => { setEditingId(null); setForm({...BLANK,className:filterCls,subject:mySubjects(filterCls)[0]??''}); setModal(true); }}
                className="px-5 py-2.5 rounded-xl text-sm font-black hover:-translate-y-0.5 transition-all"
                style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
          + Assign
        </button>
      </div>

      {/* List */}
      {loading
        ? <div className="space-y-3">{[...Array(4)].map((_,i) => <div key={i} className="skeleton h-24 rounded-2xl"/>)}</div>
        : assignments.length === 0
          ? <div className="glass rounded-2xl py-20 text-center">
              <div className="text-5xl mb-4 opacity-40">📝</div>
              <p className="text-base font-bold text-white mb-2">No assignments yet</p>
              <button onClick={() => { setEditingId(null); setForm(BLANK); setModal(true); }} className="px-6 py-2.5 rounded-xl text-sm font-bold"
                      style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>+ Create One</button>
            </div>
          : <div className="space-y-3">
              {assignments.map(a => {
                const n = daysLeft(a.dueDate);
                return (
                  <div key={a.id} className="glass rounded-2xl p-5 hover:-translate-y-0.5 transition-all"
                       style={{border:n < 0 ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(255,255,255,0.07)'}}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-bold text-white">{a.title}</span>
                          <span className="px-2 py-0.5 rounded-lg text-xs font-bold" style={{background:'rgba(30,144,255,0.12)',color:'#93C5FD'}}>{a.className}</span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{background:'rgba(168,85,247,0.12)',color:'#D8B4FE'}}>{a.subject}</span>
                        </div>
                        {a.description && <p className="text-xs text-white/50 mb-2 line-clamp-1">{a.description}</p>}
                        <div className="flex items-center gap-3 text-xs text-white/35">
                          <span>Due: <strong style={{color:urgColor(a.dueDate)}}>
                            {new Date(a.dueDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}
                            {' '}({n < 0 ? `${Math.abs(n)}d ago` : n === 0 ? 'today' : `${n}d left`})
                          </strong></span>
                          <span>·</span>
                          <span>Max: <strong className="text-white">{a.maxMarks}</strong></span>
                          <span>·</span>
                          <span>Attempts: <strong className="text-white">{a.maxSubmissions ?? 1}</strong></span>
                          <span>·</span>
                          <span>{a._count?.submissions ?? 0} submission{(a._count?.submissions ?? 0) !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => editAssignment(a)} className="px-3 py-1.5 rounded-xl text-xs font-bold"
                                style={{background:'rgba(30,144,255,0.12)',color:'#93C5FD',border:'1px solid rgba(30,144,255,0.2)'}}>✏️ Edit</button>
                        <button onClick={() => void openDetail(a)} className="px-3 py-1.5 rounded-xl text-xs font-bold glass hover:bg-white/10">📊 Submissions</button>
                        <button onClick={() => void del(a)} className="px-3 py-1.5 rounded-xl text-xs font-bold" style={{background:'rgba(239,68,68,0.12)',color:'#FCA5A5',border:'1px solid rgba(239,68,68,0.2)'}}>🗑️</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>}

      {/* Create Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)'}}>
          <div className="w-full max-w-lg rounded-3xl p-8 shadow-2xl" style={{background:'#0F2044',border:'1px solid rgba(255,255,255,0.1)'}}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-extrabold text-white">{editingId ? '✏️ Edit Assignment' : '+ Create Assignment'}</h2>
              <button onClick={() => { setModal(false); setEditingId(null); }} className="w-8 h-8 rounded-xl glass flex items-center justify-center text-white/50 text-sm">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-white/40">Title *</label>
                <input value={form.title} onChange={e => f('title',e.target.value)} className="sims-input" placeholder="e.g. Chapter 5 Exercise"/>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-white/40">Class *</label>
                  <select value={form.className} onChange={e => { f('className',e.target.value); f('subject', mySubjects(e.target.value)[0] ?? ''); }} className="sims-input">
                    <option value="">Select class</option>
                    {myClasses.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-white/40">Subject *</label>
                  <select value={form.subject} onChange={e => f('subject',e.target.value)} className="sims-input">
                    <option value="">Select subject</option>
                    {(form.className ? mySubjects(form.className) : [...SUBJECTS]).map(s => <option key={s} value={s}>{s}</option>)}
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
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-white/40">Allowed Submissions (Teacher Only)</label>
                <input type="number" value={form.maxSubmissions} onChange={e => f('maxSubmissions',Math.max(1, Number(e.target.value) || 1))} className="sims-input" min={1}/>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-white/40">Instructions</label>
                <textarea value={form.description} onChange={e => f('description',e.target.value)} className="sims-input resize-none" rows={3} placeholder="Instructions for students…"/>
              </div>
            </div>
            <div className="flex gap-3 mt-6 pt-5" style={{borderTop:'1px solid rgba(255,255,255,0.07)'}}>
              <button onClick={() => { setModal(false); setEditingId(null); }} className="flex-1 py-3 rounded-xl text-sm font-bold glass hover:bg-white/10">Cancel</button>
              <button onClick={() => void save()} disabled={saving}
                      className="flex-1 py-3 rounded-xl text-sm font-black disabled:opacity-60 hover:-translate-y-0.5 transition-all"
                      style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
                {saving ? '⏳ Saving…' : editingId ? '💾 Update' : '📝 Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submissions Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)'}}>
          <div className="w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden" style={{background:'#0F2044',border:'1px solid rgba(255,255,255,0.1)'}}>
            <div className="flex items-center justify-between px-8 py-5" style={{borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
              <div>
                <h2 className="text-lg font-extrabold text-white">{detail.title}</h2>
                <p className="text-xs text-white/40 mt-0.5">{detail.subject} · Class {detail.className} · Max {detail.maxMarks} marks</p>
              </div>
              <button onClick={() => setDetail(null)} className="w-8 h-8 rounded-xl glass flex items-center justify-center text-white/50 text-sm">✕</button>
            </div>
            <div className="overflow-auto max-h-[60vh]">
              {(detail.submissions ?? []).length === 0
                ? <div className="text-center py-14 text-white/40">No submissions yet</div>
                : <table className="sims-table">
                    <thead><tr><th>#</th><th>Student</th><th>Roll</th><th>Submitted</th><th>Status</th><th>Marks</th><th>Try</th><th>Action</th></tr></thead>
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
                            <td className="text-xs text-white/45">{sub.attemptCount ?? 1}/{detail.maxSubmissions ?? 1}</td>
                            <td>
                              <div className="flex items-center gap-1.5">
                                <input type="number" min={0} max={detail.maxMarks}
                                       value={gradeVals[sub.id] ?? ''}
                                       onChange={e => setGradeVals(p => ({...p,[sub.id]:e.target.value}))}
                                       className="sims-input text-xs text-center" style={{width:60,padding:'5px 8px'}}
                                       placeholder="—"/>
                                <button onClick={() => void grade(sub, detail.maxMarks)} disabled={grading === sub.id}
                                        className="px-2.5 py-1.5 rounded-xl text-xs font-bold disabled:opacity-40 hover:-translate-y-0.5 transition-all"
                                        style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
                                  {grading === sub.id ? '⏳' : sub.status === 'GRADED' ? 'Update' : 'Grade'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>}
            </div>
            <div className="px-8 py-4" style={{borderTop:'1px solid rgba(255,255,255,0.07)'}}>
              <button onClick={() => setDetail(null)} className="px-6 py-2.5 rounded-xl text-sm font-bold glass hover:bg-white/10">Close</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
