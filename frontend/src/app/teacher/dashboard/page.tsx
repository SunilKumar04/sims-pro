'use client';
// src/app/teacher/dashboard/page.tsx
import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { dashboardApi, noticesApi, homeworkApi, timetableApi } from '@/lib/api';
import { getUser } from '@/lib/auth';
import Link from 'next/link';

type TeacherStats = {
  classes?: number;
  classNames?: string[];
  students?: number;
  homework?: number;
  subject?: string;
  attendanceToday?: {
    marked?: number;
    present?: number;
    absent?: number;
  };
};

type DashboardSlot = {
  id: string;
  startTime?: string;
  endTime?: string;
  className?: string;
  subject?: string;
  room?: string;
  period?: number;
};

const formatSlotTime = (slot: DashboardSlot) => {
  if (slot.startTime && slot.endTime) return `${slot.startTime} - ${slot.endTime}`;
  if (slot.startTime) return slot.startTime;
  return `Period ${slot.period ?? '-'}`;
};

export default function TeacherDashboard() {
  const [stats,   setStats]   = useState<TeacherStats | null>(null);
  const [notices, setNotices] = useState<any[]>([]);
  const [hw,      setHw]      = useState<any[]>([]);
  const [todaySlots, setTodaySlots] = useState<DashboardSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const user = getUser();

  useEffect(() => {
    if (!user) return;

    const normalizeArray = (payload: any) => {
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.data)) return payload.data;
      if (Array.isArray(payload?.items)) return payload.items;
      return [];
    };

    Promise.all([
      dashboardApi.getTeacherStats().catch(()=>({data:{data:{}}})),
      noticesApi.getAll({ limit: 4 }).catch(()=>({data:{data:[]}})),
      homeworkApi.getAll({ teacherId: user.teacherId, limit: 4 }).catch(()=>({data:{data:[]}})),
      timetableApi.getMyTimetable().catch(()=>({data:{data:{todaySlots:[]}}})),
    ]).then(([s,n,h,t]) => {
      setStats(s.data?.data || {});
      setNotices(normalizeArray(n.data?.data).slice(0, 4));
      setHw(normalizeArray(h.data?.data).slice(0, 4));
      setTodaySlots(normalizeArray(t.data?.data?.todaySlots));
      if (!s.data?.data && !n.data?.data && !h.data?.data && !t.data?.data) {
        setLoadError('Could not load dashboard data right now.');
      }
    }).finally(() => setLoading(false));
  }, [user?.teacherId]);

  const classesCount = stats?.classes ?? stats?.classNames?.length ?? todaySlots.length ?? 0;
  const studentsCount = stats?.students ?? 0;
  const homeworkCount = stats?.homework ?? hw.length;
  const pendingTasks = (stats?.attendanceToday?.absent ?? 0) + Math.max(homeworkCount - hw.length, 0);
  const attendanceDue = stats?.attendanceToday?.marked ? `${stats.attendanceToday.marked} marked` : 'Pending';

  const statCards = [
    { icon:'🏫', label:'My Classes',       value: classesCount,  col:'#F0C040', bg:'rgba(212,160,23,0.12)', bd:'rgba(212,160,23,0.2)' },
    { icon:'👨‍🎓',label:'My Students',      value: studentsCount, col:'#86EFAC', bg:'rgba(34,197,94,0.12)',  bd:'rgba(34,197,94,0.2)'  },
    { icon:'📚', label:'Homework Assigned', value: homeworkCount, col:'#93C5FD', bg:'rgba(30,144,255,0.12)', bd:'rgba(30,144,255,0.2)' },
    { icon:'📅', label:'Attendance',        value: attendanceDue, col:'#FCA5A5', bg:'rgba(239,68,68,0.12)',  bd:'rgba(239,68,68,0.2)'  },
  ];

  const now = new Date();
  const hours = now.getHours();
  const greet =
  hours < 12
    ? 'Good morning'
    : hours < 18
    ? 'Good afternoon'
    : 'Good evening';

  return (
    <AppShell title="My Dashboard" subtitle="Today's overview">

      {/* GREETING BANNER */}
      <div className="rounded-2xl p-6 mb-6 relative overflow-hidden"
           style={{background:'linear-gradient(135deg,#0F2044,#162952)',border:'1px solid rgba(212,160,23,0.2)'}}>
        <div className="relative z-10">
          <div className="text-2xl font-black mb-1">
            {greet}, {user?.name?.split(' ')[0] || 'Teacher'}! 👋
          </div>
          <p className="text-sm" style={{color:'rgba(255,255,255,0.55)'}}>
            {now.toLocaleDateString('en-IN',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})} · {(stats?.subject || user?.subject || 'Teacher')} Teacher
          </p>
          <div className="grid grid-cols-2 gap-3 mt-4 sm:flex sm:flex-wrap sm:gap-6">
            {[
              [String(todaySlots.length), 'Classes Today'],
              [String(studentsCount), 'Students'],
              [String(pendingTasks), 'Pending Tasks'],
            ].map(([v,l])=>(
              <div key={l} className="rounded-2xl px-3 py-3 sm:bg-transparent sm:px-0 sm:py-0" style={{background:'rgba(255,255,255,0.05)'}}>
                <div className="text-xl font-black text-yellow-400">{v}</div>
                <div className="text-xs" style={{color:'rgba(255,255,255,0.4)'}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute right-6 top-4 text-6xl opacity-10">🏫</div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(c=>(
          <div key={c.label} className="glass rounded-2xl p-5 hover:-translate-y-0.5 transition-transform">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3" style={{background:c.bg,border:`1px solid ${c.bd}`}}>{c.icon}</div>
            <div className="text-2xl font-black" style={{color:c.col}}>{c.value}</div>
            <div className="text-xs mt-1" style={{color:'rgba(255,255,255,0.4)'}}>{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 mb-6 xl:grid-cols-2">
        {/* TODAY'S SCHEDULE */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">📅 Today's Schedule</h3>
            <span className="text-xs" style={{color:'rgba(255,255,255,0.35)'}}>{todaySlots.length} classes</span>
          </div>
          {todaySlots.length === 0 ? (
            <div className="rounded-xl px-4 py-8 text-center" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
              <div className="text-3xl mb-2 opacity-40">🗓️</div>
              <p className="text-sm text-white">No classes scheduled for today</p>
              <p className="text-xs mt-1" style={{color:'rgba(255,255,255,0.35)'}}>Your timetable will appear here when slots are assigned.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {todaySlots.map((slot)=>{
                return (
                  <div key={slot.id} className="flex flex-col gap-3 p-3 rounded-xl transition-all hover:bg-white/[0.04] sm:flex-row sm:items-center"
                       style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
                    <div className="w-fit flex-shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-black font-mono"
                         style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
                      {formatSlotTime(slot)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white">{slot.subject || stats?.subject || 'Class'} - {slot.className || '-'}</div>
                      <div className="text-xs" style={{color:'rgba(255,255,255,0.35)'}}>
                        {slot.room ? `Room ${slot.room}` : 'Room not set'}{slot.period ? ` · Period ${slot.period}` : ''}
                      </div>
                    </div>
                    <Link href="/teacher/attendance"
                          className="px-3 py-1.5 rounded-xl text-xs font-bold glass hover:bg-white/10 flex-shrink-0">
                      Mark
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* QUICK ACTIONS */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white mb-4">⚡ Quick Actions</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
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
      {!loading && loadError && (
        <div className="mt-6 rounded-2xl px-4 py-3 text-sm" style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.25)',color:'#FCA5A5'}}>
          {loadError}
        </div>
      )}
    </AppShell>
  );
}
