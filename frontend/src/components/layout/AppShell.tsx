'use client';
// src/components/layout/AppShell.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getUser, logout } from '@/lib/auth';
import { getInitials } from '@/lib/utils';
import { noticesApi, studentsApi } from '@/lib/api';

// ── Nav config ────────────────────────────────────────────────────
const NAV: Record<string, { section: string; items: { id: string; icon: string; label: string; href: string }[] }[]> = {
  ADMIN: [
    { section:'Main',          items:[{ id:'dashboard',  icon:'📊', label:'Dashboard',          href:'/admin/dashboard'   }]},
    { section:'Academic',      items:[
      { id:'students',          icon:'👨‍🎓', label:'Students',           href:'/admin/students'    },
      { id:'teachers',          icon:'👩‍🏫', label:'Teachers',           href:'/admin/teachers'    },
      { id:'classes',           icon:'🏫',  label:'Classes',            href:'/admin/classes'     },
      { id:'timetable',         icon:'🗓️',  label:'Timetable',          href:'/admin/timetable'   },
      { id:'exams',             icon:'📋',  label:'Exams & Date Sheet', href:'/admin/exams'       },
      { id:'assignments',       icon:'📝',  label:'Assignments',        href:'/admin/assignments' },
    ]},
    { section:'Finance',       items:[{ id:'fees',       icon:'💰', label:'Fee Management',     href:'/admin/fees'        }]},
    { section:'Communication', items:[
      { id:'notices',           icon:'📢',  label:'Notice Board',       href:'/admin/notices'     },
      { id:'homework',          icon:'📚',  label:'Homework',           href:'/admin/homework'    },
    ]},
    { section:'System',        items:[{ id:'settings',   icon:'⚙️', label:'Settings',           href:'/admin/settings'    }]},
  ],
  TEACHER: [
    { section:'Main',          items:[{ id:'tdash',      icon:'📊', label:'Dashboard',          href:'/teacher/dashboard'   }]},
    { section:'Classroom',     items:[
      { id:'tattend',           icon:'✅',  label:'Daily Attendance',   href:'/teacher/attendance'  },
      { id:'tsessions',         icon:'🎯',  label:'Subject Sessions',   href:'/teacher/sessions'    },
      { id:'thomework',         icon:'📚',  label:'Homework',           href:'/teacher/homework'    },
      { id:'tmarks',            icon:'📝',  label:'Marks Entry',        href:'/teacher/marks'       },
      { id:'tassign',           icon:'📋',  label:'Assignments',        href:'/teacher/assignments' },
    ]},
    { section:'Schedule',      items:[
      { id:'ttimetable', icon:'🗓️', label:'My Timetable',  href:'/teacher/timetable'   },
      { id:'texamduty',  icon:'📋', label:'Exam Duties',   href:'/teacher/exam-duties' },
    ]},
    { section:'Info',          items:[{ id:'tnotices',   icon:'📢', label:'Notices',             href:'/teacher/notices'     }]},
  ],
  STUDENT: [
    { section:'Main',          items:[{ id:'shome',      icon:'🏠', label:'My Home',             href:'/student/home'               }]},
    { section:'Academic',      items:[
      { id:'sattend',           icon:'📅',  label:'Attendance',         href:'/student/attendance'         },
      { id:'ssubattend',        icon:'🎯',  label:'Subject Attendance', href:'/student/subject-attendance' },
      { id:'shw',               icon:'📚',  label:'Homework',           href:'/student/homework'           },
      { id:'smarks',            icon:'📝',  label:'My Marks',           href:'/student/marks'              },
      { id:'sassign',           icon:'📋',  label:'Assignments',        href:'/student/assignments'        },
      { id:'sexams',            icon:'📆',  label:'Exam Schedule',      href:'/student/exam-schedule'      },
      { id:'stimetable',        icon:'🗓️',  label:'Timetable',          href:'/student/timetable'          },
    ]},
    { section:'Finance',       items:[{ id:'sfees',      icon:'💰', label:'My Fees',             href:'/student/fees'               }]},
    { section:'Info',          items:[{ id:'snotices',   icon:'🔔', label:'Notices',             href:'/student/notices'            }]},
  ],
};
const ROLE_LABELS: Record<string,string> = { ADMIN:'Admin Panel', TEACHER:'Teacher Panel', STUDENT:'Student Panel', PARENT:'Parent Panel' };
const SIDEBAR_W = 248;

