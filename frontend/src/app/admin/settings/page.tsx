'use client';
// src/app/admin/settings/page.tsx
import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import { authApi } from '@/lib/api';
import { toast } from '@/components/ui/Toast';
import { getUser } from '@/lib/auth';

const DEFAULT_FEE = [
  { grade:'Nursery', tuition:6000,  transport:1500, lab:0,    sports:300 },
  { grade:'LKG',     tuition:6500,  transport:1500, lab:0,    sports:300 },
  { grade:'UKG',     tuition:7000,  transport:1500, lab:0,    sports:300 },
  { grade:'1',       tuition:7500,  transport:1500, lab:0,    sports:300 },
  { grade:'2',       tuition:8000,  transport:1500, lab:0,    sports:300 },
  { grade:'3',       tuition:8500,  transport:1500, lab:0,    sports:350 },
  { grade:'4',       tuition:9000,  transport:1750, lab:0,    sports:350 },
  { grade:'5',       tuition:9500,  transport:1750, lab:0,    sports:400 },
  { grade:'6',  tuition:10000, transport:2000, lab:500,  sports:500 },
  { grade:'7',  tuition:11000, transport:2000, lab:500,  sports:500 },
  { grade:'8',  tuition:12000, transport:2000, lab:500,  sports:500 },
  { grade:'9',  tuition:13500, transport:2000, lab:500,  sports:500 },
  { grade:'10', tuition:15000, transport:2000, lab:1000, sports:500 },
  { grade:'11', tuition:18000, transport:2000, lab:1000, sports:500 },
  { grade:'12', tuition:18000, transport:2000, lab:1000, sports:500 },
];

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="relative flex-shrink-0 transition-all"
      style={{ width: 42, height: 24, borderRadius: 99, background: on ? '#22C55E' : 'rgba(255,255,255,0.15)' }}>
      <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
            style={{ left: on ? 18 : 2 }} />
    </button>
  );
}

type Tab = 'school' | 'fees' | 'prefs' | 'security';

const EMPTY_SCHOOL = {
  name: '',
  short: '',
  principal: '',
  email: '',
  phone: '',
  address: '',
  cbseCode: '',
  estd: '',
  board: '',
};

const schoolStorageKey = (schoolId?: string) => `sims_school_${schoolId || 'default'}`;
const feesStorageKey = (schoolId?: string) => `sims_fees_${schoolId || 'default'}`;
const prefsStorageKey = (schoolId?: string) => `sims_prefs_${schoolId || 'default'}`;

const mapSchoolProfile = (data: any) => {
  const school = data?.school ?? {};
  const settings = data?.settings ?? {};
  return {
    name: school.name ?? '',
    short: settings.short ?? school.schoolCode ?? '',
    principal: school.contactPerson ?? '',
    email: school.email ?? '',
    phone: school.phone ?? '',
    address: school.address ?? '',
    cbseCode: settings.cbseCode ?? school.schoolCode ?? '',
    estd: settings.estd ?? '',
    board: settings.board ?? '',
  };
};

