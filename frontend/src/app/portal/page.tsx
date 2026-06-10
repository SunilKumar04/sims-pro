'use client';
// src/app/page.tsx  – Portal Home (like uims.cuchd.in)
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTenant } from '@/components/providers/TenantProvider';

const TICKER_ITEMS = [
  '📢 Latest school announcements appear here',
  '📋 Check notices, homework, and timetable updates in your portal',
  '🎓 Access exam schedules and important academic updates',
  '💰 View fee status and receipts from your account',
  '🏫 Connect with teachers and administration in one place',
  '📚 Stay informed with your school dashboard',
];

const PORTALS = [
  {
    id: 'admin',
    title: 'Admin Portal',
    icon: '🛡️',
    color: 'gold',
    desc: 'Manage the entire school — students, teachers, fees, classes, and analytics from one powerful dashboard.',
    features: ['Full Dashboard & Analytics', 'Student & Teacher Management', 'Fee Collection & Receipts', 'Class & Section Control', 'Notice Board Publisher'],
    btn: 'Login as Admin',
    gradient: 'from-yellow-900/20 to-transparent',
    border: 'border-yellow-700/30 hover:border-yellow-500/50',
    iconBg: 'bg-yellow-500/10 border border-yellow-500/20',
    btnCls: 'bg-gradient-to-r from-yellow-600 to-yellow-400 text-navy-900 hover:brightness-110',
    checkColor: 'text-yellow-400',
  },
  {
    id: 'teacher',
    title: 'Teacher Portal',
    icon: '👩‍🏫',
    color: 'blue',
    desc: 'Mark attendance, assign homework, enter marks and communicate with students and parents effortlessly.',
    features: ['Daily Attendance Marking', 'Homework Assignment', 'Marks & Grade Entry', 'Class Schedule View', 'Notice Viewing'],
    btn: 'Login as Teacher',
    gradient: 'from-blue-900/20 to-transparent',
    border: 'border-blue-700/30 hover:border-blue-500/50',
    iconBg: 'bg-blue-500/10 border border-blue-500/20',
    btnCls: 'bg-gradient-to-r from-blue-600 to-blue-400 text-white hover:brightness-110',
    checkColor: 'text-blue-400',
  },
  {
    id: 'student',
    title: 'Student / Parent Login',
    icon: '👨‍🎓',
    color: 'green',
    desc: 'Track attendance, check homework, view fee status, download receipts and stay updated with school notices.',
    features: ['Attendance Calendar', 'Homework & Syllabus', 'Fee Status & Receipts', 'Marks & Report Card', 'School Notices & Alerts'],
    btn: 'Login as Student',
    gradient: 'from-green-900/20 to-transparent',
    border: 'border-green-700/30 hover:border-green-500/50',
    iconBg: 'bg-green-500/10 border border-green-500/20',
    btnCls: 'bg-gradient-to-r from-green-700 to-green-500 text-white hover:brightness-110',
    checkColor: 'text-green-400',
  },
];

const STATS = [
  { value: process.env.NEXT_PUBLIC_PORTAL_STUDENTS || '—', label: 'Enrolled Students', color: 'text-yellow-400' },
  { value: process.env.NEXT_PUBLIC_PORTAL_TEACHERS || '—', label: 'Faculty Members', color: 'text-blue-400' },
  { value: process.env.NEXT_PUBLIC_PORTAL_CLASSROOMS || '—', label: 'Classrooms', color: 'text-green-400' },
  { value: process.env.NEXT_PUBLIC_PORTAL_RESULT || '—', label: 'Board Results', color: 'text-red-400' },
];

const FEATURES = [
  { icon: '🔒', label: 'Secure Login'     },
  { icon: '📱', label: 'Mobile Friendly'  },
  { icon: '📊', label: 'Live Analytics'   },
  { icon: '🖨️', label: 'PDF Reports'      },
  { icon: '🔔', label: 'Instant Alerts'   },
  { icon: '☁️', label: 'Cloud Synced'     },
  { icon: '🌐', label: '24/7 Access'      },
  { icon: '🛡️', label: 'Data Privacy'     },
];

