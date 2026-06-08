'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [isCompact, setIsCompact] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const syncViewport = () => setIsCompact(window.innerWidth < 768);
    syncViewport();
    window.addEventListener('resize', syncViewport);
    return () => window.removeEventListener('resize', syncViewport);
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.superAdminLogin(email.trim(), password);
      const data = response.data;
      localStorage.setItem('sims_token', data.accessToken);
      localStorage.setItem('sims_user', JSON.stringify(data.user));
      router.push('/superadmin/dashboard');
    } catch (err: any) {
      const message = err?.response?.data?.message ?? err?.message ?? 'Login failed';
      setError(Array.isArray(message) ? message[0] : message);
    } finally {
      setLoading(false);
    }
  };

  const field: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 12,
    fontSize: 14,
    color: 'white',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const btn: React.CSSProperties = {
    width: '100%',
    padding: '13px 20px',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 800,
    border: 'none',
    cursor: loading ? 'not-allowed' : 'pointer',
    background: loading ? 'rgba(240,192,64,0.45)' : 'linear-gradient(135deg,#F0C040,#FFD86B)',
    color: '#07111F',
    opacity: loading ? 0.75 : 1,
  };

  const label: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 6,
  };

  const errBox: React.CSSProperties = {
    marginBottom: 14,
    padding: '10px 14px',
    borderRadius: 10,
    fontSize: 13,
    background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.3)',
    color: '#FCA5A5',
  };

  const pageGradient = 'linear-gradient(160deg, #04101F 0%, #081A31 50%, #04101F 100%)';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isCompact ? '24px 16px' : '40px',
        background: pageGradient,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at top left, rgba(240,192,64,0.16), transparent 34%), radial-gradient(circle at bottom right, rgba(30,144,255,0.12), transparent 28%), linear-gradient(180deg, rgba(3,8,16,0.88), rgba(3,8,16,0.76))',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: isCompact ? 18 : 24,
          left: isCompact ? 16 : 24,
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            width: isCompact ? 40 : 44,
            height: isCompact ? 40 : 44,
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isCompact ? 19 : 22,
            background: 'linear-gradient(135deg,#F0C040,#FFD86B)',
            boxShadow: '0 8px 24px rgba(240,192,64,0.24)',
            flexShrink: 0,
          }}
        >
          🛡️
        </div>
        <div style={{ lineHeight: 1 }}>
          <div style={{ fontSize: isCompact ? 16 : 18, fontWeight: 900, color: 'white', letterSpacing: '-0.03em', fontFamily: 'Outfit, sans-serif' }}>
            SIMS <span style={{ color: '#F0C040' }}>Pro</span>
          </div>
        </div>
      </div>
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 560,
        }}
      >
        <div
          style={{
            position: 'relative',
            borderRadius: 28,
            padding: isCompact ? '24px 20px' : '30px',
            background: 'linear-gradient(135deg, rgba(10,22,40,0.84), rgba(5,13,26,0.72))',
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
          }}
        >
          <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: isCompact ? 42 : 46,
                height: isCompact ? 42 : 46,
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isCompact ? 20 : 24,
                background: 'linear-gradient(135deg,#F0C040,#FFD86B)',
                boxShadow: '0 8px 24px rgba(240,192,64,0.24)',
                border: 'none',
                flexShrink: 0,
              }}
            >
              🛡️
            </div>
            <div>
              <div style={{ fontSize: isCompact ? 16 : 18, fontWeight: 900, color: 'white', lineHeight: 1.2, letterSpacing: '-0.03em', fontFamily: 'Outfit, sans-serif' }}>
                SIMS <span style={{ color: '#F0C040' }}>Pro</span>
              </div>
            </div>
          </div>

          <form onSubmit={submit} autoComplete="off" style={{ maxWidth: 520 }}>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Email</label>
              <input
                style={field}
                type="email"
                placeholder="superadmin@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={label}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  style={{ ...field, paddingRight: 50 }}
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  style={{
                    position: 'absolute',
                    right: 16,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 16,
                    color: 'rgba(255,255,255,0.35)',
                    padding: 0,
                  }}
                >
                  {showPwd ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'right', marginBottom: 22 }}>
              <button
                type="button"
                onClick={() => router.push('/')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: '#F0C040',
                  fontWeight: 700,
                  padding: 0,
                  fontFamily: 'Outfit, sans-serif',
                }}
              >
                Back to portal
              </button>
            </div>

            {error && <div style={errBox}>⚠️ {error}</div>}

            <button type="submit" disabled={loading} style={btn}>
              {loading ? '⏳ Signing in…' : '→ Enter Super Admin Console'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
