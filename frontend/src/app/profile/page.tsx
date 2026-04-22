'use client';
// src/app/profile/page.tsx
// Accessible by ALL roles: /profile
import React, { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { authApi } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { toast } from '@/components/ui/Toast';

interface PwdForm { current: string; next: string; confirm: string }
const BLANK: PwdForm = { current: '', next: '', confirm: '' };

function strengthBars(pwd: string) {
  return [pwd.length >= 8, /[A-Z]/.test(pwd), /[0-9]/.test(pwd), /[^A-Za-z0-9]/.test(pwd)];
}
const HINTS = ['8+ chars', 'Uppercase', 'Number', 'Symbol'];

const ROLE_COLOR: Record<string, string> = {
  ADMIN: '#F0C040', TEACHER: '#93C5FD', STUDENT: '#86EFAC', PARENT: '#D8B4FE',
};
const ROLE_ICON: Record<string, string> = {
  ADMIN: '👑', TEACHER: '👩‍🏫', STUDENT: '👨‍🎓', PARENT: '👪',
};

export default function ProfilePage() {
  const user = getUser();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [form,     setForm]     = useState<PwdForm>(BLANK);
  const [showCur,  setShowCur]  = useState(false);
  const [showNew,  setShowNew]  = useState(false);
  const [saving,   setSaving]   = useState(false);

  const role = String(user?.role ?? 'STUDENT').toUpperCase();

  useEffect(() => {
    authApi.getMe()
      .then(r => setProfile(r.data))
      .catch(() => setProfile(user))
      .finally(() => setLoading(false));
  }, []);

  const f = (k: keyof PwdForm, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.current.trim())   { toast.warning('Required', 'Enter your current password'); return; }
    if (form.next.length < 8)   { toast.warning('Too short', 'New password must be at least 8 characters'); return; }
    if (form.next !== form.confirm) { toast.warning('Mismatch', 'New passwords do not match'); return; }
    if (form.current === form.next) { toast.warning('Same password', 'New password must be different'); return; }
    setSaving(true);
    try {
      await authApi.changePassword({ currentPassword: form.current, newPassword: form.next });
      toast.success('Password Changed', 'Your password has been updated successfully');
      setForm(BLANK);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to change password';
      toast.error('Error', Array.isArray(msg) ? msg[0] : msg);
    } finally { setSaving(false); }
  };

  const bars     = strengthBars(form.next);
  const strength = bars.filter(Boolean).length;
  const strengthColor = strength <= 1 ? '#FCA5A5' : strength === 2 ? '#FCD34D' : strength === 3 ? '#93C5FD' : '#86EFAC';
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];

  const info = profile ?? user;
  const initials = (info?.name ?? 'U').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <AppShell title="My Profile" subtitle="View your details and manage your account">

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

        {/* ── LEFT: Profile card ── */}
        <div className="col-span-1 space-y-4">

          {/* Avatar + name */}
          <div className="glass rounded-2xl p-6 text-center" style={{ border: `1px solid ${ROLE_COLOR[role]}30` }}>
            {loading ? (
              <div className="skeleton w-20 h-20 rounded-2xl mx-auto mb-4"/>
            ) : (
              <>
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black mx-auto mb-4"
                     style={{ background: `linear-gradient(135deg,${ROLE_COLOR[role]}40,${ROLE_COLOR[role]}20)`, border: `2px solid ${ROLE_COLOR[role]}40`, color: ROLE_COLOR[role] }}>
                  {initials}
                </div>
                <div className="text-lg font-black text-white mb-1">{info?.name ?? '—'}</div>
                <div className="text-sm text-white/50 mb-3">{info?.email ?? '—'}</div>
                <span className="px-3 py-1.5 rounded-full text-xs font-bold"
                      style={{ background: `${ROLE_COLOR[role]}15`, color: ROLE_COLOR[role], border: `1px solid ${ROLE_COLOR[role]}30` }}>
                  {ROLE_ICON[role]} {role.charAt(0) + role.slice(1).toLowerCase()}
                </span>
              </>
            )}
          </div>

          {/* Info fields */}
          <div className="glass rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">Account Info</h3>

            {[
              { label: 'Full Name',     value: info?.name          },
              { label: 'Email',         value: info?.email         },
              { label: 'Role',          value: role.charAt(0) + role.slice(1).toLowerCase() },
              ...(role === 'STUDENT' ? [
                { label: 'Class',         value: info?.className   },
                { label: 'Roll No.',      value: info?.roll        },
              ] : []),
              ...(role === 'TEACHER' ? [
                { label: 'Employee Code', value: info?.employeeCode },
                { label: 'Subject',       value: info?.subject      },
              ] : []),
            ].map(row => (
              row.value ? (
                <div key={row.label} className="flex items-start justify-between gap-3 py-2"
                     style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span className="text-xs text-white/40 flex-shrink-0">{row.label}</span>
                  <span className="text-xs font-semibold text-white text-right truncate">{row.value}</span>
                </div>
              ) : null
            ))}
          </div>

          {/* Security note */}
          <div className="glass rounded-2xl p-4" style={{ border: '1px solid rgba(245,158,11,0.2)' }}>
            <div className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0">🔐</span>
              <div>
                <div className="text-xs font-bold text-yellow-400 mb-1">Security Tip</div>
                <p className="text-xs text-white/40 leading-relaxed">
                  Use a strong password with at least 8 characters, including uppercase, numbers, and symbols. Change it every 3 months.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Change password ── */}
        <div className="col-span-2">
          <div className="glass rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="px-7 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <h2 className="text-base font-extrabold text-white">🔒 Change Password</h2>
              <p className="text-xs mt-0.5 text-white/40">Update your login password. You will remain logged in after changing.</p>
            </div>

            <form onSubmit={handleChangePassword} className="p-7 space-y-5">

              {/* Current password */}
              <div>
                <label className="block text-xs font-bold mb-2 uppercase tracking-wider text-white/40">Current Password *</label>
                <div className="relative">
                  <input
                    type={showCur ? 'text' : 'password'}
                    value={form.current}
                    onChange={e => f('current', e.target.value)}
                    className="sims-input pr-12"
                    placeholder="Enter your current password"
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowCur(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-base"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    {showCur ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }}/>

              {/* New password */}
              <div>
                <label className="block text-xs font-bold mb-2 uppercase tracking-wider text-white/40">New Password *</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={form.next}
                    onChange={e => f('next', e.target.value)}
                    className="sims-input pr-12"
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowNew(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-base"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    {showNew ? '🙈' : '👁️'}
                  </button>
                </div>

                {/* Strength indicator */}
                {form.next.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-white/40">Password strength</span>
                      <span className="text-xs font-bold" style={{ color: strengthColor }}>{strengthLabel}</span>
                    </div>
                    <div className="flex gap-1.5 mb-2">
                      {bars.map((ok, i) => (
                        <div key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: ok ? strengthColor : 'rgba(255,255,255,0.1)', transition: 'background 0.2s' }}/>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {HINTS.map((hint, i) => (
                        <span key={hint} className="text-[11px]" style={{ color: bars[i] ? '#86EFAC' : 'rgba(255,255,255,0.25)' }}>
                          {bars[i] ? '✓' : '○'} {hint}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-xs font-bold mb-2 uppercase tracking-wider text-white/40">Confirm New Password *</label>
                <input
                  type="password"
                  value={form.confirm}
                  onChange={e => f('confirm', e.target.value)}
                  className="sims-input"
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  style={{ borderColor: form.confirm && form.confirm !== form.next ? 'rgba(239,68,68,0.5)' : '' }}
                />
                {form.confirm && form.confirm !== form.next && (
                  <p className="text-xs mt-1.5" style={{ color: '#FCA5A5' }}>Passwords do not match</p>
                )}
                {form.confirm && form.confirm === form.next && form.next.length >= 8 && (
                  <p className="text-xs mt-1.5" style={{ color: '#86EFAC' }}>✓ Passwords match</p>
                )}
              </div>

              {/* Submit */}
              <div className="flex items-center gap-4 pt-2">
                <button type="submit" disabled={saving}
                        className="px-8 py-3 rounded-xl text-sm font-black disabled:opacity-60 hover:-translate-y-0.5 transition-all"
                        style={{ background: 'linear-gradient(135deg,#D4A017,#F0C040)', color: '#0A1628' }}>
                  {saving ? '⏳ Updating…' : '🔒 Update Password'}
                </button>
                <button type="button" onClick={() => setForm(BLANK)}
                        className="px-6 py-3 rounded-xl text-sm font-bold glass hover:bg-white/10 transition-all">
                  Clear
                </button>
              </div>
            </form>
          </div>

          {/* Recent activity placeholder */}
          <div className="glass rounded-2xl p-6 mt-5" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="text-sm font-bold text-white mb-4">📋 Account Activity</h3>
            <div className="space-y-3">
              {[
                { icon:'🔑', label:'Last login',          value: info?.lastLogin ? new Date(info.lastLogin).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : 'This session' },
                { icon:'📧', label:'Registered email',   value: info?.email ?? '—' },
                { icon:'🛡️', label:'Account status',     value: 'Active' },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-2"
                     style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span className="text-sm text-white/50 flex items-center gap-2"><span>{row.icon}</span>{row.label}</span>
                  <span className="text-sm font-semibold text-white">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
