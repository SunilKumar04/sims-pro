'use client';
// src/app/student/home/page.tsx
import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { dashboardApi, homeworkApi, noticesApi } from '@/lib/api';
import { getUser } from '@/lib/auth';
import Link from 'next/link';

export default function StudentHome() {
  const [stats,   setStats]   = useState<any>(null);
  const [hw,      setHw]      = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [fees,    setFees]    = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const user = getUser();

  useEffect(() => {
    Promise.all([
      dashboardApi.getStudentStats().catch(()=>({data:{data:{}}})),
      homeworkApi.getAll({}).catch(()=>({data:{data:[]}})),
      noticesApi.getAll({ limit:4 }).catch(()=>({data:{data:[]}})),
    ]).then(([s, h, n]) => {
      setStats(s.data.data);
      setHw(h.data.data || []);
      setNotices(n.data.data || []);
      setFees(s.data.data?.fees);
    }).finally(() => setLoading(false));
  }, []);

  const now    = new Date();
  const hours  = now.getHours();
  const greet  = hours < 12 ? 'Good Morning' : hours < 17 ? 'Good Afternoon' : 'Good Evening';
  const firstName = user?.name?.split(' ')[0] || 'Student';

  const attendPct = stats?.attendance?.percentage ?? 90;
  const attendColor = attendPct >= 75 ? '#86EFAC' : attendPct >= 60 ? '#FCD34D' : '#FCA5A5';

  const feeStatus = stats?.fees?.status || 'PENDING';
  const feeColors: Record<string,string> = { PAID:'#86EFAC', PENDING:'#FCA5A5', PARTIAL:'#FCD34D' };
  const feeColor = feeColors[feeStatus] || '#FCA5A5';

  const upcomingHw = hw.filter(h => new Date(h.dueDate) >= new Date()).slice(0, 4);

  return (
    <AppShell title="My Dashboard" subtitle="Today's overview">

      {/* GREETING BANNER */}
      <div className="rounded-2xl p-7 mb-6 relative overflow-hidden"
           style={{background:'linear-gradient(135deg,#0F2044,#162952)',border:'1px solid rgba(212,160,23,0.25)'}}>
        <div className="relative z-10">
          <div className="text-2xl font-black mb-1">{greet}, {firstName}! 👋</div>
          <p className="text-sm mb-5" style={{color:'rgba(255,255,255,0.5)'}}>
            {now.toLocaleDateString('en-IN',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}
            {user?.className && ` · Class ${user.className}`}
            {user?.roll && ` · Roll: ${user.roll}`}
          </p>
          <div className="flex gap-8">
            <div>
              <div className="text-3xl font-black" style={{color:attendColor}}>{attendPct}%</div>
              <div className="text-xs mt-0.5" style={{color:'rgba(255,255,255,0.4)'}}>Attendance</div>
            </div>
            <div className="w-px" style={{background:'rgba(255,255,255,0.1)'}}/>
            <div>
              <div className="text-3xl font-black text-white">{stats?.attendance?.present ?? 18}</div>
              <div className="text-xs mt-0.5" style={{color:'rgba(255,255,255,0.4)'}}>Days Present</div>
            </div>
            <div className="w-px" style={{background:'rgba(255,255,255,0.1)'}}/>
            <div>
              <div className="text-3xl font-black" style={{color:'#FCA5A5'}}>{stats?.attendance?.absent ?? 2}</div>
              <div className="text-xs mt-0.5" style={{color:'rgba(255,255,255,0.4)'}}>Days Absent</div>
            </div>
            <div className="w-px" style={{background:'rgba(255,255,255,0.1)'}}/>
            <div>
              <div className="text-3xl font-black" style={{color:'#93C5FD'}}>{upcomingHw.length}</div>
              <div className="text-xs mt-0.5" style={{color:'rgba(255,255,255,0.4)'}}>Homework Due</div>
            </div>
          </div>
        </div>
        <div className="absolute right-8 top-6 text-7xl opacity-[0.06]">🎓</div>
      </div>

      {/* QUICK ACTION CARDS */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { icon:'📅', label:'My Attendance', href:'/student/attendance', val:`${attendPct}%`,       col:attendColor,                 bg:`${attendColor}18`, bd:`${attendColor}35` },
          { icon:'💰', label:'Fee Status',    href:'/student/fees',       val:feeStatus,              col:feeColor,                    bg:`${feeColor}18`,    bd:`${feeColor}35`    },
          { icon:'📚', label:'Homework',      href:'/student/homework',   val:`${upcomingHw.length} pending`, col:'#93C5FD',            bg:'rgba(30,144,255,0.12)', bd:'rgba(30,144,255,0.3)' },
          { icon:'🔔', label:'Notices',       href:'/student/notices',    val:`${notices.length} new`,col:'#F0C040',                   bg:'rgba(212,160,23,0.12)', bd:'rgba(212,160,23,0.3)' },
        ].map(c=>(
          <Link key={c.label} href={c.href}
                className="glass rounded-2xl p-5 hover:-translate-y-1 transition-all duration-200 hover:shadow-xl cursor-pointer"
                style={{border:`1px solid ${c.bd}`}}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3"
                 style={{background:c.bg,border:`1px solid ${c.bd}`}}>{c.icon}</div>
            <div className="text-xl font-black mb-0.5" style={{color:c.col}}>{c.val}</div>
            <div className="text-xs font-medium" style={{color:'rgba(255,255,255,0.4)'}}>{c.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* ATTENDANCE BAR */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white mb-4">📊 This Month's Attendance</h3>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs" style={{color:'rgba(255,255,255,0.5)'}}>Attendance Rate</span>
            <span className="text-sm font-black" style={{color:attendColor}}>{attendPct}%</span>
          </div>
          <div className="w-full h-3 rounded-full overflow-hidden mb-4" style={{background:'rgba(255,255,255,0.07)'}}>
            <div className="h-full rounded-full transition-all" style={{width:`${attendPct}%`,background:attendColor}}/>
          </div>
          {attendPct < 75 && (
            <div className="px-4 py-3 rounded-xl text-xs"
                 style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',color:'#FCA5A5'}}>
              ⚠️ Your attendance is below 75%. Please improve to avoid academic issues.
            </div>
          )}
          {attendPct >= 75 && (
            <div className="px-4 py-3 rounded-xl text-xs"
                 style={{background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.2)',color:'#86EFAC'}}>
              ✅ Good attendance! Keep it up.
            </div>
          )}
          <Link href="/student/attendance" className="block text-center mt-3 text-xs font-bold text-yellow-400 hover:text-yellow-300">
            View Full Calendar →
          </Link>
        </div>

        {/* FEE STATUS CARD */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white mb-4">💰 Fee Status</h3>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                 style={{background:`${feeColor}18`,border:`1px solid ${feeColor}35`}}>
              {feeStatus==='PAID'?'✅':feeStatus==='PARTIAL'?'⚠️':'❌'}
            </div>
            <div>
              <div className="text-xl font-black" style={{color:feeColor}}>{feeStatus}</div>
              <div className="text-xs mt-0.5" style={{color:'rgba(255,255,255,0.4)'}}>
                {feeStatus==='PAID'?'All fees paid for this term':feeStatus==='PARTIAL'?'Partial payment received':'Payment pending — please pay now'}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="p-3 rounded-xl text-center" style={{background:'rgba(255,255,255,0.04)'}}>
              <div className="text-sm font-black text-white">₹{(stats?.fees?.amount||15000).toLocaleString()}</div>
              <div className="text-xs mt-0.5" style={{color:'rgba(255,255,255,0.35)'}}>Total Amount</div>
            </div>
            <div className="p-3 rounded-xl text-center" style={{background:'rgba(255,255,255,0.04)'}}>
              <div className="text-sm font-black" style={{color:feeColor}}>₹{(stats?.fees?.balance||0).toLocaleString()}</div>
              <div className="text-xs mt-0.5" style={{color:'rgba(255,255,255,0.35)'}}>Balance Due</div>
            </div>
          </div>
          <Link href="/student/fees" className="block text-center text-xs font-bold text-yellow-400 hover:text-yellow-300">
            View Receipt & Details →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* UPCOMING HOMEWORK */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">📚 Upcoming Homework</h3>
            <Link href="/student/homework" className="text-xs font-bold text-yellow-400 hover:text-yellow-300">View All</Link>
          </div>
          {upcomingHw.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">🎉</div>
              <p className="text-sm font-bold text-white">No pending homework!</p>
              <p className="text-xs mt-1" style={{color:'rgba(255,255,255,0.35)'}}>Enjoy your free time</p>
            </div>
          ) : upcomingHw.map(h => {
            const daysLeft = Math.ceil((new Date(h.dueDate).getTime()-Date.now())/(1000*60*60*24));
            const urgentColor = daysLeft<=1?'#FCA5A5':daysLeft<=3?'#FCD34D':'#86EFAC';
            return (
              <div key={h.id} className="flex items-center gap-3 p-3 rounded-xl mb-2 last:mb-0"
                   style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                     style={{background:'rgba(30,144,255,0.12)'}}>📖</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white truncate">{h.title}</div>
                  <div className="text-xs mt-0.5" style={{color:'rgba(255,255,255,0.4)'}}>
                    {h.subject} · Due {h.dueDate?.slice(0,10)}
                  </div>
                </div>
                <div className="text-xs font-bold flex-shrink-0" style={{color:urgentColor}}>
                  {daysLeft<=0?'Today!':daysLeft===1?'Tomorrow':`${daysLeft}d left`}
                </div>
              </div>
            );
          })}
        </div>

        {/* LATEST NOTICES */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">📢 Latest Notices</h3>
            <Link href="/student/notices" className="text-xs font-bold text-yellow-400 hover:text-yellow-300">View All</Link>
          </div>
          {notices.length===0 ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-2 opacity-40">📢</div>
              <p className="text-sm" style={{color:'rgba(255,255,255,0.35)'}}>No notices right now</p>
            </div>
          ) : notices.slice(0,4).map(n=>{
            const pc:any={HIGH:'rgba(239,68,68,0.12)',MEDIUM:'rgba(245,158,11,0.12)',LOW:'rgba(255,255,255,0.06)'};
            const pt:any={HIGH:'#FCA5A5',MEDIUM:'#FCD34D',LOW:'rgba(255,255,255,0.35)'};
            return (
              <div key={n.id} className="p-3 rounded-xl mb-2 last:mb-0"
                   style={{background:'rgba(255,255,255,0.03)',border:`1px solid ${pc[n.priority]||pc.LOW}`}}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="text-sm font-bold text-white leading-tight">{n.title}</div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0" style={{background:pc[n.priority],color:pt[n.priority]}}>{n.priority}</span>
                </div>
                <div className="text-xs line-clamp-1" style={{color:'rgba(255,255,255,0.4)'}}>{n.body}</div>
                <div className="text-xs mt-1" style={{color:'rgba(255,255,255,0.25)'}}>{n.createdAt?.slice(0,10)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
