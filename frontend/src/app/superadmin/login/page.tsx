'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await authApi.superAdminLogin(email.trim(), password);
      const data = response.data;
      localStorage.setItem('sims_token', data.accessToken);
      localStorage.setItem('sims_user', JSON.stringify(data.user));
      router.push('/superadmin/dashboard');
    } catch (err: any) {
      const message = err?.message || err?.response?.data?.message || 'Login failed';
      setError(Array.isArray(message) ? message[0] : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 460, margin: '0 auto', padding: '72px 20px' }}>
      <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 8 }}>Super Admin Login</h1>
      <p style={{ opacity: 0.7, marginBottom: 24 }}>Sign in to manage the SaaS platform.</p>
      <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" style={{ padding: 14, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#fff' }} />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" style={{ padding: 14, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#fff' }} />
        {error ? <div style={{ color: '#fca5a5', fontSize: 14 }}>{error}</div> : null}
        <button type="submit" disabled={loading} style={{ padding: 14, borderRadius: 10, border: 'none', background: '#f0c040', color: '#07111f', fontWeight: 900 }}>
          {loading ? 'Signing in…' : 'Login'}
        </button>
      </form>
    </div>
  );
}
