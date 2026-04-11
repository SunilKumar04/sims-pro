'use client';
// src/app/teacher/marks/page.tsx  — saves to PostgreSQL via /marks/bulk
import { useEffect, useState, useCallback } from 'react';
import AppShell from '@/components/layout/AppShell';
import { studentsApi, marksApi } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { toast } from '@/components/ui/Toast';

const MY_CLASSES  = ['10A','10B','8A','9A'];
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
  const [className,  setClassName]  = useState('10A');
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [stuRes, mrkRes] = await Promise.all([
        studentsApi.getAll({ className }),
        marksApi.getByClass(className, examType),
      ]);
      const studs = stuRes.data.data || [];
      const existingMarks: any[] = mrkRes.data.data || [];
      setStudents(studs);
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
    } finally {
      setLoading(false);
    }
  }, [className, examType, subject]);

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

      await marksApi.bulkSave({
        className,
        examType,
        year: new Date().getFullYear(),
        records,
      });

      setSaveMsg(`✅ ${records.length} marks saved to database!`);
      setSaved(true);
      setTimeout(() => { setSaved(false); setSaveMsg(''); }, 4000);
      load(); // reload to confirm DB data
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
    <AppShell title="Marks Entry" subtitle="Enter and save to PostgreSQL database">

      {saved && (
        <div className="fixed top-20 right-6 z-50 px-5 py-3 rounded-2xl text-sm font-bold shadow-xl animate-fade-up"
             style={{background:'rgba(34,197,94,0.15)',border:'1px solid rgba(34,197,94,0.4)',color:'#86EFAC'}}>
          {saveMsg}
        </div>
      )}

      {/* CONTROLS */}
      <div className="glass rounded-2xl p-5 mb-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Class */}
          <div>
            <label className="block text-xs font-bold mb-1 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.4)'}}>Class</label>
            <select value={className} onChange={e=>setClassName(e.target.value)}
                    className="sims-input text-sm" style={{width:100,padding:'8px 28px 8px 12px'}}>
              {MY_CLASSES.map(c=><option key={c} value={c}>{c}</option>)}
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

        <div className="flex items-center gap-3">
          {savedCount > 0 && (
            <span className="text-xs px-3 py-1.5 rounded-xl font-bold"
                  style={{background:'rgba(34,197,94,0.12)',border:'1px solid rgba(34,197,94,0.25)',color:'#86EFAC'}}>
              💾 {savedCount} records in DB
            </span>
          )}
          <button onClick={handleSave} disabled={saving || students.length === 0}
                  className="px-5 py-2.5 rounded-xl text-sm font-black hover:-translate-y-0.5 transition-all disabled:opacity-50"
                  style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
            {saving ? '⏳ Saving to DB...' : '💾 Save to PostgreSQL'}
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-4 mb-5">
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
          <div className="overflow-x-auto">
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
        )}
      </div>

      <div className="mt-4 px-4 py-3 rounded-xl flex items-center gap-2 text-xs"
           style={{background:'rgba(30,144,255,0.07)',border:'1px solid rgba(30,144,255,0.15)',color:'rgba(255,255,255,0.45)'}}>
        ℹ️ Marks are saved per subject. Switch subject and save again to record all subjects for this exam.
        The "DB Status" column shows which students already have marks saved in PostgreSQL.
      </div>
    </AppShell>
  );
}
