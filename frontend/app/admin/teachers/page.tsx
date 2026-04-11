'use client';
// src/app/admin/teachers/page.tsx
import { useEffect, useState, useCallback } from 'react';
import AppShell from '@/components/layout/AppShell';
import { teachersApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/Toast';
import { confirm } from '@/components/ui/Confirm';

const SUBJECTS = [
  'Mathematics','Physics','Chemistry','Biology','English',
  'Hindi','History','Geography','Computer Science','Physical Education',
  'Economics','Accountancy','Political Science','Sanskrit',
];

const SUBJECT_COLORS: Record<string, { bg: string; text: string }> = {
  Mathematics:        { bg: 'rgba(79,70,229,0.15)',  text: '#a5b4fc' },
  Physics:            { bg: 'rgba(30,144,255,0.15)', text: '#93c5fd' },
  Chemistry:          { bg: 'rgba(34,197,94,0.15)',  text: '#86efac' },
  Biology:            { bg: 'rgba(16,185,129,0.15)', text: '#6ee7b7' },
  English:            { bg: 'rgba(245,158,11,0.15)', text: '#fcd34d' },
  Hindi:              { bg: 'rgba(239,68,68,0.15)',  text: '#fca5a5' },
  History:            { bg: 'rgba(168,85,247,0.15)', text: '#d8b4fe' },
  Geography:          { bg: 'rgba(20,184,166,0.15)', text: '#99f6e4' },
  'Computer Science': { bg: 'rgba(99,102,241,0.15)', text: '#c7d2fe' },
  'Physical Education':{ bg: 'rgba(249,115,22,0.15)', text: '#fdba74' },
};

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#D4A017,#F0C040)',
  'linear-gradient(135deg,#1E90FF,#60B4FF)',
  'linear-gradient(135deg,#22C55E,#86EFAC)',
  'linear-gradient(135deg,#8B5CF6,#C4B5FD)',
  'linear-gradient(135deg,#EF4444,#FCA5A5)',
  'linear-gradient(135deg,#F59E0B,#FDE68A)',
  'linear-gradient(135deg,#06B6D4,#67E8F9)',
  'linear-gradient(135deg,#EC4899,#FBCFE8)',
];

function subjectStyle(subject: string) {
  return SUBJECT_COLORS[subject] || { bg: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.55)' };
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function avatarGrad(i: number) {
  return AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length];
}

type ModalMode = 'add' | 'edit' | 'view' | null;
type ViewMode  = 'cards' | 'table';

