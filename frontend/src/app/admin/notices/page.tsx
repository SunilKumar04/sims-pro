'use client';
// src/app/admin/notices/page.tsx
import { useEffect, useState, useCallback } from 'react';
import AppShell from '@/components/layout/AppShell';
import { noticesApi } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';
import { toast } from '@/components/ui/Toast';
import { confirm } from '@/components/ui/Confirm';

const PRIORITY_META: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  HIGH:   { bg: 'rgba(239,68,68,0.12)',   text: '#FCA5A5', border: 'rgba(239,68,68,0.3)',   dot: '#EF4444' },
  MEDIUM: { bg: 'rgba(245,158,11,0.12)',  text: '#FCD34D', border: 'rgba(245,158,11,0.3)',  dot: '#F59E0B' },
  LOW:    { bg: 'rgba(255,255,255,0.06)', text: 'rgba(255,255,255,0.45)', border: 'rgba(255,255,255,0.12)', dot: 'rgba(255,255,255,0.3)' },
};

const TARGET_META: Record<string, { bg: string; text: string }> = {
  All:      { bg: 'rgba(30,144,255,0.12)',  text: '#93C5FD' },
  Students: { bg: 'rgba(34,197,94,0.12)',   text: '#86EFAC' },
  Parents:  { bg: 'rgba(168,85,247,0.12)',  text: '#D8B4FE' },
  Teachers: { bg: 'rgba(245,158,11,0.12)',  text: '#FCD34D' },
};

function pmeta(p: string) { return PRIORITY_META[p] || PRIORITY_META.LOW; }
function tmeta(t: string) { return TARGET_META[t]   || TARGET_META.All;   }

type ModalMode = 'add' | 'edit' | 'view' | null;

