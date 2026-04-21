'use client';
// src/app/admin/dashboard/page.tsx
import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { dashboardApi, noticesApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = ['#22C55E', '#EF4444', '#F59E0B'];

export default function AdminDashboard() {
  const [stats,   setStats]   = useState<any>(null);
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardApi.getAdminStats(),
      noticesApi.getAll({ limit: 4 }),
    ]).then(([s, n]) => {
      setStats(s.data.data);
      setNotices(n.data.data || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <AppShell title="Dashboard" subtitle="Loading your overview...">
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton h-32 rounded-2xl" />
        ))}
      </div>
    </AppShell>
  );

  const feeDonut = [
    { name: 'Paid',    value: stats?.fees?.paid    || 0 },
    { name: 'Pending', value: stats?.fees?.pending  || 0 },
    { name: 'Partial', value: stats?.fees?.partial  || 0 },
  ];

  const statCards = [
    { icon: '👨‍🎓', label: 'Total Students',    value: stats?.overview?.students || 0, color: 'gold',  change: '↑ +3 this month', changeType: 'up',   href: '/admin/students' },
    { icon: '👩‍🏫', label: 'Faculty Members',   value: stats?.overview?.teachers || 0, color: 'blue',  change: '↑ Active',        changeType: 'up',   href: '/admin/teachers' },
    { icon: '💰', label: 'Fees Collected',    value: formatCurrency(stats?.fees?.totalCollected || 0), color: 'green', change: `↑ ${stats?.fees?.collectionRate || 0}% rate`, changeType: 'up', href: '/admin/fees' },
    { icon: '🏫', label: 'Active Classes',    value: stats?.overview?.classes || 0,  color: 'red',   change: 'Across 3 grades',  changeType: 'neutral', href: '/admin/classes' },
  ];

  const colorMap: Record<string, any> = {
    gold:  { bg: 'rgba(212,160,23,0.12)', border: 'rgba(212,160,23,0.2)', val: '#F0C040' },
    blue:  { bg: 'rgba(30,144,255,0.12)',  border: 'rgba(30,144,255,0.2)', val: '#93C5FD' },
    green: { bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.2)',  val: '#86EFAC' },
    red:   { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.2)',  val: '#FCA5A5' },
  };

  const priorityBadge = (p: string) => {
    const map: any = { HIGH: ['#FCA5A5','rgba(239,68,68,0.15)'], MEDIUM: ['#FCD34D','rgba(245,158,11,0.15)'], LOW: ['rgba(255,255,255,0.4)','rgba(255,255,255,0.08)'] };
    const [color, bg] = map[p] || map.LOW;
    return <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ color, background: bg }}>{p}</span>;
  };

  return (
      <AppShell title="Dashboard" subtitle="School overview & statistics">

      {/* ── STAT CARDS ── */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(c => {
          const col = colorMap[c.color];
          return (
            <Link key={c.label} href={c.href}
                  className="glass rounded-2xl p-5 sm:p-6 transition-all hover:-translate-y-1 hover:shadow-xl relative overflow-hidden cursor-pointer">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-4"
                   style={{ background: col.bg, border: `1px solid ${col.border}` }}>
                {c.icon}
              </div>
              <div className="break-words text-2xl font-black tracking-tight sm:text-3xl" style={{ color: col.val }}>{c.value}</div>
              <div className="text-xs mt-1 font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>{c.label}</div>
              <div className="text-xs font-bold mt-3"
                   style={{ color: c.changeType === 'up' ? '#86EFAC' : c.changeType === 'down' ? '#FCA5A5' : 'rgba(255,255,255,0.3)' }}>
                {c.change}
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── CHARTS ROW ── */}
      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Monthly Fees Bar Chart */}
        <div className="glass rounded-2xl p-5 sm:p-6">
          <div className="sims-section-header mb-5">
            <div>
              <h3 className="text-base font-bold">Monthly Fee Collection</h3>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Current year performance</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(212,160,23,0.15)', color: '#F0C040' }}>2024</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats?.monthlyFees || []} barSize={22}>
              <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: '#0F2044', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', fontSize: 12 }}
                formatter={(v: number) => [formatCurrency(v), 'Collected']}
              />
              <Bar dataKey="amount" fill="url(#goldGrad)" radius={[4,4,0,0]} />
              <defs>
                <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F0C040" />
                  <stop offset="100%" stopColor="#D4A017" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Fee Status Donut */}
        <div className="glass rounded-2xl p-5 sm:p-6">
          <div className="mb-5">
            <h3 className="text-base font-bold">Fee Status Breakdown</h3>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Current term overview</p>
          </div>
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="h-40 w-full md:w-[55%]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={feeDonut} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {feeDonut.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3">
              {feeDonut.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i] }} />
                    <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{item.name}</span>
                  </div>
                  <span className="text-sm font-bold text-white">{item.value}</span>
                </div>
              ))}
              <div className="pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <div className="flex justify-between text-xs font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <span>Collection Rate</span>
                  <span className="text-green-400">{stats?.fees?.collectionRate || 0}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM GRID ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-3">
        {/* Today's Attendance */}
        <div className="glass rounded-2xl p-5 sm:p-6">
          <h3 className="text-sm font-bold mb-4">Today's Attendance</h3>
          {[
            { label: 'Present', value: stats?.attendance?.present || 0, color: '#86EFAC', bar: '#22C55E' },
            { label: 'Absent',  value: stats?.attendance?.absent  || 0, color: '#FCA5A5', bar: '#EF4444' },
            { label: 'Rate',    value: `${stats?.attendance?.rate || 0}%`, color: '#FCD34D', bar: '#F59E0B' },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between mb-3 last:mb-0">
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{item.label}</span>
              <span className="text-sm font-bold" style={{ color: item.color }}>{item.value}</span>
            </div>
          ))}
          <Link href="/admin/attendance" className="mt-4 block text-center text-xs font-bold py-2 rounded-xl transition-all hover:bg-white/10 glass">
            View Attendance →
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="glass rounded-2xl p-5 sm:p-6">
          <h3 className="text-sm font-bold mb-4">Quick Overview</h3>
          {[
            { label: 'Active Notices', value: stats?.overview?.notices  || 0, icon: '📢' },
            { label: 'Homework Assigned', value: stats?.overview?.homework || 0, icon: '📚' },
            { label: 'Pending Fees',   value: stats?.fees?.pending || 0, icon: '⚠️' },
            { label: 'Total Classes',  value: stats?.overview?.classes  || 0, icon: '🏫' },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between mb-3 last:mb-0 py-1">
              <div className="flex items-center gap-2">
                <span>{item.icon}</span>
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{item.label}</span>
              </div>
              <span className="text-sm font-bold text-white">{item.value}</span>
            </div>
          ))}
        </div>

        {/* Recent Notices */}
        <div className="glass rounded-2xl p-5 sm:p-6">
          <div className="sims-section-header mb-4">
            <h3 className="text-sm font-bold">Latest Notices</h3>
            <Link href="/admin/notices" className="text-xs font-bold text-yellow-400 hover:text-yellow-300">View All</Link>
          </div>
          <div className="space-y-3">
            {notices.slice(0, 3).map(n => (
              <div key={n.id} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <span className="text-sm font-bold leading-tight text-white">{n.title}</span>
                  {priorityBadge(n.priority)}
                </div>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{n.date?.slice(0,10)} · {n.target}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
