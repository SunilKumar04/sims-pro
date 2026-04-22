'use client';
// src/app/admin/homework/page.tsx
import { useEffect, useState, useCallback } from 'react';
import AppShell from '@/components/layout/AppShell';
import { homeworkApi, teachersApi } from '@/lib/api';
import { toast } from '@/components/ui/Toast';
import { confirm } from '@/components/ui/Confirm';

const CLASSES  = ['10A','10B','9A','9B','8A','8B','7A','7B'];
const SUBJECTS = ['Mathematics','Physics','Chemistry','Biology','English','Hindi','History','Geography','Computer Science','Physical Education'];

const SUBJECT_COLORS: Record<string,{bg:string;text:string}> = {
  Mathematics:        {bg:'rgba(79,70,229,0.15)',   text:'#a5b4fc'},
  Physics:            {bg:'rgba(30,144,255,0.15)',  text:'#93c5fd'},
  Chemistry:          {bg:'rgba(34,197,94,0.15)',   text:'#86efac'},
  Biology:            {bg:'rgba(16,185,129,0.15)',  text:'#6ee7b7'},
  English:            {bg:'rgba(245,158,11,0.15)',  text:'#fcd34d'},
  Hindi:              {bg:'rgba(239,68,68,0.15)',   text:'#fca5a5'},
  History:            {bg:'rgba(168,85,247,0.15)',  text:'#d8b4fe'},
  'Computer Science': {bg:'rgba(99,102,241,0.15)',  text:'#c7d2fe'},
};

function subStyle(s:string) { return SUBJECT_COLORS[s] || {bg:'rgba(255,255,255,0.08)',text:'rgba(255,255,255,0.5)'}; }

type ModalMode = 'add'|'edit'|'view'|null;

