'use client';
// src/components/layout/AppShell.tsx
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getUser, logout } from '@/lib/auth';
import { getInitials, cn } from '@/lib/utils';
import { noticesApi, studentsApi } from '@/lib/api';

// ── Nav config ────────────────────────────────────────────────────
const NAV_CONFIG: Record<string, { section: string; items: { id: string; icon: string; label: string; href: string }[] }[]> = {
  ADMIN: [
    { section:'Main',         items:[{ id:'dashboard', icon:'📊', label:'Dashboard',       href:'/admin/dashboard'  }]},
    { section:'Academic',     items:[
      { id:'students', icon:'👨‍🎓', label:'Students',        href:'/admin/students'  },
      { id:'teachers', icon:'👩‍🏫', label:'Teachers',        href:'/admin/teachers'  },
      { id:'classes',  icon:'🏫',  label:'Classes',         href:'/admin/classes'   },
    ]},
    { section:'Finance',      items:[{ id:'fees',     icon:'💰', label:'Fee Management',  href:'/admin/fees'      }]},
    { section:'Communication',items:[
      { id:'notices',  icon:'📢', label:'Notice Board',     href:'/admin/notices'   },
      { id:'homework', icon:'📚', label:'Homework',         href:'/admin/homework'  },
    ]},
    { section:'System',       items:[{ id:'settings', icon:'⚙️', label:'Settings',        href:'/admin/settings'  }]},
  ],
  TEACHER: [
    { section:'Main',         items:[{ id:'tdash',    icon:'📊', label:'Dashboard',       href:'/teacher/dashboard'  }]},
    { section:'Classroom',    items:[
      { id:'tattend',  icon:'✅', label:'Attendance',       href:'/teacher/attendance' },
      { id:'thomework',icon:'📚', label:'Homework',         href:'/teacher/homework'   },
      { id:'tmarks',   icon:'📝', label:'Marks Entry',      href:'/teacher/marks'      },
    ]},
    { section:'Info',         items:[{ id:'tnotices', icon:'📢', label:'Notices',         href:'/teacher/notices'    }]},
  ],
  STUDENT: [
    { section:'Main',         items:[{ id:'shome',    icon:'🏠', label:'My Home',         href:'/student/home'       }]},
    { section:'Academic',     items:[
      { id:'sattend',  icon:'📅', label:'Attendance',       href:'/student/attendance' },
      { id:'shw',      icon:'📚', label:'Homework',         href:'/student/homework'   },
      { id:'smarks',   icon:'📝', label:'My Marks',         href:'/student/marks'      },
    ]},
    { section:'Finance',      items:[{ id:'sfees',    icon:'💰', label:'My Fees',         href:'/student/fees'       }]},
    { section:'Info',         items:[{ id:'snotices', icon:'🔔', label:'Notices',         href:'/student/notices'    }]},
  ],
};

const ROLE_LABELS: Record<string,string> = {
  ADMIN:'Admin Panel', TEACHER:'Teacher Panel', STUDENT:'Student Panel', PARENT:'Parent Panel',
};

interface Props {
  children:  React.ReactNode;
  title:     string;
  subtitle?: string;
}

