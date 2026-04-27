'use client';
// src/app/teacher/notices/page.tsx
import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { noticesApi } from '@/lib/api';

const PRIORITY_STYLE: Record<string,{bg:string;text:string;border:string}> = {
  HIGH:   {bg:'rgba(239,68,68,0.12)',  text:'#FCA5A5',border:'rgba(239,68,68,0.25)'  },
  MEDIUM: {bg:'rgba(245,158,11,0.12)', text:'#FCD34D',border:'rgba(245,158,11,0.25)' },
  LOW:    {bg:'rgba(255,255,255,0.06)',text:'rgba(255,255,255,0.4)',border:'rgba(255,255,255,0.1)'},
};
const TARGET_STYLE: Record<string,{bg:string;text:string}> = {
  All:     {bg:'rgba(30,144,255,0.12)', text:'#93C5FD'},
  Students:{bg:'rgba(34,197,94,0.12)',  text:'#86EFAC'},
  Parents: {bg:'rgba(168,85,247,0.12)', text:'#D8B4FE'},
  Teachers:{bg:'rgba(245,158,11,0.12)', text:'#FCD34D'},
};

export default function TeacherNotices() {
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string|null>(null);
  const [filterT, setFilterT]  = useState('');

  useEffect(() => {
    noticesApi.getAll({}).then(r => setNotices(r.data.data||[])).catch(()=>setNotices([])).finally(()=>setLoading(false));
  }, []);

  const displayed = filterT ? notices.filter(n=>n.target===filterT||n.target==='All') : notices;

  return (
    <AppShell title="Notices" subtitle="School announcements & alerts">
      <div className="glass rounded-2xl p-4 mb-5 flex items-center gap-2 flex-wrap">
        {['','All','Students','Parents','Teachers'].map(t=>{
          const ts = t ? TARGET_STYLE[t] : null;
          return (
            <button key={t} onClick={()=>setFilterT(t)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                    style={{
                      background: filterT===t?(ts?.bg||'rgba(212,160,23,0.2)'):'rgba(255,255,255,0.04)',
                      border:`1px solid ${filterT===t?'rgba(255,255,255,0.2)':'rgba(255,255,255,0.08)'}`,
                      color: filterT===t?(ts?.text||'#F0C040'):'rgba(255,255,255,0.4)',
                    }}>
              {t||'All Notices'}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="skeleton h-24 rounded-2xl"/>)}</div>
      ) : displayed.length===0 ? (
        <div className="glass rounded-2xl py-20 text-center">
          <div className="text-5xl mb-4 opacity-40">📢</div>
          <div className="text-lg font-bold">No notices available</div>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(n=>{
            const ps = PRIORITY_STYLE[n.priority]||PRIORITY_STYLE.LOW;
            const ts = TARGET_STYLE[n.target]||TARGET_STYLE.All;
            const isOpen = expanded===n.id;
            return (
              <div key={n.id} className="glass rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5"
                   style={{border:`1px solid ${ps.border}`}}>
                <div className="p-5 cursor-pointer" onClick={()=>setExpanded(isOpen?null:n.id)}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                           style={{background:ps.text,boxShadow:`0 0 6px ${ps.text}`}}/>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-sm font-bold text-white">{n.title}</h3>
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{background:ps.bg,color:ps.text}}>{n.priority}</span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{background:ts.bg,color:ts.text}}>{n.target}</span>
                        </div>
                        <p className={`text-sm leading-relaxed ${isOpen?'':'line-clamp-1'}`} style={{color:'rgba(255,255,255,0.55)'}}>
                          {n.body}
                        </p>
                        <div className="text-xs mt-2" style={{color:'rgba(255,255,255,0.3)'}}>
                          📅 {n.createdAt?new Date(n.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'—'}
                        </div>
                      </div>
                    </div>
                    <span className="text-white/30 transition-transform flex-shrink-0" style={{transform:isOpen?'rotate(180deg)':''}}>▼</span>
                  </div>
                </div>
                {isOpen && (
                  <div className="px-5 pb-5 pt-0" style={{borderTop:'1px solid rgba(255,255,255,0.06)'}}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap pt-4" style={{color:'rgba(255,255,255,0.7)'}}>{n.body}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
