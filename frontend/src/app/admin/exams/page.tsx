'use client';
// src/app/admin/exams/page.tsx
import React, { useCallback, useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { examsApi, classesApi, teachersApi } from '@/lib/api';
import { toast } from '@/components/ui/Toast';
import { confirm } from '@/components/ui/Confirm';
import type { Exam, ExamCategory, DateSheetEntry } from '@/types/sims';

// ── constants ──────────────────────────────────────────────
const EXAM_TYPES: ExamCategory[] = ['MST1','MID_TERM','MST2','FINAL'];
const EXAM_LABELS: Record<ExamCategory,string> = { MST1:'MST 1', MID_TERM:'Mid Term', MST2:'MST 2', FINAL:'Final Exam' };
const EXAM_COLORS: Record<ExamCategory,{bg:string;text:string;border:string}> = {
  MST1:     {bg:'rgba(30,144,255,0.12)',  text:'#93C5FD', border:'rgba(30,144,255,0.3)'},
  MID_TERM: {bg:'rgba(245,158,11,0.12)',  text:'#FCD34D', border:'rgba(245,158,11,0.3)'},
  MST2:     {bg:'rgba(168,85,247,0.12)',  text:'#D8B4FE', border:'rgba(168,85,247,0.3)'},
  FINAL:    {bg:'rgba(239,68,68,0.12)',   text:'#FCA5A5', border:'rgba(239,68,68,0.3)'},
};
const ROLE_CFG: Record<string,{label:string;bg:string;text:string;border:string;icon:string}> = {
  HEAD_EXAMINER: {label:'Head Examiner',bg:'rgba(212,160,23,0.15)', text:'#F0C040', border:'rgba(212,160,23,0.35)',icon:'👑'},
  INVIGILATOR:   {label:'Invigilator',  bg:'rgba(30,144,255,0.15)', text:'#93C5FD', border:'rgba(30,144,255,0.35)',icon:'👁️'},
  FLYING_SQUAD:  {label:'Flying Squad', bg:'rgba(168,85,247,0.15)', text:'#D8B4FE', border:'rgba(168,85,247,0.35)',icon:'🦅'},
};
const INV_ROLES = ['HEAD_EXAMINER','INVIGILATOR','FLYING_SQUAD'] as const;
const SUBJECTS = ['Mathematics','Physics','Chemistry','Biology','English','Hindi',
                  'History','Geography','Computer Science','Physical Education','Economics','Accountancy'] as const;

const ec = (t: string) => EXAM_COLORS[t as ExamCategory] ?? EXAM_COLORS.MST1;
const el = (t: string) => EXAM_LABELS[t as ExamCategory] ?? t;
const rc = (r: string) => ROLE_CFG[r] ?? ROLE_CFG.INVIGILATOR;

interface ExamForm  { className:string; examType:ExamCategory; title:string; startDate:string; endDate:string; instructions:string }
interface EntryForm { subject:string; date:string; startTime:string; endTime:string; room:string; maxMarks:number; passingMarks:number }

const BLANK_EXAM:  ExamForm  = { className:'', examType:'MST1', title:'', startDate:'', endDate:'', instructions:'' };
const BLANK_ENTRY: EntryForm = { subject:'', date:'', startTime:'10:00', endTime:'13:00', room:'', maxMarks:100, passingMarks:33 };

type MainTab = 'schedule' | 'examday';

export default function AdminExams() {
  const [mainTab,    setMainTab]    = useState<MainTab>('schedule');

  // ── Schedule tab state ──────────────────────────────────
  const [exams,      setExams]      = useState<Exam[]>([]);
  const [classes,    setClasses]    = useState<{id:string;name:string}[]>([]);
  const [teachers,   setTeachers]   = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [filterCls,  setFilterCls]  = useState('');
  const [selExam,    setSelExam]    = useState<Exam|null>(null);
  const [examModal,  setExamModal]  = useState(false);
  const [entryModal, setEntryModal] = useState(false);
  const [examForm,   setExamForm]   = useState<ExamForm>(BLANK_EXAM);
  const [entryForm,  setEntryForm]  = useState<EntryForm>(BLANK_ENTRY);
  const [saving,     setSaving]     = useState(false);

  // ── Exam Day tab state ──────────────────────────────────
  const [examDate,   setExamDate]   = useState(new Date().toISOString().slice(0,10));
  const [dayData,    setDayData]    = useState<any>(null);
  const [dayLoading, setDayLoading] = useState(false);
  const [invForms,   setInvForms]   = useState<Record<string,{teacherId:string;role:string}>>({});
  const [assigning,  setAssigning]  = useState<string|null>(null);

  // ── Load base data ──────────────────────────────────────
  const loadBase = useCallback(async () => {
    setLoading(true);
    try {
      const [cr, tr] = await Promise.all([classesApi.getAll({}), teachersApi.getAll({})]);
      setClasses(cr.data.data ?? []);
      setTeachers(tr.data.data ?? []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  const loadExams = useCallback(async () => {
    try {
      const er = await examsApi.getAll(filterCls ? { className:filterCls } : {});
      setExams(er.data.data ?? []);
    } catch { toast.error('Load Failed','Could not fetch exams'); }
  }, [filterCls]);

  useEffect(() => { void loadBase(); }, [loadBase]);
  useEffect(() => { void loadExams(); }, [loadExams]);

  // ── Load exam-day data ──────────────────────────────────
  const loadDay = useCallback(async () => {
    setDayLoading(true);
    try {
      const r = await examsApi.getExamsByDate(examDate);
      setDayData(r.data.data);
      const forms: Record<string,{teacherId:string;role:string}> = {};
      (r.data.data?.entries ?? []).forEach((e: any) => { forms[e.id] = { teacherId:'', role:'INVIGILATOR' }; });
      setInvForms(forms);
    } catch { toast.error('Load Failed','Could not load exam day data'); }
    finally { setDayLoading(false); }
  }, [examDate]);

  useEffect(() => { if (mainTab === 'examday') void loadDay(); }, [mainTab, loadDay]);

  // ── Schedule handlers ───────────────────────────────────
  const ef = <K extends keyof ExamForm>(k:K, v:ExamForm[K]) => setExamForm(p => ({...p,[k]:v}));
  const nf = <K extends keyof EntryForm>(k:K, v:EntryForm[K]) => setEntryForm(p => ({...p,[k]:v}));

  const saveExam = async () => {
    if (!examForm.className || !examForm.title || !examForm.startDate || !examForm.endDate) {
      toast.warning('Required','Class, title and dates are required'); return;
    }
    setSaving(true);
    try {
      await examsApi.create(examForm);
      toast.success('Exam Created', `${el(examForm.examType)} — ${examForm.className}`);
      setExamModal(false); setExamForm(BLANK_EXAM); void loadExams();
    } catch (e: unknown) { toast.error('Error', (e as {message?:string})?.message ?? 'Failed'); }
    finally { setSaving(false); }
  };

  const saveEntry = async () => {
    if (!entryForm.subject || !entryForm.date) { toast.warning('Required','Subject and date required'); return; }
    if (!selExam) return;
    setSaving(true);
    try {
      await examsApi.addEntry(selExam.id, entryForm);
      toast.success('Entry Added', entryForm.subject);
      setEntryForm(BLANK_ENTRY); void loadExams();
    } catch (e: unknown) { toast.error('Error', (e as {message?:string})?.message ?? 'Failed'); }
    finally { setSaving(false); }
  };

  const delEntry = async (entry: DateSheetEntry) => {
    if (!(await confirm({ title:'Remove Entry', message:`Remove ${entry.subject}?`, danger:true, confirm:'Remove' }))) return;
    try { await examsApi.deleteEntry(entry.id); toast.success('Removed',''); void loadExams(); }
    catch { toast.error('Error','Could not remove'); }
  };

  const delExam = async (exam: Exam) => {
    if (!(await confirm({ title:'Delete Exam', message:`Delete "${exam.title}"?`, danger:true, confirm:'Delete' }))) return;
    try { await examsApi.delete(exam.id); toast.success('Deleted',''); void loadExams(); }
    catch { toast.error('Error','Could not delete'); }
  };

  const togglePublish = async (exam: Exam) => {
    try {
      await examsApi.publish(exam.id, !exam.isPublished);
      toast.success(exam.isPublished ? 'Unpublished' : 'Published', exam.title);
      void loadExams();
    } catch { toast.error('Error','Could not update'); }
  };

  // ── Exam day handlers ───────────────────────────────────
  const assignInvigilator = async (entryId: string) => {
    const f = invForms[entryId];
    if (!f?.teacherId) { toast.warning('Select Teacher','Please select a teacher first'); return; }
    setAssigning(entryId);
    try {
      await examsApi.assignInvigilator(entryId, { teacherId: f.teacherId, role: f.role });
      toast.success('Assigned', `${rc(f.role).label} assigned`);
      void loadDay();
    } catch (e: any) { toast.error('Error', e?.response?.data?.message ?? 'Could not assign'); }
    finally { setAssigning(null); }
  };

  const removeInvigilator = async (invId: string, name: string) => {
    if (!(await confirm({ title:'Remove', message:`Remove ${name} from this exam?`, danger:true, confirm:'Remove' }))) return;
    try { await examsApi.removeInvigilator(invId); toast.success('Removed',''); void loadDay(); }
    catch { toast.error('Error','Could not remove'); }
  };

  const tName = (t: any) => t?.user?.name ?? t?.name ?? '—';
  const stats = { total:exams.length, published:exams.filter(e=>e.isPublished).length, draft:exams.filter(e=>!e.isPublished).length };

  return (
    <AppShell title="Exams & Date Sheet" subtitle="Schedule exams, assign examiners and publish date sheets">

      {/* ── MAIN TABS ── */}
      <div className="glass rounded-2xl p-1.5 mb-5 flex gap-1">
        {([
          {id:'schedule' as MainTab, icon:'📋', label:'Schedule & Date Sheet'},
          {id:'examday'  as MainTab, icon:'📅', label:'Exam Day — Assign Examiners'},
        ]).map(t => (
          <button key={t.id} onClick={() => setMainTab(t.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: mainTab===t.id ? 'rgba(212,160,23,0.18)' : 'transparent',
                    border:     `1px solid ${mainTab===t.id ? 'rgba(212,160,23,0.35)' : 'transparent'}`,
                    color:      mainTab===t.id ? '#F0C040' : 'rgba(255,255,255,0.4)',
                  }}>
            {t.icon} <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ══════════════ SCHEDULE TAB ══════════════ */}
      {mainTab === 'schedule' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              {label:'Total Exams',  val:stats.total,     col:'#F0C040', bg:'rgba(212,160,23,0.12)', bd:'rgba(212,160,23,0.2)'},
              {label:'Published',    val:stats.published, col:'#86EFAC', bg:'rgba(34,197,94,0.12)',  bd:'rgba(34,197,94,0.2)'},
              {label:'Drafts',       val:stats.draft,     col:'#FCD34D', bg:'rgba(245,158,11,0.12)', bd:'rgba(245,158,11,0.2)'},
            ].map(c => (
              <div key={c.label} className="glass rounded-2xl p-5" style={{border:`1px solid ${c.bd}`}}>
                <div className="text-2xl font-black" style={{color:c.col}}>{c.val}</div>
                <div className="text-xs mt-1 text-white/40">{c.label}</div>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div className="glass rounded-2xl p-4 mb-5 flex items-center justify-between gap-4 flex-wrap">
            <select value={filterCls} onChange={e => setFilterCls(e.target.value)} className="sims-input text-sm" style={{width:150}}>
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <button onClick={() => { setExamForm({...BLANK_EXAM, className:filterCls}); setExamModal(true); }}
                    className="px-5 py-2.5 rounded-xl text-sm font-black hover:-translate-y-0.5 transition-all"
                    style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
              + Create Exam
            </button>
          </div>

          {/* Exam cards */}
          {loading
            ? <div className="grid grid-cols-2 gap-5">{[...Array(4)].map((_,i) => <div key={i} className="skeleton h-56 rounded-2xl"/>)}</div>
            : exams.length === 0
              ? <div className="glass rounded-2xl py-20 text-center">
                  <div className="text-5xl mb-4 opacity-40">📋</div>
                  <p className="text-base font-bold text-white mb-2">No exams found</p>
                  <p className="text-sm text-white/40 mb-6">Create your first exam to get started</p>
                  <button onClick={() => setExamModal(true)} className="px-6 py-2.5 rounded-xl text-sm font-bold"
                          style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>+ Create Exam</button>
                </div>
              : <div className="grid grid-cols-2 gap-5">
                  {exams.map(exam => {
                    const clr     = ec(exam.examType);
                    const entries = exam.dateSheets ?? [];
                    return (
                      <div key={exam.id} className="glass rounded-2xl overflow-hidden" style={{border:`1px solid ${clr.border}`}}>
                        {/* Header */}
                        <div className="px-5 py-4 flex items-start justify-between" style={{background:clr.bg}}>
                          <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-black" style={{background:clr.bg,color:clr.text,border:`1px solid ${clr.border}`}}>{el(exam.examType)}</span>
                              <span className="px-2 py-0.5 rounded-lg text-xs font-bold" style={{background:'rgba(30,144,255,0.15)',color:'#93C5FD'}}>Class {exam.className}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${exam.isPublished ? 'text-green-400 bg-green-400/10' : 'text-white/40 bg-white/5'}`}>
                                {exam.isPublished ? '✅ Published' : '📝 Draft'}
                              </span>
                            </div>
                            <div className="text-base font-black text-white">{exam.title}</div>
                            <div className="text-xs mt-0.5 text-white/50">
                              {new Date(exam.startDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})} – {new Date(exam.endDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                              {' · '}{entries.length} subject{entries.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                          <div className="flex gap-1.5 flex-shrink-0">
                            <button onClick={() => void togglePublish(exam)}
                                    className="px-3 py-1.5 rounded-xl text-xs font-bold hover:-translate-y-0.5 transition-all"
                                    style={exam.isPublished
                                      ? {background:'rgba(245,158,11,0.12)',color:'#FCD34D',border:'1px solid rgba(245,158,11,0.3)'}
                                      : {background:'rgba(34,197,94,0.12)',color:'#86EFAC',border:'1px solid rgba(34,197,94,0.3)'}}>
                              {exam.isPublished ? 'Unpublish' : 'Publish'}
                            </button>
                            <button onClick={() => void delExam(exam)}
                                    className="px-3 py-1.5 rounded-xl text-xs font-bold"
                                    style={{background:'rgba(239,68,68,0.12)',color:'#FCA5A5',border:'1px solid rgba(239,68,68,0.2)'}}>🗑️</button>
                          </div>
                        </div>
                        {/* Date sheet entries */}
                        <div className="p-4">
                          {entries.length > 0 && (
                            <div className="space-y-1.5 mb-3">
                              {entries.map(entry => (
                                <div key={entry.id} className="flex items-center gap-3 px-3 py-2 rounded-xl group"
                                     style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
                                  <div className="flex-1 min-w-0">
                                    <span className="text-sm font-bold text-white">{entry.subject}</span>
                                    <span className="text-xs text-white/40 ml-2">
                                      {new Date(entry.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}
                                      {' · '}{entry.startTime}–{entry.endTime}
                                      {entry.room ? ` · ${entry.room}` : ''}
                                      {' · '}{entry.maxMarks} marks
                                    </span>
                                  </div>
                                  <button onClick={() => void delEntry(entry)}
                                          className="text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                          style={{background:'rgba(239,68,68,0.12)',color:'#FCA5A5'}}>✕</button>
                                </div>
                              ))}
                            </div>
                          )}
                          <button onClick={() => { setSelExam(exam); setEntryForm(BLANK_ENTRY); setEntryModal(true); }}
                                  className="w-full py-2 rounded-xl text-xs font-bold text-center border-dashed border transition-all hover:border-yellow-400/50 hover:text-yellow-400"
                                  style={{borderColor:'rgba(255,255,255,0.12)',color:'rgba(255,255,255,0.35)'}}>
                            + Add Subject to Date Sheet
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>}
        </>
      )}

      {/* ══════════════ EXAM DAY TAB ══════════════ */}
      {mainTab === 'examday' && (
        <>
          {/* Date picker */}
          <div className="glass rounded-2xl p-5 mb-5">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-white/40">Exam Date</label>
                <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} className="sims-input"/>
              </div>
              <div className="flex-1"/>
              <p className="text-xs text-white/35 max-w-sm leading-relaxed">
                Select an exam date to view all subjects being held that day. Assign Head Examiners, Invigilators and Flying Squad members to each room.
              </p>
            </div>
          </div>

          {dayLoading ? (
            <div className="space-y-4">{[...Array(3)].map((_,i) => <div key={i} className="skeleton h-40 rounded-2xl"/>)}</div>
          ) : !dayData || dayData.entries.length === 0 ? (
            <div className="glass rounded-2xl py-20 text-center">
              <div className="text-5xl mb-4 opacity-30">📅</div>
              <p className="text-base font-bold text-white mb-1">No exams scheduled on this date</p>
              <p className="text-sm text-white/40">
                {new Date(examDate).toLocaleDateString('en-IN',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}
              </p>
            </div>
          ) : (
            <>
              {/* Day summary stats */}
              <div className="grid grid-cols-3 gap-4 mb-5">
                {[
                  {label:'Subjects Today',    val:dayData.total,                       col:'#F0C040', bg:'rgba(212,160,23,0.12)', bd:'rgba(212,160,23,0.2)'},
                  {label:'Examiners Assigned',val:dayData.covered,                     col:'#86EFAC', bg:'rgba(34,197,94,0.12)',  bd:'rgba(34,197,94,0.2)'},
                  {label:'Pending Assignment',val:dayData.total - dayData.covered,     col:dayData.total-dayData.covered>0?'#FCA5A5':'#86EFAC', bg:'rgba(239,68,68,0.12)', bd:'rgba(239,68,68,0.2)'},
                ].map(c => (
                  <div key={c.label} className="glass rounded-2xl p-5" style={{border:`1px solid ${c.bd}`}}>
                    <div className="text-2xl font-black" style={{color:c.col}}>{c.val}</div>
                    <div className="text-xs mt-1 text-white/40">{c.label}</div>
                  </div>
                ))}
              </div>

              {/* Entry cards */}
              <div className="space-y-4">
                {dayData.entries.map((entry: any) => {
                  const invs    = entry.invigilators ?? [];
                  const headSet = invs.some((i:any) => i.role === 'HEAD_EXAMINER');
                  const f       = invForms[entry.id] ?? { teacherId:'', role:'INVIGILATOR' };
                  return (
                    <div key={entry.id} className="glass rounded-2xl overflow-hidden"
                         style={{border: invs.length > 0 ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(245,158,11,0.2)'}}>

                      {/* Entry header */}
                      <div className="px-6 py-4 flex items-start justify-between gap-4 flex-wrap"
                           style={{background: invs.length>0 ? 'rgba(34,197,94,0.06)' : 'rgba(245,158,11,0.06)', borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
                        <div>
                          <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                            <span className="text-lg font-black text-white">{entry.subject}</span>
                            <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold"
                                  style={{background:ec(entry.exam.examType).bg, color:ec(entry.exam.examType).text}}>
                              {el(entry.exam.examType)}
                            </span>
                            <span className="px-2 py-0.5 rounded-lg text-xs font-bold"
                                  style={{background:'rgba(30,144,255,0.12)', color:'#93C5FD'}}>
                              Class {entry.exam.className}
                            </span>
                            {!headSet && (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold animate-pulse"
                                    style={{background:'rgba(245,158,11,0.15)',color:'#FCD34D',border:'1px solid rgba(245,158,11,0.3)'}}>
                                ⚠️ No Head Examiner
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-white/40">
                            <span>⏱ {entry.startTime} – {entry.endTime}</span>
                            {entry.room && <span>📍 Room {entry.room}</span>}
                            <span>✏️ Max {entry.maxMarks} marks</span>
                            <span>✅ Pass {entry.passingMarks}</span>
                          </div>
                        </div>
                        <span className="text-sm font-bold flex-shrink-0"
                              style={{color: invs.length>0 ? '#86EFAC' : '#FCA5A5'}}>
                          {invs.length>0 ? `✅ ${invs.length} assigned` : '❌ None assigned'}
                        </span>
                      </div>

                      <div className="p-5">
                        {/* Assigned examiners */}
                        {invs.length > 0 && (
                          <div className="mb-4">
                            <div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Assigned Examiners</div>
                            <div className="flex flex-wrap gap-2">
                              {invs.map((inv: any) => {
                                const cfg = rc(inv.role);
                                return (
                                  <div key={inv.id} className="flex items-center gap-2 px-3 py-2 rounded-xl group"
                                       style={{background:cfg.bg, border:`1px solid ${cfg.border}`}}>
                                    <span className="text-base">{cfg.icon}</span>
                                    <div>
                                      <div className="text-sm font-bold" style={{color:cfg.text}}>{inv.teacher?.user?.name ?? '—'}</div>
                                      <div className="text-[10px] text-white/35">{cfg.label}{inv.teacher?.employeeCode ? ` · ${inv.teacher.employeeCode}` : ''}</div>
                                    </div>
                                    <button
                                      onClick={() => void removeInvigilator(inv.id, inv.teacher?.user?.name ?? '—')}
                                      className="ml-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                                      style={{background:'rgba(239,68,68,0.3)',color:'#FCA5A5'}}>✕</button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Assign form */}
                        <div className="flex items-end gap-3 flex-wrap"
                             style={{paddingTop:invs.length>0?'14px':'0', borderTop:invs.length>0?'1px solid rgba(255,255,255,0.06)':'none'}}>
                          <div>
                            <label className="block text-[10px] font-bold mb-1.5 uppercase tracking-wider text-white/35">Role</label>
                            <select
                              value={f.role}
                              onChange={e => setInvForms(p => ({...p,[entry.id]:{...p[entry.id],role:e.target.value}}))}
                              className="sims-input text-xs" style={{width:160}}>
                              {INV_ROLES.map(r => <option key={r} value={r}>{rc(r).icon} {rc(r).label}</option>)}
                            </select>
                          </div>
                          <div className="flex-1 min-w-[200px]">
                            <label className="block text-[10px] font-bold mb-1.5 uppercase tracking-wider text-white/35">Teacher *</label>
                            <select
                              value={f.teacherId}
                              onChange={e => setInvForms(p => ({...p,[entry.id]:{...p[entry.id],teacherId:e.target.value}}))}
                              className="sims-input text-xs">
                              <option value="">Select teacher…</option>
                              {teachers
                                .filter(t => !invs.find((i:any) => i.teacher?.id === t.id))
                                .map(t => (
                                  <option key={t.id} value={t.id}>
                                    {tName(t)}{t.employeeCode ? ` (${t.employeeCode})` : ''}
                                  </option>
                                ))}
                            </select>
                          </div>
                          <button
                            onClick={() => void assignInvigilator(entry.id)}
                            disabled={assigning === entry.id || !f.teacherId}
                            className="px-5 py-2.5 rounded-xl text-xs font-black disabled:opacity-50 hover:-translate-y-0.5 transition-all flex-shrink-0"
                            style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
                            {assigning === entry.id ? '⏳' : '+ Assign'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary table */}
              <div className="glass rounded-2xl overflow-hidden mt-6">
                <div className="px-5 py-4" style={{borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
                  <h3 className="text-sm font-bold text-white">
                    📋 Exam Day Summary — {new Date(examDate).toLocaleDateString('en-IN',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="sims-table">
                    <thead>
                      <tr>
                        <th>Subject</th><th>Class</th><th>Time</th><th>Room</th>
                        <th>Head Examiner</th><th>Invigilators</th><th>Flying Squad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayData.entries.map((entry: any) => {
                        const head  = (entry.invigilators ?? []).filter((i:any) => i.role === 'HEAD_EXAMINER');
                        const invs  = (entry.invigilators ?? []).filter((i:any) => i.role === 'INVIGILATOR');
                        const squad = (entry.invigilators ?? []).filter((i:any) => i.role === 'FLYING_SQUAD');
                        return (
                          <tr key={entry.id}>
                            <td className="font-black text-white">{entry.subject}</td>
                            <td><span className="px-2 py-0.5 rounded text-xs font-bold" style={{background:'rgba(30,144,255,0.12)',color:'#93C5FD'}}>{entry.exam.className}</span></td>
                            <td className="font-mono text-xs text-white/55">{entry.startTime}–{entry.endTime}</td>
                            <td className="text-white/55">{entry.room || '—'}</td>
                            <td>
                              {head.length > 0
                                ? <span className="font-semibold text-yellow-400">{head.map((h:any)=>h.teacher?.user?.name).join(', ')}</span>
                                : <span className="text-red-400 text-xs font-bold">⚠️ Not set</span>}
                            </td>
                            <td className="text-white/55 text-xs">{invs.length > 0 ? invs.map((i:any)=>i.teacher?.user?.name).join(', ') : '—'}</td>
                            <td className="text-white/55 text-xs">{squad.length > 0 ? squad.map((i:any)=>i.teacher?.user?.name).join(', ') : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Create Exam Modal ── */}
      {examModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)'}}>
          <div className="w-full max-w-lg rounded-3xl p-8 shadow-2xl" style={{background:'#0F2044',border:'1px solid rgba(255,255,255,0.1)'}}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-extrabold text-white">+ Create Exam</h2>
              <button onClick={() => setExamModal(false)} className="w-8 h-8 rounded-xl glass flex items-center justify-center text-white/50 text-sm">✕</button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-white/40">Class *</label>
                  <select value={examForm.className} onChange={e => ef('className',e.target.value)} className="sims-input">
                    <option value="">Select class</option>
                    {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-white/40">Type *</label>
                  <select value={examForm.examType} onChange={e => ef('examType', e.target.value as ExamCategory)} className="sims-input">
                    {EXAM_TYPES.map(t => <option key={t} value={t}>{EXAM_LABELS[t]}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-white/40">Title *</label>
                <input value={examForm.title} onChange={e => ef('title',e.target.value)} className="sims-input" placeholder="e.g. MST 1 — November 2024"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-white/40">Start Date *</label>
                  <input type="date" value={examForm.startDate} onChange={e => ef('startDate',e.target.value)} className="sims-input"/>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-white/40">End Date *</label>
                  <input type="date" value={examForm.endDate} onChange={e => ef('endDate',e.target.value)} className="sims-input"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-white/40">Instructions</label>
                <textarea value={examForm.instructions} onChange={e => ef('instructions',e.target.value)} className="sims-input resize-none" rows={3} placeholder="Optional…"/>
              </div>
            </div>
            <div className="flex gap-3 mt-6 pt-5" style={{borderTop:'1px solid rgba(255,255,255,0.07)'}}>
              <button onClick={() => setExamModal(false)} className="flex-1 py-3 rounded-xl text-sm font-bold glass hover:bg-white/10">Cancel</button>
              <button onClick={() => void saveExam()} disabled={saving}
                      className="flex-1 py-3 rounded-xl text-sm font-black disabled:opacity-60 hover:-translate-y-0.5 transition-all"
                      style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
                {saving ? '⏳ Creating…' : '📋 Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Entry Modal ── */}
      {entryModal && selExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)'}}>
          <div className="w-full max-w-lg rounded-3xl p-8 shadow-2xl" style={{background:'#0F2044',border:'1px solid rgba(255,255,255,0.1)'}}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-extrabold text-white">+ Add Subject</h2>
                <p className="text-xs mt-0.5 text-white/40">{selExam.title} · Class {selExam.className}</p>
              </div>
              <button onClick={() => setEntryModal(false)} className="w-8 h-8 rounded-xl glass flex items-center justify-center text-white/50 text-sm">✕</button>
            </div>
            {selExam.dateSheets.length > 0 && (
              <div className="mb-4 p-3 rounded-xl" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}>
                <p className="text-xs font-bold text-white/40 mb-2">Already scheduled:</p>
                <div className="flex flex-wrap gap-1.5">
                  {selExam.dateSheets.map(e => <span key={e.id} className="px-2 py-0.5 rounded-full text-xs font-bold" style={{background:'rgba(30,144,255,0.12)',color:'#93C5FD'}}>{e.subject}</span>)}
                </div>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-white/40">Subject *</label>
                <select value={entryForm.subject} onChange={e => nf('subject',e.target.value)} className="sims-input">
                  <option value="">Select subject</option>
                  {SUBJECTS.filter(s => !selExam.dateSheets.find(e => e.subject === s)).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-white/40">Exam Date *</label>
                <input type="date" value={entryForm.date} onChange={e => nf('date',e.target.value)}
                       min={selExam.startDate?.slice(0,10)} max={selExam.endDate?.slice(0,10)} className="sims-input"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-white/40">Start Time</label>
                  <input type="time" value={entryForm.startTime} onChange={e => nf('startTime',e.target.value)} className="sims-input"/>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-white/40">End Time</label>
                  <input type="time" value={entryForm.endTime} onChange={e => nf('endTime',e.target.value)} className="sims-input"/>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-white/40">Room</label>
                  <input value={entryForm.room} onChange={e => nf('room',e.target.value)} className="sims-input" placeholder="R-101"/>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-white/40">Max Marks</label>
                  <input type="number" value={entryForm.maxMarks} onChange={e => nf('maxMarks',Number(e.target.value))} className="sims-input" min={1}/>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-white/40">Pass Marks</label>
                  <input type="number" value={entryForm.passingMarks} onChange={e => nf('passingMarks',Number(e.target.value))} className="sims-input" min={1}/>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6 pt-5" style={{borderTop:'1px solid rgba(255,255,255,0.07)'}}>
              <button onClick={() => setEntryModal(false)} className="flex-1 py-3 rounded-xl text-sm font-bold glass hover:bg-white/10">Close</button>
              <button onClick={() => void saveEntry()} disabled={saving}
                      className="flex-1 py-3 rounded-xl text-sm font-black disabled:opacity-60 hover:-translate-y-0.5 transition-all"
                      style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
                {saving ? '⏳ Adding…' : '+ Add Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}