export default function PortalPage() {
  const router = useRouter();
  const tenant = useTenant();
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setTime(n.toLocaleTimeString('en-IN', { hour12: false }));
      setDate(n.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const schoolName = tenant.school?.name || process.env.NEXT_PUBLIC_SCHOOL_NAME || 'Your School Name';
  const schoolCode = tenant.school?.schoolCode || process.env.NEXT_PUBLIC_SCHOOL_CODE || 'School Code';
  const schoolCity = tenant.school?.address || process.env.NEXT_PUBLIC_SCHOOL_CITY || 'City, State';
  const contactEmail = tenant.school?.email || process.env.NEXT_PUBLIC_SCHOOL_EMAIL || 'support@school.edu.in';
  const contactPhone = tenant.school?.phone || process.env.NEXT_PUBLIC_SCHOOL_PHONE || '+91-00000-00000';
  const portalSlug = tenant.portalSlug || tenant.school?.slug || '';
  const portalHome = portalSlug ? `/portal/${portalSlug}` : '/';
  const branding = tenant.branding;
  const tickerBackground = `linear-gradient(90deg, ${branding.primaryColor}, ${branding.accentColor})`;
  const headerGlow = `linear-gradient(90deg, ${branding.primaryColor}, ${branding.secondaryColor}, ${branding.accentColor})`;

  return (
    <div
      className="min-h-screen flex flex-col overflow-x-hidden"
      style={{ background: `linear-gradient(160deg, ${branding.backgroundColor} 0%, #0F2044 50%, ${branding.backgroundColor} 100%)` }}
    >

      {/* ── BACKGROUND ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
        <div className="animate-orb absolute w-[500px] h-[500px] rounded-full -top-32 -right-24 opacity-[0.07]" style={{ background: 'radial-gradient(circle,#1E90FF,transparent)', filter: 'blur(80px)' }} />
        <div className="animate-orb absolute w-[400px] h-[400px] rounded-full -bottom-24 -left-24 opacity-[0.06]" style={{ animationDelay: '-3s', background: 'radial-gradient(circle,#D4A017,transparent)', filter: 'blur(80px)' }} />
      </div>

      {/* ── TICKER ── */}
      <div className="relative z-10 overflow-hidden" style={{ background: tickerBackground, padding: '9px 0' }}>
        <div className="absolute left-0 top-0 bottom-0 flex items-center px-4 z-10"
             style={{ background: branding.backgroundColor, color: branding.accentColor, fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', borderRight: `2px solid ${branding.primaryColor}`, whiteSpace: 'nowrap' }}>
          📢 Latest
        </div>
        <div className="ticker-run flex items-center whitespace-nowrap pl-24 sm:pl-28">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-2 px-6 sm:px-10 text-[11px] sm:text-xs font-semibold text-navy-800" style={{ color: branding.backgroundColor }}>
              <span className="w-1.5 h-1.5 rounded-full bg-navy-800 flex-shrink-0" style={{ backgroundColor: branding.backgroundColor }} />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── HEADER ── */}
      <header className="relative z-10 flex flex-col gap-4 border-b px-4 py-4 sm:px-5 md:flex-row md:items-center md:justify-between md:px-10" style={{ minHeight: 80, borderColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
        <div className="flex min-w-0 items-center gap-3 sm:gap-4 md:w-auto">
          <button
            type="button"
            onClick={() => router.push(portalHome)}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl flex-shrink-0 overflow-hidden"
            style={{ border: 'none', padding: 0, cursor: 'pointer', background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.accentColor})`, boxShadow: `0 4px 20px ${branding.primaryColor}55` }}
          >
            {branding.logoUrl ? <img src={branding.logoUrl} alt={schoolName} className="w-full h-full object-cover" /> : '🎓'}
          </button>
          <button
            type="button"
            onClick={() => router.push(portalHome)}
            className="text-left min-w-0"
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <div className="text-base sm:text-lg font-black tracking-tight leading-tight whitespace-nowrap">SIMS <span style={{ color: branding.accentColor }}>Pro</span></div>
            <div className="text-[10px] font-medium tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>School Information Management System</div>
          </button>
        </div>

        <div className="hidden lg:flex min-w-0 flex-1 justify-center">
          <div
            className="flex max-w-[640px] items-center gap-4 rounded-[34px] px-7 py-5 shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(8,18,40,0.98), rgba(11,25,52,0.92))',
              border: '1px solid rgba(96,165,250,0.18)',
              boxShadow: '0 24px 70px rgba(30,64,175,0.16), 0 18px 55px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.03)',
            }}
          >
            <div className="min-w-0">
              <div className="truncate text-[20px] font-black tracking-tight text-white sm:text-[22px]">{schoolName}</div>
              <div className="mt-1 truncate text-[12px] font-medium tracking-wide" style={{ color: 'rgba(255,255,255,0.42)' }}>
                {process.env.NEXT_PUBLIC_SCHOOL_ESTD ? `Estd. ${process.env.NEXT_PUBLIC_SCHOOL_ESTD} · ` : ''}
                {process.env.NEXT_PUBLIC_SCHOOL_BOARD || 'Affiliated School'} · Code: {schoolCode}
              </div>
            </div>
          </div>
        </div>

        <div
          className="flex w-full items-center gap-4 rounded-[34px] px-5 py-4 text-left lg:hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(8,18,40,0.98), rgba(11,25,52,0.92))',
            border: '1px solid rgba(96,165,250,0.18)',
            boxShadow: '0 20px 58px rgba(30,64,175,0.14), 0 16px 45px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.03)',
          }}
        >
          <div className="min-w-0">
            <div className="truncate text-[18px] font-black tracking-tight text-white sm:text-[20px]">{schoolName}</div>
            <div className="mt-1 truncate text-[12px] font-medium tracking-wide" style={{ color: 'rgba(255,255,255,0.42)' }}>
              {process.env.NEXT_PUBLIC_SCHOOL_ESTD ? `Estd. ${process.env.NEXT_PUBLIC_SCHOOL_ESTD} · ` : ''}
              {process.env.NEXT_PUBLIC_SCHOOL_BOARD || 'Affiliated School'} · Code: {schoolCode}
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end md:w-auto">
          <div className="text-right rounded-xl px-4 py-2 glass w-full sm:w-auto">
            <div className="text-lg font-bold tabular-nums text-yellow-400">{time}</div>
            <div className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{date}</div>
          </div>
          <button className="w-full px-4 py-2 rounded-lg text-sm font-semibold transition-all sm:w-auto"
                  style={{ background: `${branding.primaryColor}22`, border: `1px solid ${branding.primaryColor}44`, color: branding.accentColor }}>
            📞 Help Desk
          </button>
        </div>
      </header>

      {/* ── HERO ── */}
      <div className="relative z-10 text-center pt-10 pb-8 px-4 sm:pt-14 sm:pb-10 sm:px-6 lg:px-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6"
             style={{ background: `${branding.accentColor}22`, border: `1px solid ${branding.accentColor}44`, color: branding.accentColor }}>
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: branding.accentColor }} />
          Academic Year {process.env.NEXT_PUBLIC_ACADEMIC_YEAR || 'Current Session'}
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-5xl font-black tracking-tight mb-4 leading-tight">
          One Portal, Every Service<br/>
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: headerGlow }}>
            All Under One Roof
          </span>
        </h1>
        <p className="text-sm sm:text-base max-w-xl mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
          Access student records, fee receipts, attendance, homework, notices and more — securely and instantly through your personalised dashboard.
        </p>
      </div>

      {/* ── STATS ── */}
      <div className="relative z-10 grid grid-cols-1 gap-3 max-w-4xl mx-auto w-full px-4 sm:grid-cols-2 xl:grid-cols-4 sm:px-6 lg:px-10 mb-12">
        {STATS.map((s, i) => (
          <div key={i} className="text-center py-5 px-4 glass transition-all hover:bg-white/[0.07] rounded-2xl">
            <div className={`text-2xl sm:text-3xl font-black tracking-tight ${s.color}`}>{s.value}</div>
            <div className="text-xs mt-1 font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── PORTAL CARDS ── */}
      <div className="relative z-10 grid grid-cols-1 gap-6 max-w-6xl mx-auto mb-12 w-full px-5 md:grid-cols-3 md:px-10">
        {PORTALS.map((p, i) => (
          <div key={p.id}
               className={`rounded-2xl border p-8 cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl glass ${p.border} bg-gradient-to-b ${p.gradient} animate-fade-up`}
               style={{ animationDelay: `${i * 0.1}s` }}
               onClick={() => router.push(portalSlug ? `/portal/${portalSlug}/login?role=${p.id}` : `/login?role=${p.id}`)}>

            <div className={`w-18 h-18 rounded-2xl flex items-center justify-center text-4xl mb-6 ${p.iconBg}`}
                 style={{ width: 72, height: 72 }}>
              {p.icon}
            </div>

            <h3 className="text-xl font-extrabold mb-2">{p.title}</h3>
            <p className="text-sm mb-6 leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>{p.desc}</p>

            <ul className="space-y-2 mb-7">
              {p.features.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
              <span className={`font-bold text-xs ${p.checkColor}`}>✓</span>
              {f}
            </li>
          ))}
        </ul>

            <button className={`w-full py-3 rounded-xl text-sm font-bold tracking-wide transition-all ${p.btnCls} hover:-translate-y-0.5`}>
              {p.btn}
            </button>
          </div>
        ))}
      </div>

      {/* ── FEATURE CHIPS ── */}
      <div className="relative z-10 grid grid-cols-2 gap-3 max-w-5xl mx-auto mb-10 w-full px-5 sm:grid-cols-4 md:grid-cols-8 md:px-10">
        {FEATURES.map(f => (
          <div key={f.label} className="glass rounded-xl p-4 text-center transition-all hover:bg-white/[0.08] hover:-translate-y-1 cursor-default">
            <div className="text-2xl mb-2">{f.icon}</div>
            <div className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>{f.label}</div>
          </div>
        ))}
      </div>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 mt-auto grid grid-cols-1 gap-4 border-t px-4 py-6 sm:px-5 md:grid-cols-[1.2fr_1fr_auto] md:items-center md:px-10"
              style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)' }}>
        <div className="text-sm text-center md:text-left" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <strong className="text-white">{schoolName}</strong><br/>
          {schoolCity} · Phone: {contactPhone}
        </div>
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-center">
          {['About School', 'Contact Us', 'Privacy Policy', 'Terms of Use'].map(l => (
            <a key={l} href="#" className="text-sm transition-colors hover:text-yellow-400" style={{ color: 'rgba(255,255,255,0.4)' }}>{l}</a>
          ))}
        </div>
        <div className="glass rounded-xl px-4 py-2 text-sm text-center md:text-right justify-self-center md:justify-self-end" style={{ color: 'rgba(255,255,255,0.5)' }}>
          📧 <span className="text-yellow-400 font-bold">{contactEmail}</span>
        </div>
      </footer>
    </div>
  );
}
