'use client';
// src/app/admin/classes/page.tsx
import { useEffect, useState, useCallback } from 'react';
import AppShell from '@/components/layout/AppShell';
import { classesApi, teachersApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/Toast';
import { confirm } from '@/components/ui/Confirm';

const GRADES   = ['12','11','10','9','8','7','6'];
const SECTIONS = ['A','B','C','D','E'];
const ROOMS    = ['R-101','R-102','R-103','R-201','R-202','R-203','R-301','R-302','R-303','Lab-1','Lab-2','Hall-A'];
const SUBJECTS = ['Mathematics','Physics','Chemistry','Biology','English','Hindi','History','Geography','Computer Science','Physical Education','Economics'];

const GRADE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  '12': { bg: 'rgba(239,68,68,0.12)',   text: '#FCA5A5', border: 'rgba(239,68,68,0.25)'   },
  '11': { bg: 'rgba(249,115,22,0.12)',  text: '#FDBA74', border: 'rgba(249,115,22,0.25)'  },
  '10': { bg: 'rgba(212,160,23,0.12)',  text: '#F0C040', border: 'rgba(212,160,23,0.25)'  },
  '9':  { bg: 'rgba(34,197,94,0.12)',   text: '#86EFAC', border: 'rgba(34,197,94,0.25)'   },
  '8':  { bg: 'rgba(30,144,255,0.12)',  text: '#93C5FD', border: 'rgba(30,144,255,0.25)'  },
  '7':  { bg: 'rgba(99,102,241,0.12)',  text: '#C7D2FE', border: 'rgba(99,102,241,0.25)'  },
  '6':  { bg: 'rgba(168,85,247,0.12)',  text: '#D8B4FE', border: 'rgba(168,85,247,0.25)'  },
};

function gradeStyle(grade: string) {
  return GRADE_COLORS[grade] || { bg: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.5)', border: 'rgba(255,255,255,0.12)' };
}

function getCapacity(students: number) {
  if (students >= 40) return { label: 'Full',   color: '#FCA5A5', pct: 100 };
  if (students >= 30) return { label: 'High',   color: '#FCD34D', pct: Math.round((students/40)*100) };
  return               { label: 'Normal', color: '#86EFAC', pct: Math.round((students/40)*100) };
}

type ModalMode = 'add' | 'edit' | 'view' | null;

