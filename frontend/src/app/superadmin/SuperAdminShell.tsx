'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getInitials } from '@/lib/utils';
import { getUser, logout } from '@/lib/auth';

export default function SuperAdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/superadmin/login';
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const user = getUser();
  const role = String(user?.role || 'SUPER_ADMIN').toUpperCase();

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const navItems = [
    { href: '/superadmin/dashboard', label: 'Dashboard' },
    { href: '/superadmin/schools', label: 'Schools' },
    { href: '/superadmin/plans', label: 'Plans' },
    { href: '/superadmin/subscriptions', label: 'Subscriptions' },
    { href: '/superadmin/analytics', label: 'Analytics' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#07111f', color: '#fff' }}>
      {!isLoginPage && (
        <header style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => router.push('/superadmin/dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', padding: 0, color: 'white', cursor: 'pointer' }}
          >
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 21,
              background: 'linear-gradient(135deg,#F0C040,#FFD86B)',
              boxShadow: '0 8px 24px rgba(240,192,64,0.22)',
              flexShrink: 0,
            }}>
              🛡️
            </div>
            <div style={{ lineHeight: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.03em' }}>
                SIMS <span style={{ color: '#F0C040' }}>Pro</span>
              </div>
              <div style={{ fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.34)', marginTop: 3 }}>
                Super Admin Console
              </div>
            </div>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <nav style={{ display: 'flex', gap: 18, fontSize: 14, opacity: 0.84, flexWrap: 'wrap' }}>
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    color: pathname === item.href ? '#F0C040' : 'rgba(255,255,255,0.82)',
                    textDecoration: 'none',
                    fontWeight: pathname === item.href ? 800 : 600,
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div style={{ position: 'relative' }} ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 900,
                  background: 'linear-gradient(135deg,#D4A017,#1E90FF)',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
                title={user?.name || role}
              >
                {getInitials(user?.name || 'SA')}
              </button>

              {profileOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 8,
                    width: 240,
                    borderRadius: 16,
                    overflow: 'hidden',
                    background: '#0F2044',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                    zIndex: 100,
                  }}
                >
                  <div style={{ padding: 14, borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, flexShrink: 0, background: 'linear-gradient(135deg,#D4A017,#1E90FF)', color: 'white' }}>
                      {getInitials(user?.name || 'SA')}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user?.name || 'Super Admin'}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user?.email || 'superadmin'}
                      </div>
                    </div>
                  </div>

                  <Link
                    href="/profile"
                    onClick={() => setProfileOpen(false)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', fontSize: 13, color: 'rgba(255,255,255,0.75)', textDecoration: 'none' }}
                  >
                    <span>👤</span> My Profile
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setProfileOpen(false)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', fontSize: 13, color: 'rgba(255,255,255,0.75)', textDecoration: 'none', borderTop: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <span>🔒</span> Change Password
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      logout();
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '11px 14px',
                      fontSize: 13,
                      color: '#FCA5A5',
                      background: 'none',
                      border: 'none',
                      borderTop: '1px solid rgba(255,255,255,0.07)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span>⏻</span> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      <main style={{ padding: isLoginPage ? 0 : 28 }}>{children}</main>
    </div>
  );
}
