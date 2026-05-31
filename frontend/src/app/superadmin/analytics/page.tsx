'use client';

import { useEffect, useState } from 'react';
import { superAdminApi } from '@/lib/api';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    superAdminApi.analytics().then((response) => setData(response.data.data));
  }, []);

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12 }}>Analytics</h1>
        <p style={{ opacity: 0.75 }}>Platform usage, revenue, churn, and retention analytics.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {[
          ['Total Schools', data?.totalSchools ?? '—'],
          ['Active Schools', data?.activeSchools ?? '—'],
          ['Total Students', data?.totalStudents ?? '—'],
          ['Total Teachers', data?.totalTeachers ?? '—'],
          ['Monthly Revenue', data ? `₹${Number(data.monthlyRevenue).toLocaleString('en-IN')}` : '—'],
          ['Expiring Subscriptions', data?.expiringSubscriptions ?? '—'],
        ].map(([label, value]) => (
          <div key={String(label)} style={{ padding: 16, borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 900 }}>{value as any}</div>
          </div>
        ))}
      </div>

      <section style={{ padding: 16, borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>Plan Breakdown</h2>
        <div style={{ display: 'grid', gap: 8 }}>
          {(data?.planBreakdown ?? []).map((item: any) => (
            <div key={item.planId} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.04)' }}>
              <div>{item.plan?.name ?? item.planId}</div>
              <div>{item._count?._all ?? 0} subscriptions</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