export default function AdminClasses() {
  const [classes,   setClasses]   = useState<any[]>([]);
  const [teachers,  setTeachers]  = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState<ModalMode>(null);
  const [selected,  setSelected]  = useState<any>(null);
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState<string|null>(null);
  const [form,      setForm]      = useState<any>({});
  const [filterGrade, setFilterGrade] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [clsRes, tchRes] = await Promise.all([
        classesApi.getAll({ grade: filterGrade || undefined }),
        teachersApi.getAll({}),
      ]);
      setClasses(clsRes.data.data || []);
      setTeachers(tchRes.data.data || []);
    } catch { setClasses([]); }
    finally { setLoading(false); }
  }, [filterGrade]);

  useEffect(() => { load(); }, [load]);

  const sf = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const openAdd = () => {
    setSelected(null);
    setForm({ grade: '10', section: 'A', room: 'R-101', subject: 'Mathematics', studentCount: 30 });
    setModal('add');
  };

  const openEdit = (c: any) => {
    setSelected(c);
    setForm({
      name:         c.name,
      grade:        c.grade,
      section:      c.section,
      room:         c.room,
      subject:      c.subject,
      teacherName:  c.teacherName,
      studentCount: c.studentCount,
    });
    setModal('edit');
  };

  const openView = (c: any) => { setSelected(c); setModal('view'); };

  const handleSave = async () => {
    const name = form.name || `${form.grade}${form.section}`;
    if (!name) { toast.warning('Validation', 'Class name or grade+section is required'); return; };
    setSaving(true);
    try {
      const payload = { ...form, name };
      if (modal === 'add') { await classesApi.create(payload); toast.success('Class Created', `Class ${payload.name} created`); } else { await classesApi.update(selected.id, payload); toast.success('Class Updated', `Class ${payload.name} updated`); }
      setModal(null); load();
    } catch (e: any) {
      toast.error('Error', e?.message || 'Error saving class');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!(await confirm({ title: 'Delete Class', message: `Delete class \"${name}\"? The class record will be removed.`, confirm: 'Yes, Delete', cancel: 'Cancel', danger: true }))) return;
    setDeleting(id);
    try { await classesApi.delete(id); toast.success('Class Deleted', name); load(); }
    catch (e: any) { toast.error('Error', e?.message || 'Error'); }
    finally { setDeleting(null); }
  };

  // Group classes by grade for the grid view
  const byGrade = GRADES.reduce((acc, g) => {
    const filtered = classes.filter(c => c.grade === g || c.name?.startsWith(g));
    if (filtered.length > 0) acc[g] = filtered;
    return acc;
  }, {} as Record<string, any[]>);

  const displayed = filterGrade
    ? classes.filter(c => c.grade === filterGrade || c.name?.startsWith(filterGrade))
    : classes;

  const totalStudents = classes.reduce((a, c) => a + (c.studentCount || 0), 0);
  const totalClasses  = classes.length;
  const avgClassSize  = totalClasses ? Math.round(totalStudents / totalClasses) : 0;
  const teacherNames  = teachers.map(t => t.user?.name || t.name || '').filter(Boolean);

  return (
    <AppShell title="Classes & Sections" subtitle={`${totalClasses} active classes`}>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: '🏫', label: 'Total Classes',    value: totalClasses,   col: '#F0C040', bg: 'rgba(212,160,23,0.12)',  bd: 'rgba(212,160,23,0.2)'  },
          { icon: '👨‍🎓', label: 'Total Students',  value: totalStudents,  col: '#86EFAC', bg: 'rgba(34,197,94,0.12)',   bd: 'rgba(34,197,94,0.2)'   },
          { icon: '📏', label: 'Avg Class Size',   value: avgClassSize,   col: '#93C5FD', bg: 'rgba(30,144,255,0.12)',  bd: 'rgba(30,144,255,0.2)'  },
          { icon: '🎓', label: 'Grades Active',    value: Object.keys(byGrade).length, col: '#FCA5A5', bg: 'rgba(239,68,68,0.12)', bd: 'rgba(239,68,68,0.2)' },
        ].map(c => (
          <div key={c.label} className="glass rounded-2xl p-5 hover:-translate-y-0.5 transition-transform cursor-default">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3"
                 style={{ background: c.bg, border: `1px solid ${c.bd}` }}>{c.icon}</div>
            <div className="text-2xl font-black" style={{ color: c.col }}>{c.value}</div>
            <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* ── TOOLBAR ── */}
      <div className="glass rounded-2xl p-4 mb-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider mr-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Filter:</span>
          {['', ...GRADES].map(g => (
            <button key={g}
                    onClick={() => setFilterGrade(g)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                    style={{
                      background: filterGrade === g ? (g ? gradeStyle(g).bg : 'rgba(212,160,23,0.2)') : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${filterGrade === g ? (g ? gradeStyle(g).border : 'rgba(212,160,23,0.4)') : 'rgba(255,255,255,0.08)'}`,
                      color: filterGrade === g ? (g ? gradeStyle(g).text : '#F0C040') : 'rgba(255,255,255,0.45)',
                    }}>
              {g ? `Grade ${g}` : 'All Grades'}
            </button>
          ))}
        </div>
        <button onClick={openAdd}
                className="px-5 py-2.5 rounded-xl text-sm font-black transition-all hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg,#D4A017,#F0C040)', color: '#0A1628' }}>
          + Add Class
        </button>
      </div>

      {/* ── LOADING ── */}
      {loading && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton rounded-2xl h-52" />)}
        </div>
      )}

      {/* ── EMPTY STATE ── */}
      {!loading && displayed.length === 0 && (
        <div className="glass rounded-2xl py-20 text-center">
          <div className="text-5xl mb-4 opacity-40">🏫</div>
          <div className="text-lg font-bold mb-2">No classes found</div>
          <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {filterGrade ? `No classes for Grade ${filterGrade}` : 'Add your first class to get started'}
          </p>
          <button onClick={openAdd} className="px-6 py-2.5 rounded-xl text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg,#D4A017,#F0C040)', color: '#0A1628' }}>
            + Add First Class
          </button>
        </div>
      )}

      {/* ── GRADE GROUPS (no filter) ── */}
      {!loading && displayed.length > 0 && !filterGrade && (
        <div className="space-y-6">
          {Object.entries(byGrade).map(([grade, gradeClasses]) => {
            const gs = gradeStyle(grade);
            return (
              <div key={grade}>
                {/* Grade header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="px-3 py-1 rounded-xl text-sm font-black"
                       style={{ background: gs.bg, color: gs.text, border: `1px solid ${gs.border}` }}>
                    Grade {grade}
                  </div>
                  <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {gradeClasses.length} section{gradeClasses.length !== 1 ? 's' : ''} ·{' '}
                    {gradeClasses.reduce((a, c) => a + (c.studentCount || 0), 0)} students
                  </span>
                </div>

                {/* Class cards for this grade */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {(gradeClasses as any[]).map(c => <ClassCard key={c.id} cls={c} gs={gs}
                    onEdit={openEdit} onView={openView} onDelete={handleDelete} deleting={deleting} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── FILTERED GRID ── */}
      {!loading && displayed.length > 0 && filterGrade && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {displayed.map(c => {
            const gs = gradeStyle(c.grade || filterGrade);
            return <ClassCard key={c.id} cls={c} gs={gs}
              onEdit={openEdit} onView={openView} onDelete={handleDelete} deleting={deleting} />;
          })}
        </div>
      )}

      {/* ══════════════════════════
          SUMMARY TABLE (bottom)
      ══════════════════════════ */}
      {!loading && classes.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden mt-6">
          <div className="px-6 py-4 flex items-center justify-between"
               style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <h3 className="text-sm font-bold text-white">All Classes — Summary Table</h3>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{classes.length} total</span>
          </div>
          <div className="divide-y md:hidden" style={{borderColor:'rgba(255,255,255,0.06)'}}>
            {classes.map(c => {
              const cap = getCapacity(c.studentCount || 0);
              const gs  = gradeStyle(c.grade || '');
              return (
                <div key={c.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="px-2.5 py-1 rounded-lg text-sm font-black" style={{ background: gs.bg, color: gs.text }}>{c.name}</span>
                      <div className="mt-2 text-xs text-white/35">Grade {c.grade} · Section {c.section}</div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-lg font-mono flex-shrink-0"
                          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                      {c.room}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl p-3" style={{background:'rgba(255,255,255,0.03)'}}>
                      <div className="text-white/35">Class Teacher</div>
                      <div className="mt-1 text-white/70">{c.teacherName || '—'}</div>
                    </div>
                    <div className="rounded-xl p-3" style={{background:'rgba(255,255,255,0.03)'}}>
                      <div className="text-white/35">Subject</div>
                      <div className="mt-1 text-white/70">{c.subject || '—'}</div>
                    </div>
                  </div>
                  <div className="mt-4 rounded-xl p-3" style={{background:'rgba(255,255,255,0.03)'}}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs text-white/35">{c.studentCount || 0} students</span>
                      <span className="text-xs font-bold" style={{ color: cap.color }}>{cap.label}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${cap.pct}%`, background: cap.color }} />
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => openView(c)} className="flex-1 px-3 py-2 rounded-xl text-xs font-bold glass hover:bg-white/10">👁 View</button>
                    <button onClick={() => openEdit(c)} className="flex-1 px-3 py-2 rounded-xl text-xs font-bold"
                            style={{ background: 'rgba(212,160,23,0.12)', color: '#F0C040', border: '1px solid rgba(212,160,23,0.2)' }}>✏️ Edit</button>
                    <button onClick={() => handleDelete(c.id, c.name)} disabled={deleting === c.id}
                            className="px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-40"
                            style={{ background: 'rgba(239,68,68,0.12)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)' }}>
                      {deleting === c.id ? '⏳' : '🗑️'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="sims-table">
              <thead>
                <tr>
                  <th>Class</th><th>Grade</th><th>Section</th><th>Class Teacher</th>
                  <th>Subject</th><th>Room</th><th>Students</th><th>Capacity</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {classes.map(c => {
                  const cap = getCapacity(c.studentCount || 0);
                  const gs  = gradeStyle(c.grade || '');
                  return (
                    <tr key={c.id}>
                      <td>
                        <span className="px-2.5 py-1 rounded-lg text-sm font-black"
                              style={{ background: gs.bg, color: gs.text }}>{c.name}</span>
                      </td>
                      <td>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
                              style={{ background: gs.bg, color: gs.text }}>Grade {c.grade}</span>
                      </td>
                      <td className="font-bold text-white">{c.section}</td>
                      <td style={{ color: 'rgba(255,255,255,0.65)' }}>{c.teacherName || '—'}</td>
                      <td style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>{c.subject}</td>
                      <td>
                        <span className="text-xs px-2 py-0.5 rounded-lg font-mono"
                              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                          {c.room}
                        </span>
                      </td>
                      <td className="font-bold text-white">{c.studentCount || 0}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                            <div className="h-full rounded-full transition-all" style={{ width: `${cap.pct}%`, background: cap.color }} />
                          </div>
                          <span className="text-xs font-bold" style={{ color: cap.color }}>{cap.label}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex gap-1.5">
                          <button onClick={() => openView(c)} className="px-2.5 py-1.5 rounded-lg text-xs font-bold glass hover:bg-white/10">👁</button>
                          <button onClick={() => openEdit(c)} className="px-2.5 py-1.5 rounded-lg text-xs font-bold"
                                  style={{ background: 'rgba(212,160,23,0.12)', color: '#F0C040', border: '1px solid rgba(212,160,23,0.2)' }}>✏️</button>
                          <button onClick={() => handleDelete(c.id, c.name)} disabled={deleting === c.id}
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40"
                                  style={{ background: 'rgba(239,68,68,0.12)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)' }}>
                            {deleting === c.id ? '⏳' : '🗑️'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════
          ADD / EDIT MODAL
      ══════════════════════════ */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-xl rounded-3xl shadow-2xl"
               style={{ background: '#0F2044', border: '1px solid rgba(255,255,255,0.1)' }}>

            <div className="flex items-center justify-between px-8 pt-7 pb-5">
              <div>
                <h2 className="text-xl font-extrabold">
                  {modal === 'add' ? '+ Add New Class' : `✏️ Edit Class ${selected?.name}`}
                </h2>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {modal === 'add' ? 'Create a new class section' : 'Update class details'}
                </p>
              </div>
              <button onClick={() => setModal(null)}
                      className="w-8 h-8 rounded-xl glass flex items-center justify-center text-sm"
                      style={{ color: 'rgba(255,255,255,0.5)' }}>✕</button>
            </div>

            <div className="px-8 pb-2 space-y-4 max-h-[60vh] overflow-y-auto">

              {/* Grade + Section + auto-name */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>Grade *</label>
                  <select value={form.grade || ''} onChange={e => {
                    const g = e.target.value;
                    const s = form.section || 'A';
                    sf('grade', g); sf('name', `${g}${s}`);
                  }} className="sims-input">
                    <option value="">Select</option>
                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>Section *</label>
                  <select value={form.section || ''} onChange={e => {
                    const s = e.target.value;
                    sf('section', s); sf('name', `${form.grade || ''}${s}`);
                  }} className="sims-input">
                    <option value="">Select</option>
                    {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>Class Name</label>
                  <input value={form.name || ''} onChange={e => sf('name', e.target.value)}
                         className="sims-input font-bold" placeholder="Auto: 10A" />
                </div>
              </div>

              {/* Teacher + Subject */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>Class Teacher</label>
                  <select value={form.teacherName || ''} onChange={e => sf('teacherName', e.target.value)} className="sims-input">
                    <option value="">Select teacher</option>
                    {teacherNames.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>Primary Subject</label>
                  <select value={form.subject || ''} onChange={e => sf('subject', e.target.value)} className="sims-input">
                    <option value="">Select subject</option>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Room + Students */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>Classroom / Room No.</label>
                  <select value={form.room || ''} onChange={e => sf('room', e.target.value)} className="sims-input">
                    <option value="">Select room</option>
                    {ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>No. of Students</label>
                  <input type="number" value={form.studentCount || ''} onChange={e => sf('studentCount', parseInt(e.target.value) || 0)}
                         className="sims-input" placeholder="e.g. 32" min={0} max={60} />
                </div>
              </div>

              {/* Preview badge */}
              {form.name && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
                     style={{ background: 'rgba(212,160,23,0.07)', border: '1px solid rgba(212,160,23,0.2)' }}>
                  <span className="px-3 py-1 rounded-xl text-base font-black"
                        style={{ background: gradeStyle(form.grade || '').bg, color: gradeStyle(form.grade || '').text }}>
                    {form.name}
                  </span>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {form.teacherName && <span>🧑‍🏫 {form.teacherName} · </span>}
                    {form.room && <span>🚪 {form.room} · </span>}
                    {form.studentCount && <span>👨‍🎓 {form.studentCount} students</span>}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 px-8 py-6 sm:flex-row" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <button onClick={() => setModal(null)} className="flex-1 py-3 rounded-xl text-sm font-bold glass hover:bg-white/10 transition-all">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                      className="flex-1 py-3 rounded-xl text-sm font-black transition-all hover:-translate-y-0.5 disabled:opacity-60"
                      style={{ background: 'linear-gradient(135deg,#D4A017,#F0C040)', color: '#0A1628' }}>
                {saving ? '⏳ Saving...' : modal === 'add' ? '+ Create Class' : '✅ Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════
          VIEW MODAL
      ══════════════════════════ */}
      {modal === 'view' && selected && (() => {
        const gs  = gradeStyle(selected.grade || '');
        const cap = getCapacity(selected.studentCount || 0);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
               style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
            <div className="w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
                 style={{ background: '#0F2044', border: '1px solid rgba(255,255,255,0.1)' }}>

              {/* Banner */}
              <div className="px-8 py-8 text-center" style={{ background: 'linear-gradient(160deg,#0F2044,#162952)' }}>
                <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-4xl font-black mx-auto mb-3 shadow-xl"
                     style={{ background: gs.bg, border: `2px solid ${gs.border}`, color: gs.text }}>
                  {selected.name}
                </div>
                <p className="text-base font-black text-white mt-1">Grade {selected.grade} — Section {selected.section}</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{selected.room}</p>
              </div>

              {/* Details */}
              <div className="p-6 space-y-2.5">
                {([
                  ['🧑‍🏫', 'Class Teacher', selected.teacherName || 'Not assigned'],
                  ['📚', 'Primary Subject', selected.subject || '—'],
                  ['🚪', 'Room', selected.room || '—'],
                  ['👨‍🎓', 'Students Enrolled', `${selected.studentCount || 0} students`],
                ] as [string,string,string][]).map(([ic, lb, val]) => (
                  <div key={lb} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                       style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="text-sm w-5 text-center flex-shrink-0">{ic}</span>
                    <span className="text-xs font-bold w-28 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>{lb}</span>
                    <span className="text-sm font-semibold text-white">{val}</span>
                  </div>
                ))}

                {/* Capacity bar */}
                <div className="px-3 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>Capacity Usage</span>
                    <span className="text-xs font-bold" style={{ color: cap.color }}>{selected.studentCount || 0} / 40 · {cap.label}</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${cap.pct}%`, background: cap.color }} />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 px-6 pb-7 sm:flex-row">
                <button onClick={() => setModal(null)} className="flex-1 py-3 rounded-xl text-sm font-bold glass hover:bg-white/10 transition-all">Close</button>
                <button onClick={() => { setModal(null); setTimeout(() => openEdit(selected), 50); }}
                        className="flex-1 py-3 rounded-xl text-sm font-black hover:-translate-y-0.5 transition-all"
                        style={{ background: 'linear-gradient(135deg,#D4A017,#F0C040)', color: '#0A1628' }}>
                  ✏️ Edit Class
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </AppShell>
  );
}

/* ── Class Card Component ── */
function ClassCard({ cls, gs, onEdit, onView, onDelete, deleting }: any) {
  const cap = getCapacity(cls.studentCount || 0);
  return (
    <div className="glass rounded-2xl p-5 group transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl"
         style={{ border: `1px solid ${gs.border}` }}>

      {/* Top */}
      <div className="flex items-start justify-between mb-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black flex-shrink-0"
             style={{ background: gs.bg, color: gs.text, border: `1px solid ${gs.border}` }}>
          {cls.name}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onView(cls)} className="w-7 h-7 rounded-lg flex items-center justify-center text-sm glass">👁</button>
          <button onClick={() => onEdit(cls)} className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ background: 'rgba(212,160,23,0.15)' }}>✏️</button>
          <button onClick={() => onDelete(cls.id, cls.name)} disabled={deleting === cls.id}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-sm disabled:opacity-40"
                  style={{ background: 'rgba(239,68,68,0.15)' }}>
            {deleting === cls.id ? '⏳' : '🗑️'}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-2 mb-4">
        {cls.teacherName && (
          <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
            <span>🧑‍🏫</span><span className="truncate">{cls.teacherName}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
          <span>📚</span><span>{cls.subject || 'Not assigned'}</span>
        </div>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
          <span>🚪</span><span>{cls.room || '—'}</span>
        </div>
      </div>

      {/* Student count + capacity */}
      <div className="pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-bold text-white">{cls.studentCount || 0} students</span>
          <span className="text-xs font-bold" style={{ color: cap.color }}>{cap.label}</span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <div className="h-full rounded-full" style={{ width: `${cap.pct}%`, background: cap.color }} />
        </div>
      </div>
    </div>
  );
}