export default function AdminSettings() {
  const user = getUser();
  const [tab, setTab] = useState<Tab>('school');
  const [schoolId, setSchoolId] = useState(user?.schoolId || '');
  const [loadingSchool, setLoadingSchool] = useState(true);

  // ── School info ──
  const [school, setSchool] = useState(EMPTY_SCHOOL);
  const [savingSchool, setSavingSchool] = useState(false);

  // ── Fee structure ──
  const [fees, setFees] = useState(DEFAULT_FEE);
  const [savingFees, setSavingFees] = useState(false);

  // ── Preferences ──
  const [prefs, setPrefs] = useState({
    emailNotif: true, smsAlerts: false, feeReminders: true,
    parentApp: true, attendAlert: true, hwNotif: false,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);

  // ── Password change ──
  const [pwForm, setPwForm] = useState({ current: '', newPass: '', confirm: '' });
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState('');

  const sf  = (k: string, v: string)  => setSchool(p => ({ ...p, [k]: v }));
  const sfee = (grade: string, k: string, v: number) =>
    setFees(prev => prev.map(f => f.grade === grade ? { ...f, [k]: v } : f));

  const saveSchool = async () => {
    setSavingSchool(true);
    try {
      await authApi.updateSchool(school);
      if (typeof window !== 'undefined') {
        localStorage.setItem(schoolStorageKey(schoolId), JSON.stringify(school));
      }
      toast.success('School Info Saved', 'Your school details have been updated');
    } catch (error: any) {
      toast.error('Save Failed', error?.message || 'Unable to save school details');
    } finally {
      setSavingSchool(false);
    }
  };

  const saveFees = async () => {
    setSavingFees(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(feesStorageKey(schoolId), JSON.stringify(fees));
      }
      toast.success('Fee Structure Saved', 'Fee amounts updated for all grades');
    } finally {
      setSavingFees(false);
    }
  };

  const savePrefs = async () => {
    setSavingPrefs(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(prefsStorageKey(schoolId), JSON.stringify(prefs));
      }
      toast.success('Preferences Saved', 'System settings have been updated');
    } finally {
      setSavingPrefs(false);
    }
  };

  const changePassword = async () => {
    setPwError('');
    if (!pwForm.current)          { setPwError('Current password is required'); return; }
    if (!pwForm.newPass)          { setPwError('New password is required'); return; }
    if (pwForm.newPass.length < 8){ setPwError('New password must be at least 8 characters'); return; }
    if (pwForm.newPass !== pwForm.confirm) { setPwError('Passwords do not match'); return; }

    setSavingPw(true);
    try {
      await authApi.changePassword({ currentPassword: pwForm.current, newPassword: pwForm.newPass });
      setPwForm({ current: '', newPass: '', confirm: '' });
      toast.success('Password Changed', 'Your password has been updated successfully');
    } catch (e: any) {
      const msg = e?.message || 'Incorrect current password';
      setPwError(msg);
      toast.error('Password Change Failed', msg);
    } finally { setSavingPw(false); }
  };

  // Load school-scoped data
  useEffect(() => {
    let cancelled = false;
    if (!user?.schoolId) {
      setLoadingSchool(false);
      return;
    }
    setSchoolId(user.schoolId);
    setLoadingSchool(true);

    (async () => {
      try {
        const res = await authApi.getSchool();
        if (cancelled) return;
        setSchool(mapSchoolProfile(res.data?.data));
      } catch {
        if (!cancelled) setSchool(EMPTY_SCHOOL);
      } finally {
        if (!cancelled) setLoadingSchool(false);
      }

      if (typeof window === 'undefined') return;
      const f = localStorage.getItem(feesStorageKey(user.schoolId));
      const p = localStorage.getItem(prefsStorageKey(user.schoolId));
      if (f) try { if (!cancelled) setFees(JSON.parse(f)); } catch {}
      if (p) try { if (!cancelled) setPrefs(JSON.parse(p)); } catch {}
    })();

    return () => { cancelled = true; };
  }, [user?.schoolId]);

  const TABS: { id: Tab; icon: string; label: string }[] = [
    { id:'school',   icon:'🏫', label:'School Info'   },
    { id:'fees',     icon:'💰', label:'Fee Structure'  },
    { id:'prefs',    icon:'⚙️', label:'Preferences'   },
    { id:'security', icon:'🔒', label:'Security'       },
  ];

  return (
    <AppShell title="Settings" subtitle="System configuration & preferences">

      {/* TAB BAR */}
      <div className="glass rounded-2xl p-1.5 mb-6 flex gap-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
                  className="flex min-w-max flex-1 items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: tab===t.id ? 'rgba(212,160,23,0.15)' : 'transparent',
                    border:     `1px solid ${tab===t.id ? 'rgba(212,160,23,0.3)' : 'transparent'}`,
                    color:      tab===t.id ? '#F0C040' : 'rgba(255,255,255,0.45)',
                  }}>
            <span>{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── SCHOOL INFO ── */}
      {tab === 'school' && (
      <div className="glass rounded-2xl p-5 sm:p-8">
          <div className="sims-section-header mb-6">
            <div>
              <h2 className="text-base font-bold text-white">School Information</h2>
              <p className="text-xs mt-0.5" style={{color:'rgba(255,255,255,0.4)'}}>Shown across the portal and receipts</p>
              {loadingSchool && (
                <p className="text-xs mt-1" style={{color:'rgba(255,255,255,0.55)'}}>Loading current school details…</p>
              )}
            </div>
            <button onClick={saveSchool} disabled={savingSchool}
                    className="w-full px-5 py-2.5 rounded-xl text-sm font-black transition-all hover:-translate-y-0.5 disabled:opacity-60 sm:w-auto"
                    style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
              {savingSchool ? '⏳ Saving...' : '💾 Save Changes'}
            </button>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-2">
            {([
              ['School Full Name','name','text','Enter school name'],
              ['Short Name','short','text','Enter short name'],
              ['Principal Name','principal','text','Enter principal name'],
              ['Official Email','email','email','Enter official email'],
              ['Phone Number','phone','text','Enter phone number'],
              ['CBSE School Code','cbseCode','text','Enter school code'],
              ['Year Established','estd','number','Enter year established'],
              ['Affiliation Board','board','text','Enter board name'],
            ] as [string,string,string,string][]).map(([label,key,type,ph]) => (
              <div key={key}>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.4)'}}>{label}</label>
                <input type={type} value={(school as any)[key]||''} onChange={e=>sf(key,e.target.value)}
                       className="sims-input" placeholder={ph}/>
              </div>
            ))}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.4)'}}>Full Address</label>
              <input value={school.address||''} onChange={e=>sf('address',e.target.value)}
                     className="sims-input" placeholder="Street, City, State – PIN"/>
            </div>
          </div>
        </div>
      )}

      {/* ── FEE STRUCTURE ── */}
      {tab === 'fees' && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="sims-section-header px-5 py-5 sm:px-6" style={{borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
            <div>
              <h2 className="text-base font-bold text-white">Annual Fee Structure</h2>
              <p className="text-xs mt-0.5" style={{color:'rgba(255,255,255,0.4)'}}>Edit fee amounts per grade — saved locally</p>
            </div>
            <button onClick={saveFees} disabled={savingFees}
                    className="w-full px-5 py-2.5 rounded-xl text-sm font-black hover:-translate-y-0.5 transition-all disabled:opacity-60 sm:w-auto"
                    style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
              {savingFees ? '⏳ Saving...' : '💾 Save Structure'}
            </button>
          </div>
          <div className="sims-table-wrap">
            <table className="sims-table">
              <thead>
                <tr><th>Grade</th><th>Tuition (₹)</th><th>Transport (₹)</th><th>Lab Fee (₹)</th><th>Sports (₹)</th><th>Total / Year</th></tr>
              </thead>
              <tbody>
                {fees.map(f => {
                  const total = f.tuition + f.transport + f.lab + f.sports;
                  return (
                    <tr key={f.grade}>
                      <td>
                        <span className="px-3 py-1 rounded-xl text-sm font-black"
                              style={{background:'rgba(212,160,23,0.12)',color:'#F0C040'}}>
                          Grade {f.grade}
                        </span>
                      </td>
                      {(['tuition','transport','lab','sports'] as const).map(k => (
                        <td key={k}>
                          <div className="flex items-center gap-1">
                            <span className="text-xs" style={{color:'rgba(255,255,255,0.3)'}}>₹</span>
                            <input type="number" value={f[k]} min={0}
                                   onChange={e => sfee(f.grade, k, parseInt(e.target.value)||0)}
                                   className="sims-input text-sm font-bold"
                                   style={{width:100,padding:'6px 10px'}}/>
                          </div>
                        </td>
                      ))}
                      <td>
                        <span className="text-base font-black" style={{color:'#F0C040'}}>
                          ₹{total.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PREFERENCES ── */}
      {tab === 'prefs' && (
        <div className="glass rounded-2xl p-5 sm:p-8">
          <div className="sims-section-header mb-6">
            <div>
              <h2 className="text-base font-bold text-white">System Preferences</h2>
              <p className="text-xs mt-0.5" style={{color:'rgba(255,255,255,0.4)'}}>Configure notifications and portal behaviour</p>
            </div>
            <button onClick={savePrefs} disabled={savingPrefs}
                    className="w-full px-5 py-2.5 rounded-xl text-sm font-black hover:-translate-y-0.5 transition-all disabled:opacity-60 sm:w-auto"
                    style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
              {savingPrefs ? '⏳ Saving...' : '💾 Save Preferences'}
            </button>
          </div>
          <div className="space-y-3">
            {([
              ['emailNotif', '📧','Email Notifications',    'Send fee reminders and alerts via email to parents'],
              ['smsAlerts',  '📱','SMS Alerts',              'Send SMS to parents for attendance and fee dues'],
              ['feeReminders','💰','Auto Fee Reminders',     'Automatically send reminders on fee due dates'],
              ['parentApp',  '👨‍👩‍👦','Parent Portal Access',    'Allow parents to login to the student/parent portal'],
              ['attendAlert','📅','Daily Attendance Alerts', 'Notify parents when child is marked absent'],
              ['hwNotif',    '📚','Homework Notifications',  'Alert students when new homework is assigned'],
            ] as [string,string,string,string][]).map(([key,icon,title,desc]) => (
              <div key={key} className="flex flex-col gap-4 px-4 py-4 rounded-xl transition-all hover:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between sm:px-5"
                   style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
                <div className="flex items-start gap-3">
                  <span className="text-xl w-8 text-center">{icon}</span>
                  <div>
                    <div className="text-sm font-bold text-white">{title}</div>
                    <div className="text-xs mt-0.5" style={{color:'rgba(255,255,255,0.4)'}}>{desc}</div>
                  </div>
                </div>
                <Toggle on={(prefs as any)[key]} onChange={v => setPrefs(p => ({ ...p, [key]: v }))} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SECURITY ── */}
      {tab === 'security' && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {/* Change password */}
          <div className="glass rounded-2xl p-5 sm:p-8">
            <h2 className="text-base font-bold text-white mb-1">Change Password</h2>
            <p className="text-xs mb-5" style={{color:'rgba(255,255,255,0.4)'}}>
              Logged in as <span className="text-yellow-400 font-semibold">{user?.email}</span>
            </p>

            {pwError && (
              <div className="mb-4 px-4 py-3 rounded-xl text-xs font-bold"
                   style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',color:'#FCA5A5'}}>
                ⚠️ {pwError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.4)'}}>Current Password</label>
                <input type="password" value={pwForm.current} onChange={e=>setPwForm(p=>({...p,current:e.target.value}))}
                       className="sims-input" placeholder="Enter current password"
                       onFocus={()=>setPwError('')}/>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.4)'}}>New Password</label>
                <input type="password" value={pwForm.newPass} onChange={e=>setPwForm(p=>({...p,newPass:e.target.value}))}
                       className="sims-input" placeholder="Minimum 8 characters"/>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{color:'rgba(255,255,255,0.4)'}}>Confirm New Password</label>
                <input type="password" value={pwForm.confirm} onChange={e=>setPwForm(p=>({...p,confirm:e.target.value}))}
                       className="sims-input" placeholder="Re-enter new password"
                       onKeyDown={e=>e.key==='Enter'&&changePassword()}/>
              </div>

              {/* Password strength indicator */}
              {pwForm.newPass && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs" style={{color:'rgba(255,255,255,0.4)'}}>Password strength</span>
                    <span className="text-xs font-bold" style={{color: pwForm.newPass.length >= 12 && /[A-Z]/.test(pwForm.newPass) && /[0-9]/.test(pwForm.newPass) ? '#86EFAC' : pwForm.newPass.length >= 8 ? '#FCD34D' : '#FCA5A5'}}>
                      {pwForm.newPass.length >= 12 && /[A-Z]/.test(pwForm.newPass) && /[0-9]/.test(pwForm.newPass) ? 'Strong' : pwForm.newPass.length >= 8 ? 'Medium' : 'Weak'}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.07)'}}>
                    <div className="h-full rounded-full transition-all"
                         style={{
                           width: `${Math.min(100, (pwForm.newPass.length / 12) * 100)}%`,
                           background: pwForm.newPass.length >= 12 ? '#22C55E' : pwForm.newPass.length >= 8 ? '#F59E0B' : '#EF4444',
                         }}/>
                  </div>
                </div>
              )}

              {pwForm.newPass && pwForm.confirm && pwForm.newPass !== pwForm.confirm && (
                <p className="text-xs" style={{color:'#FCA5A5'}}>⚠️ Passwords do not match</p>
              )}

              <button onClick={changePassword} disabled={savingPw}
                      className="w-full py-3 rounded-xl text-sm font-black transition-all hover:-translate-y-0.5 disabled:opacity-60"
                      style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
                {savingPw ? '⏳ Updating...' : '🔒 Update Password'}
              </button>
            </div>
          </div>

          {/* Session info */}
          <div className="glass rounded-2xl p-5 sm:p-8">
            <h2 className="text-base font-bold text-white mb-1">Session & Security</h2>
            <p className="text-xs mb-5" style={{color:'rgba(255,255,255,0.4)'}}>Current session and access info</p>
            <div className="space-y-3">
              {[
                ['🔑','JWT Expiry',    '7 days','Tokens expire after 7 days of inactivity'],
                ['👤','Current Role',  user?.role||'ADMIN','Your access level in this portal'],
                ['📋','Audit Log',     'Enabled','All admin actions are being recorded'],
                ['🌐','CORS Policy',   'localhost:3000','Frontend origin allowed by API'],
              ].map(([icon,title,badge,desc])=>(
                <div key={title as string} className="flex flex-col gap-3 px-4 py-3.5 rounded-xl sm:flex-row sm:items-center sm:justify-between"
                     style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
                  <div className="flex items-start gap-3">
                    <span className="text-lg w-7 text-center">{icon}</span>
                    <div>
                      <div className="text-sm font-bold text-white">{title}</div>
                      <div className="text-xs mt-0.5" style={{color:'rgba(255,255,255,0.4)'}}>{desc}</div>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-xl ml-2"
                        style={{background:'rgba(34,197,94,0.12)',color:'#86EFAC',flexShrink:0}}>
                    {badge}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 p-4 rounded-xl" style={{background:'rgba(212,160,23,0.07)',border:'1px solid rgba(212,160,23,0.2)'}}>
              <p className="text-xs leading-relaxed" style={{color:'rgba(255,255,255,0.5)'}}>
                💡 <strong className="text-yellow-400">Security tip:</strong> Use a strong password with uppercase letters, numbers and symbols.
                Never share your credentials. Log out when using shared computers.
              </p>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
