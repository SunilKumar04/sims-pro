'use client';

import { useEffect, useState } from 'react';
import { superAdminApi } from '@/lib/api';

export default function SchoolDetailsPage({ params }: { params: { id: string } }) {
  const [school, setSchool] = useState<any>(null);
  const [admins, setAdmins] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '', phone: '' });

  const load = async () => {
    const [schoolRes, adminsRes] = await Promise.all([
      superAdminApi.getSchool(params.id),
      superAdminApi.schoolAdmins(params.id),
    ]);
    setSchool(schoolRes.data.data);
    setAdmins(adminsRes.data.data ?? []);
  };

  useEffect(() => { load(); }, [params.id]);

  const createAdmin = async (event: React.FormEvent) => {
    event.preventDefault();
    const response = await superAdminApi.createSchoolAdmin(params.id, adminForm);
    setMessage(`Created ${response.data.data.email}.`);
    setAdminForm({ name: '', email: '', password: '', phone: '' });
    await load();
  };

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>{school?.name ?? 'School Details'}</h1>
        <p style={{ opacity: 0.75 }}>{school?.schoolCode} • {school?.status}</p>
      </div>

      <section style={{ padding: 18, borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>School Information</h2>
        <div style={{ display: 'grid', gap: 6, fontSize: 14, opacity: 0.9 }}>
          <div>Contact: {school?.contactPerson}</div>
          <div>Email: {school?.email}</div>
          <div>Phone: {school?.phone || '—'}</div>
          <div>Address: {school?.address || '—'}</div>
          <div>Onboarding: {school?.onboardingDone ? 'Completed' : 'Pending'}</div>
        </div>
      </section>

      <section style={{ padding: 18, borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>School Admins</h2>
        <form onSubmit={createAdmin} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 14 }}>
          <input value={adminForm.name} onChange={(e) => setAdminForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Admin Name" style={{ padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff' }} />
          <input value={adminForm.email} onChange={(e) => setAdminForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="Admin Email" style={{ padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff' }} />
          <input value={adminForm.password} onChange={(e) => setAdminForm((prev) => ({ ...prev, password: e.target.value }))} placeholder="Temporary Password" type="password" style={{ padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff' }} />
          <input value={adminForm.phone} onChange={(e) => setAdminForm((prev) => ({ ...prev, phone: e.target.value }))} placeholder="Phone" style={{ padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff' }} />
          <button type="submit" style={{ padding: 12, borderRadius: 10, border: 'none', background: '#f0c040', color: '#07111f', fontWeight: 900 }}>Add Admin</button>
        </form>
        {message ? <div style={{ color: '#86efac', marginBottom: 10 }}>{message}</div> : null}
        <div style={{ display: 'grid', gap: 10 }}>
          {admins.map((admin) => (
            <div key={admin.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.04)' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{admin.name}</div>
                <div style={{ fontSize: 12, opacity: 0.65 }}>{admin.email}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => superAdminApi.setSchoolAdminStatus(admin.id, !admin.isActive).then(load)} style={{ padding: '8px 12px', borderRadius: 8, background: admin.isActive ? '#7f1d1d' : '#14532d', border: 'none', color: '#fff' }}>
                  {admin.isActive ? 'Suspend' : 'Activate'}
                </button>
                <button onClick={() => {
                  const password = prompt('New temporary password?');
                  if (!password) return;
                  superAdminApi.resetSchoolAdminPassword(admin.id, password).then(load);
                }} style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff' }}>
                  Reset Password
                </button>
              </div>
            </div>
          ))}
          {!admins.length ? <div style={{ opacity: 0.7 }}>No school admins found.</div> : null}
        </div>
      </section>
    </div>
  );
}
