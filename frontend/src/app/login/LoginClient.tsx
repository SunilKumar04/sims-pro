'use client';
// src/app/login/page.tsx
import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api';
import { getRoleRedirect, login as loginWithStorage } from '@/lib/auth';
import { useTenant } from '@/components/providers/TenantProvider';

type Screen = 'login' | 'forgot' | 'reset' | 'done';

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenant = useTenant();
  const [isCompact, setIsCompact] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [devToken, setDevToken] = useState('');

  const [screen, setScreen] = useState<Screen>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const clearMessages = () => { setError(''); setSuccess(''); };
  const sanitizeReturnTo = (value: string) => {
    if (!value || !value.startsWith('/') || value.startsWith('//')) return '';

    const currentPortalSlug = tenant.portalSlug?.trim().toLowerCase();
    const portalMatch = value.match(/^\/portal\/([^/?#]+)/i);

    if (portalMatch) {
      const requestedSlug = decodeURIComponent(portalMatch[1]).trim().toLowerCase();
      if (!currentPortalSlug || requestedSlug !== currentPortalSlug) return '';
    }

    return value;
  };

  useEffect(() => {
    const syncViewport = () => setIsCompact(window.innerWidth < 768);
    syncViewport();
    window.addEventListener('resize', syncViewport);
    return () => window.removeEventListener('resize', syncViewport);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      const { user } = await loginWithStorage(email.trim(), password);
      const safeReturnTo = sanitizeReturnTo(searchParams.get('returnTo') || '');
      router.push(safeReturnTo || getRoleRedirect(user.role));
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Login failed';
      setError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!forgotEmail.trim()) {
      setError('Please enter your email address');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.forgotPassword(forgotEmail.trim());
      const data = res.data;
      setSuccess(data.message ?? 'Reset code sent!');
      if (data.resetToken) setDevToken(data.resetToken);
      setScreen('reset');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Something went wrong. Try again.';
      setError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!resetToken.trim()) {
      setError('Please enter the reset code');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPwd) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.resetPassword(resetToken.trim(), newPassword);
      setSuccess(res.data.message ?? 'Password reset successfully!');
      setScreen('done');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Invalid or expired code.';
      setError(Array.isArray(msg) ? msg[0] : msg);
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
    background: loading ? 'rgba(212,160,23,0.45)' : 'linear-gradient(135deg,#D4A017,#F0C040)',
    color: '#0A1628',
    opacity: loading ? 0.7 : 1,
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
  const back: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    color: 'rgba(255,255,255,0.38)',
    padding: 0,
    marginBottom: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
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
  const okBox: React.CSSProperties = {
    marginBottom: 14,
    padding: '10px 14px',
    borderRadius: 10,
    fontSize: 13,
    background: 'rgba(34,197,94,0.1)',
    border: '1px solid rgba(34,197,94,0.3)',
    color: '#86EFAC',
  };

  const schoolName = tenant.school?.name || 'Your School';
  const portalHome = tenant.portalSlug ? `/portal/${tenant.portalSlug}` : '/';
  const selectedRole = (searchParams.get('role') || '').toLowerCase();
  const schoolGradient = `linear-gradient(135deg, ${tenant.branding.primaryColor}, ${tenant.branding.accentColor})`;
  const pageGradient = `linear-gradient(160deg, ${tenant.branding.backgroundColor} 0%, #0A1628 55%, ${tenant.branding.backgroundColor} 100%)`;
  const backgroundImage = tenant.branding.backgroundImageUrl
    || tenant.settings?.backgroundImageUrl
    || tenant.settings?.loginBackgroundImage
    || tenant.settings?.backgroundImage
    || tenant.settings?.brandBackgroundImage
    || '';
  const pageBackground = backgroundImage
    ? `${pageGradient}, url(${backgroundImage})`
    : pageGradient;
  const roleCards = {
    admin: {
      id: 'admin',
      label: 'Admin Portal',
      title: 'Admin Portal',
      icon: '🛡️',
      desc: 'School administration, control, reports, and settings.',
      accent: tenant.branding.primaryColor,
    },
    teacher: {
      id: 'teacher',
      label: 'Teacher Panel',
      title: 'Teacher Panel',
      icon: '📘',
      desc: 'Classes, attendance, marks, homework, and communication.',
      accent: tenant.branding.secondaryColor,
    },
    student: {
      id: 'student',
      label: 'Student Panel',
      title: 'Student Panel',
      icon: '🎓',
      desc: 'Homework, results, notices, and student updates.',
      accent: tenant.branding.accentColor,
    },
  } as const;
  const activeRole = selectedRole === 'teacher' || selectedRole === 'student' ? selectedRole : 'admin';
  const activeRoleCard = roleCards[activeRole];

  const strengthBars = (pwd: string) => [
    pwd.length >= 8, /[A-Z]/.test(pwd), /[0-9]/.test(pwd), /[^A-Za-z0-9]/.test(pwd),
  ];

  const cardWidth = screen === 'login' ? 560 : 620;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isCompact ? '24px 16px' : '40px',
        background: pageBackground,
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
          background: 'linear-gradient(180deg, rgba(3,8,16,0.88), rgba(3,8,16,0.76))',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: cardWidth,
          borderRadius: 28,
          padding: isCompact ? '22px 16px' : '24px 24px 22px',
          background: 'rgba(10,22,40,0.72)',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
        }}
      >
        <div style={{ marginBottom: screen === 'login' ? 24 : 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={() => router.push(portalHome)}
            style={{
              width: isCompact ? 42 : 46,
              height: isCompact ? 42 : 46,
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isCompact ? 20 : 24,
              background: schoolGradient,
              boxShadow: `0 8px 24px ${tenant.branding.primaryColor}33`,
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {tenant.branding.logoUrl ? (
              <img
                src={tenant.branding.logoUrl}
                alt={tenant.school?.name || 'School logo'}
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 14 }}
              />
            ) : (
              '🎓'
            )}
          </button>
          <div>
            <div style={{ fontSize: isCompact ? 16 : 18, fontWeight: 900, color: 'white', lineHeight: 1.2, letterSpacing: '-0.03em', fontFamily: 'Outfit, sans-serif' }}>
              SIMS <span style={{ color: tenant.branding.accentColor }}>Pro</span>
            </div>
            <div style={{ fontSize: isCompact ? 8 : 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginTop: 2, fontFamily: 'Outfit, sans-serif' }}>
              SCHOOL INFORMATION SYSTEM
            </div>
          </div>
        </div>

        {screen === 'login' && (
          <form onSubmit={handleLogin} autoComplete="off" style={{ maxWidth: 500 }}>
            <h1 style={{ margin: '0 0 8px', fontSize: isCompact ? 23 : 26, fontWeight: 900, color: 'white', lineHeight: 1.12, letterSpacing: '-0.045em', fontFamily: 'Outfit, sans-serif', textAlign: 'center' }}>Welcome to {schoolName}</h1>
            <p style={{ margin: '0 0 18px', fontSize: isCompact ? 12 : 14, color: 'rgba(255,255,255,0.40)', fontWeight: 600, fontFamily: 'Outfit, sans-serif', textAlign: 'center' }}>Sign in to your school portal</p>

            <div style={{ marginBottom: 20, padding: '14px 14px 15px', borderRadius: 18, border: `1px solid ${activeRoleCard.accent}66`, background: `linear-gradient(135deg, ${activeRoleCard.accent}22, rgba(255,255,255,0.05))`, boxShadow: `0 12px 30px ${activeRoleCard.accent}1f` }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 12, background: `linear-gradient(135deg, ${activeRoleCard.accent}33, rgba(255,255,255,0.06))`, border: `1px solid ${activeRoleCard.accent}44` }}>
                {activeRoleCard.icon}
              </div>
              <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 4, fontFamily: 'Outfit, sans-serif', color: 'white' }}>{activeRoleCard.title}</div>
              <div style={{ fontSize: 11, lineHeight: 1.55, color: 'rgba(255,255,255,0.50)' }}>{activeRoleCard.desc}</div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={label}>Email</label>
              <input style={field} type="email" placeholder="your@email.edu.in" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
            </div>
            <div style={{ marginBottom: 6 }}>
              <label style={label}>Password</label>
              <div style={{ position: 'relative' }}>
                <input style={{ ...field, paddingRight: 50 }} type={showPwd ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPwd(v => !v)} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'rgba(255,255,255,0.35)', padding: 0 }}>
                  {showPwd ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <div style={{ textAlign: 'right', marginBottom: 22 }}>
              <button type="button" onClick={() => { setForgotEmail(email); clearMessages(); setScreen('forgot'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: tenant.branding.accentColor, fontWeight: 700, padding: 0, fontFamily: 'Outfit, sans-serif' }}>
                Forgot password?
              </button>
            </div>
            {error && <div style={errBox}>⚠️ {error}</div>}
            <button type="submit" disabled={loading} style={btn}>{loading ? '⏳ Signing in…' : '→ Sign In'}</button>

          </form>
        )}

        {screen === 'forgot' && (
          <form onSubmit={handleForgot} autoComplete="off">
            <button type="button" style={back} onClick={() => { clearMessages(); setScreen('login'); }}>← Back to login</button>
            <h1 style={{ margin: '0 0 6px', fontSize: isCompact ? 28 : 32, fontWeight: 900, color: 'white', fontFamily: 'Outfit, sans-serif' }}>Forgot Password?</h1>
            <p style={{ margin: '0 0 28px', fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>Enter your registered email. We&apos;ll send a 6-digit reset code valid for 15 minutes.</p>
            <div style={{ marginBottom: 20 }}>
              <label style={label}>Registered Email</label>
              <input style={field} type="email" placeholder="your@email.edu.in" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} autoFocus />
            </div>
            {error && <div style={errBox}>⚠️ {error}</div>}
            <button type="submit" disabled={loading} style={btn}>{loading ? '⏳ Sending…' : '📧 Send Reset Code'}</button>
            <p style={{ marginTop: 14, fontSize: 12, color: 'rgba(255,255,255,0.25)', lineHeight: 1.7 }}>
              Already have a code?{' '}
              <button type="button" onClick={() => { clearMessages(); setScreen('reset'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F0C040', fontWeight: 600, fontSize: 12, padding: 0 }}>
                Enter it here
              </button>
            </p>
          </form>
        )}

        {screen === 'reset' && (
          <form onSubmit={handleReset} autoComplete="off">
            <button type="button" style={back} onClick={() => { clearMessages(); setScreen('forgot'); }}>← Back</button>
            <h1 style={{ margin: '0 0 6px', fontSize: isCompact ? 28 : 32, fontWeight: 900, color: 'white', fontFamily: 'Outfit, sans-serif' }}>Enter Reset Code</h1>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Check your email or server logs for the 6-digit code.</p>
            {devToken && (
              <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 12, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(134,239,172,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>🛠 Dev Mode — Your Reset Code</div>
                <div style={{ fontSize: 30, fontWeight: 900, color: '#86EFAC', letterSpacing: '0.35em' }}>{devToken}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>Hidden in production</div>
              </div>
            )}
            {success && <div style={okBox}>✅ {success}</div>}
            <div style={{ marginBottom: 16 }}>
              <label style={label}>6-Digit Code</label>
              <input style={{ ...field, fontSize: 24, fontWeight: 800, letterSpacing: '0.4em', textAlign: 'center' }} type="text" inputMode="numeric" maxLength={6} placeholder="• • • • • •" value={resetToken} onChange={e => setResetToken(e.target.value.replace(/\D/g, ''))} autoFocus />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={label}>New Password</label>
              <div style={{ position: 'relative' }}>
                <input style={{ ...field, paddingRight: 46 }} type={showNewPwd ? 'text' : 'password'} placeholder="Min. 8 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                <button type="button" onClick={() => setShowNewPwd(v => !v)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'rgba(255,255,255,0.35)', padding: 0 }}>
                  {showNewPwd ? '🙈' : '👁️'}
                </button>
              </div>
              {newPassword.length > 0 && (
                <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                  {strengthBars(newPassword).map((ok, i) => (<div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: ok ? '#86EFAC' : 'rgba(255,255,255,0.1)', transition: 'background 0.2s' }} />))}
                </div>
              )}
              {newPassword.length > 0 && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                  {['8+ chars', 'Uppercase', 'Number', 'Symbol'].map((hint, i) => (
                    <span key={i} style={{ marginRight: 10, color: strengthBars(newPassword)[i] ? '#86EFAC' : 'rgba(255,255,255,0.25)' }}>
                      {strengthBars(newPassword)[i] ? '✓' : '○'} {hint}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={label}>Confirm New Password</label>
              <input style={{ ...field, borderColor: confirmPwd && confirmPwd !== newPassword ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.12)' }} type="password" placeholder="Re-enter new password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} />
              {confirmPwd && confirmPwd !== newPassword && (<div style={{ fontSize: 12, color: '#FCA5A5', marginTop: 4 }}>Passwords do not match</div>)}
            </div>
            {error && <div style={errBox}>⚠️ {error}</div>}
            <button type="submit" disabled={loading} style={btn}>{loading ? '⏳ Resetting…' : '🔒 Reset Password'}</button>
            <div style={{ marginTop: 14, textAlign: 'center' }}>
              <button type="button" onClick={() => { clearMessages(); setScreen('forgot'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'rgba(255,255,255,0.35)', padding: 0 }}>
                Didn&apos;t receive a code? Request again
              </button>
            </div>
          </form>
        )}

        {screen === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>🔓</div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: 'white', fontFamily: 'Outfit, sans-serif' }}>Password Updated!</h1>
            <p style={{ margin: '12px auto 32px', fontSize: 14, color: 'rgba(255,255,255,0.45)', maxWidth: 320, lineHeight: 1.7 }}>Your password has been reset successfully. You can now log in with your new password.</p>
            <button onClick={() => { clearMessages(); setScreen('login'); setDevToken(''); setResetToken(''); setNewPassword(''); setConfirmPwd(''); }} style={{ ...btn, width: 'auto', padding: '13px 48px', cursor: 'pointer' }}>
              → Go to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
