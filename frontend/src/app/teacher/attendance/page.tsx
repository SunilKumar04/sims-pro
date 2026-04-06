'use client';
// src/app/teacher/attendance/page.tsx
import { useEffect, useState, useCallback } from 'react';
import AppShell from '@/components/layout/AppShell';
import { attendanceApi, studentsApi } from '@/lib/api';
import { getUser } from '@/lib/auth';

const MY_CLASSES = ['10A','10B','8A','9A'];

type Status = 'PRESENT'|'ABSENT'|'LATE';

export default function TeacherAttendance() {
  const [className,  setClassName]  = useState('10A');
  const [date,       setDate]       = useState(new Date().toISOString().slice(0,10));
  const [students,   setStudents]   = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string,Status>>({});
  const [remarks,    setRemarks]    = useState<Record<string,string>>({});
  const [loading,    setLoading]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);

  const user = getUser();

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const [stuRes, attRes] = await Promise.all([
        studentsApi.getAll({ className }),
        attendanceApi.getByClass(className, date),
      ]);
      const studs = stuRes.data.data || [];
      const attData: any[] = attRes.data.data || [];
      setStudents(studs);
      // Pre-fill attendance from existing records
      const init: Record<string,Status> = {};
      studs.forEach((s: any) => { init[s.id] = 'PRESENT'; });
      attData.forEach((a: any) => { if (a.studentId) init[a.studentId] = a.status; });
      setAttendance(init);
    } catch { setStudents([]); }
    finally { setLoading(false); }
  }, [className, date]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  const setStatus = (id: string, status: Status) =>
    setAttendance(p => ({ ...p, [id]: status }));

  const setRemark = (id: string, val: string) =>
    setRemarks(p => ({ ...p, [id]: val }));

  const markAll = (status: Status) => {
    const next: Record<string,Status> = {};
    students.forEach(s => { next[s.id] = status; });
    setAttendance(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const records = students.map(s => ({
        studentId: s.id,
        status: attendance[s.id] || 'PRESENT',
        remark: remarks[s.id] || '',
      }));
      // Get teacher ID from profile or use placeholder
      await attendanceApi.markBulk({
        className,
        date,
        teacherId: user?.id || 'teacher-1',
        records,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) { alert(e?.message || 'Error saving attendance'); }
    finally { setSaving(false); }
  };

  const present = Object.values(attendance).filter(s => s === 'PRESENT').length;
  const absent  = Object.values(attendance).filter(s => s === 'ABSENT').length;
  const late    = Object.values(attendance).filter(s => s === 'LATE').length;
  const pct     = students.length ? Math.round((present / students.length) * 100) : 0;

  const STATUS_STYLE: Record<Status,{bg:string;text:string;border:string}> = {
    PRESENT: { bg:'rgba(34,197,94,0.15)',  text:'#86EFAC', border:'rgba(34,197,94,0.4)'  },
    ABSENT:  { bg:'rgba(239,68,68,0.15)',  text:'#FCA5A5', border:'rgba(239,68,68,0.4)'  },
    LATE:    { bg:'rgba(245,158,11,0.15)', text:'#FCD34D', border:'rgba(245,158,11,0.4)' },
  };

  return (
    <AppShell title="Mark Attendance" subtitle={`${className} · ${date}`}>

      {saved && (
        <div className="fixed top-20 right-6 z-50 px-5 py-3 rounded-2xl text-sm font-bold shadow-xl animate-fade-up"
             style={{background:'rgba(34,197,94,0.15)',border:'1px solid rgba(34,197,94,0.4)',color:'#86EFAC'}}>
          ✅ Attendance saved for {className} on {date}
        </div>
      )}

      {/* CONTROLS */}
      <div className="glass rounded-2xl p-5 mb-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.4)'}}>Class</label>
            <select value={className} onChange={e=>setClassName(e.target.value)}
                    className="sims-input text-sm" style={{width:120,padding:'8px 28px 8px 12px'}}>
              {MY_CLASSES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.4)'}}>Date</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)}
                   className="sims-input text-sm" style={{width:160,padding:'8px 12px'}}/>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>markAll('PRESENT')}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition-all hover:-translate-y-0.5"
                  style={{background:'rgba(34,197,94,0.15)',border:'1px solid rgba(34,197,94,0.3)',color:'#86EFAC'}}>
            ✅ All Present
          </button>
          <button onClick={()=>markAll('ABSENT')}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition-all hover:-translate-y-0.5"
                  style={{background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.3)',color:'#FCA5A5'}}>
            ❌ All Absent
          </button>
          <button onClick={handleSave} disabled={saving||students.length===0}
                  className="px-5 py-2 rounded-xl text-sm font-black transition-all hover:-translate-y-0.5 disabled:opacity-50"
                  style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
            {saving?'⏳ Saving...':'💾 Save Attendance'}
          </button>
        </div>
      </div>

      {/* SUMMARY STRIP */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          {label:'Total',   value:students.length, col:'rgba(255,255,255,0.7)', bg:'rgba(255,255,255,0.05)'},
          {label:'Present', value:present, col:'#86EFAC', bg:'rgba(34,197,94,0.08)'},
          {label:'Absent',  value:absent,  col:'#FCA5A5', bg:'rgba(239,68,68,0.08)'},
          {label:'Rate',    value:`${pct}%`, col:'#F0C040', bg:'rgba(212,160,23,0.08)'},
        ].map(c=>(
          <div key={c.label} className="rounded-2xl p-4 text-center" style={{background:c.bg,border:'1px solid rgba(255,255,255,0.07)'}}>
            <div className="text-2xl font-black" style={{color:c.col}}>{c.value}</div>
            <div className="text-xs mt-1" style={{color:'rgba(255,255,255,0.4)'}}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* STUDENT TABLE */}
      <div className="glass rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(6)].map((_,i)=><div key={i} className="skeleton h-14 rounded-xl"/>)}
          </div>
        ) : students.length===0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3 opacity-40">👨‍🎓</div>
            <p className="text-sm font-bold text-white">No students in {className}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="sims-table">
              <thead>
                <tr><th>#</th><th>Student Name</th><th>Roll No</th><th>Status</th><th>Remark</th></tr>
              </thead>
              <tbody>
                {students.map((s,i)=>{
                  const st = attendance[s.id] || 'PRESENT';
                  const ss = STATUS_STYLE[st];
                  return (
                    <tr key={s.id}>
                      <td className="text-white/30 text-xs">{i+1}</td>
                      <td className="font-bold text-white">{s.name}</td>
                      <td className="font-mono text-xs" style={{color:'rgba(255,255,255,0.45)'}}>{s.roll}</td>
                      <td>
                        <div className="flex gap-1.5">
                          {(['PRESENT','ABSENT','LATE'] as Status[]).map(status=>(
                            <button key={status} onClick={()=>setStatus(s.id,status)}
                                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                                    style={{
                                      background: st===status ? STATUS_STYLE[status].bg : 'rgba(255,255,255,0.04)',
                                      border: `1px solid ${st===status ? STATUS_STYLE[status].border : 'rgba(255,255,255,0.08)'}`,
                                      color: st===status ? STATUS_STYLE[status].text : 'rgba(255,255,255,0.35)',
                                    }}>
                              {status==='PRESENT'?'✅':status==='ABSENT'?'❌':'⏰'} {status}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td>
                        <input value={remarks[s.id]||''} onChange={e=>setRemark(s.id,e.target.value)}
                               className="sims-input text-xs" style={{padding:'6px 10px',maxWidth:200}}
                               placeholder="Optional remark..."/>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
