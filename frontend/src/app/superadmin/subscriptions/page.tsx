'use client';

import { useEffect, useState } from 'react';
import { superAdminApi } from '@/lib/api';

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    superAdminApi.subscriptions().then((response) => setSubscriptions(response.data.data ?? []));
  }, []);

  const filtered = subscriptions.filter((sub) =>
    !filter ||
    sub.status === filter ||
    sub.school?.name?.toLowerCase().includes(filter.toLowerCase()) ||
    sub.plan?.name?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12 }}>Subscriptions</h1>
        <p style={{ opacity: 0.75 }}>Track renewals, expiry dates, and payment status.</p>
      </div>
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter by school, plan, or status"
        style={{ padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
      />
      <div style={{ display: 'grid', gap: 10 }}>
        {filtered.map((subscription) => (
          <div key={subscription.id} style={{ padding: 16, borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontWeight: 800 }}>{subscription.school?.name ?? 'Unknown School'}</div>
            <div style={{ fontSize: 12, opacity: 0.65 }}>{subscription.plan?.name} • {subscription.status}</div>
            <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
              Expiry: {new Date(subscription.expiryDate).toLocaleDateString()}
              {new Date(subscription.expiryDate).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000 ? ' • Renewal warning' : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
