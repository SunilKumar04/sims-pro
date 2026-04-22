'use client';
// src/app/teacher/homework/page.tsx
import { useEffect, useState, useCallback } from 'react';
import AppShell from '@/components/layout/AppShell';
import { homeworkApi } from '@/lib/api';
import { toast } from '@/components/ui/Toast';
import { confirm } from '@/components/ui/Confirm';

const MY_CLASSES = ['10A','10B','8A','9A'];
const SUBJECTS   = ['Mathematics','Physics','Chemistry','Biology','English','Hindi','History','Computer Science'];

export default function TeacherHomework() {
  const [hw,       setHw]       = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState<string|null>(null);
  const [filterCls,setFilterCls]= useState('');
  const [form,     setForm]     = useState<any>({ subject:'Mathematics', className:'10A' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await homeworkApi.getAll({ className: filterCls||undefined });
      setHw(res.data.data || []);
    } catch { setHw([]); }
    finally { setLoading(false); }
  }, [filterCls]);

  useEffect(() => { load(); }, [load]);

  const sf = (k:string,v:any) => setForm((p:any)=>({...p,[k]:v}));

  const handleSave = async () => {
    if (!form.title?.trim()) { toast.warning('Validation', 'Title is required'); return; };
    if (!form.dueDate)       { toast.warning('Validation', 'Due date is required'); return; };
    setSaving(true);
    try {
      await homeworkApi.create(form);
      toast.success('Homework Assigned', form.title);
      setModal(false); setForm({ subject:'Mathematics', className:'10A' }); load();
    } catch (e:any) { toast.error('Error', e?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id:string, title:string) => {
    if (!(await confirm({ title: 'Delete Homework', message: `Delete homework \"${title}\"? Students will no longer see this assignment.`, confirm: 'Yes, Delete', cancel: 'Cancel', danger: true }))) return;
    setDeleting(id);
    try { await homeworkApi.delete(id); toast.success('Deleted', title); load(); }
    catch (e:any) { toast.error('Error', e?.message || 'Error'); }
    finally { setDeleting(null); }
  };

  const SUBJECT_COLORS: Record<string,string> = {
    Mathematics:'#a5b4fc', Physics:'#93c5fd', Chemistry:'#86efac',
    English:'#fcd34d', Hindi:'#fca5a5', History:'#d8b4fe',
    'Computer Science':'#c7d2fe',
  };

  const totalDue = hw.filter(h => new Date(h.dueDate) >= new Date()).length;

  return (
    <AppShell title="Homework" subtitle="Assign and manage student homework">

      {/* STATS */}
      <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-3">
        {[
          {icon:'📚',label:'Total Assigned',  value:hw.length,    col:'#F0C040',bg:'rgba(212,160,23,0.12)',bd:'rgba(212,160,23,0.2)'},
          {icon:'⏳',label:'Due This Week',   value:totalDue,     col:'#FCA5A5',bg:'rgba(239,68,68,0.12)',bd:'rgba(239,68,68,0.2)'},
          {icon:'🏫',label:'Classes Covered', value:[...new Set(hw.map(h=>h.className))].length, col:'#86EFAC',bg:'rgba(34,197,94,0.12)',bd:'rgba(34,197,94,0.2)'},
        ].map(c=>(
          <div key={c.label} className="glass rounded-2xl p-5 hover:-translate-y-0.5 transition-transform">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3" style={{background:c.bg,border:`1px solid ${c.bd}`}}>{c.icon}</div>
            <div className="text-2xl font-black" style={{color:c.col}}>{c.value}</div>
            <div className="text-xs mt-1" style={{color:'rgba(255,255,255,0.4)'}}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* TOOLBAR */}
      <div className="glass rounded-2xl p-4 mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {['', ...MY_CLASSES].map(c=>(
            <button key={c} onClick={()=>setFilterCls(c)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                    style={{
                      background: filterCls===c?'rgba(212,160,23,0.2)':'rgba(255,255,255,0.04)',
                      border:`1px solid ${filterCls===c?'rgba(212,160,23,0.4)':'rgba(255,255,255,0.08)'}`,
                      color: filterCls===c?'#F0C040':'rgba(255,255,255,0.4)',
                    }}>
              {c||'All Classes'}
            </button>
          ))}
        </div>
        <button onClick={()=>{setForm({subject:'Mathematics',className:'10A'});setModal(true);}}
                className="w-full rounded-xl px-5 py-2.5 text-sm font-black transition-all hover:-translate-y-0.5 sm:w-auto"
                style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
          + Assign Homework
        </button>
      </div>

      {/* LIST */}
      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="skeleton h-24 rounded-2xl"/>)}</div>
      ) : hw.length===0 ? (
        <div className="glass rounded-2xl py-20 text-center">
          <div className="text-5xl mb-4 opacity-40">📚</div>
          <div className="text-lg font-bold mb-2">No homework assigned yet</div>
          <p className="text-sm mb-6" style={{color:'rgba(255,255,255,0.35)'}}>Assign your first homework to a class</p>
          <button onClick={()=>{setForm({subject:'Mathematics',className:'10A'});setModal(true);}}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold"
                  style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
            + Assign First Homework
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {hw.map(h=>{
            const isOverdue = new Date(h.dueDate) < new Date();
            const tc = SUBJECT_COLORS[h.subject]||'rgba(255,255,255,0.5)';
            return (
              <div key={h.id} className="glass rounded-2xl p-5 flex items-start gap-4 transition-all hover:-translate-y-0.5"
                   style={{border:'1px solid rgba(255,255,255,0.07)'}}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                     style={{background:`${tc}18`,border:`1px solid ${tc}35`}}>📖</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-white mb-1">{h.title}</h3>
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{background:`${tc}18`,color:tc}}>{h.subject}</span>
                        <span className="text-xs px-2 py-0.5 rounded-lg font-bold" style={{background:'rgba(30,144,255,0.12)',color:'#93C5FD'}}>Class {h.className}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isOverdue?'':''}` }
                              style={{background:isOverdue?'rgba(239,68,68,0.12)':'rgba(34,197,94,0.12)',color:isOverdue?'#FCA5A5':'#86EFAC'}}>
                          {isOverdue?'⚠️ Overdue':'Due: '}{h.dueDate?.slice(0,10)}
                        </span>
                      </div>
                      {h.description && <p className="text-xs leading-relaxed" style={{color:'rgba(255,255,255,0.5)'}}>{h.description}</p>}
                    </div>
                    <button onClick={()=>handleDelete(h.id,h.title)} disabled={deleting===h.id}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 disabled:opacity-40 transition-all"
                            style={{background:'rgba(239,68,68,0.12)',color:'#FCA5A5',border:'1px solid rgba(239,68,68,0.2)'}}>
                      {deleting===h.id?'⏳':'🗑️ Delete'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)'}}>
          <div className="w-full max-w-lg rounded-3xl shadow-2xl" style={{background:'#0F2044',border:'1px solid rgba(255,255,255,0.1)'}}>
            <div className="flex items-center justify-between px-8 pt-7 pb-5">
              <h2 className="text-xl font-extrabold">+ Assign Homework</h2>
              <button onClick={()=>setModal(false)} className="w-8 h-8 rounded-xl glass flex items-center justify-center" style={{color:'rgba(255,255,255,0.5)'}}>✕</button>
            </div>
            <div className="px-8 pb-2 space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.4)'}}>Title *</label>
                <input value={form.title||''} onChange={e=>sf('title',e.target.value)} className="sims-input" placeholder="Homework title"/>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.4)'}}>Subject</label>
                  <select value={form.subject||''} onChange={e=>sf('subject',e.target.value)} className="sims-input">
                    {SUBJECTS.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.4)'}}>Class</label>
                  <select value={form.className||''} onChange={e=>sf('className',e.target.value)} className="sims-input">
                    {MY_CLASSES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.4)'}}>Due Date *</label>
                <input type="date" value={form.dueDate||''} onChange={e=>sf('dueDate',e.target.value)} className="sims-input"/>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.4)'}}>Description / Instructions</label>
                <textarea value={form.description||''} onChange={e=>sf('description',e.target.value)}
                          className="sims-input resize-none" rows={4} placeholder="Detailed instructions for students..."/>
              </div>
            </div>
            <div className="flex gap-3 px-8 py-6" style={{borderTop:'1px solid rgba(255,255,255,0.07)'}}>
              <button onClick={()=>setModal(false)} className="flex-1 py-3 rounded-xl text-sm font-bold glass hover:bg-white/10">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                      className="flex-1 py-3 rounded-xl text-sm font-black hover:-translate-y-0.5 transition-all disabled:opacity-60"
                      style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
                {saving?'⏳ Saving...':'📚 Assign Homework'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
