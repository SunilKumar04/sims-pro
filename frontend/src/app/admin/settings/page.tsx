'use client';
// src/app/admin/settings/page.tsx
import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import { authApi } from '@/lib/api';
import { toast } from '@/components/ui/Toast';
import { getUser } from '@/lib/auth';

const DEFAULT_FEE = [
  { grade:'12', tuition:18000, transport:2000, lab:1000, sports:500 },
  { grade:'11', tuition:18000, transport:2000, lab:1000, sports:500 },
  { grade:'10', tuition:15000, transport:2000, lab:1000, sports:500 },
  { grade:'9',  tuition:13500, transport:2000, lab:500,  sports:500 },
  { grade:'8',  tuition:12000, transport:2000, lab:500,  sports:500 },
  { grade:'7',  tuition:11000, transport:2000, lab:500,  sports:500 },
  { grade:'6',  tuition:10000, transport:2000, lab:500,  sports:500 },
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

export default function AdminSettings() {
  const user = getUser();
  const [tab, setTab] = useState<Tab>('school');

  // ── School info ──
  const [school, setSchool] = useState({
    name:     'Guru Nanak Public Senior Secondary School',
    short:    'GNPSS',
    principal:'Dr. R.K. Sharma',
    email:    'principal@gnpss.edu.in',
    phone:    '+91-161-2345678',
    address:  'Civil Lines, Ludhiana, Punjab – 141001',
    cbseCode: '1630247',
    estd:     '1985',
    board:    'CBSE, New Delhi',
  });
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
    await new Promise(r => setTimeout(r, 600)); // persist to localStorage for demo
    if (typeof window !== 'undefined') {
      localStorage.setItem('sims_school', JSON.stringify(school));
    }
    setSavingSchool(false);
    toast.success('School Info Saved', 'Your school details have been updated');
  };

  const saveFees = async () => {
    setSavingFees(true);
    await new Promise(r => setTimeout(r, 600));
    if (typeof window !== 'undefined') {
      localStorage.setItem('sims_fees', JSON.stringify(fees));
    }
    setSavingFees(false);
    toast.success('Fee Structure Saved', 'Fee amounts updated for all grades');
  };

  const savePrefs = async () => {
    setSavingPrefs(true);
    await new Promise(r => setTimeout(r, 600));
    if (typeof window !== 'undefined') {
      localStorage.setItem('sims_prefs', JSON.stringify(prefs));
    }
    setSavingPrefs(false);
    toast.success('Preferences Saved', 'System settings have been updated');
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

  // Load persisted data
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const s = localStorage.getItem('sims_school');
    const f = localStorage.getItem('sims_fees');
    const p = localStorage.getItem('sims_prefs');
    if (s) try { setSchool(JSON.parse(s)); } catch {}
    if (f) try { setFees(JSON.parse(f)); } catch {}
    if (p) try { setPrefs(JSON.parse(p)); } catch {}
  }, []);

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
            </div>
            <button onClick={saveSchool} disabled={savingSchool}
                    className="w-full px-5 py-2.5 rounded-xl text-sm font-black transition-all hover:-translate-y-0.5 disabled:opacity-60 sm:w-auto"
                    style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
              {savingSchool ? '⏳ Saving...' : '💾 Save Changes'}
            </button>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-2">
            {([
              ['School Full Name','name','text','Guru Nanak Public...'],
              ['Short Name','short','text','GNPSS'],
              ['Principal Name','principal','text','Dr. R.K. Sharma'],
              ['Official Email','email','email','principal@school.edu.in'],
              ['Phone Number','phone','text','+91-161-...'],
              ['CBSE School Code','cbseCode','text','1630247'],
              ['Year Established','estd','number','1985'],
              ['Affiliation Board','board','text','CBSE, New Delhi'],
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