interface Props { children?: React.ReactNode; title: string; subtitle?: string }

export default function AppShell({ children, title, subtitle }: Props) {
  const router   = useRouter();
  const pathname = usePathname();

  const [user,         setUser]         = useState<any>(null);
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [notifOpen,    setNotifOpen]    = useState(false);
  const [profileOpen,  setProfileOpen]  = useState(false);
  const [notifications,setNotifications]= useState<any[]>([]);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [searchResults,setSearchResults]= useState<any[]>([]);
  const [searchOpen,   setSearchOpen]   = useState(false);
  const [isMobile,     setIsMobile]     = useState(false);

  const notifRef   = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef  = useRef<HTMLDivElement>(null);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Close sidebar on route change
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push('/login'); return; }
    setUser(u);
    noticesApi.getAll({ limit: 5 }).then(r => {
      const notices = r.data.data || [];
      setNotifications(notices.slice(0,5).map((n:any) => ({
        id: n.id,
        icon: n.priority==='HIGH'?'🔴':n.priority==='MEDIUM'?'🟡':'📢',
        text: n.title,
        sub:  `${n.target} · ${n.createdAt?.slice(0,10)||''}`,
        href: `/${u.role.toLowerCase()}/notices`,
      })));
    }).catch(() => {});
  }, []);

  // Search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) { setSearchResults([]); setSearchOpen(false); return; }
    const t = setTimeout(async () => {
      if (!user) return;
      const results: any[] = [];
      if (String(user.role).toUpperCase() === 'ADMIN') {
        try {
          const r = await studentsApi.getAll({ search: searchQuery, limit: 5 });
          (r.data.data||[]).forEach((s:any) => results.push({ icon:'👨‍🎓', label:s.name, sub:`${s.className}·${s.roll}`, href:'/admin/students' }));
        } catch {}
      }
      setSearchResults(results);
      setSearchOpen(results.length > 0);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, user]);

  // Click-outside dropdowns
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (notifRef.current   && !notifRef.current.contains(e.target as Node))   setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (searchRef.current  && !searchRef.current.contains(e.target as Node))  setSearchOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  if (!user) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0A1628' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:40, marginBottom:12, animation:'pulse 2s ease-in-out infinite' }}>🎓</div>
        <div style={{ fontSize:14, color:'rgba(255,255,255,0.4)' }}>Loading portal…</div>
      </div>
    </div>
  );

  const role        = String(user.role||'STUDENT').toUpperCase();
  const navSections = NAV[role] ?? NAV.STUDENT;
  const showSidebar = !isMobile || sidebarOpen;

  // ── Sidebar content ──────────────────────────────────────────────
  const SidebarContent = () => (
    <>
      {/* Brand */}
      <div style={{ padding:'16px 14px 12px', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36,height:36,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,background:'linear-gradient(135deg,#D4A017,#F0C040)',boxShadow:'0 4px 12px rgba(212,160,23,0.3)',flexShrink:0 }}>🎓</div>
            <div>
              <div style={{ fontSize:14,fontWeight:900,color:'white',lineHeight:1.2 }}>SIMS <span style={{ color:'#F0C040' }}>Pro</span></div>
              <div style={{ fontSize:9,letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(255,255,255,0.3)' }}>School Portal</div>
            </div>
          </div>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} style={{ background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.4)',fontSize:20,padding:4 }}>✕</button>
          )}
        </div>
        <div style={{ marginTop:10,padding:'5px 10px',borderRadius:8,fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',background:'rgba(212,160,23,0.12)',border:'1px solid rgba(212,160,23,0.25)',color:'#F0C040' }}>
          {ROLE_LABELS[role] ?? 'Portal'}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1,overflowY:'auto',overflowX:'hidden',padding:'6px 8px',minHeight:0 }}>
        {navSections.map(sec => (
          <div key={sec.section}>
            <div style={{ padding:'10px 8px 3px',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.12em',color:'rgba(255,255,255,0.22)' }}>
              {sec.section}
            </div>
            {sec.items.map(item => {
              const active = pathname === item.href || pathname.startsWith(item.href+'/');
              return (
                <Link key={item.id} href={item.href} style={{
                  display:'flex',alignItems:'center',gap:9,padding:'9px 10px',
                  borderRadius:10,marginBottom:1,fontSize:13.5,fontWeight:active?700:500,
                  color:active?'white':'rgba(255,255,255,0.5)',
                  background:active?'rgba(212,160,23,0.14)':'transparent',
                  textDecoration:'none',transition:'background 0.12s',
                }}
                  onMouseEnter={e=>{ if(!active)(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.05)' }}
                  onMouseLeave={e=>{ if(!active)(e.currentTarget as HTMLElement).style.background='transparent' }}
                >
                  <span style={{ width:20,textAlign:'center',fontSize:15,color:active?'#F0C040':'inherit',flexShrink:0 }}>{item.icon}</span>
                  <span style={{ flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding:8,borderTop:'1px solid rgba(255,255,255,0.06)',flexShrink:0 }}>
        <div style={{ display:'flex',alignItems:'center',gap:9,padding:9,borderRadius:10,background:'rgba(255,255,255,0.04)' }}>
          <div style={{ width:34,height:34,borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:900,flexShrink:0,background:'linear-gradient(135deg,#D4A017,#1E90FF)',color:'white' }}>
            {getInitials(user.name||'U')}
          </div>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ fontSize:12.5,fontWeight:700,color:'white',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{user.name}</div>
            <div style={{ fontSize:10,textTransform:'capitalize',color:'rgba(255,255,255,0.4)' }}>{role.toLowerCase()}</div>
          </div>
          <button onClick={logout} title="Logout" style={{ background:'none',border:'none',cursor:'pointer',fontSize:16,color:'rgba(255,255,255,0.3)',flexShrink:0,padding:2 }}
            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color='#FCA5A5'}
            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.3)'}>⏻</button>
        </div>
      </div>
    </>
  );

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'linear-gradient(160deg,#060E1C 0%,#0A1628 100%)' }}>

      {/* ── MOBILE OVERLAY ── */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
             style={{ position:'fixed',inset:0,zIndex:49,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)' }}/>
      )}

      {/* ── SIDEBAR ── */}
      <aside style={{
        position:'fixed', left:0, top:0, bottom:0, width:SIDEBAR_W,
        background:'#050D1A', borderRight:'1px solid rgba(255,255,255,0.06)',
        display:'flex', flexDirection:'column', zIndex:50,
        transform: isMobile ? (sidebarOpen ? 'translateX(0)' : `translateX(-${SIDEBAR_W}px)`) : 'translateX(0)',
        transition: isMobile ? 'transform 0.28s cubic-bezier(0.4,0,0.2,1)' : 'none',
      }}>
        <SidebarContent />
      </aside>

      {/* ── TOPBAR ── */}
      <header style={{
        position:'fixed', top:0, right:0, height:60, zIndex:40,
        left: isMobile ? 0 : SIDEBAR_W,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 16px 0 20px',
        background:'rgba(5,13,26,0.96)', backdropFilter:'blur(20px)',
        borderBottom:'1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, minWidth:0 }}>
          {/* Hamburger on mobile */}
          {isMobile && (
            <button onClick={() => setSidebarOpen(v => !v)}
                    style={{ background:'none',border:'none',cursor:'pointer',padding:'4px 6px',color:'rgba(255,255,255,0.7)',fontSize:20,flexShrink:0,borderRadius:8,display:'flex',flexDirection:'column',gap:4 }}>
              <span style={{ display:'block',width:20,height:2,background:'currentColor',borderRadius:2 }}/>
              <span style={{ display:'block',width:16,height:2,background:'currentColor',borderRadius:2 }}/>
              <span style={{ display:'block',width:20,height:2,background:'currentColor',borderRadius:2 }}/>
            </button>
          )}
          <div style={{ minWidth:0 }}>
            <h1 style={{ margin:0,fontSize:isMobile?14:17,fontWeight:900,color:'white',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{title}</h1>
            {subtitle && !isMobile && <p style={{ margin:0,fontSize:11,color:'rgba(255,255,255,0.4)',marginTop:1 }}>{subtitle}</p>}
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:isMobile?6:10, flexShrink:0 }}>

          {/* Search (desktop only) */}
          {!isMobile && (
            <div style={{ position:'relative' }} ref={searchRef}>
              <div style={{ display:'flex',alignItems:'center',gap:8,padding:'7px 12px',borderRadius:10,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',width:200 }}>
                <span style={{ fontSize:13,color:'rgba(255,255,255,0.3)' }}>🔍</span>
                <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} onFocus={()=>searchResults.length>0&&setSearchOpen(true)}
                       placeholder="Search…" style={{ background:'transparent',border:'none',outline:'none',fontSize:13,color:'white',flex:1,minWidth:0 }}/>
                {searchQuery && <button onClick={()=>{setSearchQuery('');setSearchOpen(false)}} style={{ background:'none',border:'none',cursor:'pointer',fontSize:11,color:'rgba(255,255,255,0.3)',padding:0 }}>✕</button>}
              </div>
              {searchOpen && searchResults.length>0 && (
                <div style={{ position:'absolute',top:'100%',left:0,right:0,marginTop:6,borderRadius:14,overflow:'hidden',background:'#0F2044',border:'1px solid rgba(255,255,255,0.1)',boxShadow:'0 16px 48px rgba(0,0,0,0.5)' }}>
                  {searchResults.map((r,i) => (
                    <Link key={i} href={r.href} onClick={()=>{setSearchOpen(false);setSearchQuery('')}}
                          style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 14px',textDecoration:'none',borderTop:i>0?'1px solid rgba(255,255,255,0.05)':'none' }}>
                      <span>{r.icon}</span>
                      <div><div style={{ fontSize:13,fontWeight:700,color:'white' }}>{r.label}</div><div style={{ fontSize:11,color:'rgba(255,255,255,0.4)' }}>{r.sub}</div></div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notifications */}
          <div style={{ position:'relative' }} ref={notifRef}>
            <button onClick={()=>{setNotifOpen(v=>!v);setProfileOpen(false)}}
                    style={{ position:'relative',width:34,height:34,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',cursor:'pointer',fontSize:16 }}>
              🔔
              {notifications.length>0 && <span style={{ position:'absolute',top:5,right:5,width:7,height:7,borderRadius:'50%',background:'#EF4444',border:'2px solid #050D1A' }}/>}
            </button>
            {notifOpen && (
              <div style={{ position:'absolute',top:'100%',right:0,marginTop:8,width:300,borderRadius:16,overflow:'hidden',background:'#0F2044',border:'1px solid rgba(255,255,255,0.1)',boxShadow:'0 20px 60px rgba(0,0,0,0.5)',zIndex:100 }}>
                <div style={{ padding:'11px 14px',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                  <span style={{ fontSize:13,fontWeight:700,color:'white' }}>Notifications</span>
                  <span style={{ fontSize:11,padding:'2px 7px',borderRadius:99,fontWeight:700,background:'rgba(239,68,68,0.15)',color:'#FCA5A5' }}>{notifications.length}</span>
                </div>
                {notifications.length===0 ? <div style={{ padding:'24px 14px',textAlign:'center',fontSize:13,color:'rgba(255,255,255,0.3)' }}>No notifications</div>
                  : notifications.map(n=>(
                    <Link key={n.id} href={n.href} onClick={()=>setNotifOpen(false)}
                          style={{ display:'flex',alignItems:'flex-start',gap:10,padding:'10px 14px',textDecoration:'none',borderTop:'1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize:16,flexShrink:0,marginTop:1 }}>{n.icon}</span>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:12.5,fontWeight:700,color:'white',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{n.text}</div>
                        <div style={{ fontSize:11,marginTop:2,color:'rgba(255,255,255,0.35)' }}>{n.sub}</div>
                      </div>
                    </Link>
                  ))}
                <div style={{ padding:'10px 14px',borderTop:'1px solid rgba(255,255,255,0.07)' }}>
                  <Link href={`/${role.toLowerCase()}/notices`} onClick={()=>setNotifOpen(false)}
                        style={{ display:'block',textAlign:'center',fontSize:12,fontWeight:700,color:'#F0C040',textDecoration:'none' }}>
                    View all →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <div style={{ position:'relative' }} ref={profileRef}>
            <button onClick={()=>{setProfileOpen(v=>!v);setNotifOpen(false)}}
                    style={{ width:34,height:34,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:900,background:'linear-gradient(135deg,#D4A017,#1E90FF)',color:'white',border:'none',cursor:'pointer' }}>
              {getInitials(user.name||'U')}
            </button>
            {profileOpen && (
              <div style={{ position:'absolute',top:'100%',right:0,marginTop:8,width:240,borderRadius:16,overflow:'hidden',background:'#0F2044',border:'1px solid rgba(255,255,255,0.1)',boxShadow:'0 20px 60px rgba(0,0,0,0.5)',zIndex:100 }}>
                <div style={{ padding:14,borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',gap:10 }}>
                  <div style={{ width:38,height:38,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:900,flexShrink:0,background:'linear-gradient(135deg,#D4A017,#1E90FF)',color:'white' }}>{getInitials(user.name||'U')}</div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:13,fontWeight:700,color:'white',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{user.name}</div>
                    <div style={{ fontSize:11,color:'rgba(255,255,255,0.4)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{user.email}</div>
                  </div>
                </div>
                <Link href="/profile" onClick={()=>setProfileOpen(false)}
                      style={{ display:'flex',alignItems:'center',gap:10,padding:'11px 14px',fontSize:13,color:'rgba(255,255,255,0.65)',textDecoration:'none' }}>
                  <span>👤</span> My Profile
                </Link>
                <Link href="/profile" onClick={()=>setProfileOpen(false)}
                      style={{ display:'flex',alignItems:'center',gap:10,padding:'11px 14px',fontSize:13,color:'rgba(255,255,255,0.65)',textDecoration:'none',borderTop:'1px solid rgba(255,255,255,0.05)' }}>
                  <span>🔒</span> Change Password
                </Link>
                {role==='ADMIN' && (
                  <Link href="/admin/settings" onClick={()=>setProfileOpen(false)}
                        style={{ display:'flex',alignItems:'center',gap:10,padding:'11px 14px',fontSize:13,color:'rgba(255,255,255,0.65)',textDecoration:'none',borderTop:'1px solid rgba(255,255,255,0.05)' }}>
                    <span>⚙️</span> Settings
                  </Link>
                )}
                <button onClick={logout}
                        style={{ width:'100%',display:'flex',alignItems:'center',gap:10,padding:'11px 14px',fontSize:13,color:'#FCA5A5',background:'none',border:'none',borderTop:'1px solid rgba(255,255,255,0.07)',cursor:'pointer',textAlign:'left' }}>
                  <span>⏻</span> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main style={{
        flex:1,
        marginLeft: isMobile ? 0 : SIDEBAR_W,
        marginTop: 60,
        padding: isMobile ? '16px 14px' : '24px 28px',
        minWidth: 0,
        animation: 'fadeUp 0.35s ease both',
      }}>
        {children}
      </main>
    </div>
  );
}
