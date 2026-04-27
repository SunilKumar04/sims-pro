'use client';
// src/app/teacher/attendance/page.tsx
import React, { useCallback, useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { attendanceApi, classesApi } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { toast } from '@/components/ui/Toast';

type Status = 'PRESENT' | 'ABSENT' | 'LATE';

const ST: Record<Status, { bg: string; border: string; text: string; icon: string; label: string }> = {
  PRESENT: { bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.45)',  text: '#86EFAC', icon: '✅', label: 'Present' },
  ABSENT:  { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.45)',  text: '#FCA5A5', icon: '❌', label: 'Absent'  },
  LATE:    { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.45)', text: '#FCD34D', icon: '⏰', label: 'Late'    },
};

const pctColor = (p: number) => p >= 75 ? '#86EFAC' : p >= 60 ? '#FCD34D' : '#FCA5A5';

export default function TeacherAttendance() {
  const user = getUser();
  const tid  = user?.teacherId ?? user?.id ?? '';

  const [classes,     setClasses]     = useState<any[]>([]);
  const [selClass,    setSelClass]    = useState('');
  const [date,        setDate]        = useState(new Date().toISOString().slice(0, 10));
  const [students,    setStudents]    = useState<any[]>([]);
  const [att,         setAtt]         = useState<Record<string, Status>>({});
  const [remarks,     setRemarks]     = useState<Record<string, string>>({});
  const [loading,     setLoading]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [summary,     setSummary]     = useState<any>(null);  // already-marked info
  const [search,      setSearch]      = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [classStats,  setClassStats]  = useState<any[]>([]);

  // ── Load classes ───────────────────────────────────────────────────────
  useEffect(() => {
    classesApi.getAll({})
      .then(r => setClasses(r.data.data ?? []))
      .catch(() => {});
  }, []);

  // ── Load students for selected class + date ─────────────────────────────
  const loadStudents = useCallback(async () => {
    if (!selClass || !date) return;
    setLoading(true); setSaved(false);
    try {
      const r   = await attendanceApi.getByClass(selClass, date);
      const raw = r.data.data ?? [];
      setSummary(r.data.summary ?? null);
      setStudents(raw);

      const ia: Record<string, Status> = {};
      const ir: Record<string, string> = {};
      raw.forEach((s: any) => {
        ia[s.studentId] = (s.status !== 'NOT_MARKED' ? s.status : 'PRESENT') as Status;
        ir[s.studentId] = s.remark ?? '';
      });
      setAtt(ia);
      setRemarks(ir);
    } catch {
      toast.error('Load Failed', 'Could not fetch class list');
    } finally {
      setLoading(false);
    }
  }, [selClass, date]);

  useEffect(() => { void loadStudents(); }, [loadStudents]);

  // ── Load 30-day class summary ──────────────────────────────────────────
  const loadSummary = async () => {
    if (!selClass) return;
    try {
      const r = await attendanceApi.getClassSummary(selClass);
      setClassStats(r.data.data ?? []);
      setShowSummary(true);
    } catch { toast.error('Error', 'Could not load summary'); }
  };

  // ── Mark all shortcut ──────────────────────────────────────────────────
  const markAll = (s: Status) => {
    const n: Record<string, Status> = {};
    students.forEach(st => { n[st.studentId] = s; });
    setAtt(n);
  };

  // ── Toggle individual status ───────────────────────────────────────────
  const toggle = (sid: string, s: Status) =>
    setAtt(p => ({ ...p, [sid]: s }));

  // ── Save ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selClass) { toast.warning('Select Class', ''); return; }
    setSaving(true);
    try {
      const records = students.map(s => ({
        studentId: s.studentId,
        status:    att[s.studentId] ?? 'PRESENT',
        remark:    remarks[s.studentId] ?? '',
      }));
      await attendanceApi.markBulk({ className: selClass, date, teacherId: tid, records });
      toast.success('Attendance Saved', `${records.length} students marked for ${date}`);
      setSaved(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to save attendance';
      toast.error('Error', msg);
    } finally { setSaving(false); }
  };

  // ── Filtered students ──────────────────────────────────────────────────
  const filtered = search
    ? students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.roll.toLowerCase().includes(search.toLowerCase()))
    : students;

  const present = Object.values(att).filter(s => s === 'PRESENT').length;
  const absent  = Object.values(att).filter(s => s === 'ABSENT').length;
  const late    = Object.values(att).filter(s => s === 'LATE').length;
  const total   = students.length;
  const pct     = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

  const todayStr = new Date().toISOString().slice(0, 10);
  const isToday  = date === todayStr;

  return (
    <AppShell title="Daily Attendance" subtitle="Mark class-wide daily attendance">

      {/* Controls row */}
      <div className="glass rounded-2xl p-4 mb-5 flex items-end gap-4 flex-wrap">
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-white/40">Class *</label>
          <select value={selClass} onChange={e => { setSelClass(e.target.value); setShowSummary(false); }} className="sims-input">
            <option value="">Select class</option>
            {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-white/40">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
                 max={todayStr} className="sims-input"/>
        </div>
        {selClass && !showSummary && (
          <button onClick={() => void loadSummary()}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold glass hover:bg-white/10 transition-all">
            📊 30-day Summary
          </button>
        )}
        {showSummary && (
          <button onClick={() => setShowSummary(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold glass hover:bg-white/10 transition-all">
            ← Back to Marking
          </button>
        )}
      </div>

      {/* 30-day summary panel */}
      {showSummary && (
        <div className="glass rounded-2xl overflow-hidden mb-5">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <h3 className="text-sm font-bold text-white">📊 Class {selClass} — 30-day Attendance Summary</h3>
          </div>
          {classStats.length === 0
            ? <div className="text-center py-10 text-white/40">No attendance data yet</div>
            : <div className="overflow-x-auto">
                <table className="sims-table">
                  <thead><tr><th>Roll</th><th>Name</th><th>Present</th><th>Absent</th><th>Total</th><th>%</th><th>Status</th></tr></thead>
                  <tbody>
                    {classStats.map((s: any) => {
                      const pc  = s.percentage ?? 0;
                      const col = pctColor(pc);
                      return (
                        <tr key={s.studentId}>
                          <td className="font-mono text-xs text-white/50">{s.roll}</td>
                          <td className="font-bold text-white">{s.name}</td>
                          <td className="text-green-400 font-semibold">{s.present}</td>
                          <td className="text-red-400 font-semibold">{s.absent}</td>
                          <td className="text-white/50">{s.total}</td>
                          <td><span className="text-base font-black" style={{ color: col }}>{pc}%</span></td>
                          <td>
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold"
                                  style={{ background: `${col}18`, color: col, border: `1px solid ${col}30` }}>
                              {pc >= 75 ? '✅ OK' : pc >= 60 ? '⚠️ Low' : '❌ Critical'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>}
        </div>
      )}

      {/* Marking view */}
      {!showSummary && (
        <>
          {/* Already marked notice */}
          {summary?.alreadyMarked && (
            <div className="rounded-2xl p-4 mb-4 flex items-center gap-3"
                 style={{ background: 'rgba(30,144,255,0.08)', border: '1px solid rgba(30,144,255,0.2)' }}>
              <span className="text-xl">ℹ️</span>
              <div>
                <div className="text-sm font-bold text-blue-300">Attendance already marked for this date</div>
                <p className="text-xs text-white/40 mt-0.5">You can edit and re-save to update.</p>
              </div>
            </div>
          )}

          {/* Stats + quick actions */}
          {students.length > 0 && !loading && (
            <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-center">
              {/* Stat chips */}
              <div className="sims-mobile-scroll xl:grid xl:grid-cols-4 xl:gap-2 xl:overflow-visible">
                {[['Present', present, '#86EFAC', 'rgba(34,197,94,0.12)', 'rgba(34,197,94,0.2)'],
                  ['Absent',  absent,  '#FCA5A5', 'rgba(239,68,68,0.12)', 'rgba(239,68,68,0.2)'],
                  ['Late',    late,    '#FCD34D', 'rgba(245,158,11,0.12)','rgba(245,158,11,0.2)']].map(([l, v, col, bg, bd]) => (
                  <div key={l as string} className="min-w-[7rem] px-4 py-2 rounded-xl text-center xl:min-w-0"
                       style={{ background: bg as string, border: `1px solid ${bd}` }}>
                    <div className="text-xl font-black" style={{ color: col as string }}>{v as number}</div>
                    <div className="text-[10px] text-white/40">{l}</div>
                  </div>
                ))}
                <div className="min-w-[7rem] px-4 py-2 rounded-xl text-center glass xl:min-w-0">
                  <div className="text-xl font-black" style={{ color: pctColor(pct) }}>{pct}%</div>
                  <div className="text-[10px] text-white/40">Present</div>
                </div>
              </div>

              {/* Mark all shortcuts */}
              <div className="flex flex-wrap items-center gap-2 xl:ml-auto">
                <span className="text-xs text-white/30 font-bold">Mark all:</span>
                {(['PRESENT', 'ABSENT', 'LATE'] as Status[]).map(s => (
                  <button key={s} onClick={() => markAll(s)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold hover:-translate-y-0.5 transition-all"
                          style={{ background: ST[s].bg, border: `1px solid ${ST[s].border}`, color: ST[s].text }}>
                    {ST[s].icon} {ST[s].label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search */}
          {students.length > 0 && (
            <div className="mb-4">
              <input value={search} onChange={e => setSearch(e.target.value)}
                     className="sims-input text-sm" placeholder="🔍 Search student by name or roll…"/>
            </div>
          )}

          {/* Table */}
          {!selClass ? (
            <div className="glass rounded-2xl py-20 text-center">
              <div className="text-5xl mb-4 opacity-30">🏫</div>
              <p className="text-base font-bold text-white">Select a class to mark attendance</p>
            </div>
          ) : loading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-14 rounded-2xl"/>)}</div>
          ) : students.length === 0 ? (
            <div className="glass rounded-2xl py-16 text-center">
              <div className="text-4xl mb-3 opacity-30">👤</div>
              <p className="text-white/50">No students in Class {selClass}</p>
            </div>
          ) : (
            <>
              <div className="glass rounded-2xl overflow-hidden mb-4">
                <div className="px-5 py-3 flex items-center justify-between"
                     style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <span className="text-xs font-bold text-white/40 uppercase tracking-wider">
                    Class {selClass} · {filtered.length} student{filtered.length !== 1 ? 's' : ''} · {isToday ? 'Today' : date}
                  </span>
                  {!isToday && (
                    <span className="text-xs text-yellow-400">Editing past date</span>
                  )}
                </div>

                {/* Card grid for mobile-friendly layout */}
                <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  {filtered.map((s, i) => {
                    const st  = att[s.studentId] ?? 'PRESENT';
                    const cfg = ST[st];
                    return (
                      <div key={s.studentId}
                           className="px-4 py-4 transition-all sm:px-5 sm:py-3"
                           style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                                 style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}>
                              {i + 1}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-white">{s.name}</div>
                              <div className="text-xs text-white/35 font-mono">Roll: {s.roll}</div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5 lg:ml-auto lg:flex-nowrap">
                            {(['PRESENT', 'ABSENT', 'LATE'] as Status[]).map(status => (
                              <button key={status} onClick={() => toggle(s.studentId, status)}
                                      className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:-translate-y-0.5"
                                      style={{
                                        background: st === status ? ST[status].bg : 'rgba(255,255,255,0.04)',
                                        border: `1px solid ${st === status ? ST[status].border : 'rgba(255,255,255,0.07)'}`,
                                        color: st === status ? ST[status].text : 'rgba(255,255,255,0.3)',
                                      }}>
                                {ST[status].icon}
                                <span className="ml-1">{ST[status].label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <input
                            value={remarks[s.studentId] ?? ''}
                            onChange={e => setRemarks(p => ({ ...p, [s.studentId]: e.target.value }))}
                            className="sims-input text-xs flex-1"
                            style={{ padding: '7px 10px' }}
                            placeholder="Remark…"
                          />

                          <span className="w-full text-center px-2 py-2 rounded-full text-xs font-bold sm:w-20"
                                style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}>
                            {cfg.icon} <span className="ml-1 sm:hidden">{cfg.label}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Save button */}
              <button onClick={() => void handleSave()} disabled={saving}
                      className="w-full py-3.5 rounded-xl text-sm font-black disabled:opacity-60 hover:-translate-y-0.5 transition-all"
                      style={{
                        background: saved
                          ? 'rgba(34,197,94,0.2)'
                          : 'linear-gradient(135deg,#D4A017,#F0C040)',
                        color: saved ? '#86EFAC' : '#0A1628',
                        border: saved ? '1px solid rgba(34,197,94,0.3)' : 'none',
                      }}>
                {saving ? '⏳ Saving…' : saved ? '✅ Saved — Save Again' : `💾 Save Attendance (${students.length} students)`}
              </button>
            </>
          )}
        </>
      )}
    </AppShell>
  );
}
