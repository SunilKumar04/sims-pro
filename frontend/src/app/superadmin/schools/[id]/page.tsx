'use client';

import { useEffect, useState } from 'react';
import { superAdminApi } from '@/lib/api';

const domainBadge = (school: any) => {
  const hasCustomDomain = Boolean(school?.customDomain);
  const hasSubdomain = Boolean(school?.subdomain);

  if (hasCustomDomain && hasSubdomain) {
    return { label: 'Custom + Subdomain', color: '#22c55e', background: 'rgba(34,197,94,0.12)' };
  }
  if (hasCustomDomain) {
    return { label: 'Custom Domain', color: '#60a5fa', background: 'rgba(96,165,250,0.12)' };
  }
  if (hasSubdomain) {
    return { label: 'SaaS Subdomain', color: '#f0c040', background: 'rgba(240,192,64,0.12)' };
  }
  return { label: 'Default Domain', color: '#fca5a5', background: 'rgba(252,165,165,0.12)' };
};

const portalPath = (slug?: string) => (slug ? `/portal/${slug}` : '');

export default function SchoolDetailsPage({ params }: { params: { id: string } }) {
  const [school, setSchool] = useState<any>(null);
  const [admins, setAdmins] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [schoolForm, setSchoolForm] = useState({
    name: '',
    schoolCode: '',
    subdomain: '',
    customDomain: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    logoUrl: '',
    primaryColor: '',
    secondaryColor: '',
    accentColor: '',
    backgroundColor: '',
    themeMode: 'dark',
  });

  const load = async () => {
    const [schoolRes, adminsRes] = await Promise.all([
      superAdminApi.getSchool(params.id),
      superAdminApi.schoolAdmins(params.id),
    ]);
    const nextSchool = schoolRes.data.data;
    setSchool(nextSchool);
    setSchoolForm({
      name: nextSchool?.name ?? '',
      schoolCode: nextSchool?.schoolCode ?? '',
      subdomain: nextSchool?.subdomain ?? '',
      customDomain: nextSchool?.customDomain ?? '',
      contactPerson: nextSchool?.contactPerson ?? '',
      email: nextSchool?.email ?? '',
      phone: nextSchool?.phone ?? '',
      address: nextSchool?.address ?? '',
      logoUrl: nextSchool?.settings?.logoUrl ?? '',
      primaryColor: nextSchool?.settings?.primaryColor ?? '',
      secondaryColor: nextSchool?.settings?.secondaryColor ?? '',
      accentColor: nextSchool?.settings?.accentColor ?? '',
      backgroundColor: nextSchool?.settings?.backgroundColor ?? '',
      themeMode: nextSchool?.settings?.themeMode ?? 'dark',
    });
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

  const saveSchool = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await superAdminApi.updateSchool(params.id, {
        ...schoolForm,
        schoolCode: schoolForm.schoolCode || undefined,
        subdomain: schoolForm.subdomain || undefined,
        customDomain: schoolForm.customDomain || undefined,
        logoUrl: schoolForm.logoUrl || undefined,
        primaryColor: schoolForm.primaryColor || undefined,
        secondaryColor: schoolForm.secondaryColor || undefined,
        accentColor: schoolForm.accentColor || undefined,
        backgroundColor: schoolForm.backgroundColor || undefined,
        themeMode: schoolForm.themeMode || undefined,
        phone: schoolForm.phone || undefined,
        address: schoolForm.address || undefined,
      });
      setMessage('School profile updated successfully.');
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to update school');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>{school?.name ?? 'School Details'}</h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <p style={{ opacity: 0.75, margin: 0 }}>{school?.schoolCode} • {school?.status}</p>
          <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: domainBadge(school).background, color: domainBadge(school).color }}>
            {domainBadge(school).label}
          </span>
          {school?.slug ? (
            <span style={{ fontSize: 12, opacity: 0.75 }}>
              Slug: {school.slug} • Portal: {portalPath(school.slug)}
            </span>
          ) : null}
        </div>
      </div>

      <section style={{ padding: 18, borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>School Information</h2>
        <div style={{ display: 'grid', gap: 6, fontSize: 14, opacity: 0.9 }}>
          <div>Contact: {school?.contactPerson}</div>
          <div>Email: {school?.email}</div>
          <div>Phone: {school?.phone || '—'}</div>
          <div>Address: {school?.address || '—'}</div>
          <div>Slug: {school?.slug || '—'}</div>
          <div>Subdomain: {school?.subdomain || '—'}</div>
          <div>Custom Domain: {school?.customDomain || '—'}</div>
          <div>Logo: {school?.settings?.logoUrl || '—'}</div>
          <div>Theme Mode: {school?.settings?.themeMode || 'dark'}</div>
          <div>Onboarding: {school?.onboardingDone ? 'Completed' : 'Pending'}</div>
        </div>
      </section>

      <section style={{ padding: 18, borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>Edit School Profile</h2>
        <form onSubmit={saveSchool} style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            {[
              ['name', 'School Name'],
              ['schoolCode', 'School Code'],
              ['subdomain', 'Subdomain'],
              ['customDomain', 'Custom Domain'],
              ['logoUrl', 'Logo URL'],
              ['primaryColor', 'Primary Color'],
              ['secondaryColor', 'Secondary Color'],
              ['accentColor', 'Accent Color'],
              ['backgroundColor', 'Background Color'],
              ['contactPerson', 'Contact Person'],
              ['email', 'School Email'],
              ['phone', 'Phone'],
              ['address', 'Address'],
            ].map(([key, placeholder]) => (
              <input
                key={key}
                value={(schoolForm as any)[key]}
                onChange={(e) => setSchoolForm((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder={placeholder}
                style={{ padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
              />
            ))}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Theme Mode</label>
              <select
                value={schoolForm.themeMode}
                onChange={(e) => setSchoolForm((prev) => ({ ...prev, themeMode: e.target.value }))}
                style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>
          </div>
          {schoolForm.logoUrl ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.04)' }}>
              <img src={schoolForm.logoUrl} alt="School logo preview" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover' }} />
              <div style={{ fontSize: 12, opacity: 0.75 }}>Logo preview</div>
            </div>
          ) : null}
          {error ? <div style={{ color: '#fca5a5' }}>{error}</div> : null}
          {message ? <div style={{ color: '#86efac' }}>{message}</div> : null}
          <button
            type="submit"
            disabled={saving}
            style={{ padding: 12, borderRadius: 10, border: 'none', background: '#60a5fa', color: '#07111f', fontWeight: 900, width: 'fit-content' }}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
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
