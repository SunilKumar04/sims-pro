'use client';
// src/app/teacher/sessions/page.tsx
import React, { useCallback, useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { sessionsApi, timetableApi } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { toast } from '@/components/ui/Toast';
import { confirm } from '@/components/ui/Confirm';

type Status = 'PRESENT' | 'ABSENT' | 'LATE';
type View   = 'today' | 'create' | 'mark' | 'history';

const SS: Record<Status, { bg: string; border: string; text: string; icon: string }> = {
  PRESENT: { bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.5)',  text: '#86EFAC', icon: '✅' },
  ABSENT:  { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.5)',  text: '#FCA5A5', icon: '❌' },
  LATE:    { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.5)', text: '#FCD34D', icon: '⏰' },
};

const SUB_COL: Record<string, string> = {
  Mathematics: '#a5b4fc', Physics: '#93c5fd', Chemistry: '#86efac', Biology: '#6ee7b7',
  English: '#fcd34d', Hindi: '#fca5a5', History: '#d8b4fe', 'Computer Science': '#c7d2fe',
  Geography: '#99f6e4', 'Physical Education': '#fdba74', Economics: '#fbcfe8', Accountancy: '#fef08a',
};
const sc = (s: string) => SUB_COL[s] ?? '#aaaaaa';

export default function TeacherSessions() {
  const user = getUser();
  const tid  = user?.teacherId ?? user?.id ?? '';

  const [view,     setView]     = useState<View>('today');
  const [today,    setToday]    = useState<any[]>([]);
  const [history,  setHistory]  = useState<any[]>([]);
  const [session,  setSession]  = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [att,      setAtt]      = useState<Record<string, Status>>({});
  const [rem,      setRem]      = useState<Record<string, string>>({});
  const [mappings, setMappings] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [search,   setSearch]   = useState('');
  const [form,     setForm]     = useState<any>({
    period: 1,
    date:   new Date().toISOString().slice(0, 10),
    topic:  '',
  });

  const sf = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [t, m] = await Promise.all([
        sessionsApi.getToday(),
        timetableApi.getMappings(),
      ]);
      setToday(t.data.data?.todayClasses ?? []);

      const allMaps = m.data.data ?? [];
      const mine = allMaps.filter((x: any) =>
        x.teacherId === tid || x.teacher?.user?.name === user?.name
      );
      setMappings(mine);
    } catch { toast.error('Load Failed', 'Could not load sessions'); }
    finally { setLoading(false); }
  }, [tid, user?.name]);

  const loadHistory = useCallback(async () => {
    try {
      const r = await sessionsApi.getSessions({});
      setHistory(r.data.data?.slice(0, 30) ?? []);
    } catch {}
  }, []);

  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => {
    if (view === 'history') void loadHistory();
  }, [view, loadHistory]);

  const openSession = async (sid: string) => {
    try {
      const r = await sessionsApi.getSessionStudents(sid);
      const d = r.data.data;
      if (!d) { toast.error('Error', 'Could not load session'); return; }
      setSession(d.session);
      setStudents(d.students ?? []);
      const ia: Record<string, Status> = {};
      const ir: Record<string, string> = {};
      (d.students ?? []).forEach((s: any) => {
        ia[s.studentId] = (s.status && s.status !== 'null' ? s.status : 'PRESENT') as Status;
        ir[s.studentId] = s.remark ?? '';
      });
      setAtt(ia);
      setRem(ir);
      setSearch('');
      setView('mark');
    } catch (e: any) {
      toast.error('Error', e?.response?.data?.message ?? 'Could not load session');
    }
  };

  const createAndOpen = async () => {
    if (!form.className || !form.subject) {
      toast.warning('Required', 'Please select class and subject'); return;
    }
    setSaving(true);
    try {
      const r = await sessionsApi.create({
        className: form.className,
        subject:   form.subject,
        period:    Number(form.period),
        date:      form.date,
        topic:     form.topic ?? '',
      });
      const sid = r.data.data?.id;
      if (!sid) throw new Error('No session ID returned');
      await openSession(sid);
    } catch (e: any) {
      toast.error('Create Failed', e?.response?.data?.message ?? e?.message ?? 'Failed');
    } finally { setSaving(false); }
  };

  const handleSave = async (lock = false) => {
    if (!session) return;
    setSaving(true);
    try {
      const records = students.map(s => ({
        studentId: s.studentId,
        status:    att[s.studentId] ?? 'PRESENT',
        remark:    rem[s.studentId] ?? '',
      }));
      await sessionsApi.markBulk(session.id, records);
      if (lock) {
        if (!(await confirm({ title: 'Lock Session', message: 'Lock this session? Attendance cannot be edited after locking.', confirm: 'Lock', danger: true }))) {
          setSaving(false); return;
        }
        await sessionsApi.lock(session.id);
        toast.success('Saved & Locked', `${records.length} students`);
      } else {
        toast.success('Saved', `${records.length} students marked`);
      }
      setView('today');
      void reload();
    } catch (e: any) {
      toast.error('Error', e?.response?.data?.message ?? 'Failed to save');
    } finally { setSaving(false); }
  };

  const startFromCard = async (card: any) => {
    if (card.hasSession) {
      if (!card.session.isLocked) {
        await openSession(card.session.id);
      }
      return;
    }
    setSaving(true);
    try {
      const r = await sessionsApi.create({
        className: card.className,
        subject:   card.subject,
        period:    card.period,
        date:      new Date().toISOString().slice(0, 10),
      });
      await openSession(r.data.data.id);
    } catch (e: any) {
      toast.error('Failed', e?.response?.data?.message ?? 'Could not start session');
    } finally { setSaving(false); }
  };

  const myClasses  = [...new Set<string>(mappings.map((m: any) => m.className))];
  const mySubjects = (cls: string) => mappings.filter((m: any) => m.className === cls).map((m: any) => m.subject);

  const filteredStudents = search
    ? students.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()) || s.roll?.toLowerCase().includes(search.toLowerCase()))
    : students;

  const present = Object.values(att).filter(s => s === 'PRESENT').length;
  const absent  = Object.values(att).filter(s => s === 'ABSENT').length;
  const late    = Object.values(att).filter(s => s === 'LATE').length;

  const TABS: { id: View; icon: string; label: string }[] = [
    { id: 'today',   icon: '📅', label: "Today's Classes" },
    { id: 'create',  icon: '➕', label: 'New Session'      },
    { id: 'history', icon: '📋', label: 'History'          },
  ];

  return (
    <AppShell title="Subject Sessions" subtitle="Subject-wise period attendance tracking">
      {view !== 'mark' && (
        <div className="glass rounded-2xl p-1.5 mb-5 flex gap-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setView(t.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
                    style={{
                      background: view === t.id ? 'rgba(212,160,23,0.15)' : 'transparent',
                      border: `1px solid ${view === t.id ? 'rgba(212,160,23,0.3)' : 'transparent'}`,
                      color: view === t.id ? '#F0C040' : 'rgba(255,255,255,0.45)',
                    }}>
              {t.icon} <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      )}

      {view === 'today' && (
        loading
          ? <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl"/>)}</div>
          : today.length === 0
            ? <div className="glass rounded-2xl py-20 text-center">
                <div className="text-5xl mb-4 opacity-30">📅</div>
                <p className="text-base font-bold text-white mb-2">No classes scheduled for today</p>
                <p className="text-sm text-white/40 mb-5">Your timetable is empty or hasn't been set up</p>
                <button onClick={() => setView('create')}
                        className="px-6 py-2.5 rounded-xl text-sm font-bold"
                        style={{ background: 'linear-gradient(135deg,#D4A017,#F0C040)', color: '#0A1628' }}>
                  + Create Manual Session
                </button>
              </div>
            : <div className="grid grid-cols-2 gap-3">
                {today.map((card: any, i: number) => {
                  const col     = sc(card.subject);
                  const held    = card.hasSession;
                  const locked  = card.session?.isLocked ?? false;
                  const count   = card.session?._count?.records ?? 0;
                  return (
                    <div key={i} className="glass rounded-2xl p-5 hover:-translate-y-0.5 transition-all"
                         style={{ border: held ? `1px solid ${col}30` : '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0"
                               style={{ background: `${col}20`, color: col, border: `1px solid ${col}30` }}>
                            P{card.period}
                          </div>
                          <div>
                            <div className="text-sm font-black text-white">{card.subject}</div>
                            <div className="text-xs text-white/40">{card.className}{card.room ? ` · ${card.room}` : ''}</div>
                          </div>
                        </div>
                        {held && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0"
                                style={{
                                  background: locked ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
                                  color:      locked ? '#FCA5A5' : '#86EFAC',
                                }}>
                            {locked ? '🔒 Locked' : '✅ Active'}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-white/35 mb-3">
                        ⏱ {card.startTime}–{card.endTime}
                        {held && count > 0 && <span className="ml-2">· {count} marked</span>}
                      </div>

                      {locked ? (
                        <div className="text-xs text-white/30 text-center py-1">Session locked</div>
                      ) : held ? (
                        <button onClick={() => void openSession(card.session.id)} disabled={saving}
                                className="w-full py-2.5 rounded-xl text-xs font-black hover:-translate-y-0.5 transition-all disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg,#D4A017,#F0C040)', color: '#0A1628' }}>
                          ✏️ Edit Attendance
                        </button>
                      ) : (
                        <button onClick={() => void startFromCard(card)} disabled={saving}
                                className="w-full py-2.5 rounded-xl text-xs font-black hover:-translate-y-0.5 transition-all disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg,#D4A017,#F0C040)', color: '#0A1628' }}>
                          {saving ? '⏳ Starting…' : '▶ Start Session'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
      )}

      {view === 'create' && (
        <div className="max-w-xl">
          <div className="glass rounded-2xl p-7">
            <h2 className="text-lg font-extrabold mb-5 text-white">➕ Create New Session</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-white/40">Class *</label>
                  <select value={form.className ?? ''} onChange={e => { sf('className', e.target.value); sf('subject', ''); }} className="sims-input">
                    <option value="">Select class</option>
                    {myClasses.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-white/40">Subject *</label>
                  <select value={form.subject ?? ''} onChange={e => sf('subject', e.target.value)} className="sims-input">
                    <option value="">Select subject</option>
                    {form.className && mySubjects(form.className).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-white/40">Date *</label>
                  <input type="date" value={form.date} onChange={e => sf('date', e.target.value)}
                         max={new Date().toISOString().slice(0, 10)} className="sims-input"/>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-white/40">Period *</label>
                  <select value={form.period} onChange={e => sf('period', parseInt(e.target.value))} className="sims-input">
                    {[1,2,3,4,5,6,7,8].map(p => <option key={p} value={p}>Period {p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-white/40">Topic Covered</label>
                <input value={form.topic ?? ''} onChange={e => sf('topic', e.target.value)}
                       className="sims-input" placeholder="e.g. Chapter 3 — Newton's Laws"/>
              </div>
            </div>
            <div className="flex gap-3 mt-6 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <button onClick={() => setView('today')} className="flex-1 py-3 rounded-xl text-sm font-bold glass hover:bg-white/10">
                Cancel
              </button>
              <button onClick={() => void createAndOpen()} disabled={saving || !form.className || !form.subject}
                      className="flex-1 py-3 rounded-xl text-sm font-black disabled:opacity-60 hover:-translate-y-0.5 transition-all"
                      style={{ background: 'linear-gradient(135deg,#D4A017,#F0C040)', color: '#0A1628' }}>
                {saving ? '⏳ Creating…' : '▶ Create & Mark'}
              </button>
            </div>
          </div>
        </div>
      )}

      {view === 'mark' && session && (
        <div>
          <div className="glass rounded-2xl p-5 mb-4"
               style={{ border: session.isLocked ? '1px solid rgba(239,68,68,0.3)' : `1px solid ${sc(session.subject)}30` }}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: sc(session.subject) }}/>
                  <span className="text-lg font-black text-white">{session.subject}</span>
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold"
                        style={{ background: 'rgba(30,144,255,0.15)', color: '#93C5FD' }}>
                    {session.className}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold"
                        style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}>
                    Period {session.period}
                  </span>
                  {session.isLocked && (
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold"
                          style={{ background: 'rgba(239,68,68,0.15)', color: '#FCA5A5' }}>
                      🔒 Locked — View Only
                    </span>
                  )}
                </div>
                <div className="text-xs text-white/40">
                  {new Date(session.date).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                  {session.topic && <span className="ml-2 text-white/30">· {session.topic}</span>}
                </div>
              </div>

              <div className="flex gap-3 flex-shrink-0">
                {[['✅', present, '#86EFAC', 'rgba(34,197,94,0.12)'],
                  ['❌', absent,  '#FCA5A5', 'rgba(239,68,68,0.12)'],
                  ['⏰', late,    '#FCD34D', 'rgba(245,158,11,0.12)']].map(([icon, v, col, bg]) => (
                  <div key={icon as string} className="px-4 py-2 rounded-xl text-center"
                       style={{ background: bg as string, border: `1px solid ${col as string}30` }}>
                    <div className="text-xl font-black" style={{ color: col as string }}>{v}</div>
                    <div className="text-[10px] text-white/40">{icon}</div>
                  </div>
                ))}
                <div className="px-4 py-2 rounded-xl text-center glass">
                  <div className="text-xl font-black text-white">{students.length}</div>
                  <div className="text-[10px] text-white/40">Total</div>
                </div>
              </div>
            </div>
          </div>

          {!session.isLocked && (
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span className="text-xs font-bold text-white/35">Mark all:</span>
              {(['PRESENT', 'ABSENT', 'LATE'] as Status[]).map(s => (
                <button key={s}
                        onClick={() => { const n: Record<string, Status> = {}; students.forEach(st => { n[st.studentId] = s; }); setAtt(n); }}
                        className="px-4 py-2 rounded-xl text-xs font-bold hover:-translate-y-0.5 transition-all"
                        style={{ background: SS[s].bg, border: `1px solid ${SS[s].border}`, color: SS[s].text }}>
                  {SS[s].icon} {s}
                </button>
              ))}
              <div className="flex-1"/>
              <input value={search} onChange={e => setSearch(e.target.value)}
                     className="sims-input text-xs" style={{ width: 200 }} placeholder="🔍 Search…"/>
            </div>
          )}

          <div className="glass rounded-2xl overflow-hidden mb-4">
            <table className="sims-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Roll</th>
                  <th>Status</th>
                  <th>Remark</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s: any, i: number) => {
                  const st  = att[s.studentId] ?? 'PRESENT';
                  const cfg = SS[st] ?? SS.PRESENT;
                  return (
                    <tr key={s.studentId}>
                      <td className="text-white/30 text-xs">{i + 1}</td>
                      <td className="font-bold text-white">{s.name}</td>
                      <td className="font-mono text-xs text-white/45">{s.roll}</td>
                      <td>
                        {session.isLocked ? (
                          <span className="px-3 py-1.5 rounded-xl text-xs font-bold"
                                style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.text }}>
                            {cfg.icon} {st}
                          </span>
                        ) : (
                          <div className="flex gap-1.5">
                            {(['PRESENT', 'ABSENT', 'LATE'] as Status[]).map(status => (
                              <button key={status}
                                      onClick={() => setAtt(p => ({ ...p, [s.studentId]: status }))}
                                      className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:-translate-y-0.5"
                                      style={{
                                        background: st === status ? SS[status].bg : 'rgba(255,255,255,0.04)',
                                        border: `1px solid ${st === status ? SS[status].border : 'rgba(255,255,255,0.07)'}`,
                                        color: st === status ? SS[status].text : 'rgba(255,255,255,0.3)',
                                      }}>
                                {SS[status].icon}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        {session.isLocked ? (
                          <span className="text-xs text-white/35">{rem[s.studentId] || '—'}</span>
                        ) : (
                          <input value={rem[s.studentId] ?? ''}
                                 onChange={e => setRem(p => ({ ...p, [s.studentId]: e.target.value }))}
                                 className="sims-input text-xs" style={{ maxWidth: 160, padding: '5px 10px' }}
                                 placeholder="Remark…"/>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setView('today')}
                    className="px-6 py-3 rounded-xl text-sm font-bold glass hover:bg-white/10">
              ← Back
            </button>
            {!session.isLocked && (
              <>
                <button onClick={() => void handleSave(false)} disabled={saving}
                        className="flex-1 py-3 rounded-xl text-sm font-black disabled:opacity-60 hover:-translate-y-0.5 transition-all"
                        style={{ background: 'linear-gradient(135deg,#D4A017,#F0C040)', color: '#0A1628' }}>
                  {saving ? '⏳ Saving…' : '💾 Save'}
                </button>
                <button onClick={() => void handleSave(true)} disabled={saving}
                        className="px-6 py-3 rounded-xl text-sm font-bold disabled:opacity-60 hover:-translate-y-0.5 transition-all"
                        style={{ background: 'rgba(239,68,68,0.12)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.3)' }}>
                  🔒 Save & Lock
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {view === 'history' && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <h3 className="text-sm font-bold text-white">Recent Sessions</h3>
            <p className="text-xs mt-0.5 text-white/40">Last 30 sessions you conducted</p>
          </div>
          {history.length === 0 ? (
            <div className="text-center py-12 text-white/40">No sessions yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="sims-table">
                <thead>
                  <tr><th>Subject</th><th>Class</th><th>Date</th><th>Period</th><th>Topic</th><th>Status</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {history.map((s: any) => (
                    <tr key={s.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sc(s.subject) }}/>
                          <span className="font-bold text-white">{s.subject}</span>
                        </div>
                      </td>
                      <td>
                        <span className="px-2 py-0.5 rounded text-xs font-bold"
                              style={{ background: 'rgba(30,144,255,0.12)', color: '#93C5FD' }}>
                          {s.className}
                        </span>
                      </td>
                      <td className="text-xs text-white/50">
                        {new Date(s.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="text-white/50">P{s.period}</td>
                      <td className="text-white/35 text-xs max-w-[120px] truncate">{s.topic ?? '—'}</td>
                      <td>
                        {s.isLocked
                          ? <span className="text-xs font-bold text-red-400">🔒 Locked</span>
                          : <span className="text-xs font-bold text-green-400">✅ Open</span>}
                      </td>
                      <td>
                        {!s.isLocked && (
                          <button onClick={() => void openSession(s.id)}
                                  className="text-xs font-bold text-yellow-400 hover:text-yellow-300">
                            Edit →
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
