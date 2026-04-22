'use client';
// src/app/login/page.tsx
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { getRoleRedirect } from '@/lib/auth';

type Screen = 'login' | 'forgot' | 'reset' | 'done';

export default function LoginPage() {
  const router = useRouter();
  const [isCompact, setIsCompact] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  // ── Login state ──────────────────────────────────
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);

  // ── Forgot / reset state ─────────────────────────
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken,  setResetToken]  = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPwd,  setConfirmPwd]  = useState('');
  const [showNewPwd,  setShowNewPwd]  = useState(false);
  const [devToken,    setDevToken]    = useState('');

  // ── Shared ───────────────────────────────────────
  const [screen,  setScreen]  = useState<Screen>('login');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  const clearMessages = () => { setError(''); setSuccess(''); };

  useEffect(() => {
    const syncViewport = () => {
      setIsCompact(window.innerWidth < 1024);
      setIsTablet(window.innerWidth < 1280);
    };

    syncViewport();
    window.addEventListener('resize', syncViewport);
    return () => window.removeEventListener('resize', syncViewport);
  }, []);

  // ── Handlers ─────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); clearMessages();
    if (!email.trim() || !password.trim()) { setError('Please enter email and password'); return; }
    setLoading(true);
    try {
      const res  = await authApi.login(email.trim(), password);
      const data = res.data;
      if (!data.accessToken) throw new Error('No token received');
      localStorage.setItem('sims_token', data.accessToken);
      localStorage.setItem('sims_user',  JSON.stringify(data.user));
      router.push(getRoleRedirect(data.user.role));
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Login failed';
      setError(Array.isArray(msg) ? msg[0] : msg);
    } finally { setLoading(false); }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault(); clearMessages();
    if (!forgotEmail.trim()) { setError('Please enter your email address'); return; }
    setLoading(true);
    try {
      const res  = await authApi.forgotPassword(forgotEmail.trim());
      const data = res.data;
      setSuccess(data.message ?? 'Reset code sent!');
      if (data.resetToken) setDevToken(data.resetToken);
      setScreen('reset');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Something went wrong. Try again.';
      setError(Array.isArray(msg) ? msg[0] : msg);
    } finally { setLoading(false); }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault(); clearMessages();
    if (!resetToken.trim())        { setError('Please enter the reset code');            return; }
    if (newPassword.length < 8)    { setError('Password must be at least 8 characters'); return; }
    if (newPassword !== confirmPwd){ setError('Passwords do not match');                return; }
    setLoading(true);
    try {
      const res = await authApi.resetPassword(resetToken.trim(), newPassword);
      setSuccess(res.data.message ?? 'Password reset successfully!');
      setScreen('done');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Invalid or expired code.';
      setError(Array.isArray(msg) ? msg[0] : msg);
    } finally { setLoading(false); }
  };

  // ── Demo accounts ────────────────────────────────
  const DEMOS = [
    { role:'Admin',   email:'admin@gnpss.edu.in',         pw:'Admin@1234',   color:'#F0C040' },
    { role:'Teacher', email:'sunita@gnpss.edu.in',        pw:'Teacher@1234', color:'#93C5FD' },
    { role:'Student', email:'aarav@student.gnpss.edu.in', pw:'Student@1234', color:'#86EFAC' },
  ];

  // ── Shared inline style helpers ──────────────────
  const field: React.CSSProperties = {
    width:'100%', padding:'12px 16px', borderRadius:12, fontSize:14, color:'white',
    background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)',
    outline:'none', boxSizing:'border-box',
  };
  const btn: React.CSSProperties = {
    width:'100%', padding:'13px', borderRadius:12, fontSize:14, fontWeight:800,
    border:'none', cursor: loading ? 'not-allowed' : 'pointer',
    background: loading ? 'rgba(212,160,23,0.45)' : 'linear-gradient(135deg,#D4A017,#F0C040)',
    color:'#0A1628', opacity: loading ? 0.7 : 1,
  };
  const label: React.CSSProperties = {
    display:'block', fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.4)',
    textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6,
  };
  const back: React.CSSProperties = {
    background:'none', border:'none', cursor:'pointer', fontSize:13,
    color:'rgba(255,255,255,0.4)', padding:0, marginBottom:20, display:'flex', alignItems:'center', gap:6,
  };
  const errBox: React.CSSProperties = {
    marginBottom:14, padding:'10px 14px', borderRadius:10, fontSize:13,
    background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.3)', color:'#FCA5A5',
  };
  const okBox: React.CSSProperties = {
    marginBottom:14, padding:'10px 14px', borderRadius:10, fontSize:13,
    background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', color:'#86EFAC',
  };

  const strengthBars = (pwd: string) => [
    pwd.length >= 8, /[A-Z]/.test(pwd), /[0-9]/.test(pwd), /[^A-Za-z0-9]/.test(pwd),
  ];

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:isCompact ? 'column' : 'row', background:'linear-gradient(160deg,#060E1C 0%,#0A1628 55%,#060E1C 100%)' }}>

      {/* ── Left: form panel ── */}
      <div style={{ flex:isCompact ? '0 0 auto' : 1, display:'flex', flexDirection:'column', justifyContent:'center', padding:isCompact ? '28px 18px 40px' : isTablet ? '48px 42px' : '60px 80px', width:'100%', maxWidth:isCompact ? '100%' : 580, margin:isCompact ? '0 auto' : undefined }}>

        {/* Brand */}
        <div style={{ marginBottom:isCompact ? 32 : 48, display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:isCompact ? 44 : 50,height:isCompact ? 44 : 50,borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',fontSize:isCompact ? 20 : 24,background:'linear-gradient(135deg,#D4A017,#F0C040)',boxShadow:'0 8px 24px rgba(212,160,23,0.35)' }}>🎓</div>
          <div>
            <div style={{ fontSize:isCompact ? 18 : 20,fontWeight:900,color:'white',lineHeight:1.2 }}>SIMS <span style={{ color:'#F0C040' }}>Pro</span></div>
            <div style={{ fontSize:10,letterSpacing:'0.12em',textTransform:'uppercase',color:'rgba(255,255,255,0.3)',marginTop:2 }}>School Information System</div>
          </div>
        </div>

        {/* ── SCREEN: login ── */}
        {screen === 'login' && (
          <form onSubmit={handleLogin} autoComplete="off">
            <h1 style={{ margin:'0 0 6px',fontSize:isCompact ? 26 : 30,fontWeight:900,color:'white' }}>Welcome back</h1>
            <p style={{ margin:'0 0 28px',fontSize:14,color:'rgba(255,255,255,0.4)' }}>Sign in to your school portal</p>

            <div style={{ marginBottom:14 }}>
              <label style={label}>Email</label>
              <input style={field} type="email" placeholder="your@email.edu.in" value={email} onChange={e => setEmail(e.target.value)} autoFocus/>
            </div>

            <div style={{ marginBottom:6 }}>
              <label style={label}>Password</label>
              <div style={{ position:'relative' }}>
                <input style={{ ...field, paddingRight:46 }} type={showPwd ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}/>
                <button type="button" onClick={() => setShowPwd(v => !v)}
                        style={{ position:'absolute',right:14,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:16,color:'rgba(255,255,255,0.35)',padding:0 }}>
                  {showPwd ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div style={{ textAlign:'right', marginBottom:20 }}>
              <button type="button" onClick={() => { setForgotEmail(email); clearMessages(); setScreen('forgot'); }}
                      style={{ background:'none',border:'none',cursor:'pointer',fontSize:13,color:'#F0C040',fontWeight:600,padding:0 }}>
                Forgot password?
              </button>
            </div>

            {error && <div style={errBox}>⚠️ {error}</div>}
            <button type="submit" disabled={loading} style={btn}>{loading ? '⏳ Signing in…' : '→ Sign In'}</button>

            {/* Demo creds */}
            <div style={{ marginTop:36 }}>
              <div style={{ fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.2)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:10 }}>Demo Accounts</div>
              <div style={{ display:'flex',flexDirection:'column',gap:7 }}>
                {DEMOS.map(d => (
                  <button key={d.role} type="button"
                          onClick={() => { setEmail(d.email); setPassword(d.pw); clearMessages(); }}
                          style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 14px',borderRadius:12,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',cursor:'pointer' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.07)'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.04)'}>
                    <span style={{ fontSize:12,fontWeight:700,color:d.color }}>{d.role}</span>
                    {!isCompact && <span style={{ fontSize:11,color:'rgba(255,255,255,0.35)',fontFamily:'monospace' }}>{d.email}</span>}
                  </button>
                ))}
              </div>
            </div>
          </form>
        )}

        {/* ── SCREEN: forgot ── */}
        {screen === 'forgot' && (
          <form onSubmit={handleForgot} autoComplete="off">
            <button type="button" style={back} onClick={() => { clearMessages(); setScreen('login'); }}>← Back to login</button>
            <h1 style={{ margin:'0 0 6px',fontSize:28,fontWeight:900,color:'white' }}>Forgot Password?</h1>
            <p style={{ margin:'0 0 28px',fontSize:14,color:'rgba(255,255,255,0.4)',lineHeight:1.6 }}>
              Enter your registered email. We&apos;ll send a 6-digit reset code valid for 15 minutes.
            </p>

            <div style={{ marginBottom:20 }}>
              <label style={label}>Registered Email</label>
              <input style={field} type="email" placeholder="your@email.edu.in" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} autoFocus/>
            </div>

            {error   && <div style={errBox}>⚠️ {error}</div>}
            <button type="submit" disabled={loading} style={btn}>{loading ? '⏳ Sending…' : '📧 Send Reset Code'}</button>

            <p style={{ marginTop:14,fontSize:12,color:'rgba(255,255,255,0.25)',lineHeight:1.7 }}>
              Already have a code?{' '}
              <button type="button" onClick={() => { clearMessages(); setScreen('reset'); }}
                      style={{ background:'none',border:'none',cursor:'pointer',color:'#F0C040',fontWeight:600,fontSize:12,padding:0 }}>
                Enter it here
              </button>
            </p>
          </form>
        )}

        {/* ── SCREEN: reset ── */}
        {screen === 'reset' && (
          <form onSubmit={handleReset} autoComplete="off">
            <button type="button" style={back} onClick={() => { clearMessages(); setScreen('forgot'); }}>← Back</button>
            <h1 style={{ margin:'0 0 6px',fontSize:28,fontWeight:900,color:'white' }}>Enter Reset Code</h1>
            <p style={{ margin:'0 0 24px',fontSize:14,color:'rgba(255,255,255,0.4)' }}>
              Check your email or server logs for the 6-digit code.
            </p>

            {/* Dev token display */}
            {devToken && (
              <div style={{ marginBottom:20,padding:'12px 16px',borderRadius:12,background:'rgba(34,197,94,0.08)',border:'1px solid rgba(34,197,94,0.25)' }}>
                <div style={{ fontSize:10,fontWeight:700,color:'rgba(134,239,172,0.7)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6 }}>🛠 Dev Mode — Your Reset Code</div>
                <div style={{ fontSize:30,fontWeight:900,color:'#86EFAC',letterSpacing:'0.35em' }}>{devToken}</div>
                <div style={{ fontSize:11,color:'rgba(255,255,255,0.3)',marginTop:4 }}>Hidden in production</div>
              </div>
            )}

            {success && <div style={okBox}>✅ {success}</div>}

            <div style={{ marginBottom:16 }}>
              <label style={label}>6-Digit Code</label>
              <input style={{ ...field,fontSize:24,fontWeight:800,letterSpacing:'0.4em',textAlign:'center' }}
                     type="text" inputMode="numeric" maxLength={6}
                     placeholder="• • • • • •" value={resetToken}
                     onChange={e => setResetToken(e.target.value.replace(/\D/g,''))} autoFocus/>
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={label}>New Password</label>
              <div style={{ position:'relative' }}>
                <input style={{ ...field,paddingRight:46 }} type={showNewPwd ? 'text' : 'password'}
                       placeholder="Min. 8 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)}/>
                <button type="button" onClick={() => setShowNewPwd(v => !v)}
                        style={{ position:'absolute',right:14,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:16,color:'rgba(255,255,255,0.35)',padding:0 }}>
                  {showNewPwd ? '🙈' : '👁️'}
                </button>
              </div>
              {newPassword.length > 0 && (
                <div style={{ display:'flex',gap:4,marginTop:6 }}>
                  {strengthBars(newPassword).map((ok,i) => (
                    <div key={i} style={{ flex:1,height:3,borderRadius:99,background:ok?'#86EFAC':'rgba(255,255,255,0.1)',transition:'background 0.2s' }}/>
                  ))}
                </div>
              )}
              {newPassword.length > 0 && (
                <div style={{ fontSize:11,color:'rgba(255,255,255,0.3)',marginTop:4 }}>
                  {['8+ chars','Uppercase','Number','Symbol'].map((hint,i) => (
                    <span key={i} style={{ marginRight:10,color:strengthBars(newPassword)[i]?'#86EFAC':'rgba(255,255,255,0.25)' }}>
                      {strengthBars(newPassword)[i]?'✓':'○'} {hint}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginBottom:20 }}>
              <label style={label}>Confirm New Password</label>
              <input style={{ ...field,borderColor:confirmPwd&&confirmPwd!==newPassword?'rgba(239,68,68,0.5)':'rgba(255,255,255,0.12)' }}
                     type="password" placeholder="Re-enter new password"
                     value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}/>
              {confirmPwd && confirmPwd !== newPassword && (
                <div style={{ fontSize:12,color:'#FCA5A5',marginTop:4 }}>Passwords do not match</div>
              )}
            </div>

            {error && <div style={errBox}>⚠️ {error}</div>}
            <button type="submit" disabled={loading} style={btn}>{loading ? '⏳ Resetting…' : '🔒 Reset Password'}</button>

            <div style={{ marginTop:14,textAlign:'center' }}>
              <button type="button" onClick={() => { clearMessages(); setScreen('forgot'); }}
                      style={{ background:'none',border:'none',cursor:'pointer',fontSize:12,color:'rgba(255,255,255,0.35)',padding:0 }}>
                Didn&apos;t receive a code? Request again
              </button>
            </div>
          </form>
        )}

        {/* ── SCREEN: done ── */}
        {screen === 'done' && (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:64,marginBottom:20 }}>🔓</div>
            <h1 style={{ margin:0,fontSize:28,fontWeight:900,color:'white' }}>Password Updated!</h1>
            <p style={{ margin:'12px auto 32px',fontSize:14,color:'rgba(255,255,255,0.45)',maxWidth:320,lineHeight:1.7 }}>
              Your password has been reset successfully. You can now log in with your new password.
            </p>
            <button onClick={() => { clearMessages(); setScreen('login'); setDevToken(''); setResetToken(''); setNewPassword(''); setConfirmPwd(''); }}
                    style={{ ...btn,width:'auto',padding:'13px 48px',cursor:'pointer' }}>
              → Go to Login
            </button>
          </div>
        )}
      </div>

      {/* ── Right: decorative panel ── */}
      {!isCompact && (
      <div style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:isTablet ? 36 : 60,background:'rgba(255,255,255,0.012)',borderLeft:'1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize:80,marginBottom:28,lineHeight:1,filter:'drop-shadow(0 8px 24px rgba(212,160,23,0.2))' }}>🏫</div>
        <h2 style={{ margin:0,fontSize:26,fontWeight:900,color:'white',textAlign:'center',lineHeight:1.3 }}>GNPSS School Portal</h2>
        <p style={{ margin:'14px 0 0',fontSize:14,color:'rgba(255,255,255,0.35)',textAlign:'center',maxWidth:300,lineHeight:1.8 }}>
          Manage students, teachers, attendance, marks, fees and more — all in one place.
        </p>
        <div style={{ marginTop:36,display:'flex',flexWrap:'wrap',gap:8,justifyContent:'center',maxWidth:360 }}>
          {['📊 Dashboard','✅ Attendance','📝 Marks','💰 Fees','📢 Notices','🗓️ Timetable','📋 Assignments','📆 Exams','🎯 Sessions'].map(f => (
            <div key={f} style={{ padding:'6px 14px',borderRadius:99,fontSize:12,fontWeight:600,background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.5)',border:'1px solid rgba(255,255,255,0.08)' }}>{f}</div>
          ))}
        </div>
      </div>
      )}

    </div>
  );
}
