'use client';
// src/app/login/page.tsx
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { getRoleRedirect } from '@/lib/auth';

type RoleId = 'admin' | 'teacher' | 'student';

const META: Record<RoleId, {
  title: string; desc: string; idLabel: string; placeholder: string;
  demoEmail: string; demoPass: string; features: [string, string][];
  btnCls: string; accentBg: string; accentBorder: string;
}> = {
  admin: {
    title: 'Admin Portal',
    desc: 'Login with your admin credentials to manage the entire school ecosystem.',
    idLabel: 'ADMIN EMAIL', placeholder: 'admin@gnpss.edu.in',
    demoEmail: 'admin@gnpss.edu.in', demoPass: 'Admin@1234',
    features: [['🛡️','Full Dashboard & Analytics'],['👥','Student & Teacher Mgmt'],['💰','Fee & Finance Control'],['📢','Notice Publisher & Settings']],
    btnCls: 'from-yellow-600 to-yellow-400 text-stone-900',
    accentBg: 'rgba(212,160,23,0.12)', accentBorder: 'rgba(212,160,23,0.3)',
  },
  teacher: {
    title: 'Teacher Portal',
    desc: 'Login with your Employee Code and Password to access your classroom tools.',
    idLabel: 'TEACHER EMAIL', placeholder: 'teacher@gnpss.edu.in',
    demoEmail: 'sunita@gnpss.edu.in', demoPass: 'Teacher@1234',
    features: [['✅','Daily Attendance Marking'],['📚','Homework Assignment'],['📝','Marks & Grade Entry'],['📅','Class Schedule View']],
    btnCls: 'from-blue-600 to-blue-400 text-white',
    accentBg: 'rgba(30,144,255,0.12)', accentBorder: 'rgba(30,144,255,0.3)',
  },
  student: {
    title: 'Student / Parent Login',
    desc: 'Login with your UID and Password to access your academic portal.',
    idLabel: 'STUDENT EMAIL / UID', placeholder: 'aarav@student.gnpss.edu.in',
    demoEmail: 'aarav@student.gnpss.edu.in', demoPass: 'Student@1234',
    features: [['📅','Attendance Calendar'],['💰','Fee Status & Receipts'],['📚','Homework Tracker'],['🔔','School Notices & Alerts']],
    btnCls: 'from-green-700 to-green-500 text-white',
    accentBg: 'rgba(34,197,94,0.12)', accentBorder: 'rgba(34,197,94,0.3)',
  },
};

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const rp     = (params.get('role') || 'admin') as RoleId;

  const [role,    setRoleState] = useState<RoleId>(rp);
  const [email,   setEmail]     = useState('');
  const [pass,    setPass]      = useState('');
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState('');
  const m = META[role];

  useEffect(() => {
    setRoleState(rp);
    setEmail(META[rp]?.demoEmail || '');
    setPass('');
    setError('');
  }, [rp]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await authApi.login(email, pass);
      const { accessToken, user } = res.data;
      localStorage.setItem('sims_token', accessToken);
      localStorage.setItem('sims_user', JSON.stringify(user));
      router.push(getRoleRedirect(user.role));
    } catch (err: any) {
      setError(err?.message || 'Invalid credentials. Please check and try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8"
         style={{background:'linear-gradient(160deg,#0A1628 0%,#0F2044 50%,#0A1628 100%)'}}>
      <div className="fixed inset-0 pointer-events-none"
           style={{backgroundImage:'linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px)',backgroundSize:'60px 60px'}}/>

      <div className="relative z-10 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl"
           style={{border:'1px solid rgba(255,255,255,0.1)',animation:'fadeUp 0.4s ease both'}}>
        <div className="flex min-h-[560px]">

          {/* LEFT */}
          <div className="flex-1 p-12 flex flex-col"
               style={{background:'linear-gradient(160deg,#0F2044,#162952)',borderRight:'1px solid rgba(255,255,255,0.06)'}}>
            {/* Logo */}
            <div className="flex items-center gap-3 mb-10">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                   style={{background:'linear-gradient(135deg,#D4A017,#F0C040)'}}>🎓</div>
              <div className="text-lg font-black text-white">SIMS <span style={{color:'#F0C040'}}>Pro</span></div>
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-extrabold mb-3 leading-tight text-white">
                {m.title.split(' ').slice(0,-1).join(' ')}{' '}
                <span style={{color:'#F0C040'}}>{m.title.split(' ').slice(-1)}</span>
              </h2>
              <p className="text-sm mb-8 leading-relaxed" style={{color:'rgba(255,255,255,0.5)'}}>{m.desc}</p>
              <div className="space-y-3">
                {m.features.map(([icon,label])=>(
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                         style={{background:m.accentBg,border:`1px solid ${m.accentBorder}`}}>{icon}</div>
                    <span className="text-sm" style={{color:'rgba(255,255,255,0.7)'}}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Switch portal */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{color:'rgba(255,255,255,0.3)'}}>Switch portal</p>
              <div className="flex gap-2 mb-5">
                {(['admin','teacher','student'] as RoleId[]).map(r=>(
                  <Link key={r} href={`/login?role=${r}`}
                        className="flex-1 py-2 px-2 rounded-lg text-xs font-bold capitalize text-center transition-all"
                        style={{
                          background: r===role?'rgba(212,160,23,0.2)':'rgba(255,255,255,0.04)',
                          border:`1px solid ${r===role?'rgba(212,160,23,0.4)':'rgba(255,255,255,0.08)'}`,
                          color: r===role?'#F0C040':'rgba(255,255,255,0.4)',
                        }}>
                    {r}
                  </Link>
                ))}
              </div>
              <Link href="/" className="text-sm transition-colors hover:text-yellow-400" style={{color:'rgba(255,255,255,0.4)'}}>
                ← Back to Portal Home
              </Link>
            </div>
          </div>

          {/* RIGHT */}
          <div className="w-96 p-12 flex flex-col justify-center" style={{background:'#0A1628'}}>
            <h3 className="text-2xl font-extrabold text-white mb-1">Welcome Back</h3>
            <p className="text-sm mb-8" style={{color:'rgba(255,255,255,0.4)'}}>Sign in to access your portal</p>

            {error && (
              <div className="mb-5 px-4 py-3 rounded-xl text-sm font-medium"
                   style={{background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.3)',color:'#FCA5A5'}}>
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-2 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.45)'}}>
                  {m.idLabel}
                </label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                       placeholder={m.placeholder} required autoComplete="email"
                       className="sims-input"/>
              </div>
              <div>
                <label className="block text-xs font-bold mb-2 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.45)'}}>
                  PASSWORD
                </label>
                <input type="password" value={pass} onChange={e=>setPass(e.target.value)}
                       placeholder="••••••••" required autoComplete="current-password"
                       className="sims-input"/>
              </div>
              <div className="flex justify-end">
                <button type="button" className="text-xs transition-colors hover:text-yellow-400" style={{color:'rgba(255,255,255,0.4)'}}>
                  Forgot Password?
                </button>
              </div>
              <button type="submit" disabled={loading}
                      className={`w-full py-3.5 rounded-xl text-sm font-black tracking-wide bg-gradient-to-r ${m.btnCls} transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed`}>
                {loading ? '⏳ Signing in...' : `Login to ${m.title.split(' ')[0]} Portal →`}
              </button>
            </form>

            <button onClick={()=>{setEmail(m.demoEmail);setPass(m.demoPass);}}
                    className="mt-4 w-full py-2.5 rounded-xl text-xs font-semibold transition-all hover:bg-white/10 glass">
              🔑 Use Demo Credentials
            </button>
            <p className="text-center text-xs mt-4" style={{color:'rgba(255,255,255,0.25)'}}>
              Demo: <span className="text-white/50">{m.demoEmail}</span>
              {' / '}<span className="text-white/50">{m.demoPass}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{background:'#0A1628'}}>
        <div className="text-white/30 text-sm">Loading...</div>
      </div>
    }>
      <LoginInner/>
    </Suspense>
  );
}