export default function AdminHomework() {
  const [hw,        setHw]        = useState<any[]>([]);
  const [teachers,  setTeachers]  = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState<ModalMode>(null);
  const [selected,  setSelected]  = useState<any>(null);
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState<string|null>(null);
  const [form,      setForm]      = useState<any>({});
  const [filterCls, setFilterCls] = useState('');
  const [filterSub, setFilterSub] = useState('');
  const [search,    setSearch]    = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [hwRes, tchRes] = await Promise.all([
        homeworkApi.getAll({ className: filterCls||undefined, subject: filterSub||undefined }),
        teachersApi.getAll({}),
      ]);
      setHw(hwRes.data.data || []);
      setTeachers(tchRes.data.data || []);
    } catch { setHw([]); }
    finally { setLoading(false); }
  }, [filterCls, filterSub]);

  useEffect(() => { load(); }, [load]);

  const sf = (k:string, v:any) => setForm((p:any) => ({...p,[k]:v}));

  const openAdd = () => {
    setSelected(null);
    setForm({ subject:'Mathematics', className:'10A' });
    setModal('add');
  };
  const openEdit = (h:any) => {
    setSelected(h);
    setForm({
      title:       h.title,
      subject:     h.subject,
      className:   h.className,
      dueDate:     h.dueDate?.slice(0,10),
      description: h.description,
    });
    setModal('edit');
  };
  const openView = (h:any) => { setSelected(h); setModal('view'); };

  const handleSave = async () => {
    if (!form.title?.trim()) { toast.warning('Validation', 'Title is required'); return; };
    if (!form.dueDate)       { toast.warning('Validation', 'Due date is required'); return; };
    setSaving(true);
    try {
      if (modal === 'add') { await homeworkApi.create(form); toast.success('Homework Assigned', form.title); } else { await homeworkApi.update(selected.id, form); toast.success('Homework Updated', form.title); }
      setModal(null); load();
    } catch (e:any) { toast.error('Error', e?.message || 'Error saving homework'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id:string, title:string) => {
    if (!(await confirm({ title: 'Delete Homework', message: `Delete homework \"${title}\"? Students will no longer see this assignment.`, confirm: 'Yes, Delete', cancel: 'Cancel', danger: true }))) return;
    setDeleting(id);
    try { await homeworkApi.delete(id); toast.success('Homework Deleted', title); load(); }
    catch (e:any) { toast.error('Error', e?.message || 'Error'); }
    finally { setDeleting(null); }
  };

  const displayed = hw.filter(h =>
    (!search || h.title?.toLowerCase().includes(search.toLowerCase()) ||
                h.subject?.toLowerCase().includes(search.toLowerCase()))
  );

  const overdue   = displayed.filter(h => new Date(h.dueDate) < new Date());
  const upcoming  = displayed.filter(h => new Date(h.dueDate) >= new Date());
  const classes   = [...new Set(hw.map(h => h.className))].filter(Boolean);
  const subjects  = [...new Set(hw.map(h => h.subject))].filter(Boolean);

  function HWCard({ h }: { h:any }) {
    const ss = subStyle(h.subject);
    const daysLeft = Math.ceil((new Date(h.dueDate).getTime()-Date.now())/(1000*60*60*24));
    const isOverdue = daysLeft < 0;
    const urgCol = isOverdue?'#FCA5A5':daysLeft<=1?'#FCA5A5':daysLeft<=3?'#FCD34D':'#86EFAC';
    const teacherName = h.teacher?.user?.name || 'Unknown';
    return (
      <div
        className="glass rounded-2xl p-5 group transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl cursor-pointer"
        style={{border:`1px solid ${isOverdue?'rgba(239,68,68,0.3)':'rgba(255,255,255,0.08)'}`}}
        onClick={() => openView(h)}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
               style={{background:ss.bg,border:`1px solid ${ss.text}35`}}>📖</div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e=>e.stopPropagation()}>
            <button onClick={()=>openEdit(h)} className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                    style={{background:'rgba(212,160,23,0.15)'}}>✏️</button>
            <button onClick={()=>handleDelete(h.id,h.title)} disabled={deleting===h.id}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-sm disabled:opacity-40"
                    style={{background:'rgba(239,68,68,0.15)'}}>
              {deleting===h.id?'⏳':'🗑️'}
            </button>
          </div>
        </div>
        {/* Title */}
        <h3 className="text-sm font-bold text-white mb-2 line-clamp-2">{h.title}</h3>
        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{background:ss.bg,color:ss.text}}>{h.subject}</span>
          <span className="text-xs px-2 py-0.5 rounded-lg font-bold" style={{background:'rgba(30,144,255,0.12)',color:'#93C5FD'}}>Class {h.className}</span>
        </div>
        {/* Description */}
        {h.description && (
          <p className="text-xs mb-3 line-clamp-2 leading-relaxed" style={{color:'rgba(255,255,255,0.45)'}}>{h.description}</p>
        )}
        {/* Footer */}
        <div className="flex items-center justify-between pt-3" style={{borderTop:'1px solid rgba(255,255,255,0.07)'}}>
          <div className="text-xs" style={{color:'rgba(255,255,255,0.35)'}}>🧑‍🏫 {teacherName}</div>
          <div className="text-xs font-bold" style={{color:urgCol}}>
            {isOverdue ? `${Math.abs(daysLeft)}d overdue` : daysLeft===0 ? 'Due today!' : daysLeft===1 ? 'Due tomorrow' : `${daysLeft}d left`}
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppShell title="Homework Management" subtitle={`${hw.length} assignments across all classes`}>

      {/* STATS */}
      <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {icon:'📚',label:'Total Assigned',  value:hw.length,        col:'#F0C040',bg:'rgba(212,160,23,0.12)',bd:'rgba(212,160,23,0.2)'},
          {icon:'⏳',label:'Due This Week',   value:upcoming.filter(h=>{const d=Math.ceil((new Date(h.dueDate).getTime()-Date.now())/(1000*60*60*24));return d>=0&&d<=7;}).length, col:'#93C5FD',bg:'rgba(30,144,255,0.12)',bd:'rgba(30,144,255,0.2)'},
          {icon:'⚠️',label:'Overdue',         value:overdue.length,   col:'#FCA5A5',bg:'rgba(239,68,68,0.12)',bd:'rgba(239,68,68,0.2)'},
          {icon:'🏫',label:'Classes Covered', value:classes.length,   col:'#86EFAC',bg:'rgba(34,197,94,0.12)',bd:'rgba(34,197,94,0.2)'},
        ].map(c=>(
          <div key={c.label} className="glass rounded-2xl p-5 hover:-translate-y-0.5 transition-transform">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3" style={{background:c.bg,border:`1px solid ${c.bd}`}}>{c.icon}</div>
            <div className="text-2xl font-black" style={{color:c.col}}>{c.value}</div>
            <div className="text-xs mt-1" style={{color:'rgba(255,255,255,0.4)'}}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* TOOLBAR */}
      <div className="glass rounded-2xl p-4 mb-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-[200px] max-w-xs"
               style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)'}}>
            <span style={{color:'rgba(255,255,255,0.3)',fontSize:13}}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)}
                   placeholder="Search homework..." className="bg-transparent text-sm text-white placeholder-white/20 outline-none flex-1"/>
            {search && <button onClick={()=>setSearch('')} className="text-white/30 hover:text-white/60 text-xs">✕</button>}
          </div>
          {/* Class filter */}
          <select value={filterCls} onChange={e=>setFilterCls(e.target.value)}
                  className="sims-input text-sm" style={{width:130,padding:'8px 28px 8px 12px'}}>
            <option value="">All Classes</option>
            {CLASSES.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          {/* Subject filter */}
          <select value={filterSub} onChange={e=>setFilterSub(e.target.value)}
                  className="sims-input text-sm" style={{width:160,padding:'8px 28px 8px 12px'}}>
            <option value="">All Subjects</option>
            {SUBJECTS.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button onClick={openAdd}
                className="px-5 py-2.5 rounded-xl text-sm font-black hover:-translate-y-0.5 transition-all"
                style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
          + Assign Homework
        </button>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_,i)=><div key={i} className="skeleton h-48 rounded-2xl"/>)}
        </div>
      )}

      {/* EMPTY */}
      {!loading && displayed.length===0 && (
        <div className="glass rounded-2xl py-20 text-center">
          <div className="text-5xl mb-4 opacity-40">📚</div>
          <div className="text-lg font-bold mb-2">No homework found</div>
          <p className="text-sm mb-6" style={{color:'rgba(255,255,255,0.35)'}}>
            {search||filterCls||filterSub?'Try adjusting your filters':'No homework has been assigned yet'}
          </p>
          {!search&&!filterCls&&!filterSub&&(
            <button onClick={openAdd} className="px-6 py-2.5 rounded-xl text-sm font-bold"
                    style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
              + Assign First Homework
            </button>
          )}
        </div>
      )}

      {/* OVERDUE SECTION */}
      {!loading && overdue.length>0 && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-black uppercase tracking-wider px-2 py-1 rounded-lg"
                  style={{background:'rgba(239,68,68,0.15)',color:'#FCA5A5'}}>
              ⚠️ Overdue ({overdue.length})
            </span>
            <div className="h-px flex-1" style={{background:'rgba(239,68,68,0.2)'}}/>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {overdue.map(h=><HWCard key={h.id} h={h}/>)}
          </div>
        </div>
      )}

      {/* UPCOMING SECTION */}
      {!loading && upcoming.length>0 && (
        <div>
          {overdue.length>0 && (
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider" style={{color:'rgba(255,255,255,0.35)'}}>Upcoming ({upcoming.length})</span>
              <div className="h-px flex-1" style={{background:'rgba(255,255,255,0.07)'}}/>
            </div>
          )}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {upcoming.map(h=><HWCard key={h.id} h={h}/>)}
          </div>
        </div>
      )}

      {/* ADD/EDIT MODAL */}
      {(modal==='add'||modal==='edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)'}}>
          <div className="w-full max-w-lg rounded-3xl shadow-2xl"
               style={{background:'#0F2044',border:'1px solid rgba(255,255,255,0.1)'}}>
            <div className="flex items-center justify-between px-8 pt-7 pb-5">
              <div>
                <h2 className="text-xl font-extrabold">{modal==='add'?'+ Assign Homework':'✏️ Edit Homework'}</h2>
                <p className="text-xs mt-0.5" style={{color:'rgba(255,255,255,0.4)'}}>
                  {modal==='add'?'Create a new homework assignment':'Update assignment details'}
                </p>
              </div>
              <button onClick={()=>setModal(null)}
                      className="w-8 h-8 rounded-xl glass flex items-center justify-center text-sm" style={{color:'rgba(255,255,255,0.5)'}}>✕</button>
            </div>
            <div className="px-8 pb-2 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.4)'}}>Title *</label>
                <input value={form.title||''} onChange={e=>sf('title',e.target.value)}
                       className="sims-input" placeholder="e.g. Chapter 5 – Quadratic Equations"/>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.4)'}}>Subject *</label>
                  <select value={form.subject||''} onChange={e=>sf('subject',e.target.value)} className="sims-input">
                    {SUBJECTS.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.4)'}}>Class *</label>
                  <select value={form.className||''} onChange={e=>sf('className',e.target.value)} className="sims-input">
                    {CLASSES.map(c=><option key={c} value={c}>{c}</option>)}
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
                          className="sims-input resize-none" rows={4}
                          placeholder="Write clear instructions for students..."/>
              </div>
            </div>
            <div className="flex gap-3 px-8 py-6" style={{borderTop:'1px solid rgba(255,255,255,0.07)'}}>
              <button onClick={()=>setModal(null)} className="flex-1 py-3 rounded-xl text-sm font-bold glass hover:bg-white/10">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                      className="flex-1 py-3 rounded-xl text-sm font-black hover:-translate-y-0.5 transition-all disabled:opacity-60"
                      style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
                {saving?'⏳ Saving...':(modal==='add'?'📚 Assign':'✅ Save Changes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {modal==='view' && selected && (()=>{
        const ss = subStyle(selected.subject);
        const daysLeft = Math.ceil((new Date(selected.dueDate).getTime()-Date.now())/(1000*60*60*24));
        const isOverdue = daysLeft < 0;
        const urgCol = isOverdue?'#FCA5A5':daysLeft<=3?'#FCD34D':'#86EFAC';
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
               style={{background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)'}}>
            <div className="w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
                 style={{background:'#0F2044',border:'1px solid rgba(255,255,255,0.1)'}}>
              <div className="px-8 py-7" style={{background:'linear-gradient(160deg,#0F2044,#162952)',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{background:ss.bg,color:ss.text}}>{selected.subject}</span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold" style={{background:'rgba(30,144,255,0.12)',color:'#93C5FD'}}>Class {selected.className}</span>
                </div>
                <h2 className="text-xl font-extrabold text-white mb-2">{selected.title}</h2>
                <div className="flex items-center gap-3 text-xs" style={{color:'rgba(255,255,255,0.4)'}}>
                  <span>🧑‍🏫 {selected.teacher?.user?.name || 'Teacher'}</span>
                  <span>·</span>
                  <span style={{color:urgCol}}>
                    Due: {selected.dueDate?.slice(0,10)}
                    {isOverdue?` (${Math.abs(daysLeft)}d overdue)`:daysLeft===0?' (today!)':daysLeft===1?' (tomorrow)':` (${daysLeft}d left)`}
                  </span>
                </div>
              </div>
              <div className="px-8 py-6">
                <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{color:'rgba(255,255,255,0.4)'}}>Instructions</h3>
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{color:'rgba(255,255,255,0.75)'}}>
                  {selected.description || 'No additional instructions provided.'}
                </p>
              </div>
              <div className="flex gap-3 px-8 pb-7">
                <button onClick={()=>setModal(null)} className="flex-1 py-3 rounded-xl text-sm font-bold glass hover:bg-white/10">Close</button>
                <button onClick={()=>{setModal(null);setTimeout(()=>openEdit(selected),50);}}
                        className="flex-1 py-3 rounded-xl text-sm font-black hover:-translate-y-0.5 transition-all"
                        style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
                  ✏️ Edit
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </AppShell>
  );
}
