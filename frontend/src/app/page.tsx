'use client';
// src/app/page.tsx  – Portal Home (like uims.cuchd.in)
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const SCHOOL = {
  name:  process.env.NEXT_PUBLIC_SCHOOL_NAME  || 'Guru Nanak Public Senior Secondary School',
  short: process.env.NEXT_PUBLIC_SCHOOL_SHORT || 'GNPSS',
  code:  process.env.NEXT_PUBLIC_SCHOOL_CODE  || '1630247',
  city:  process.env.NEXT_PUBLIC_SCHOOL_CITY  || 'Ludhiana, Punjab',
};

const TICKER_ITEMS = [
  '📢 Annual Sports Day – Registration open till 10th April 2024',
  '📋 Parent-Teacher Meeting on 30th March 2024 from 9 AM',
  '🎓 Board Exam Hall Tickets available on Student Portal',
  '💰 Term 2 Fee deadline: 31st March 2024 – Pay to avoid late fee',
  '🏖️ Summer vacation from 15th May to 30th June 2024',
  '📚 New academic session registrations open for 2024–25',
];

const PORTALS = [
  {
    id: 'admin',
    title: 'Admin Portal',
    icon: '🛡️',
    color: 'gold',
    desc: 'Manage the entire school — students, teachers, fees, classes, and analytics from one powerful dashboard.',
    features: ['Full Dashboard & Analytics', 'Student & Teacher Management', 'Fee Collection & Receipts', 'Class & Section Control', 'Notice Board Publisher'],
    btn: 'Login as Admin →',
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
    btn: 'Login as Teacher →',
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
    btn: 'Login as Student →',
    gradient: 'from-green-900/20 to-transparent',
    border: 'border-green-700/30 hover:border-green-500/50',
    iconBg: 'bg-green-500/10 border border-green-500/20',
    btnCls: 'bg-gradient-to-r from-green-700 to-green-500 text-white hover:brightness-110',
    checkColor: 'text-green-400',
  },
];

