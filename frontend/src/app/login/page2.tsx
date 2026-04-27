'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { getRoleRedirect } from '@/lib/auth';

type RoleId = 'admin' | 'teacher' | 'student';
type Screen = 'login' | 'forgot' | 'reset' | 'done';

const META: Record<RoleId, any> = {
  admin: {
    title: 'Admin Portal',
    desc: 'Login with your admin credentials to manage the entire school ecosystem.',
    email: 'admin@gnpss.edu.in',
    pass: 'Admin@1234',
    color: '#F0C040',
    features: [
      ['🛡️','Full Dashboard & Analytics'],
      ['👥','Student & Teacher Mgmt'],
      ['💰','Fee & Finance Control'],
      ['📢','Notice Publisher & Settings'],
    ],
  },
  teacher: {
    title: 'Teacher Portal',
    desc: 'Manage classroom tools and students.',
    email: 'sunita@gnpss.edu.in',
    pass: 'Teacher@1234',
    color: '#60A5FA',
    features: [
      ['✅','Attendance'],
      ['📚','Homework'],
      ['📝','Marks'],
      ['📅','Schedule'],
    ],
  },
  student: {
    title: 'Student Portal',
    desc: 'Access your academic dashboard.',
    email: 'aarav@student.gnpss.edu.in',
    pass: 'Student@1234',
    color: '#34D399',
    features: [
      ['📅','Attendance'],
      ['💰','Fees'],
      ['📚','Homework'],
      ['🔔','Notices'],
    ],
  },
};

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();

  const roleParam = (params.get('role') || 'admin') as RoleId;
  const [role, setRole] = useState<RoleId>('admin');
  const [screen, setScreen] = useState<Screen>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');

  const [devToken, setDevToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const m = META[role];

  useEffect(() => {
    setRole(roleParam);
    setEmail(META[roleParam].email);
    setPassword('');
  }, [roleParam]);

  const clear = () => setError('');

  // LOGIN
  const handleLogin = async (e: any) => {
    e.preventDefault();
    clear();
    setLoading(true);

    try {
      const res = await authApi.login(email, password);
      const { accessToken, user } = res.data;

      localStorage.setItem('sims_token', accessToken);
      localStorage.setItem('sims_user', JSON.stringify(user));

      router.push(getRoleRedirect(user.role));
    } catch {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  // FORGOT
  const handleForgot = async (e: any) => {
    e.preventDefault();
    clear();
    setLoading(true);

    try {
      const res = await authApi.forgotPassword(forgotEmail);
      if (res.data.resetToken) setDevToken(res.data.resetToken);
      setScreen('reset');
    } catch {
      setError('Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  // RESET
  const handleReset = async (e: any) => {
    e.preventDefault();
    clear();

    if (newPassword !== confirmPwd) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await authApi.resetPassword(resetToken, newPassword);
      setScreen('done');
    } catch {
      setError('Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#0A1628]">

      {/* LEFT PANEL */}
      <div className="hidden lg:flex flex-1 flex-col justify-center px-16 py-12 bg-[#14284B] text-white">

        {/* LOGO */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center text-xl">
            🎓
          </div>
          <div className="text-xl font-bold">
            SIMS <span style={{ color: '#F0C040' }}>Pro</span>
          </div>
        </div>

        {/* TITLE */}
        <h1 className="text-4xl font-extrabold mb-4">
          {m.title.split(' ')[0]}{' '}
          <span style={{ color: '#F0C040' }}>
            {m.title.split(' ')[1]}
          </span>
        </h1>

        <p className="text-white/50 mb-10 max-w-md">
          {m.desc}
        </p>

        {/* FEATURES */}
        <div className="space-y-4">
          {m.features.map(([icon, text]: any) => (
            <div key={text} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                {icon}
              </div>
              <span className="text-white/70">{text}</span>
            </div>
          ))}
        </div>

        {/* SWITCH */}
        <div className="mt-10">
          <p className="text-xs text-white/40 mb-2">SWITCH PORTAL</p>
          <div className="flex gap-2">
            {(['admin','teacher','student'] as RoleId[]).map(r => (
              <Link
                key={r}
                href={`/login?role=${r}`}
                className={`flex-1 py-2 text-center rounded-lg text-sm ${
                  r === role
                    ? 'bg-yellow-500 text-black'
                    : 'bg-white/10 text-white/40'
                }`}
              >
                {r}
              </Link>
            ))}
          </div>
        </div>

        <Link href="/portal" className="mt-6 text-white/40 text-sm">
          ← Back to Portal Home
        </Link>
      </div>

      {/* RIGHT PANEL (UNCHANGED STYLE) */}
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">

          {screen === 'login' && (
            <form onSubmit={handleLogin}>
              <h2 className="text-3xl font-bold text-white mb-2">
                Welcome Back
              </h2>
              <p className="text-white/40 mb-6">
                Sign in to access your portal
              </p>

              <input
                className="w-full p-4 mb-4 rounded-xl bg-white/10 text-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
              />

              <div className="relative mb-4">
                <input
                  type={showPwd ? 'text' : 'password'}
                  className="w-full p-4 rounded-xl bg-white/10 text-white"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-4 top-4"
                >
                  {showPwd ? '🙈' : '👁️'}
                </button>
              </div>

              <div className="text-right mb-4">
                <button
                  type="button"
                  onClick={() => setScreen('forgot')}
                  className="text-yellow-400 text-sm"
                >
                  Forgot Password?
                </button>
              </div>

              {error && (
                <div className="bg-red-500/20 text-red-300 p-3 rounded-lg mb-4">
                  ⚠️ {error}
                </div>
              )}

              <button className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-400 text-black font-bold">
                {loading ? 'Loading...' : '→ Login'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail(m.email);
                  setPassword(m.pass);
                }}
                className="w-full mt-3 py-3 rounded-xl bg-white/10"
              >
                🔑 Use Demo Credentials
              </button>
            </form>
          )}

          {/* FORGOT */}
          {screen === 'forgot' && (
            <form onSubmit={handleForgot}>
              <h2 className="text-xl text-white mb-4">Forgot Password</h2>

              <input
                className="w-full p-4 mb-4 rounded-xl bg-white/10 text-white"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="Email"
              />

              <button className="w-full py-4 bg-yellow-500 rounded-xl text-black">
                Send Code
              </button>
            </form>
          )}

          {/* RESET */}
          {screen === 'reset' && (
            <form onSubmit={handleReset}>
              <h2 className="text-xl text-white mb-4">Reset Password</h2>

              {devToken && (
                <div className="text-green-400 mb-3 text-center">
                  {devToken}
                </div>
              )}

              <input
                className="w-full p-4 mb-3 rounded-xl bg-white/10 text-white text-center tracking-widest"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                placeholder="Code"
              />

              <input
                className="w-full p-4 mb-3 rounded-xl bg-white/10 text-white"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New Password"
              />

              <input
                className="w-full p-4 mb-3 rounded-xl bg-white/10 text-white"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="Confirm Password"
              />

              {error && (
                <div className="text-red-400 mb-3">{error}</div>
              )}

              <button className="w-full py-4 bg-green-500 rounded-xl">
                Reset Password
              </button>
            </form>
          )}

          {/* DONE */}
          {screen === 'done' && (
            <div className="text-center text-white">
              <h2>Password Updated</h2>
              <button
                onClick={() => setScreen('login')}
                className="mt-4 px-6 py-3 bg-yellow-500 rounded-xl text-black"
              >
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-white p-6">Loading...</div>}>
      <LoginInner />
    </Suspense>
  );
}
