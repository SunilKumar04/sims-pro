'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { superAdminApi } from '@/lib/api';

type School = {
  id: string;
  name: string;
  schoolCode: string;
  contactPerson: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  status: string;
  subscriptions?: Array<{
    plan?: { name: string };
    expiryDate: string;
    status: string;
  }>;
};

const emptyForm = {
  name: '',
  schoolCode: '',
  contactPerson: '',
  email: '',
  phone: '',
  address: '',
  adminEmail: '',
  planCode: 'starter',
  tempPassword: '',
};

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);

  const refresh = async () => {
    setLoading(true);
    try {
      const response = await superAdminApi.schools();
      setSchools(response.data.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const metrics = useMemo(() => ({
    total: schools.length,
    active: schools.filter((school) => school.status === 'ACTIVE').length,
    suspended: schools.filter((school) => school.status === 'SUSPENDED').length,
  }), [schools]);

  const onCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = {
        ...form,
        schoolCode: form.schoolCode || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
        tempPassword: form.tempPassword || undefined,
      };
      const response = await superAdminApi.createSchool(payload);
      setMessage(`Created ${response.data.data.school.name}. Admin: ${response.data.data.adminCredentials.email} / ${response.data.data.adminCredentials.tempPassword}`);
      setForm(emptyForm);
      await refresh();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create school');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (school: School, active: boolean) => {
    await (active ? superAdminApi.activateSchool(school.id) : superAdminApi.suspendSchool(school.id));
    await refresh();
  };

  const removeSchool = async (id: string) => {
    if (!confirm('Delete this school permanently?')) return;
    await superAdminApi.deleteSchool(id);
    await refresh();
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>Schools</h1>
        <p style={{ opacity: 0.75 }}>Onboard, activate, suspend, and manage school tenants.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {[
          { label: 'Total Schools', value: metrics.total },
          { label: 'Active', value: metrics.active },
          { label: 'Suspended', value: metrics.suspended },
        ].map((card) => (
          <div key={card.label} style={{ padding: 16, borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 12, opacity: 0.6 }}>{card.label}</div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>{card.value}</div>
          </div>
        ))}
      </div>

      <form onSubmit={onCreate} style={{ display: 'grid', gap: 12, padding: 18, borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>Add School</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          {[
            ['name', 'School Name'],
            ['schoolCode', 'School Code'],
            ['contactPerson', 'Contact Person'],
            ['email', 'School Email'],
            ['phone', 'Phone'],
            ['address', 'Address'],
            ['adminEmail', 'School Admin Email'],
            ['planCode', 'Plan Code'],
            ['tempPassword', 'Temporary Password'],
          ].map(([key, label]) => (
            <input
              key={key}
              value={(form as any)[key]}
              onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
              placeholder={label}
              required={['schoolCode', 'phone', 'address', 'tempPassword'].includes(key) ? false : true}
              style={{ padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
            />
          ))}
        </div>
        {error ? <div style={{ color: '#fca5a5' }}>{error}</div> : null}
        {message ? <div style={{ color: '#86efac' }}>{message}</div> : null}
        <button type="submit" disabled={saving} style={{ padding: 12, borderRadius: 10, background: '#f0c040', color: '#07111f', fontWeight: 900, border: 'none', width: 'fit-content' }}>
          {saving ? 'Creating…' : 'Create School'}
        </button>
      </form>

      <div style={{ display: 'grid', gap: 10 }}>
        {loading ? (
          <div style={{ opacity: 0.7 }}>Loading schools…</div>
        ) : schools.length ? schools.map((school) => (
          <div key={school.id} style={{ padding: 16, borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'start' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{school.name}</div>
                <div style={{ fontSize: 12, opacity: 0.65 }}>{school.schoolCode} • {school.status}</div>
                <div style={{ fontSize: 13, opacity: 0.85, marginTop: 5 }}>
                  {school.contactPerson} • {school.email}
                </div>
                <div style={{ fontSize: 12, opacity: 0.65, marginTop: 4 }}>
                  {school.subscriptions?.[0]?.plan?.name ? `Plan: ${school.subscriptions[0].plan?.name}` : 'No active plan'} {school.subscriptions?.[0]?.expiryDate ? `• Expiry: ${new Date(school.subscriptions[0].expiryDate).toLocaleDateString()}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
                <Link href={`/superadmin/schools/${school.id}`} style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.08)' }}>Details</Link>
                <button onClick={() => updateStatus(school, true)} style={{ padding: '8px 12px', borderRadius: 10, background: '#14532d', color: '#fff', border: 'none' }}>Activate</button>
                <button onClick={() => updateStatus(school, false)} style={{ padding: '8px 12px', borderRadius: 10, background: '#7f1d1d', color: '#fff', border: 'none' }}>Suspend</button>
                <button onClick={() => removeSchool(school.id)} style={{ padding: '8px 12px', borderRadius: 10, background: '#3f3f46', color: '#fff', border: 'none' }}>Delete</button>
              </div>
            </div>
          </div>
        )) : (
          <div style={{ opacity: 0.7 }}>No schools found.</div>
        )}
      </div>
    </div>
  );
}
