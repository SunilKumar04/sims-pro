'use client';
// src/app/teacher/marks/page.tsx  — saves to PostgreSQL via /marks/bulk
import { useEffect, useState, useCallback } from 'react';
import AppShell from '@/components/layout/AppShell';
import { studentsApi, marksApi, timetableApi, classesApi } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { toast } from '@/components/ui/Toast';

const EXAM_TYPES  = [
  { label:'Unit Test 1', value:'UNIT_TEST'  },
  { label:'Unit Test 2', value:'UNIT_TEST'  },
  { label:'Mid-Term',    value:'MID_TERM'   },
  { label:'Final Exam',  value:'FINAL'      },
  { label:'Practicals',  value:'PRACTICALS' },
];
const SUBJECTS = ['Mathematics','Physics','Chemistry','English','Hindi','Science','Social Studies'];

function grade(marks: number, max = 100): { g: string; col: string } {
  const p = (marks / max) * 100;
  if (p >= 90) return { g:'A+', col:'#86EFAC' };
  if (p >= 80) return { g:'A',  col:'#86EFAC' };
  if (p >= 70) return { g:'B+', col:'#FCD34D' };
  if (p >= 60) return { g:'B',  col:'#FCD34D' };
  if (p >= 40) return { g:'C',  col:'#FDBA74' };
  return               { g:'F',  col:'#FCA5A5' };
}

