'use client';

import { useEffect, useState } from 'react';
import { superAdminApi } from '@/lib/api';

const emptyPlan = {
  code: '',
  name: '',
  priceMonthly: '',
  priceAnnual: '',
  studentLimit: '',
  teacherLimit: '',
  storageLimitMb: '',
  isActive: true,
};

export default function PlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [form, setForm] = useState(emptyPlan);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    const response = await superAdminApi.plans();
    setPlans(response.data.data ?? []);
  };

  useEffect(() => { load(); }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = {
      ...form,
      priceMonthly: Number(form.priceMonthly),
      priceAnnual: form.priceAnnual ? Number(form.priceAnnual) : undefined,
      studentLimit: Number(form.studentLimit),
      teacherLimit: Number(form.teacherLimit),
      storageLimitMb: form.storageLimitMb ? Number(form.storageLimitMb) : undefined,
    };
    if (editingId) {
      await superAdminApi.updatePlan(editingId, payload);
    } else {
      await superAdminApi.createPlan(payload);
    }
    setForm(emptyPlan);
    setEditingId(null);
    await load();
  };

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12 }}>Plans</h1>
        <p style={{ opacity: 0.75 }}>Starter, Professional, and Enterprise plan management.</p>
      </div>

      <form onSubmit={submit} style={{ display: 'grid', gap: 12, padding: 18, borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800 }}>{editingId ? 'Edit Plan' : 'Add Plan'}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          {[
            ['code', 'Code'],
            ['name', 'Name'],
            ['priceMonthly', 'Monthly Price'],
            ['priceAnnual', 'Annual Price'],
            ['studentLimit', 'Student Limit'],
            ['teacherLimit', 'Teacher Limit'],
            ['storageLimitMb', 'Storage MB'],
          ].map(([key, label]) => (
            <input
              key={key}
              value={(form as any)[key]}
              onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
              placeholder={label}
              style={{ padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
            />
          ))}
        </div>
        <label style={{ fontSize: 14, opacity: 0.85 }}>
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))} style={{ marginRight: 8 }} />
          Active
        </label>
        <button type="submit" style={{ padding: 12, borderRadius: 10, border: 'none', background: '#f0c040', color: '#07111f', fontWeight: 900, width: 'fit-content' }}>
          {editingId ? 'Save Changes' : 'Create Plan'}
        </button>
      </form>

      <div style={{ display: 'grid', gap: 12 }}>
        {plans.map((plan) => (
          <div key={plan.id} style={{ padding: 16, borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
              <div>
                <div style={{ fontWeight: 800 }}>{plan.name}</div>
                <div style={{ fontSize: 13, opacity: 0.75 }}>Code: {plan.code}</div>
                <div style={{ fontSize: 13, opacity: 0.75 }}>₹{Number(plan.priceMonthly).toLocaleString('en-IN')} / month</div>
                <div style={{ fontSize: 12, opacity: 0.65, marginTop: 4 }}>
                  Students: {plan.studentLimit} • Teachers: {plan.teacherLimit} • Active: {String(plan.isActive)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setEditingId(plan.id); setForm({ ...plan, priceMonthly: String(plan.priceMonthly), priceAnnual: plan.priceAnnual ? String(plan.priceAnnual) : '', studentLimit: String(plan.studentLimit), teacherLimit: String(plan.teacherLimit), storageLimitMb: plan.storageLimitMb ? String(plan.storageLimitMb) : '', isActive: plan.isActive }); }} style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff' }}>
                  Edit
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
