'use client';
// src/app/student/notices/page.tsx
import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { noticesApi } from '@/lib/api';

const PRIORITY_STYLE: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  HIGH:   { bg:'rgba(239,68,68,0.12)',   text:'#FCA5A5', border:'rgba(239,68,68,0.3)',   glow:'#EF4444' },
  MEDIUM: { bg:'rgba(245,158,11,0.12)',  text:'#FCD34D', border:'rgba(245,158,11,0.3)',  glow:'#F59E0B' },
  LOW:    { bg:'rgba(255,255,255,0.06)', text:'rgba(255,255,255,0.4)', border:'rgba(255,255,255,0.12)', glow:'rgba(255,255,255,0.3)' },
};

export default function StudentNotices() {
  const [notices,  setNotices]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filterP,  setFilterP]  = useState('');
  const [expanded, setExpanded] = useState<string|null>(null);

  useEffect(() => {
    noticesApi.getAll({})
      .then(r => setNotices(r.data.data||[]))
      .catch(() => setNotices([]))
      .finally(() => setLoading(false));
  }, []);

  const displayed = filterP ? notices.filter(n=>n.priority===filterP) : notices;

  const stats = {
    total: notices.length,
    high:  notices.filter(n=>n.priority==='HIGH').length,
    today: notices.filter(n=>n.createdAt?.slice(0,10)===new Date().toISOString().slice(0,10)).length,
  };

  return (
    <AppShell title="Notices & Alerts" subtitle="School announcements for students & parents">

      {/* STATS */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          {icon:'📢', label:'Total Notices',    value:stats.total, col:'#F0C040', bg:'rgba(212,160,23,0.1)',  bd:'rgba(212,160,23,0.2)'},
          {icon:'🔴', label:'High Priority',    value:stats.high,  col:'#FCA5A5', bg:'rgba(239,68,68,0.1)',   bd:'rgba(239,68,68,0.2)' },
          {icon:'📅', label:'Posted Today',     value:stats.today, col:'#86EFAC', bg:'rgba(34,197,94,0.1)',   bd:'rgba(34,197,94,0.2)' },
        ].map(c=>(
          <div key={c.label} className="glass rounded-2xl p-4 hover:-translate-y-0.5 transition-transform"
               style={{border:`1px solid ${c.bd}`}}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                   style={{background:c.bg,border:`1px solid ${c.bd}`}}>{c.icon}</div>
              <div>
                <div className="text-xl font-black" style={{color:c.col}}>{c.value}</div>
                <div className="text-xs" style={{color:'rgba(255,255,255,0.4)'}}>{c.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FILTER */}
      <div className="glass rounded-2xl p-4 mb-5 flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider mr-1" style={{color:'rgba(255,255,255,0.35)'}}>Filter:</span>
        {[{v:'',l:'All'},  {v:'HIGH',l:'🔴 High'}, {v:'MEDIUM',l:'🟡 Medium'}, {v:'LOW',l:'⚪ Low'}].map(({v,l})=>{
          const ps = v ? PRIORITY_STYLE[v] : null;
          return (
            <button key={v} onClick={()=>setFilterP(v)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                    style={{
                      background: filterP===v ? (ps?.bg||'rgba(212,160,23,0.2)') : 'rgba(255,255,255,0.04)',
                      border:`1px solid ${filterP===v ? (ps?.border||'rgba(212,160,23,0.4)') : 'rgba(255,255,255,0.08)'}`,
                      color: filterP===v ? (ps?.text||'#F0C040') : 'rgba(255,255,255,0.4)',
                    }}>
              {l}
            </button>
          );
        })}
      </div>

      {/* LIST */}
      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="skeleton h-24 rounded-2xl"/>)}</div>
      ) : displayed.length===0 ? (
        <div className="glass rounded-2xl py-20 text-center">
          <div className="text-5xl mb-4 opacity-40">📢</div>
          <div className="text-lg font-bold text-white">No notices available</div>
          <p className="text-sm mt-2" style={{color:'rgba(255,255,255,0.35)'}}>
            {filterP ? 'No notices with this priority' : 'Check back later for school announcements'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(n => {
            const ps  = PRIORITY_STYLE[n.priority] || PRIORITY_STYLE.LOW;
            const isOpen = expanded===n.id;
            const dateStr = n.createdAt
              ? new Date(n.createdAt).toLocaleDateString('en-IN',{weekday:'short',day:'2-digit',month:'short',year:'numeric'})
              : '—';
            return (
              <div key={n.id} className="glass rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
                   style={{border:`1px solid ${ps.border}`}}>
                <div className="p-5 cursor-pointer select-none" onClick={()=>setExpanded(isOpen?null:n.id)}>
                  <div className="flex items-start gap-3">
                    {/* Priority indicator */}
                    <div className="mt-1.5 flex-shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full" style={{background:ps.glow,boxShadow:`0 0 8px ${ps.glow}`}}/>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="text-sm font-bold text-white leading-tight">{n.title}</h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{background:ps.bg,color:ps.text}}>{n.priority}</span>
                          <span className="text-white/30 transition-transform" style={{transform:isOpen?'rotate(180deg)':'',display:'inline-block'}}>▼</span>
                        </div>
                      </div>

                      <p className={`text-sm leading-relaxed ${isOpen?'':'line-clamp-2'}`}
                         style={{color:'rgba(255,255,255,0.55)'}}>
                        {n.body}
                      </p>

                      <div className="flex items-center gap-3 mt-2 text-xs" style={{color:'rgba(255,255,255,0.3)'}}>
                        <span>📅 {dateStr}</span>
                        <span>·</span>
                        <span>👥 {n.target}</span>
                        {n.publishedBy && <><span>·</span><span>✍️ {n.publishedBy}</span></>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded content */}
                {isOpen && (
                  <div className="px-6 pb-5 -mt-1" style={{borderTop:'1px solid rgba(255,255,255,0.06)'}}>
                    <div className="pt-4">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{color:'rgba(255,255,255,0.75)'}}>
                        {n.body}
                      </p>
                    </div>
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
