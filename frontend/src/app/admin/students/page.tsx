'use client';
// src/app/admin/students/page.tsx
import { useEffect, useState, useCallback } from 'react';
import AppShell from '@/components/layout/AppShell';
import { studentsApi } from '@/lib/api';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { confirm } from '@/components/ui/Confirm';

type FeeStatus = 'PAID' | 'PENDING' | 'PARTIAL';
const FEE_BADGE: Record<FeeStatus, string> = {
  PAID:    'bg-green-500/15 text-green-400',
  PENDING: 'bg-red-500/15 text-red-400',
  PARTIAL: 'bg-yellow-500/15 text-yellow-400',
};
const CLASSES = ['10A','10B','9A','9B','8A','8B','7A','7B','6A','6B'];

export default function AdminStudents() {
  const [students, setStudents]   = useState<any[]>([]);
  const [loading,  setLoading]    = useState(true);
  const [modal,    setModal]      = useState<'add'|'edit'|null>(null);
  const [selected, setSelected]   = useState<any>(null);
  const [saving,   setSaving]     = useState(false);
  const [deleting, setDeleting]   = useState<string|null>(null);
  const [form,     setForm]       = useState<any>({});
  const [filterCls,setFilterCls]  = useState('');
  const [search,   setSearch]     = useState('');
  const [meta,     setMeta]       = useState<any>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await studentsApi.getAll({
        className: filterCls || undefined,
        search:    search    || undefined,
      });
      setStudents(res.data.data || []);
      setMeta(res.data.meta || {});
    } catch (e: any) {
      toast.error('Failed to load students', e?.message);
      setStudents([]);
    } finally { setLoading(false); }
  }, [filterCls, search]);

  useEffect(() => { load(); }, [load]);

  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const openAdd = () => {
    setForm({ className: '10A', phone: '', parentPhone: '' });
    setSelected(null);
    setModal('add');
  };

  const openEdit = (s: any) => {
    setSelected(s);
    setForm({
      name:        s.name,
      roll:        s.roll,
      className:   s.className,
      phone:       s.phone        || '',
      parentName:  s.parentName   || '',
      parentPhone: s.parentPhone  || '',
      address:     s.address      || '',
      dob:         s.dob          ? new Date(s.dob).toISOString().slice(0,10) : '',
      email:       s.email        || '',
    });
    setModal('edit');
  };

  const validate = (): string | null => {
    if (!form.name?.trim())      return 'Full name is required';
    if (!form.roll?.trim())      return 'Roll number is required';
    if (!form.className?.trim()) return 'Class is required';
    if (modal === 'add' && !form.dob) return 'Date of birth is required';
    if (modal === 'add' && !form.parentName?.trim()) return 'Parent name is required';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { toast.warning('Validation Error', err); return; }

    setSaving(true);
    try {
      if (modal === 'add') {
        // Build payload matching CreateStudentDto exactly — no extra fields
        const payload: any = {
          name:        form.name.trim(),
          roll:        form.roll.trim(),
          className:   form.className,
          phone:       form.phone       || '',
          parentName:  form.parentName  || '',
          parentPhone: form.parentPhone || '',
          address:     form.address     || '',
          dob:         form.dob,   // ISO date string e.g. "2009-03-15"
          email:       form.email?.trim() ||
                       `${form.roll.toLowerCase().replace(/[^a-z0-9]/g,'')}@student.gnpss.edu.in`,
          password:    form.password || undefined,
        };
        await studentsApi.create(payload);
        toast.success('Student Added', `${form.name} has been enrolled successfully`);
      } else {
        // Update — only send fields that the UpdateStudentDto accepts
        const payload: any = {};
        if (form.name)        payload.name        = form.name.trim();
        if (form.roll)        payload.roll        = form.roll.trim();
        if (form.className)   payload.className   = form.className;
        if (form.phone)       payload.phone       = form.phone;
        if (form.parentName)  payload.parentName  = form.parentName;
        if (form.parentPhone) payload.parentPhone = form.parentPhone;
        if (form.address)     payload.address     = form.address;
        if (form.dob)         payload.dob         = form.dob;
        await studentsApi.update(selected.id, payload);
        toast.success('Student Updated', `${form.name}'s details saved successfully`);
      }
      setModal(null);
      load();
    } catch (e: any) {
      const msg = e?.message || (typeof e === 'string' ? e : 'Unknown error');
      toast.error('Save Failed', msg);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!(await confirm({ title: 'Delete Student', message: `Delete student \"${name}\"? This action cannot be undone and all records will be removed.`, confirm: 'Yes, Delete', cancel: 'Cancel', danger: true }))) return;
    setDeleting(id);
    try {
      await studentsApi.delete(id);
      toast.success('Student Removed', `${name} has been deleted`);
      load();
    } catch (e: any) {
      toast.error('Delete Failed', e?.message);
    } finally { setDeleting(null); }
  };

  return (
    <AppShell title="Students" subtitle={`${meta.total || students.length} enrolled students`}>

      {/* ── TOOLBAR ── */}
      <div className="glass rounded-2xl p-5 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex min-w-0 items-center gap-2 rounded-xl px-3 py-2 flex-1 sm:min-w-[220px] sm:max-w-xs"
                 style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)'}}>
              <span style={{color:'rgba(255,255,255,0.3)',fontSize:14}}>🔍</span>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                     placeholder="Search by name, roll, parent..."
                     className="bg-transparent text-sm text-white placeholder:text-white/20 outline-none flex-1"/>
              {search && <button onClick={()=>setSearch('')} className="text-white/30 hover:text-white/60 text-xs">✕</button>}
            </div>
            <select value={filterCls} onChange={e=>setFilterCls(e.target.value)}
                    className="sims-input text-sm w-full sm:w-auto" style={{width:140,padding:'8px 28px 8px 12px'}}>
              <option value="">All Classes</option>
              {CLASSES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button onClick={openAdd}
                  className="w-full rounded-xl px-5 py-2.5 text-sm font-bold transition-all hover:-translate-y-0.5 sm:w-auto"
                  style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
            + Add Student
          </button>
        </div>
      </div>

      {/* ── TABLE ── */}
      <div className="glass rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3 md:hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton h-36 rounded-2xl" />
            ))}
          </div>
        ) : students.length === 0 ? (
          <div className="py-16 text-center md:hidden">
            <div className="text-4xl mb-3 opacity-40">👨‍🎓</div>
            <div className="text-base font-bold text-white">No students found</div>
            <div className="text-sm mt-1" style={{color:'rgba(255,255,255,0.35)'}}>
              {search||filterCls?'Try adjusting your filters':'Add your first student to get started'}
            </div>
          </div>
        ) : (
          <div className="divide-y md:hidden" style={{borderColor:'rgba(255,255,255,0.06)'}}>
            {students.map((s, i) => (
              <div key={s.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white/35">#{i + 1}</span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold" style={{background:'rgba(30,144,255,0.15)',color:'#93C5FD'}}>{s.className}</span>
                    </div>
                    <div className="mt-2 text-sm font-bold text-white">{s.name}</div>
                    <div className="text-xs text-white/35 break-all">{s.email}</div>
                  </div>
                  <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold capitalize flex-shrink-0', FEE_BADGE[s.feeStatus as FeeStatus]||FEE_BADGE.PENDING)}>
                    {(s.feeStatus||'pending').toLowerCase()}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl p-3" style={{background:'rgba(255,255,255,0.03)'}}>
                    <div className="text-white/35">Roll No</div>
                    <div className="mt-1 font-mono text-white/70">{s.roll}</div>
                  </div>
                  <div className="rounded-xl p-3" style={{background:'rgba(255,255,255,0.03)'}}>
                    <div className="text-white/35">Phone</div>
                    <div className="mt-1 text-white/70">{s.phone || '—'}</div>
                  </div>
                  <div className="col-span-2 rounded-xl p-3" style={{background:'rgba(255,255,255,0.03)'}}>
                    <div className="text-white/35">Parent</div>
                    <div className="mt-1 text-white/70">{s.parentName || '—'}</div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button onClick={()=>openEdit(s)}
                          className="flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:bg-white/15 glass">
                    ✏️ Edit
                  </button>
                  <button onClick={()=>handleDelete(s.id,s.name)} disabled={deleting===s.id}
                          className="px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
                          style={{background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.3)',color:'#FCA5A5'}}>
                    {deleting===s.id?'⏳':'🗑️'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="hidden overflow-x-auto md:block">
          <table className="sims-table">
            <thead>
              <tr><th>#</th><th>Name</th><th>Class</th><th>Roll No</th><th>Parent</th><th>Phone</th><th>Fee Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading
                ? [...Array(6)].map((_,i)=>(
                    <tr key={i}>{[...Array(8)].map((_,j)=><td key={j}><div className="skeleton h-5 rounded"/></td>)}</tr>
                  ))
                : students.length===0
                  ? <tr><td colSpan={8} className="text-center py-16">
                      <div className="text-4xl mb-3 opacity-40">👨‍🎓</div>
                      <div className="text-base font-bold text-white">No students found</div>
                      <div className="text-sm mt-1" style={{color:'rgba(255,255,255,0.35)'}}>
                        {search||filterCls?'Try adjusting your filters':'Add your first student to get started'}
                      </div>
                    </td></tr>
                  : students.map((s,i)=>(
                    <tr key={s.id}>
                      <td className="text-white/40 text-xs">{i+1}</td>
                      <td>
                        <div className="font-bold text-white">{s.name}</div>
                        <div className="text-xs text-white/35">{s.email}</div>
                      </td>
                      <td><span className="px-2.5 py-1 rounded-lg text-xs font-bold" style={{background:'rgba(30,144,255,0.15)',color:'#93C5FD'}}>{s.className}</span></td>
                      <td className="font-mono text-xs text-white/60">{s.roll}</td>
                      <td className="text-white/60">{s.parentName}</td>
                      <td className="text-white/60">{s.phone}</td>
                      <td>
                        <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold capitalize', FEE_BADGE[s.feeStatus as FeeStatus]||FEE_BADGE.PENDING)}>
                          {(s.feeStatus||'pending').toLowerCase()}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button onClick={()=>openEdit(s)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:bg-white/15 glass">
                            ✏️ Edit
                          </button>
                          <button onClick={()=>handleDelete(s.id,s.name)} disabled={deleting===s.id}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40"
                                  style={{background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.3)',color:'#FCA5A5'}}>
                            {deleting===s.id?'⏳':'🗑️'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)'}}>
          <div className="w-full max-w-lg rounded-3xl p-8 shadow-2xl"
               style={{background:'#0F2044',border:'1px solid rgba(255,255,255,0.1)'}}>

            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-extrabold">{modal==='add'?'Add New Student':'Edit Student'}</h2>
                <p className="text-xs mt-0.5" style={{color:'rgba(255,255,255,0.4)'}}>
                  {modal==='add'?'Fill in student details below':`Editing: ${selected?.name}`}
                </p>
              </div>
              <button onClick={()=>setModal(null)}
                      className="w-8 h-8 rounded-xl glass flex items-center justify-center text-sm" style={{color:'rgba(255,255,255,0.5)'}}>✕</button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.45)'}}>Full Name *</label>
                  <input value={form.name||''} onChange={e=>f('name',e.target.value)} className="sims-input" placeholder="Student's full name"/>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.45)'}}>Roll Number *</label>
                  <input value={form.roll||''} onChange={e=>f('roll',e.target.value)} className="sims-input" placeholder="e.g. S008"/>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.45)'}}>Class *</label>
                  <select value={form.className||''} onChange={e=>f('className',e.target.value)} className="sims-input">
                    <option value="">Select Class</option>
                    {CLASSES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.45)'}}>Date of Birth {modal==='add'?'*':''}</label>
                  <input type="date" value={form.dob||''} onChange={e=>f('dob',e.target.value)} className="sims-input"/>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.45)'}}>Parent Name {modal==='add'?'*':''}</label>
                  <input value={form.parentName||''} onChange={e=>f('parentName',e.target.value)} className="sims-input" placeholder="Parent's name"/>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.45)'}}>Phone Number</label>
                  <input value={form.phone||''} onChange={e=>f('phone',e.target.value)} className="sims-input" placeholder="10-digit number"/>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.45)'}}>Parent Phone</label>
                  <input value={form.parentPhone||''} onChange={e=>f('parentPhone',e.target.value)} className="sims-input" placeholder="Parent's number"/>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.45)'}}>Address / City</label>
                  <input value={form.address||''} onChange={e=>f('address',e.target.value)} className="sims-input" placeholder="City / Area"/>
                </div>
              </div>
              {modal==='add' && (
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.45)'}}>Email</label>
                  <input type="email" value={form.email||''} onChange={e=>f('email',e.target.value)} className="sims-input"
                         placeholder="Auto-generated if blank"/>
                  <p className="text-xs mt-1" style={{color:'rgba(255,255,255,0.3)'}}>
                    Leave blank → auto: {form.roll?`${form.roll.toLowerCase().replace(/[^a-z0-9]/g,'')}@student.gnpss.edu.in`:'roll@student.gnpss.edu.in'}
                  </p>
                </div>
              )}
              {modal==='add' && (
                <div className="px-4 py-3 rounded-xl text-xs" style={{background:'rgba(212,160,23,0.07)',border:'1px solid rgba(212,160,23,0.2)',color:'rgba(255,255,255,0.5)'}}>
                  💡 Default password: <strong className="text-yellow-400">Student@1234</strong> — student should change on first login.
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-3 pt-5 sm:flex-row" style={{borderTop:'1px solid rgba(255,255,255,0.07)'}}>
              <button onClick={()=>setModal(null)} className="flex-1 py-3 rounded-xl text-sm font-bold glass hover:bg-white/10">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                      className="flex-1 py-3 rounded-xl text-sm font-black transition-all hover:-translate-y-0.5 disabled:opacity-60"
                      style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
                {saving?'⏳ Saving...':(modal==='add'?'Add Student':'Save Changes')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