export default function AppShell({ children, title, subtitle }: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const [user,         setUser]         = useState<any>(null);
  const [notifOpen,    setNotifOpen]    = useState(false);
  const [profileOpen,  setProfileOpen]  = useState(false);
  const [notifications,setNotifications]= useState<any[]>([]);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [searchResults,setSearchResults]= useState<any[]>([]);
  const [searchOpen,   setSearchOpen]   = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef  = useRef<HTMLDivElement>(null);
  const profileRef= useRef<HTMLDivElement>(null);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push('/login'); return; }
    setUser(u);
    // Load real notifications (recent notices)
    noticesApi.getAll({ limit: 5 }).then(r => {
      const notices = r.data.data || [];
      setNotifications(notices.slice(0,5).map((n:any) => ({
        id:   n.id,
        icon: n.priority==='HIGH'?'🔴':n.priority==='MEDIUM'?'🟡':'📢',
        text: n.title,
        sub:  `${n.target} · ${n.createdAt?.slice(0,10)||''}`,
        href: `/${u.role.toLowerCase()}/notices`,
      })));
    }).catch(() => {});
  }, []);

  // Global search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]); setSearchOpen(false); return;
    }
    const timer = setTimeout(async () => {
      if (!user) return;
      const results: any[] = [];
      if (user.role === 'ADMIN') {
        try {
          const r = await studentsApi.getAll({ search: searchQuery, limit: 5 });
          (r.data.data||[]).forEach((s:any) => results.push({
            icon:'👨‍🎓', label:s.name, sub:`${s.className} · ${s.roll}`,
            href:'/admin/students',
          }));
        } catch {}
      }
      setSearchResults(results);
      setSearchOpen(results.length > 0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, user]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) { setSearchOpen(false); }
      if (notifRef.current  && !notifRef.current.contains(e.target as Node))  { setNotifOpen(false);  }
      if (profileRef.current&& !profileRef.current.contains(e.target as Node)){ setProfileOpen(false); }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#0A1628'}}>
      <div className="text-center">
        <div className="text-3xl mb-3 animate-pulse">🎓</div>
        <div className="text-sm" style={{color:'rgba(255,255,255,0.4)'}}>Loading portal...</div>
      </div>
    </div>
  );

  const navSections = NAV_CONFIG[user.role] || NAV_CONFIG.STUDENT;

  return (
    <div className="flex min-h-screen" style={{background:'linear-gradient(160deg,#060E1C 0%,#0A1628 100%)'}}>

      {/* ══ SIDEBAR ══ */}
      <aside className="fixed left-0 top-0 bottom-0 flex flex-col z-50"
             style={{width:248,background:'#050D1A',borderRight:'1px solid rgba(255,255,255,0.06)'}}>
        {/* Brand */}
        <div className="px-4 py-5" style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                 style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',boxShadow:'0 4px 12px rgba(212,160,23,0.3)'}}>🎓</div>
            <div>
              <div className="text-sm font-black leading-tight">SIMS <span className="text-yellow-400">Pro</span></div>
              <div className="text-[9px] tracking-wider" style={{color:'rgba(255,255,255,0.3)',textTransform:'uppercase'}}>School Portal</div>
            </div>
          </div>
          <div className="mt-3 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider"
               style={{background:'rgba(212,160,23,0.12)',border:'1px solid rgba(212,160,23,0.25)',color:'#F0C040'}}>
            {ROLE_LABELS[user.role]}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5">
          {navSections.map(sec => (
            <div key={sec.section}>
              <div className="px-2 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest"
                   style={{color:'rgba(255,255,255,0.25)'}}>
                {sec.section}
              </div>
              {sec.items.map(item => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link key={item.id} href={item.href}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-0.5 text-sm font-medium transition-all"
                        style={{
                          color:      active ? 'white' : 'rgba(255,255,255,0.5)',
                          background: active ? 'rgba(212,160,23,0.15)' : 'transparent',
                          fontWeight: active ? 700 : 500,
                        }}
                        onMouseEnter={e => { if(!active)(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.05)'; }}
                        onMouseLeave={e => { if(!active)(e.currentTarget as HTMLElement).style.background='transparent'; }}>
                    <span className={cn('w-5 text-center text-base', active && 'text-yellow-400')}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-2.5" style={{borderTop:'1px solid rgba(255,255,255,0.06)'}}>
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl"
               style={{background:'rgba(255,255,255,0.04)'}}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0"
                 style={{background:'linear-gradient(135deg,#D4A017,#1E90FF)',color:'white'}}>
              {getInitials(user.name||'U')}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white truncate">{user.name}</div>
              <div className="text-[10px] capitalize" style={{color:'rgba(255,255,255,0.4)'}}>{user.role.toLowerCase()}</div>
            </div>
            <button onClick={logout} title="Logout"
                    className="text-base transition-colors flex-shrink-0 hover:text-red-400"
                    style={{color:'rgba(255,255,255,0.3)'}}>⏻</button>
          </div>
        </div>
      </aside>

      {/* ══ TOPBAR ══ */}
      <header className="fixed top-0 right-0 z-40 flex items-center justify-between px-7"
              style={{left:248,height:64,background:'rgba(5,13,26,0.95)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <div>
          <h1 className="text-lg font-black text-white">{title}</h1>
          {subtitle && <p className="text-xs mt-0.5" style={{color:'rgba(255,255,255,0.4)'}}>{subtitle}</p>}
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative" ref={searchRef}>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
                 style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',width:230}}>
              <span className="text-sm" style={{color:'rgba(255,255,255,0.3)'}}>🔍</span>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
                placeholder="Search students..."
                className="bg-transparent text-sm text-white placeholder:text-white/20 outline-none flex-1"
              />
              {searchQuery && (
                <button onClick={()=>{setSearchQuery('');setSearchOpen(false);}} className="text-white/30 hover:text-white/60 text-xs">✕</button>
              )}
            </div>
            {searchOpen && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden shadow-2xl"
                   style={{background:'#0F2044',border:'1px solid rgba(255,255,255,0.1)'}}>
                {searchResults.map((r,i) => (
                  <Link key={i} href={r.href}
                        onClick={()=>{setSearchOpen(false);setSearchQuery('');}}
                        className="flex items-center gap-3 px-4 py-3 transition-all hover:bg-white/[0.05]"
                        style={{borderTop:i>0?'1px solid rgba(255,255,255,0.05)':'none'}}>
                    <span className="text-lg">{r.icon}</span>
                    <div>
                      <div className="text-sm font-bold text-white">{r.label}</div>
                      <div className="text-xs" style={{color:'rgba(255,255,255,0.4)'}}>{r.sub}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setNotifOpen(v=>!v); setProfileOpen(false); }}
              className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all"
              style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)'}}>
              🔔
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500"
                      style={{border:'2px solid #050D1A'}}/>
              )}
            </button>

            {notifOpen && (
              <div className="absolute top-full right-0 mt-2 w-80 rounded-2xl overflow-hidden shadow-2xl"
                   style={{background:'#0F2044',border:'1px solid rgba(255,255,255,0.1)'}}>
                <div className="px-4 py-3 flex items-center justify-between"
                     style={{borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
                  <span className="text-sm font-bold text-white">Notifications</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{background:'rgba(239,68,68,0.15)',color:'#FCA5A5'}}>
                    {notifications.length} new
                  </span>
                </div>
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm" style={{color:'rgba(255,255,255,0.35)'}}>
                    No new notifications
                  </div>
                ) : notifications.map(n => (
                  <Link key={n.id} href={n.href}
                        onClick={()=>setNotifOpen(false)}
                        className="flex items-start gap-3 px-4 py-3 transition-all hover:bg-white/[0.04]"
                        style={{borderTop:'1px solid rgba(255,255,255,0.05)'}}>
                    <span className="text-lg flex-shrink-0 mt-0.5">{n.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white leading-tight truncate">{n.text}</div>
                      <div className="text-xs mt-0.5" style={{color:'rgba(255,255,255,0.35)'}}>{n.sub}</div>
                    </div>
                  </Link>
                ))}
                <div className="px-4 py-3" style={{borderTop:'1px solid rgba(255,255,255,0.07)'}}>
                  <Link href={`/${user.role.toLowerCase()}/notices`}
                        onClick={()=>setNotifOpen(false)}
                        className="block text-center text-xs font-bold text-yellow-400 hover:text-yellow-300">
                    View all notices →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Profile dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => { setProfileOpen(v=>!v); setNotifOpen(false); }}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black transition-all hover:scale-105"
              style={{background:'linear-gradient(135deg,#D4A017,#1E90FF)',color:'white'}}>
              {getInitials(user.name||'U')}
            </button>

            {profileOpen && (
              <div className="absolute top-full right-0 mt-2 w-64 rounded-2xl overflow-hidden shadow-2xl"
                   style={{background:'#0F2044',border:'1px solid rgba(255,255,255,0.1)'}}>
                {/* User info */}
                <div className="px-4 py-4" style={{borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0"
                         style={{background:'linear-gradient(135deg,#D4A017,#1E90FF)',color:'white'}}>
                      {getInitials(user.name||'U')}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">{user.name}</div>
                      <div className="text-xs truncate" style={{color:'rgba(255,255,255,0.4)'}}>{user.email}</div>
                      <div className="text-[10px] mt-0.5 capitalize" style={{color:'rgba(212,160,23,0.8)'}}>{user.role.toLowerCase()}</div>
                    </div>
                  </div>
                </div>

                {/* Menu items */}
                {user.role === 'ADMIN' && (
                  <Link href="/admin/settings?tab=security"
                        onClick={()=>setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm transition-all hover:bg-white/[0.04]"
                        style={{color:'rgba(255,255,255,0.65)'}}>
                    <span>🔒</span> Change Password
                  </Link>
                )}
                <Link href="/admin/settings"
                      onClick={()=>setProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm transition-all hover:bg-white/[0.04]"
                      style={{borderTop:'1px solid rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.65)'}}>
                  <span>⚙️</span> Settings
                </Link>
                <button onClick={logout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-all hover:bg-red-500/10"
                        style={{borderTop:'1px solid rgba(255,255,255,0.07)',color:'#FCA5A5'}}>
                  <span>⏻</span> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ══ MAIN ══ */}
      <main className="flex-1 p-7 animate-fade-up" style={{marginLeft:248,marginTop:64}}>
        {children}
      </main>
    </div>
  );
}
