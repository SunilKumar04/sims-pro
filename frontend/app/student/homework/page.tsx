'use client';
// src/app/student/homework/page.tsx
import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { homeworkApi } from '@/lib/api';
import { getUser } from '@/lib/auth';

const SUBJECT_COLORS: Record<string, string> = {
  Mathematics:'#a5b4fc', Physics:'#93c5fd', Chemistry:'#86efac',
  English:'#fcd34d', Hindi:'#fca5a5', History:'#d8b4fe',
  'Computer Science':'#c7d2fe', Science:'#6ee7b7',
};

export default function StudentHomework() {
  const [hw,      setHw]      = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('');
  const user = getUser();

  useEffect(() => {
    homeworkApi.getAll({ className: user?.className })
      .then(r => setHw(r.data.data||[]))
      .catch(() => setHw([]))
      .finally(() => setLoading(false));
  }, []);

  const subjects = [...new Set(hw.map(h => h.subject))].filter(Boolean);
  const displayed = filter ? hw.filter(h => h.subject===filter) : hw;
  const upcoming  = displayed.filter(h => new Date(h.dueDate) >= new Date());
  const past      = displayed.filter(h => new Date(h.dueDate) <  new Date());

  function HWCard({ h }: { h: any }) {
    const daysLeft   = Math.ceil((new Date(h.dueDate).getTime()-Date.now())/(1000*60*60*24));
    const isOverdue  = daysLeft < 0;
    const tc         = SUBJECT_COLORS[h.subject] || 'rgba(255,255,255,0.5)';
    const urgCol     = isOverdue?'#FCA5A5':daysLeft===0?'#FCA5A5':daysLeft<=2?'#FCD34D':'#86EFAC';
    return (
      <div className="glass rounded-2xl p-5 transition-all hover:-translate-y-0.5"
           style={{border:`1px solid ${isOverdue?'rgba(239,68,68,0.25)':'rgba(255,255,255,0.08)'}`}}>
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
               style={{background:`${tc}18`,border:`1px solid ${tc}35`}}>📖</div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white mb-1">{h.title}</h3>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{background:`${tc}18`,color:tc}}>{h.subject}</span>
              <span className="text-xs px-2 py-0.5 rounded-xl font-bold" style={{background:'rgba(30,144,255,0.12)',color:'#93C5FD'}}>Class {h.className}</span>
            </div>
            {h.description && <p className="text-xs leading-relaxed mb-2" style={{color:'rgba(255,255,255,0.5)'}}>{h.description}</p>}
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{color:'rgba(255,255,255,0.35)'}}>By {h.teacher?.user?.name||'Teacher'}</span>
              <span className="text-xs font-bold" style={{color:urgCol}}>
                {isOverdue?`${Math.abs(daysLeft)}d overdue`:daysLeft===0?'Due today!':daysLeft===1?'Due tomorrow':`Due in ${daysLeft} days`}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppShell title="Homework" subtitle="Your subject-wise assignments">
      <div className="glass rounded-2xl p-4 mb-5 flex items-center gap-2 flex-wrap">
        {['', ...subjects].map(s=>(
          <button key={s} onClick={()=>setFilter(s)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: filter===s?'rgba(212,160,23,0.2)':'rgba(255,255,255,0.04)',
                    border:`1px solid ${filter===s?'rgba(212,160,23,0.4)':'rgba(255,255,255,0.08)'}`,
                    color: filter===s?'#F0C040':'rgba(255,255,255,0.4)',
                  }}>
            {s||'All Subjects'}
          </button>
        ))}
      </div>

      {loading ? <div className="space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="skeleton h-28 rounded-2xl"/>)}</div>
      : displayed.length===0 ? (
        <div className="glass rounded-2xl py-20 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <div className="text-lg font-bold text-white mb-2">No homework!</div>
          <p className="text-sm" style={{color:'rgba(255,255,255,0.35)'}}>Enjoy your free time — no assignments pending</p>
        </div>
      ) : (
        <>
          {upcoming.length>0&&(
            <>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider" style={{color:'rgba(255,255,255,0.35)'}}>Upcoming ({upcoming.length})</span>
                <div className="h-px flex-1" style={{background:'rgba(255,255,255,0.07)'}}/>
              </div>
              <div className="space-y-3 mb-6">{upcoming.map(h=><HWCard key={h.id} h={h}/>)}</div>
            </>
          )}
          {past.length>0&&(
            <>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider" style={{color:'rgba(255,255,255,0.25)'}}>Past Due ({past.length})</span>
                <div className="h-px flex-1" style={{background:'rgba(255,255,255,0.07)'}}/>
              </div>
              <div className="space-y-3 opacity-60">{past.map(h=><HWCard key={h.id} h={h}/>)}</div>
            </>
          )}
        </>
      )}
    </AppShell>
  );
}
