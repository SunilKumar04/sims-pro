'use client';
// src/app/teacher/dashboard/page.tsx
import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { dashboardApi, noticesApi, homeworkApi } from '@/lib/api';
import { getUser } from '@/lib/auth';
import Link from 'next/link';

const SCHEDULE = [
  { time:'8:00 AM',  cls:'10A', subject:'Mathematics', room:'R-101', duration:'1 hr'  },
  { time:'9:00 AM',  cls:'10B', subject:'Mathematics', room:'R-102', duration:'1 hr'  },
  { time:'11:00 AM', cls:'8A',  subject:'Mathematics', room:'R-301', duration:'1 hr'  },
  { time:'12:00 PM', cls:'9A',  subject:'Mathematics', room:'R-201', duration:'1 hr'  },
];

export default function TeacherDashboard() {
  const [stats,   setStats]   = useState<any>(null);
  const [notices, setNotices] = useState<any[]>([]);
  const [hw,      setHw]      = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const user = getUser();

  useEffect(() => {
    Promise.all([
      dashboardApi.getTeacherStats().catch(()=>({data:{data:{}}})),
      noticesApi.getAll({ limit: 4 }).catch(()=>({data:{data:[]}})),
      homeworkApi.getAll({}).catch(()=>({data:{data:[]}})),
    ]).then(([s,n,h]) => {
      setStats(s.data.data);
      setNotices(n.data.data || []);
      setHw(h.data.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const statCards = [
    { icon:'🏫', label:'My Classes',       value: stats?.classes  || 2,  col:'#F0C040', bg:'rgba(212,160,23,0.12)', bd:'rgba(212,160,23,0.2)' },
    { icon:'👨‍🎓',label:'My Students',      value: stats?.students || 66, col:'#86EFAC', bg:'rgba(34,197,94,0.12)',  bd:'rgba(34,197,94,0.2)'  },
    { icon:'📚', label:'Homework Assigned', value: hw.length,             col:'#93C5FD', bg:'rgba(30,144,255,0.12)', bd:'rgba(30,144,255,0.2)' },
    { icon:'📅', label:'Attendance Due',    value: 'Today',               col:'#FCA5A5', bg:'rgba(239,68,68,0.12)',  bd:'rgba(239,68,68,0.2)'  },
  ];

  const now = new Date();
  const hours = now.getHours();
  const greet = hours<12?'Good morning':'hours<18'?'Good afternoon':'Good evening';

  return (
    <AppShell title="My Dashboard" subtitle="Today's overview">

      {/* GREETING BANNER */}
      <div className="rounded-2xl p-6 mb-6 relative overflow-hidden"
           style={{background:'linear-gradient(135deg,#0F2044,#162952)',border:'1px solid rgba(212,160,23,0.2)'}}>
        <div className="relative z-10">
          <div className="text-2xl font-black mb-1">
            {hours<12?'Good Morning':'Good Afternoon'}, {user?.name?.split(' ')[0] || 'Teacher'}! 👋
          </div>
          <p className="text-sm" style={{color:'rgba(255,255,255,0.55)'}}>
            {now.toLocaleDateString('en-IN',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})} · {stats?.subject || 'Mathematics'} Teacher
          </p>
          <div className="flex gap-6 mt-4">
            {[['4','Classes Today'],['66','Students'],['2','Pending Tasks']].map(([v,l])=>(
              <div key={l}><div className="text-xl font-black text-yellow-400">{v}</div><div className="text-xs" style={{color:'rgba(255,255,255,0.4)'}}>{l}</div></div>
            ))}
          </div>
        </div>
        <div className="absolute right-6 top-4 text-6xl opacity-10">🏫</div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {statCards.map(c=>(
          <div key={c.label} className="glass rounded-2xl p-5 hover:-translate-y-0.5 transition-transform">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3" style={{background:c.bg,border:`1px solid ${c.bd}`}}>{c.icon}</div>
            <div className="text-2xl font-black" style={{color:c.col}}>{c.value}</div>
            <div className="text-xs mt-1" style={{color:'rgba(255,255,255,0.4)'}}>{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* TODAY'S SCHEDULE */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">📅 Today's Schedule</h3>
            <span className="text-xs" style={{color:'rgba(255,255,255,0.35)'}}>{SCHEDULE.length} classes</span>
          </div>
          <div className="space-y-2.5">
            {SCHEDULE.map((s,i)=>{
              const isPast = false; // would compare with current time
              return (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-white/[0.04]"
                     style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
                  <div className="flex-shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-black font-mono"
                       style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
                    {s.time}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white">{s.subject} – {s.cls}</div>
                    <div className="text-xs" style={{color:'rgba(255,255,255,0.35)'}}>Room {s.room} · {s.duration}</div>
                  </div>
                  <Link href="/teacher/attendance"
                        className="px-3 py-1.5 rounded-xl text-xs font-bold glass hover:bg-white/10 flex-shrink-0">
                    Mark
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white mb-4">⚡ Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon:'✅', label:'Mark Attendance', href:'/teacher/attendance', col:'rgba(34,197,94,0.15)',   border:'rgba(34,197,94,0.3)',   text:'#86EFAC' },
              { icon:'📚', label:'Assign Homework',  href:'/teacher/homework',   col:'rgba(30,144,255,0.15)', border:'rgba(30,144,255,0.3)',  text:'#93C5FD' },
              { icon:'📝', label:'Enter Marks',      href:'/teacher/marks',      col:'rgba(168,85,247,0.15)',border:'rgba(168,85,247,0.3)',   text:'#D8B4FE' },
              { icon:'📢', label:'View Notices',     href:'/teacher/notices',    col:'rgba(212,160,23,0.15)',border:'rgba(212,160,23,0.3)',   text:'#F0C040' },
            ].map(a=>(
              <Link key={a.label} href={a.href}
                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl text-center transition-all hover:-translate-y-1 hover:shadow-lg"
                    style={{background:a.col,border:`1px solid ${a.border}`}}>
                <span className="text-2xl">{a.icon}</span>
                <span className="text-xs font-bold" style={{color:a.text}}>{a.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* RECENT HOMEWORK */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">📚 Recent Homework</h3>
            <Link href="/teacher/homework" className="text-xs font-bold text-yellow-400 hover:text-yellow-300">+ Assign New</Link>
          </div>
          {hw.length===0
            ? <div className="text-center py-8"><div className="text-3xl mb-2 opacity-40">📚</div><p className="text-sm" style={{color:'rgba(255,255,255,0.35)'}}>No homework assigned yet</p></div>
            : hw.slice(0,4).map(h=>(
              <div key={h.id} className="p-3 rounded-xl mb-2 last:mb-0" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate">{h.title}</div>
                    <div className="text-xs mt-0.5" style={{color:'rgba(255,255,255,0.35)'}}>
                      {h.subject} · Class {h.className} · Due: {h.dueDate?.slice(0,10)}
                    </div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-lg font-bold flex-shrink-0"
                        style={{background:'rgba(30,144,255,0.12)',color:'#93C5FD'}}>{h.subject}</span>
                </div>
              </div>
            ))}
        </div>

        {/* LATEST NOTICES */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">📢 Latest Notices</h3>
            <Link href="/teacher/notices" className="text-xs font-bold text-yellow-400 hover:text-yellow-300">View All</Link>
          </div>
          {notices.length===0
            ? <div className="text-center py-8"><div className="text-3xl mb-2 opacity-40">📢</div><p className="text-sm" style={{color:'rgba(255,255,255,0.35)'}}>No notices available</p></div>
            : notices.slice(0,4).map(n=>{
              const pc:any={HIGH:'rgba(239,68,68,0.12)',MEDIUM:'rgba(245,158,11,0.12)',LOW:'rgba(255,255,255,0.06)'};
              const pt:any={HIGH:'#FCA5A5',MEDIUM:'#FCD34D',LOW:'rgba(255,255,255,0.4)'};
              return (
                <div key={n.id} className="p-3 rounded-xl mb-2 last:mb-0" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="text-sm font-bold text-white leading-tight">{n.title}</div>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0" style={{background:pc[n.priority]||pc.LOW,color:pt[n.priority]||pt.LOW}}>{n.priority}</span>
                  </div>
                  <div className="text-xs" style={{color:'rgba(255,255,255,0.3)'}}>{n.createdAt?.slice(0,10)} · {n.target}</div>
                </div>
              );
            })}
        </div>
      </div>
    </AppShell>
  );
}