export default function AdminNotices() {
  const [notices,  setNotices]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState<ModalMode>(null);
  const [selected, setSelected] = useState<any>(null);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState<string|null>(null);
  const [form,     setForm]     = useState<any>({});
  const [filterP,  setFilterP]  = useState('');
  const [filterT,  setFilterT]  = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await noticesApi.getAll({ priority: filterP || undefined, target: filterT || undefined });
      setNotices(res.data.data || []);
    } catch { setNotices([]); }
    finally   { setLoading(false); }
  }, [filterP, filterT]);

  useEffect(() => { load(); }, [load]);

  const sf = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const openAdd  = () => { setSelected(null); setForm({ priority: 'HIGH', target: 'All', isPublished: true }); setModal('add'); };
  const openEdit = (n: any) => { setSelected(n); setForm({ title: n.title, body: n.body, priority: n.priority, target: n.target, isPublished: n.isPublished }); setModal('edit'); };
  const openView = (n: any) => { setSelected(n); setModal('view'); };

  const handleSave = async () => {
    if (!form.title?.trim()) { toast.warning('Validation', 'Title is required'); return; };
    if (!form.body?.trim())  { toast.warning('Validation', 'Message body is required'); return; };
    setSaving(true);
    try {
      if (modal === 'add') { await noticesApi.create(form); toast.success('Notice Published', form.title); } else { await noticesApi.update(selected.id, form); toast.success('Notice Updated', form.title); }
      setModal(null); load();
    } catch (e: any) { toast.error('Error', e?.message || 'Error saving notice'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!(await confirm({ title: 'Delete Notice', message: `Delete notice \"${title}\"? It will be removed from all portals immediately.`, confirm: 'Yes, Delete', cancel: 'Cancel', danger: true }))) return;
    setDeleting(id);
    try { await noticesApi.delete(id); toast.success('Notice Deleted', title); load(); }
    catch (e: any) { toast.error('Error', e?.message || 'Error'); }
    finally { setDeleting(null); }
  };

  const displayed = notices.filter(n =>
    (!filterP || n.priority === filterP) &&
    (!filterT || n.target   === filterT)
  );

  const stats = {
    total:  notices.length,
    high:   notices.filter(n => n.priority === 'HIGH').length,
    all:    notices.filter(n => n.target   === 'All').length,
    today:  notices.filter(n => n.createdAt?.slice(0,10) === new Date().toISOString().slice(0,10)).length,
  };

  return (
    <AppShell title="Notice Board" subtitle="Publish & manage school announcements">

      {/* STATS */}
      <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon:'📢', label:'Total Notices',    value: stats.total, col:'#F0C040', bg:'rgba(212,160,23,0.12)', bd:'rgba(212,160,23,0.2)' },
          { icon:'🔴', label:'High Priority',    value: stats.high,  col:'#FCA5A5', bg:'rgba(239,68,68,0.12)',  bd:'rgba(239,68,68,0.2)'  },
          { icon:'🌐', label:'For Everyone',     value: stats.all,   col:'#93C5FD', bg:'rgba(30,144,255,0.12)', bd:'rgba(30,144,255,0.2)' },
          { icon:'📅', label:'Published Today',  value: stats.today, col:'#86EFAC', bg:'rgba(34,197,94,0.12)',  bd:'rgba(34,197,94,0.2)'  },
        ].map(c => (
          <div key={c.label} className="glass rounded-2xl p-5 hover:-translate-y-0.5 transition-transform">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3" style={{background:c.bg,border:`1px solid ${c.bd}`}}>{c.icon}</div>
            <div className="text-2xl font-black" style={{color:c.col}}>{c.value}</div>
            <div className="text-xs mt-1" style={{color:'rgba(255,255,255,0.4)'}}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* TOOLBAR */}
      <div className="glass rounded-2xl p-4 mb-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider mr-1" style={{color:'rgba(255,255,255,0.35)'}}>Priority:</span>
          {['','HIGH','MEDIUM','LOW'].map(p => {
            const pm = p ? pmeta(p) : null;
            return (
              <button key={p} onClick={() => setFilterP(p)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                      style={{
                        background: filterP===p ? (pm?.bg||'rgba(212,160,23,0.2)') : 'rgba(255,255,255,0.04)',
                        border:     `1px solid ${filterP===p ? (pm?.border||'rgba(212,160,23,0.4)') : 'rgba(255,255,255,0.08)'}`,
                        color:      filterP===p ? (pm?.text||'#F0C040') : 'rgba(255,255,255,0.4)',
                      }}>
                {p || 'All'}
              </button>
            );
          })}
          <div className="w-px h-5 mx-1" style={{background:'rgba(255,255,255,0.1)'}} />
          <span className="text-xs font-bold uppercase tracking-wider mr-1" style={{color:'rgba(255,255,255,0.35)'}}>Target:</span>
          {['','All','Students','Parents','Teachers'].map(t => {
            const tm = t ? tmeta(t) : null;
            return (
              <button key={t} onClick={() => setFilterT(t)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                      style={{
                        background: filterT===t ? (tm?.bg||'rgba(212,160,23,0.2)') : 'rgba(255,255,255,0.04)',
                        border:     `1px solid ${filterT===t ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`,
                        color:      filterT===t ? (tm?.text||'#F0C040') : 'rgba(255,255,255,0.4)',
                      }}>
                {t || 'All targets'}
              </button>
            );
          })}
        </div>
        <button onClick={openAdd}
                className="px-5 py-2.5 rounded-xl text-sm font-black transition-all hover:-translate-y-0.5"
                style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
          + Create Notice
        </button>
      </div>

      {/* LOADING */}
      {loading && <div className="space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="skeleton rounded-2xl h-28"/>)}</div>}

      {/* EMPTY */}
      {!loading && displayed.length===0 && (
        <div className="glass rounded-2xl py-20 text-center">
          <div className="text-5xl mb-4 opacity-40">📢</div>
          <div className="text-lg font-bold mb-2">No notices found</div>
          <p className="text-sm mb-6" style={{color:'rgba(255,255,255,0.35)'}}>
            {filterP||filterT ? 'Try adjusting your filters' : 'Create your first school announcement'}
          </p>
          {!filterP&&!filterT&&(
            <button onClick={openAdd} className="px-6 py-2.5 rounded-xl text-sm font-bold"
                    style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
              + Create First Notice
            </button>
          )}
        </div>
      )}

      {/* NOTICE LIST */}
      {!loading && displayed.length>0 && (
        <div className="space-y-3">
          {displayed.map(n => {
            const pm = pmeta(n.priority);
            const tm = tmeta(n.target);
            return (
              <div key={n.id} className="glass rounded-2xl p-5 group transition-all hover:-translate-y-0.5 cursor-pointer"
                   style={{border:`1px solid ${pm.border}`}}
                   onClick={() => openView(n)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Priority dot */}
                    <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{background:pm.dot}} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <h3 className="text-sm font-bold text-white">{n.title}</h3>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{background:pm.bg,color:pm.text}}>{n.priority}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{background:tm.bg,color:tm.text}}>{n.target}</span>
                        {!n.isPublished && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.35)'}}>Draft</span>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed line-clamp-2" style={{color:'rgba(255,255,255,0.55)'}}>{n.body}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs" style={{color:'rgba(255,255,255,0.3)'}}>
                          📅 {n.createdAt ? new Date(n.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'}
                        </span>
                        {n.publishedBy && (
                          <span className="text-xs" style={{color:'rgba(255,255,255,0.3)'}}>✍️ {n.publishedBy}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={e=>e.stopPropagation()}>
                    <button onClick={() => openEdit(n)} className="px-3 py-1.5 rounded-xl text-xs font-bold glass hover:bg-white/10">✏️ Edit</button>
                    <button onClick={() => handleDelete(n.id, n.title)} disabled={deleting===n.id}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold disabled:opacity-40"
                            style={{background:'rgba(239,68,68,0.12)',color:'#FCA5A5',border:'1px solid rgba(239,68,68,0.2)'}}>
                      {deleting===n.id?'⏳':'🗑️'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD/EDIT MODAL */}
      {(modal==='add'||modal==='edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)'}}>
          <div className="w-full max-w-xl rounded-3xl shadow-2xl" style={{background:'#0F2044',border:'1px solid rgba(255,255,255,0.1)'}}>
            <div className="flex items-center justify-between px-8 pt-7 pb-5">
              <h2 className="text-xl font-extrabold">{modal==='add'?'+ Create Notice':'✏️ Edit Notice'}</h2>
              <button onClick={()=>setModal(null)} className="w-8 h-8 rounded-xl glass flex items-center justify-center text-sm" style={{color:'rgba(255,255,255,0.5)'}}>✕</button>
            </div>
            <div className="px-8 pb-2 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.4)'}}>Title *</label>
                <input value={form.title||''} onChange={e=>sf('title',e.target.value)} className="sims-input" placeholder="Notice title"/>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.4)'}}>Target Audience</label>
                  <select value={form.target||'All'} onChange={e=>sf('target',e.target.value)} className="sims-input">
                    {['All','Students','Parents','Teachers'].map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.4)'}}>Priority</label>
                  <select value={form.priority||'HIGH'} onChange={e=>sf('priority',e.target.value)} className="sims-input">
                    {['HIGH','MEDIUM','LOW'].map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.4)'}}>Message *</label>
                <textarea value={form.body||''} onChange={e=>sf('body',e.target.value)}
                          className="sims-input resize-none" rows={5} placeholder="Write the full notice content here..."/>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative w-10 h-6">
                  <input type="checkbox" checked={!!form.isPublished} onChange={e=>sf('isPublished',e.target.checked)} className="sr-only peer"/>
                  <div className="w-10 h-6 rounded-full transition-all peer-checked:bg-green-500" style={{background:'rgba(255,255,255,0.15)'}}/>
                  <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4"/>
                </div>
                <span className="text-sm font-semibold" style={{color:'rgba(255,255,255,0.7)'}}>
                  {form.isPublished ? 'Published — visible to everyone' : 'Draft — not visible yet'}
                </span>
              </label>
            </div>
            <div className="flex gap-3 px-8 py-6" style={{borderTop:'1px solid rgba(255,255,255,0.07)'}}>
              <button onClick={()=>setModal(null)} className="flex-1 py-3 rounded-xl text-sm font-bold glass hover:bg-white/10">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                      className="flex-1 py-3 rounded-xl text-sm font-black hover:-translate-y-0.5 transition-all disabled:opacity-60"
                      style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
                {saving?'⏳ Saving...':(modal==='add'?'📢 Publish Notice':'✅ Save Changes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {modal==='view'&&selected&&(()=>{
        const pm=pmeta(selected.priority); const tm=tmeta(selected.target);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
               style={{background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)'}}>
            <div className="w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden" style={{background:'#0F2044',border:'1px solid rgba(255,255,255,0.1)'}}>
              <div className="px-8 py-6" style={{background:'linear-gradient(160deg,#0F2044,#162952)',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{background:pm.bg,color:pm.text}}>{selected.priority}</span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{background:tm.bg,color:tm.text}}>{selected.target}</span>
                </div>
                <h2 className="text-xl font-extrabold text-white mb-1">{selected.title}</h2>
                <p className="text-xs" style={{color:'rgba(255,255,255,0.35)'}}>
                  📅 {selected.createdAt ? new Date(selected.createdAt).toLocaleDateString('en-IN',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}) : '—'}
                  {selected.publishedBy && ` · ✍️ ${selected.publishedBy}`}
                </p>
              </div>
              <div className="px-8 py-6">
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{color:'rgba(255,255,255,0.75)'}}>{selected.body}</p>
              </div>
              <div className="flex gap-3 px-8 pb-7">
                <button onClick={()=>setModal(null)} className="flex-1 py-3 rounded-xl text-sm font-bold glass hover:bg-white/10">Close</button>
                <button onClick={()=>{setModal(null);setTimeout(()=>openEdit(selected),50);}}
                        className="flex-1 py-3 rounded-xl text-sm font-black hover:-translate-y-0.5 transition-all"
                        style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>✏️ Edit</button>
              </div>
            </div>
          </div>
        );
      })()}
    </AppShell>
  );
}