const STATS = [
  { value: '1,240', label: 'Enrolled Students', color: 'text-yellow-400' },
  { value: '64',    label: 'Faculty Members',   color: 'text-blue-400'   },
  { value: '38',    label: 'Classrooms',         color: 'text-green-400'  },
  { value: '99.2%', label: 'Board Result 2023',  color: 'text-red-400'   },
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

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(160deg,#0A1628 0%,#0F2044 50%,#0A1628 100%)' }}>

      {/* ── BACKGROUND ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
        <div className="animate-orb absolute w-[500px] h-[500px] rounded-full -top-32 -right-24 opacity-[0.07]" style={{ background: 'radial-gradient(circle,#1E90FF,transparent)', filter: 'blur(80px)' }} />
        <div className="animate-orb absolute w-[400px] h-[400px] rounded-full -bottom-24 -left-24 opacity-[0.06]" style={{ animationDelay: '-3s', background: 'radial-gradient(circle,#D4A017,transparent)', filter: 'blur(80px)' }} />
      </div>

      {/* ── TICKER ── */}
      <div className="relative z-10 overflow-hidden" style={{ background: 'linear-gradient(90deg,#D4A017,#F0C040)', padding: '9px 0' }}>
        <div className="absolute left-0 top-0 bottom-0 flex items-center px-4 z-10"
             style={{ background: '#0A1628', color: '#F0C040', fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', borderRight: '2px solid #D4A017', whiteSpace: 'nowrap' }}>
          📢 Latest
        </div>
        <div className="ticker-run flex items-center whitespace-nowrap pl-28">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-2 px-10 text-xs font-semibold text-navy-800" style={{ color: '#0A1628' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-navy-800 flex-shrink-0" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── HEADER ── */}
      <header className="relative z-10 flex items-center justify-between px-10 border-b" style={{ height: 80, borderColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
               style={{ background: 'linear-gradient(135deg,#D4A017,#F0C040)', boxShadow: '0 4px 20px rgba(212,160,23,0.4)' }}>🎓</div>
          <div>
            <div className="text-lg font-black tracking-tight leading-tight">SIMS <span className="text-yellow-400">Pro</span></div>
            <div className="text-[10px] font-medium tracking-wide" style={{ color: 'rgba(255,255,255,0.4)' }}>School Information Management System</div>
          </div>
        </div>

        <div className="text-center">
          <div className="font-lora text-base font-semibold" style={{ color: '#F0F4FF' }}>{SCHOOL.name}</div>
          <div className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Estd. 1985 · CBSE Affiliated · Code: {SCHOOL.code}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right rounded-xl px-4 py-2 glass">
            <div className="text-lg font-bold tabular-nums text-yellow-400">{time}</div>
            <div className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{date}</div>
          </div>
          <button className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{ background: 'rgba(30,144,255,0.15)', border: '1px solid rgba(30,144,255,0.3)', color: '#93C5FD' }}>
            📞 Help Desk
          </button>
        </div>
      </header>

      {/* ── HERO ── */}
      <div className="relative z-10 text-center pt-14 pb-10 px-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6"
             style={{ background: 'rgba(212,160,23,0.12)', border: '1px solid rgba(212,160,23,0.3)', color: '#FFD966' }}>
          <span className="w-2 h-2 rounded-full bg-yellow-300 animate-pulse" />
          Academic Year 2024–25
        </div>
        <h1 className="text-4xl lg:text-5xl font-black tracking-tight mb-4 leading-tight">
          One Portal, Every Service<br/>
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg,#D4A017,#F0C040,#00D4FF)' }}>
            All Under One Roof
          </span>
        </h1>
        <p className="text-base max-w-xl mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
          Access student records, fee receipts, attendance, homework, notices and more — securely and instantly through your personalised dashboard.
        </p>
      </div>

      {/* ── STATS ── */}
      <div className="relative z-10 flex max-w-4xl mx-auto w-full px-10 mb-12">
        {STATS.map((s, i) => (
          <div key={i} className="flex-1 text-center py-5 glass transition-all hover:bg-white/[0.07]"
               style={{
                 borderRadius: i === 0 ? '12px 0 0 12px' : i === STATS.length - 1 ? '0 12px 12px 0' : '0',
                 borderRight: i < STATS.length - 1 ? 'none' : undefined,
               }}>
            <div className={`text-3xl font-black tracking-tight ${s.color}`}>{s.value}</div>
            <div className="text-xs mt-1 font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── PORTAL CARDS ── */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto w-full px-10 mb-12">
        {PORTALS.map((p, i) => (
          <div key={p.id}
               className={`rounded-2xl border p-8 cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl glass ${p.border} bg-gradient-to-b ${p.gradient} animate-fade-up`}
               style={{ animationDelay: `${i * 0.1}s` }}
               onClick={() => router.push(`/login?role=${p.id}`)}>

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
      <div className="relative z-10 grid grid-cols-4 md:grid-cols-8 gap-3 max-w-5xl mx-auto w-full px-10 mb-10">
        {FEATURES.map(f => (
          <div key={f.label} className="glass rounded-xl p-4 text-center transition-all hover:bg-white/[0.08] hover:-translate-y-1 cursor-default">
            <div className="text-2xl mb-2">{f.icon}</div>
            <div className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>{f.label}</div>
          </div>
        ))}
      </div>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 mt-auto border-t px-10 py-7 flex items-center justify-between"
              style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)' }}>
        <div className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <strong className="text-white">{SCHOOL.name}</strong><br/>
          {SCHOOL.city} · Phone: +91-161-2345678
        </div>
        <div className="flex gap-5">
          {['About School', 'Contact Us', 'Privacy Policy', 'Terms of Use'].map(l => (
            <a key={l} href="#" className="text-sm transition-colors hover:text-yellow-400" style={{ color: 'rgba(255,255,255,0.4)' }}>{l}</a>
          ))}
        </div>
        <div className="glass rounded-xl px-4 py-2 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
          📧 <span className="text-yellow-400 font-bold">itsupport@gnpss.edu.in</span>
        </div>
      </footer>
    </div>
  );
}