export default function AdminTeachers() {
  const [teachers,  setTeachers]  = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState<ModalMode>(null);
  const [selected,  setSelected]  = useState<any>(null);
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState<string|null>(null);
  const [form,      setForm]      = useState<any>({});
  const [search,    setSearch]    = useState('');
  const [filterSub, setFilterSub] = useState('');
  const [viewMode,  setViewMode]  = useState<ViewMode>('cards');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await teachersApi.getAll({ search: search || undefined });
      setTeachers(res.data.data || []);
    } catch { setTeachers([]); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const setField = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const openAdd = () => {
    setSelected(null);
    setForm({ subject: 'Mathematics' });
    setModal('add');
  };

  const openEdit = (t: any) => {
    setSelected(t);
    setForm({
      name: t.user?.name || t.name || '',
      email: t.user?.email || t.email || '',
      employeeCode: t.employeeCode || '',
      subject: t.subject || 'Mathematics',
      assignedClasses: t.assignedClasses || '',
      phone: t.phone || '',
      qualification: t.qualification || '',
      experience: t.experience || '',
      salary: t.salary || '',
    });
    setModal('edit');
  };

  const openView = (t: any) => { setSelected(t); setModal('view'); };

  const handleSave = async () => {
    if (!form.name?.trim())  { toast.warning('Validation', 'Name is required'); return; };
    if (!form.email?.trim()) { toast.warning('Validation', 'Email is required'); return; };
    setSaving(true);
    try {
      if (modal === 'add') await teachersApi.create(form);
      else await teachersApi.update(selected.id, form);
      setModal(null);
      load();
    } catch (e: any) {
      toast.error('Error', e?.message || 'Error saving teacher');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!(await confirm({ title: 'Delete Teacher', message: `Delete \"${name}\" from the system? All their attendance and homework records will be removed.`, confirm: 'Yes, Delete', cancel: 'Cancel', danger: true }))) return;
    setDeleting(id);
    try { await teachersApi.delete(id); toast.success('Teacher Removed', `${name} deleted`); load(); }
    catch (e: any) { toast.error('Error', e?.message || 'Error'); }
    finally { setDeleting(null); }
  };

  // Filtered display list
  const displayed = teachers.filter(t => {
    const n = t.user?.name || t.name || '';
    return (!filterSub || t.subject === filterSub);
  });

  const uniqueSubjects = [...new Set(teachers.map(t => t.subject))].filter(Boolean);

  return (
    <AppShell title="Teacher Management" subtitle={`${teachers.length} faculty members`}>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { icon:'👩‍🏫', label:'Total Teachers',   value: teachers.length,       col:'#F0C040', bg:'rgba(212,160,23,0.12)',  bd:'rgba(212,160,23,0.2)' },
          { icon:'📚',  label:'Subjects Taught',   value: uniqueSubjects.length, col:'#93C5FD', bg:'rgba(30,144,255,0.12)',  bd:'rgba(30,144,255,0.2)' },
          { icon:'🏫',  label:'Classes Covered',   value: teachers.reduce((a,t)=>a+(t.assignedClasses?.split(',').filter(Boolean).length||0),0), col:'#86EFAC', bg:'rgba(34,197,94,0.12)', bd:'rgba(34,197,94,0.2)' },
          { icon:'💰',  label:'Avg. Salary',        value: teachers.length ? `₹${Math.round(teachers.reduce((a,t)=>a+(t.salary||0),0)/teachers.length/1000)}K` : '—', col:'#FCA5A5', bg:'rgba(239,68,68,0.12)', bd:'rgba(239,68,68,0.2)' },
        ].map(c=>(
          <div key={c.label} className="glass rounded-2xl p-5 hover:-translate-y-0.5 transition-transform cursor-default">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3" style={{background:c.bg,border:`1px solid ${c.bd}`}}>{c.icon}</div>
            <div className="text-2xl font-black" style={{color:c.col}}>{c.value}</div>
            <div className="text-xs mt-1" style={{color:'rgba(255,255,255,0.4)'}}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* ── TOOLBAR ── */}
      <div className="glass rounded-2xl p-4 mb-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 max-w-xs"
               style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)'}}>
            <span style={{color:'rgba(255,255,255,0.3)',fontSize:13}}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)}
                   placeholder="Search by name..." className="bg-transparent text-sm text-white placeholder-white/20 outline-none flex-1"/>
            {search && <button onClick={()=>setSearch('')} className="text-white/30 hover:text-white/60 text-xs">✕</button>}
          </div>
          <select value={filterSub} onChange={e=>setFilterSub(e.target.value)}
                  className="sims-input text-sm" style={{width:160,padding:'8px 32px 8px 12px'}}>
            <option value="">All Subjects</option>
            {SUBJECTS.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl overflow-hidden" style={{border:'1px solid rgba(255,255,255,0.1)'}}>
            {(['cards','table'] as ViewMode[]).map(v=>(
              <button key={v} onClick={()=>setViewMode(v)}
                      className="px-3 py-2 text-xs font-bold capitalize transition-all"
                      style={{background:viewMode===v?'rgba(212,160,23,0.2)':'transparent',color:viewMode===v?'#F0C040':'rgba(255,255,255,0.4)'}}>
                {v==='cards'?'▦ Cards':'☰ Table'}
              </button>
            ))}
          </div>
          <button onClick={openAdd}
                  className="px-5 py-2.5 rounded-xl text-sm font-black transition-all hover:-translate-y-0.5"
                  style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
            + Add Teacher
          </button>
        </div>
      </div>

      {/* ── LOADING SKELETONS ── */}
      {loading && (
        <div className={cn(viewMode==='cards'?'grid grid-cols-3 gap-5':'space-y-3')}>
          {[...Array(6)].map((_,i)=>(
            <div key={i} className={cn('skeleton rounded-2xl',viewMode==='cards'?'h-60':'h-14')}/>
          ))}
        </div>
      )}

      {/* ── EMPTY STATE ── */}
      {!loading && displayed.length===0 && (
        <div className="glass rounded-2xl py-20 text-center">
          <div className="text-5xl mb-4 opacity-40">👩‍🏫</div>
          <div className="text-lg font-bold mb-2">No teachers found</div>
          <p className="text-sm mb-6" style={{color:'rgba(255,255,255,0.35)'}}>
            {search||filterSub?'Try adjusting your search or filter':'Add your first faculty member to get started'}
          </p>
          {!search&&!filterSub&&(
            <button onClick={openAdd} className="px-6 py-2.5 rounded-xl text-sm font-bold"
                    style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
              + Add First Teacher
            </button>
          )}
        </div>
      )}

      {/* ══════════ CARDS VIEW ══════════ */}
      {!loading && displayed.length>0 && viewMode==='cards' && (
        <div className="grid grid-cols-3 gap-5">
          {displayed.map((t,i)=>{
            const name  = t.user?.name  || t.name  || 'Unknown';
            const email = t.user?.email || t.email || '';
            const ss    = subjectStyle(t.subject);
            const classes = (t.assignedClasses||'').split(',').map((c:string)=>c.trim()).filter(Boolean);
            return (
              <div key={t.id} className="glass rounded-2xl p-6 group transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl"
                   style={{border:'1px solid rgba(255,255,255,0.08)'}}>

                {/* Header row */}
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-lg flex-shrink-0"
                         style={{background:avatarGrad(i)}}>
                      {initials(name)}
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm leading-tight">{name}</div>
                      <div className="text-xs mt-0.5" style={{color:'rgba(255,255,255,0.38)'}}>{t.employeeCode}</div>
                    </div>
                  </div>
                  {/* Hover actions */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={()=>openView(t)} title="View" className="w-7 h-7 rounded-lg flex items-center justify-center text-sm glass">👁</button>
                    <button onClick={()=>openEdit(t)} title="Edit" className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{background:'rgba(212,160,23,0.15)'}}>✏️</button>
                    <button onClick={()=>handleDelete(t.id,name)} disabled={deleting===t.id} title="Delete"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm disabled:opacity-40"
                            style={{background:'rgba(239,68,68,0.15)'}}>
                      {deleting===t.id?'⏳':'🗑️'}
                    </button>
                  </div>
                </div>

                {/* Subject + experience */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold"
                        style={{background:ss.bg,color:ss.text}}>{t.subject}</span>
                  <span className="text-xs px-2 py-0.5 rounded-lg"
                        style={{background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.4)'}}>{t.experience}</span>
                </div>

                {/* Info */}
                <div className="space-y-1.5 mb-4">
                  {[['📞',t.phone],['✉️',email],['🎓',t.qualification]].map(([ic,val])=>(
                    val ? <div key={ic as string} className="flex items-center gap-2 text-xs" style={{color:'rgba(255,255,255,0.55)'}}>
                      <span>{ic}</span><span className="truncate">{val}</span>
                    </div> : null
                  ))}
                </div>

                {/* Classes */}
                {classes.length>0&&(
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {classes.map((c:string)=>(
                      <span key={c} className="px-2 py-0.5 rounded-lg text-xs font-bold"
                            style={{background:'rgba(30,144,255,0.12)',color:'#93C5FD'}}>{c}</span>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3"
                     style={{borderTop:'1px solid rgba(255,255,255,0.07)'}}>
                  <div>
                    <div className="text-base font-black text-white">₹{((t.salary||0)/1000).toFixed(0)}K</div>
                    <div className="text-xs" style={{color:'rgba(255,255,255,0.3)'}}>per month</div>
                  </div>
                  <button onClick={()=>openEdit(t)}
                          className="px-4 py-2 rounded-xl text-xs font-bold glass hover:bg-white/10 transition-all">
                    Edit Profile
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════ TABLE VIEW ══════════ */}
      {!loading && displayed.length>0 && viewMode==='table' && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="sims-table">
              <thead>
                <tr><th>#</th><th>Teacher</th><th>Subject</th><th>Classes</th>
                    <th>Phone</th><th>Qualification</th><th>Exp</th><th>Salary</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {displayed.map((t,i)=>{
                  const name = t.user?.name||t.name||'Unknown';
                  const email = t.user?.email||t.email||'';
                  const ss = subjectStyle(t.subject);
                  const classes = (t.assignedClasses||'').split(',').map((c:string)=>c.trim()).filter(Boolean);
                  return (
                    <tr key={t.id}>
                      <td className="text-white/30 text-xs">{i+1}</td>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0"
                               style={{background:avatarGrad(i),color:'white'}}>{initials(name)}</div>
                          <div>
                            <div className="font-bold text-white text-sm">{name}</div>
                            <div className="text-xs truncate max-w-[140px]" style={{color:'rgba(255,255,255,0.35)'}}>{email}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{background:ss.bg,color:ss.text}}>{t.subject}</span></td>
                      <td><div className="flex flex-wrap gap-1">{classes.map((c:string)=><span key={c} className="px-2 py-0.5 rounded-lg text-xs font-bold" style={{background:'rgba(30,144,255,0.12)',color:'#93C5FD'}}>{c}</span>)}</div></td>
                      <td className="text-sm" style={{color:'rgba(255,255,255,0.6)'}}>{t.phone}</td>
                      <td className="text-sm" style={{color:'rgba(255,255,255,0.6)'}}>{t.qualification}</td>
                      <td className="text-sm" style={{color:'rgba(255,255,255,0.6)'}}>{t.experience}</td>
                      <td className="font-bold text-white text-sm">₹{((t.salary||0)/1000).toFixed(0)}K</td>
                      <td>
                        <div className="flex gap-1.5">
                          <button onClick={()=>openView(t)} className="px-2.5 py-1.5 rounded-lg text-xs font-bold glass hover:bg-white/10">👁</button>
                          <button onClick={()=>openEdit(t)} className="px-2.5 py-1.5 rounded-lg text-xs font-bold" style={{background:'rgba(212,160,23,0.12)',color:'#F0C040',border:'1px solid rgba(212,160,23,0.2)'}}>✏️ Edit</button>
                          <button onClick={()=>handleDelete(t.id,name)} disabled={deleting===t.id}
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40"
                                  style={{background:'rgba(239,68,68,0.12)',color:'#FCA5A5',border:'1px solid rgba(239,68,68,0.2)'}}>
                            {deleting===t.id?'⏳':'🗑️'}
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
      {(modal==='add'||modal==='edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)'}}>
          <div className="w-full max-w-2xl rounded-3xl shadow-2xl"
               style={{background:'#0F2044',border:'1px solid rgba(255,255,255,0.1)'}}>

            {/* Header */}
            <div className="flex items-center justify-between px-8 pt-7 pb-5">
              <div>
                <h2 className="text-xl font-extrabold">
                  {modal==='add'?'+ Add New Teacher':'✏️ Edit Teacher Profile'}
                </h2>
                <p className="text-xs mt-1" style={{color:'rgba(255,255,255,0.4)'}}>
                  {modal==='add'?'Fill in faculty details below':`Editing: ${selected?.user?.name||selected?.name}`}
                </p>
              </div>
              <button onClick={()=>setModal(null)}
                      className="w-8 h-8 rounded-xl glass flex items-center justify-center text-sm" style={{color:'rgba(255,255,255,0.5)'}}>✕</button>
            </div>

            {/* Fields */}
            <div className="px-8 pb-2 max-h-[60vh] overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.4)'}}>Full Name *</label>
                  <input value={form.name||''} onChange={e=>setField('name',e.target.value)} className="sims-input" placeholder="Dr. / Mr. / Ms. Full Name"/>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.4)'}}>Employee Code</label>
                  <input value={form.employeeCode||''} onChange={e=>setField('employeeCode',e.target.value)} className="sims-input" placeholder="EMP005" disabled={modal==='edit'}/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.4)'}}>Email *</label>
                  <input type="email" value={form.email||''} onChange={e=>setField('email',e.target.value)} className="sims-input" placeholder="name@gnpss.edu.in" disabled={modal==='edit'}/>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.4)'}}>Phone</label>
                  <input value={form.phone||''} onChange={e=>setField('phone',e.target.value)} className="sims-input" placeholder="10-digit mobile"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.4)'}}>Subject *</label>
                  <select value={form.subject||''} onChange={e=>setField('subject',e.target.value)} className="sims-input">
                    <option value="">Select subject</option>
                    {SUBJECTS.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.4)'}}>Assigned Classes</label>
                  <input value={form.assignedClasses||''} onChange={e=>setField('assignedClasses',e.target.value)} className="sims-input" placeholder="10A, 10B, 9A"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.4)'}}>Qualification</label>
                  <input value={form.qualification||''} onChange={e=>setField('qualification',e.target.value)} className="sims-input" placeholder="M.Sc Physics / PhD Maths"/>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.4)'}}>Experience</label>
                  <input value={form.experience||''} onChange={e=>setField('experience',e.target.value)} className="sims-input" placeholder="8 years"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.4)'}}>Monthly Salary (₹)</label>
                  <input type="number" value={form.salary||''} onChange={e=>setField('salary',parseInt(e.target.value)||0)} className="sims-input" placeholder="40000"/>
                </div>
                {modal==='add'&&(
                  <div>
                    <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.4)'}}>Password</label>
                    <input type="password" value={form.password||''} onChange={e=>setField('password',e.target.value)} className="sims-input" placeholder="Default: Teacher@1234"/>
                  </div>
                )}
              </div>
              {modal==='add'&&(
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs"
                     style={{background:'rgba(212,160,23,0.07)',border:'1px solid rgba(212,160,23,0.2)',color:'rgba(255,255,255,0.5)'}}>
                  💡 Default password is <strong className="text-yellow-400 mx-1">Teacher@1234</strong> if not set. Teacher should change on first login.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-8 py-6" style={{borderTop:'1px solid rgba(255,255,255,0.07)'}}>
              <button onClick={()=>setModal(null)} className="flex-1 py-3 rounded-xl text-sm font-bold glass hover:bg-white/10 transition-all">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                      className="flex-1 py-3 rounded-xl text-sm font-black transition-all hover:-translate-y-0.5 disabled:opacity-60"
                      style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
                {saving?'⏳ Saving...':(modal==='add'?'+ Add Teacher':'✅ Save Changes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════
          VIEW PROFILE MODAL
      ══════════════════════════ */}
      {modal==='view'&&selected&&(()=>{
        const name   = selected.user?.name  || selected.name  || 'Unknown';
        const email  = selected.user?.email || selected.email || '';
        const classes = (selected.assignedClasses||'').split(',').map((c:string)=>c.trim()).filter(Boolean);
        const ss     = subjectStyle(selected.subject);
        const idx    = displayed.findIndex(t=>t.id===selected.id);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
               style={{background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)'}}>
            <div className="w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
                 style={{background:'#0F2044',border:'1px solid rgba(255,255,255,0.1)'}}>

              {/* Profile banner */}
              <div className="px-8 py-8 text-center" style={{background:'linear-gradient(160deg,#0F2044,#162952)'}}>
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-3xl font-black mx-auto mb-3 shadow-xl"
                     style={{background:avatarGrad(idx),color:'white'}}>
                  {initials(name)}
                </div>
                <h3 className="text-xl font-extrabold text-white">{name}</h3>
                <p className="text-xs mt-1" style={{color:'rgba(255,255,255,0.4)'}}>{selected.employeeCode}</p>
                <span className="inline-block mt-3 px-4 py-1.5 rounded-full text-xs font-bold"
                      style={{background:ss.bg,color:ss.text}}>
                  {selected.subject}
                </span>
              </div>

              {/* Detail rows */}
              <div className="p-6 space-y-2.5">
                {([['✉️','Email',email],['📞','Phone',selected.phone],['🎓','Qualification',selected.qualification],['⏱️','Experience',selected.experience],['💰','Salary',`₹${(selected.salary||0).toLocaleString()} / month`]] as [string,string,string][]).map(([ic,lb,val])=>(
                  <div key={lb} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                       style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
                    <span className="text-sm w-5 text-center flex-shrink-0">{ic}</span>
                    <span className="text-xs font-bold w-24 flex-shrink-0" style={{color:'rgba(255,255,255,0.4)'}}>{lb}</span>
                    <span className="text-sm font-semibold text-white truncate">{val||'—'}</span>
                  </div>
                ))}

                {/* Classes row */}
                <div className="flex items-start gap-3 px-3 py-2.5 rounded-xl"
                     style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
                  <span className="text-sm w-5 text-center flex-shrink-0 mt-0.5">🏫</span>
                  <span className="text-xs font-bold w-24 flex-shrink-0 mt-0.5" style={{color:'rgba(255,255,255,0.4)'}}>Classes</span>
                  <div className="flex flex-wrap gap-1.5">
                    {classes.length>0
                      ? classes.map((c:string)=><span key={c} className="px-2 py-0.5 rounded-lg text-xs font-bold" style={{background:'rgba(30,144,255,0.15)',color:'#93C5FD'}}>{c}</span>)
                      : <span style={{color:'rgba(255,255,255,0.3)',fontSize:13}}>Not assigned</span>}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 px-6 pb-7">
                <button onClick={()=>setModal(null)} className="flex-1 py-3 rounded-xl text-sm font-bold glass hover:bg-white/10 transition-all">Close</button>
                <button onClick={()=>{setModal(null);setTimeout(()=>openEdit(selected),50);}}
                        className="flex-1 py-3 rounded-xl text-sm font-black transition-all hover:-translate-y-0.5"
                        style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
                  ✏️ Edit Profile
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </AppShell>
  );
}
