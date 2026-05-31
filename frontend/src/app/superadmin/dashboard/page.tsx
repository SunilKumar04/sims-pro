'use client';

import { useEffect, useState } from 'react';
import { superAdminApi } from '@/lib/api';

type DashboardData = {
  totalSchools: number;
  activeSchools: number;
  suspendedSchools: number;
  totalStudents: number;
  totalTeachers: number;
  monthlyRevenue: number;
  expiringSubscriptions: Array<{
    school: { id: string; name: string; schoolCode: string };
    expiryDate: string;
    amountPaid?: string | number | null;
  }>;
};

export default function SuperAdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await superAdminApi.dashboard();
        if (mounted) setData(response.data.data);
      } catch (err: any) {
        if (mounted) setError(err?.message || 'Unable to load dashboard');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const cards = [
    { label: 'Total Schools', value: data?.totalSchools ?? '—' },
    { label: 'Active Schools', value: data?.activeSchools ?? '—' },
    { label: 'Suspended Schools', value: data?.suspendedSchools ?? '—' },
    { label: 'Total Students', value: data?.totalStudents ?? '—' },
    { label: 'Total Teachers', value: data?.totalTeachers ?? '—' },
    { label: 'Monthly Revenue', value: data ? `₹${Number(data.monthlyRevenue).toLocaleString('en-IN')}` : '—' },
  ];

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div>
        <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 8 }}>Dashboard Overview</h1>
        <p style={{ opacity: 0.7 }}>SaaS-wide health and school onboarding metrics.</p>
      </div>

      {error ? (
        <div style={{ padding: 14, borderRadius: 12, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
          {error}
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {cards.map((card) => (
          <div key={card.label} style={{ padding: 18, borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>{loading ? '…' : card.value}</div>
          </div>
        ))}
      </div>

      <section style={{ padding: 18, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>Expiring Subscriptions</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {(data?.expiringSubscriptions ?? []).length ? data!.expiringSubscriptions.map((item) => (
            <div key={item.school.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.04)' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{item.school.name}</div>
                <div style={{ fontSize: 12, opacity: 0.65 }}>{item.school.schoolCode}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700 }}>{new Date(item.expiryDate).toLocaleDateString()}</div>
                <div style={{ fontSize: 12, opacity: 0.65 }}>Renewal due soon</div>
              </div>
            </div>
          )) : (
            <div style={{ opacity: 0.7, fontSize: 14 }}>No expiring subscriptions right now.</div>
          )}
        </div>
      </section>
    </div>
  );
}