export default function TeacherMarks() {
  const user = getUser();
  const [classes,    setClasses]    = useState<string[]>([]);
  const [className,  setClassName]  = useState('');
  const [examType,   setExamType]   = useState('FINAL');
  const [examLabel,  setExamLabel]  = useState('Final Exam');
  const [subject,    setSubject]    = useState('Mathematics');
  const [maxMarks,   setMaxMarks]   = useState(100);
  const [students,   setStudents]   = useState<any[]>([]);
  const [marks,      setMarks]      = useState<Record<string, number>>({});
  const [existing,   setExisting]   = useState<any[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [saveMsg,    setSaveMsg]    = useState('');

  const loadClasses = useCallback(async () => {
    try {
      const [mappingsRes, classesRes] = await Promise.all([
        timetableApi.getMappings(),
        classesApi.getAll({}),
      ]);

      const allMappings = mappingsRes.data.data ?? [];
      const teacherClasses = [...new Set(
        allMappings
          .filter((item: any) => item.teacherId === user?.teacherId || item.teacher?.user?.name === user?.name)
          .map((item: any) => item.className)
          .filter(Boolean),
      )];

      const systemClasses = (classesRes.data.data ?? [])
        .map((item: any) => item.name)
        .filter(Boolean);

      const availableClasses = teacherClasses.length > 0 ? teacherClasses : systemClasses;
      setClasses(availableClasses);
      setClassName((current) => current && availableClasses.includes(current)
        ? current
        : availableClasses[0] ?? '');
    } catch {
      setClasses([]);
      setClassName('');
    }
  }, [user?.name, user?.teacherId]);

  const load = useCallback(async () => {
    if (!className) {
      setStudents([]);
      setExisting([]);
      setMarks({});
      return;
    }
    setLoading(true);
    try {
      const stuRes = await studentsApi.getAll({ className });
      const studs = stuRes.data.data || [];
      setStudents(studs);

      let existingMarks: any[] = [];
      try {
        const mrkRes = await marksApi.getByClass(className, examType);
        existingMarks = mrkRes.data.data || [];
      } catch {
        existingMarks = [];
      }
      setExisting(existingMarks);

      // Pre-fill from existing DB data
      const init: Record<string, number> = {};
      studs.forEach((s: any) => { init[s.id] = 0; });
      existingMarks
        .filter((m: any) => m.subject === subject)
        .forEach((m: any) => { init[m.studentId] = m.marks; });
      setMarks(init);
    } catch {
      setStudents([]);
      setExisting([]);
      setMarks({});
    } finally {
      setLoading(false);
    }
  }, [className, examType, subject]);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  useEffect(() => { load(); }, [load]);

  const setMark = (id: string, val: number) => {
    setMarks(p => ({ ...p, [id]: Math.min(maxMarks, Math.max(0, val || 0)) }));
  };

  const handleSave = async () => {
    if (students.length === 0) { toast.warning('Validation', 'No students to save'); return; };
    setSaving(true);
    try {
      const records = students.map(s => ({
        studentId: s.id,
        subject,
        marks:     marks[s.id] ?? 0,
        maxMarks,
      }));

      const res = await marksApi.bulkSave({
        className,
        examType,
        year: new Date().getFullYear(),
        records,
      });

      const savedRows = res?.data?.data?.length ?? 0;
      setSaveMsg(`✅ ${savedRows} records saved in DB`);
      setSaved(true);
      setTimeout(() => { setSaved(false); setSaveMsg(''); }, 4000);
      await load(); // reload to confirm DB data
    } catch (e: any) {
      toast.error('Error', e?.message || 'Error saving marks');
    } finally {
      setSaving(false);
    }
  };

  const scored    = Object.values(marks).filter(m => m > 0);
  const avg       = scored.length ? Math.round(scored.reduce((a,b)=>a+b,0)/scored.length) : 0;
  const topScore  = scored.length ? Math.max(...scored) : 0;
  const topStudent = students.find(s => marks[s.id] === topScore);
  const passCount = scored.filter(m => (m/maxMarks)*100 >= 40).length;
  const savedCount = existing.filter(m => m.subject === subject).length;

  return (
    <AppShell title="Marks Entry" subtitle="Enter marks and save to database">

      {saved && (
        <div className="fixed top-20 right-6 z-50 px-5 py-3 rounded-2xl text-sm font-bold shadow-xl animate-fade-up"
             style={{background:'rgba(34,197,94,0.15)',border:'1px solid rgba(34,197,94,0.4)',color:'#86EFAC'}}>
          {saveMsg}
        </div>
      )}

      {/* CONTROLS */}
      <div className="glass rounded-2xl p-5 mb-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="grid w-full gap-3 sm:grid-cols-2 xl:flex xl:w-auto xl:flex-wrap xl:items-end">
          {/* Class */}
          <div>
            <label className="block text-xs font-bold mb-1 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.4)'}}>Class</label>
            <select value={className} onChange={e=>setClassName(e.target.value)}
                    className="sims-input text-sm" style={{width:100,padding:'8px 28px 8px 12px'}}>
              {classes.length === 0 && <option value="">No classes found</option>}
              {classes.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {/* Exam Type */}
          <div>
            <label className="block text-xs font-bold mb-1 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.4)'}}>Exam</label>
            <select
              value={examLabel}
              onChange={e => {
                const found = EXAM_TYPES.find(et => et.label === e.target.value);
                setExamLabel(e.target.value);
                setExamType(found?.value || 'UNIT_TEST');
              }}
              className="sims-input text-sm" style={{width:150,padding:'8px 28px 8px 12px'}}>
              {EXAM_TYPES.map(e=><option key={e.label} value={e.label}>{e.label}</option>)}
            </select>
          </div>
          {/* Subject */}
          <div>
            <label className="block text-xs font-bold mb-1 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.4)'}}>Subject</label>
            <select value={subject} onChange={e=>setSubject(e.target.value)}
                    className="sims-input text-sm" style={{width:170,padding:'8px 28px 8px 12px'}}>
              {SUBJECTS.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {/* Max Marks */}
          <div>
            <label className="block text-xs font-bold mb-1 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.4)'}}>Max Marks</label>
            <input type="number" value={maxMarks} onChange={e=>setMaxMarks(parseInt(e.target.value)||100)}
                   className="sims-input text-sm font-bold" style={{width:80,padding:'8px 12px'}}/>
          </div>
        </div>

        <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
          {savedCount > 0 && (
            <span className="text-xs px-3 py-1.5 rounded-xl font-bold"
                  style={{background:'rgba(34,197,94,0.12)',border:'1px solid rgba(34,197,94,0.25)',color:'#86EFAC'}}>
              💾 {savedCount} Student records saved
            </span>
          )}
          <button onClick={handleSave} disabled={saving || students.length === 0}
                  className="px-5 py-2.5 rounded-xl text-sm font-black hover:-translate-y-0.5 transition-all disabled:opacity-50"
                  style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
            {saving ? '⏳ Saving marks..' : '💾 Save Marks'}
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 gap-4 mb-5 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {label:'Students',   value:students.length, col:'rgba(255,255,255,0.7)', bg:'rgba(255,255,255,0.05)'},
          {label:'Class Avg',  value:`${avg}/${maxMarks}`, col:'#F0C040', bg:'rgba(212,160,23,0.08)'},
          {label:'Passed',     value:`${passCount}/${students.length}`, col:'#86EFAC', bg:'rgba(34,197,94,0.08)'},
          {label:'Top Scorer', value:topStudent?.name?.split(' ')[0]||'—', col:'#93C5FD', bg:'rgba(30,144,255,0.08)'},
        ].map(c=>(
          <div key={c.label} className="rounded-2xl p-4 text-center" style={{background:c.bg,border:'1px solid rgba(255,255,255,0.07)'}}>
            <div className="text-xl font-black truncate" style={{color:c.col}}>{c.value}</div>
            <div className="text-xs mt-1" style={{color:'rgba(255,255,255,0.4)'}}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* MARKS TABLE */}
      <div className="glass rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">{[...Array(6)].map((_,i)=><div key={i} className="skeleton h-12 rounded-xl"/>)}</div>
        ) : students.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3 opacity-40">📝</div>
            <p className="text-sm font-bold text-white">No students in {className}</p>
          </div>
        ) : (
          <>
            <div className="divide-y md:hidden" style={{borderColor:'rgba(255,255,255,0.06)'}}>
              {students.map((s, i) => {
                const m = marks[s.id] ?? 0;
                const pct  = maxMarks > 0 ? Math.round((m/maxMarks)*100) : 0;
                const { g, col } = grade(m, maxMarks);
                const inDb = existing.some((e: any) => e.studentId === s.id && e.subject === subject);
                return (
                  <div key={s.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs text-white/35">#{i + 1} · {s.roll}</div>
                        <div className="mt-1 text-sm font-bold text-white">{s.name}</div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-black flex-shrink-0" style={{background:`${col}20`,color:col}}>
                        {g}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-3">
                      <input
                        type="number" value={m} min={0} max={maxMarks}
                        onChange={e => setMark(s.id, parseInt(e.target.value) || 0)}
                        className="sims-input text-sm font-black text-center"
                      />
                      <div className="text-right">
                        <div className="text-sm font-bold" style={{color:col}}>{pct}%</div>
                        <div className="text-[10px] text-white/35">out of {maxMarks}</div>
                      </div>
                    </div>
                    <div className="mt-3 w-full h-1.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.07)'}}>
                      <div className="h-full rounded-full" style={{width:`${pct}%`,background:col}}/>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="text-white/35">{subject}</span>
                      <span className="px-2 py-1 rounded-lg font-bold"
                            style={{
                              background: inDb?'rgba(34,197,94,0.12)':'rgba(255,255,255,0.06)',
                              color: inDb?'#86EFAC':'rgba(255,255,255,0.3)',
                            }}>
                        {inDb ? '✅ Saved' : '⏳ Not saved'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
            <table className="sims-table">
              <thead>
                <tr>
                  <th>#</th><th>Student Name</th><th>Roll</th>
                  <th>Marks / {maxMarks}</th><th>%</th><th>Grade</th><th>DB Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => {
                  const m    = marks[s.id] ?? 0;
                  const pct  = maxMarks > 0 ? Math.round((m/maxMarks)*100) : 0;
                  const { g, col } = grade(m, maxMarks);
                  const inDb = existing.some((e: any) => e.studentId === s.id && e.subject === subject);
                  return (
                    <tr key={s.id}>
                      <td className="text-white/30 text-xs">{i+1}</td>
                      <td className="font-bold text-white">{s.name}</td>
                      <td className="font-mono text-xs" style={{color:'rgba(255,255,255,0.4)'}}>{s.roll}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <input
                            type="number" value={m} min={0} max={maxMarks}
                            onChange={e => setMark(s.id, parseInt(e.target.value) || 0)}
                            className="sims-input text-sm font-black text-center"
                            style={{width:80, padding:'7px 8px'}}
                          />
                          <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.07)'}}>
                            <div className="h-full rounded-full" style={{width:`${pct}%`,background:col}}/>
                          </div>
                        </div>
                      </td>
                      <td><span className="font-bold text-sm" style={{color:col}}>{pct}%</span></td>
                      <td>
                        <span className="px-2.5 py-1 rounded-full text-xs font-black" style={{background:`${col}20`,color:col}}>
                          {g}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs px-2 py-1 rounded-lg font-bold"
                              style={{
                                background: inDb?'rgba(34,197,94,0.12)':'rgba(255,255,255,0.06)',
                                color: inDb?'#86EFAC':'rgba(255,255,255,0.3)',
                              }}>
                          {inDb ? '✅ Saved' : '⏳ Not saved'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>

      <div className="mt-4 px-4 py-3 rounded-xl flex items-center gap-2 text-xs"
           style={{background:'rgba(30,144,255,0.07)',border:'1px solid rgba(30,144,255,0.15)',color:'rgba(255,255,255,0.45)'}}>
        ℹ️ Marks are saved per subject. Switch subjects and save to record all entries.
        "DB Status" shows which records are already saved.
      </div>
    </AppShell>
  );
}
