'use client';
// src/app/admin/timetable/page.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { timetableApi, teachersApi, classesApi } from '@/lib/api';
import { toast } from '@/components/ui/Toast';
import { confirm } from '@/components/ui/Confirm';
import type { TimetableSlot, ClassSubjectTeacher } from '@/types/sims';

// ── Constants ──────────────────────────────────────────────────────────────
const DAYS  = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'] as const;
const PTIMES: [string,string][] = [
  ['08:00','08:45'],['08:45','09:30'],['09:30','10:15'],['10:30','11:15'],
  ['11:15','12:00'],['12:00','12:45'],['13:30','14:15'],['14:15','15:00'],
];
const SUBJECTS = [
  'Mathematics','Physics','Chemistry','Biology','English','Hindi',
  'History','Geography','Computer Science','Physical Education','Economics','Accountancy',
] as const;
const SUB_COLORS: Record<string,string> = {
  Mathematics:'#a5b4fc', Physics:'#93c5fd', Chemistry:'#86efac', Biology:'#6ee7b7',
  English:'#fcd34d', Hindi:'#fca5a5', History:'#d8b4fe', 'Computer Science':'#c7d2fe',
  Geography:'#99f6e4', 'Physical Education':'#fdba74', Economics:'#fbcfe8', Accountancy:'#fef08a',
};
const sc = (s: string) => SUB_COLORS[s] ?? '#aaaaaa';

type ViewTab = 'grid' | 'mapping';
interface DragPayload { subject:string; teacherId:string; startTime:string; endTime:string; room:string; slotId?:string }

// ── Component ──────────────────────────────────────────────────────────────
export default function AdminTimetable() {
  const [tab,       setTab]       = useState<ViewTab>('grid');
  const [classes,   setClasses]   = useState<{id:string;name:string}[]>([]);
  const [teachers,  setTeachers]  = useState<{id:string;user?:{name:string}}[]>([]);
  const [mappings,  setMappings]  = useState<ClassSubjectTeacher[]>([]);
  const [slots,     setSlots]     = useState<Record<number,TimetableSlot[]>>({});
  const [selClass,  setSelClass]  = useState('');
  const [loading,   setLoading]   = useState(false);
  const [saving,    setSaving]    = useState(false);

  // ── Paint mode ─────────────────────────────────────────────────────────
  const [paintMode,  setPaintMode]  = useState(false);
  const [paintSlot,  setPaintSlot]  = useState<{subject:string;teacherId:string;room:string}|null>(null);

  // ── Drag state ─────────────────────────────────────────────────────────
  const dragData = useRef<DragPayload|null>(null);
  const [dragOver, setDragOver] = useState<string|null>(null);   // "day-period"

  // ── Modals ─────────────────────────────────────────────────────────────
  const [slotModal,  setSlotModal]  = useState<{day:number;period:number;existing?:TimetableSlot}|null>(null);
  const [mapModal,   setMapModal]   = useState(false);
  const [slotForm,   setSlotForm]   = useState<Record<string,string>>({});
  const [mapForm,    setMapForm]    = useState<Record<string,string|number>>({});

  // ── Copy-day modal ─────────────────────────────────────────────────────
  const [copyModal,  setCopyModal]  = useState(false);
  const [copyFrom,   setCopyFrom]   = useState(1);
  const [copyTo,     setCopyTo]     = useState(2);

  // ── Load ───────────────────────────────────────────────────────────────
  const loadBase = useCallback(async () => {
    const [cr,tr] = await Promise.all([classesApi.getAll({}), teachersApi.getAll({})]);
    setClasses(cr.data.data ?? []);
    setTeachers(tr.data.data ?? []);
  }, []);

  const loadMappings = useCallback(async () => {
    const r = await timetableApi.getMappings(selClass || undefined);
    setMappings(r.data.data ?? []);
  }, [selClass]);

  const loadSlots = useCallback(async () => {
    if (!selClass) return;
    setLoading(true);
    try {
      const r = await timetableApi.getClassTimetable(selClass);
      setSlots((r.data.data?.grouped as Record<number,TimetableSlot[]>) ?? {});
    } finally { setLoading(false); }
  }, [selClass]);

  useEffect(() => { void loadBase(); }, [loadBase]);
  useEffect(() => {
    void loadMappings();
    if (selClass) void loadSlots();
  }, [selClass, loadMappings, loadSlots]);

  const getSlot = (day:number, period:number) =>
    (slots[day] ?? []).find(s => s.period === period);

  const tName = (id:string) => {
    const t = teachers.find(t => t.id === id);
    return t?.user?.name ?? '—';
  };

  // ── Count periods used per subject for current class ──────────────────
  const periodCount: Record<string,number> = {};
  Object.values(slots).flat().forEach(s => {
    periodCount[s.subject] = (periodCount[s.subject] ?? 0) + 1;
  });

  // ── Upsert a slot ──────────────────────────────────────────────────────
  const upsert = async (day:number, period:number, data:Partial<DragPayload>) => {
    if (!data.subject || !data.teacherId || !selClass) return;
    await timetableApi.upsertSlot({
      className:  selClass,
      dayOfWeek:  day,
      period,
      subject:    data.subject,
      teacherId:  data.teacherId,
      startTime:  data.startTime ?? PTIMES[period-1]?.[0] ?? '08:00',
      endTime:    data.endTime   ?? PTIMES[period-1]?.[1] ?? '08:45',
      room:       data.room ?? '',
    });
  };

  // ── Drag handlers ──────────────────────────────────────────────────────
  const onDragStart = (e: React.DragEvent, slot: TimetableSlot) => {
    dragData.current = {
      subject:   slot.subject,
      teacherId: slot.teacherId,
      startTime: slot.startTime,
      endTime:   slot.endTime,
      room:      slot.room ?? '',
      slotId:    slot.id,
    };
    e.dataTransfer.effectAllowed = 'copy';
  };

  const onDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOver(key);
  };

  const onDrop = async (e: React.DragEvent, day: number, period: number) => {
    e.preventDefault();
    setDragOver(null);
    const data = dragData.current;
    if (!data || !selClass) return;
    const target = getSlot(day, period);
    // Don't drop onto the exact same cell
    if (data.slotId && target?.id === data.slotId) return;
    setSaving(true);
    try {
      await upsert(day, period, data);
      toast.success('Copied!', `${data.subject} → ${DAYS[day-1]} P${period}`);
      void loadSlots();
    } catch { toast.error('Error','Could not copy slot'); }
    finally { setSaving(false); dragData.current = null; }
  };

  // ── Paint click ────────────────────────────────────────────────────────
  const handleCellClick = async (day:number, period:number, existing?:TimetableSlot) => {
    if (paintMode && paintSlot) {
      setSaving(true);
      try {
        await upsert(day, period, { ...paintSlot, startTime:PTIMES[period-1]?.[0], endTime:PTIMES[period-1]?.[1] });
        void loadSlots();
      } catch { toast.error('Error','Could not paint slot'); }
      finally { setSaving(false); }
      return;
    }
    setSlotForm(existing
      ? { subject:existing.subject, teacherId:existing.teacherId, startTime:existing.startTime, endTime:existing.endTime, room:existing.room??'' }
      : { startTime:PTIMES[period-1]?.[0]??'', endTime:PTIMES[period-1]?.[1]??'' }
    );
    setSlotModal({ day, period, existing });
  };

  // ── Save slot modal ────────────────────────────────────────────────────
  const saveSlot = async () => {
    if (!slotForm.subject || !slotForm.teacherId || !slotModal) { toast.warning('Required','Subject and teacher required'); return; }
    setSaving(true);
    try {
      await upsert(slotModal.day, slotModal.period, slotForm as any);
      toast.success('Saved','');
      setSlotModal(null);
      void loadSlots();
    } catch { toast.error('Error','Could not save'); }
    finally { setSaving(false); }
  };

  // ── Delete slot ────────────────────────────────────────────────────────
  const deleteSlot = async (id:string, e?:React.MouseEvent) => {
    e?.stopPropagation();
    if (!(await confirm({ title:'Clear Slot', message:'Remove this slot?', danger:true, confirm:'Clear' }))) return;
    await timetableApi.deleteSlot(id);
    void loadSlots();
  };

  // ── Copy entire day ────────────────────────────────────────────────────
  const copyDay = async () => {
    const srcSlots = slots[copyFrom] ?? [];
    if (srcSlots.length === 0) { toast.warning('Empty','Source day has no slots'); return; }
    setSaving(true);
    try {
      await Promise.all(srcSlots.map(s => upsert(copyTo, s.period, {
        subject:   s.subject,
        teacherId: s.teacherId,
        startTime: s.startTime,
        endTime:   s.endTime,
        room:      s.room ?? '',
      })));
      toast.success('Day Copied', `${DAYS[copyFrom-1]} → ${DAYS[copyTo-1]}`);
      setCopyModal(false);
      void loadSlots();
    } catch { toast.error('Error','Could not copy day'); }
    finally { setSaving(false); }
  };

  // ── Clear entire day ───────────────────────────────────────────────────
  const clearDay = async (day:number) => {
    const daySlots = slots[day] ?? [];
    if (daySlots.length === 0) return;
    if (!(await confirm({ title:`Clear ${DAYS[day-1]}`, message:`Remove all ${daySlots.length} slots for ${DAYS[day-1]}?`, danger:true, confirm:'Clear All' }))) return;
    setSaving(true);
    try {
      await Promise.all(daySlots.map(s => timetableApi.deleteSlot(s.id)));
      toast.success('Cleared', DAYS[day-1]);
      void loadSlots();
    } catch { toast.error('Error',''); }
    finally { setSaving(false); }
  };

  // ── Save mapping ────────────────────────────────────────────────────────
  const saveMapping = async () => {
    if (!mapForm.subject || !mapForm.teacherId || !mapForm.className) { toast.warning('Required','All fields required'); return; }
    setSaving(true);
    try {
      await timetableApi.createMapping(mapForm);
      toast.success('Mapping Saved','');
      setMapModal(false); setMapForm({});
      void loadMappings();
    } catch { toast.error('Error',''); }
    finally { setSaving(false); }
  };

  // ── Delete mapping ─────────────────────────────────────────────────────
  const delMapping = async (m: ClassSubjectTeacher) => {
    if (!(await confirm({ title:'Remove', message:`Remove ${m.subject}?`, danger:true, confirm:'Remove' }))) return;
    await timetableApi.deleteMapping(m.id);
    void loadMappings();
  };

  // ── Auto-fill from mappings ────────────────────────────────────────────
  // Distributes each mapped subject evenly across the week
  const autoFill = async () => {
    const clsMappings = mappings.filter(m => m.className === selClass);
    if (clsMappings.length === 0) { toast.warning('No Mappings','Add subject-teacher mappings first'); return; }
    if (!(await confirm({ title:'Auto Fill', message:'This will overwrite the existing timetable. Continue?', confirm:'Auto Fill' }))) return;
    setSaving(true);
    try {
      // Clear existing
      const all = Object.values(slots).flat();
      await Promise.all(all.map(s => timetableApi.deleteSlot(s.id)));

      // Fill: each mapping gets `periodsPerWeek` slots spread across days
      let dayIdx = 0;
      let perIdx = 0;
      const TOTAL_PERIODS = DAYS.length * PTIMES.length;
      const schedule: Array<{day:number;period:number;subject:string;teacherId:string}> = [];

      for (const m of clsMappings) {
        const count = Math.min(m.periodsPerWeek ?? 5, TOTAL_PERIODS);
        for (let i = 0; i < count; i++) {
          // Skip if slot already occupied
          while (schedule.find(s => s.day === dayIdx+1 && s.period === perIdx+1)) {
            perIdx++;
            if (perIdx >= PTIMES.length) { perIdx = 0; dayIdx = (dayIdx + 1) % DAYS.length; }
          }
          schedule.push({ day:dayIdx+1, period:perIdx+1, subject:m.subject, teacherId:m.teacherId });
          perIdx++;
          if (perIdx >= PTIMES.length) { perIdx = 0; dayIdx = (dayIdx + 1) % DAYS.length; }
        }
      }

      await Promise.all(schedule.map(s =>
        upsert(s.day, s.period, { subject:s.subject, teacherId:s.teacherId, startTime:PTIMES[s.period-1]?.[0], endTime:PTIMES[s.period-1]?.[1] })
      ));
      toast.success('Auto Filled!', `${schedule.length} slots created`);
      void loadSlots();
    } catch { toast.error('Error','Auto fill failed'); }
    finally { setSaving(false); }
  };

  // ── Total filled slots ─────────────────────────────────────────────────
  const totalFilled = Object.values(slots).flat().length;
  const totalCells  = DAYS.length * PTIMES.length;

  return (
    <AppShell title="Timetable Manager" subtitle="Drag slots to copy • Paint mode for fast fill • Click to edit">

      {/* ── TOOLBAR ── */}
      <div className="glass rounded-2xl p-3 mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Class picker */}
          <select value={selClass} onChange={e => { setSelClass(e.target.value); setPaintMode(false); }}
                  className="sims-input text-sm font-bold" style={{width:140}}>
            <option value="">Select Class</option>
            {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>

          {/* Tab */}
          <div className="flex rounded-xl overflow-hidden" style={{border:'1px solid rgba(255,255,255,0.1)'}}>
            {(['grid','mapping'] as ViewTab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                      className="px-4 py-2 text-xs font-bold transition-all"
                      style={{background:tab===t?'rgba(212,160,23,0.2)':'transparent',color:tab===t?'#F0C040':'rgba(255,255,255,0.4)'}}>
                {t === 'grid' ? '🗓️ Grid' : '📋 Mappings'}
              </button>
            ))}
          </div>

          {/* Grid-only tools */}
          {tab === 'grid' && selClass && (
            <>
              <button onClick={() => setCopyModal(true)}
                      className="px-3 py-2 rounded-xl text-xs font-bold glass hover:bg-white/10 transition-all flex items-center gap-1.5">
                📋 Copy Day
              </button>
              <button onClick={() => void autoFill()}
                      className="px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                      style={{background:'rgba(168,85,247,0.15)',color:'#D8B4FE',border:'1px solid rgba(168,85,247,0.3)'}}>
                ⚡ Auto Fill
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {/* Paint mode toggle */}
          {tab === 'grid' && selClass && (
            <button onClick={() => { setPaintMode(v => !v); if (paintMode) setPaintSlot(null); }}
                    className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                    style={paintMode
                      ? {background:'rgba(34,197,94,0.2)',color:'#86EFAC',border:'1px solid rgba(34,197,94,0.4)'}
                      : {background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.5)',border:'1px solid rgba(255,255,255,0.1)'}}>
              🎨 Paint {paintMode ? 'ON' : 'OFF'}
            </button>
          )}
          {tab === 'mapping' && (
            <button onClick={() => { setMapForm(selClass ? {className:selClass} : {}); setMapModal(true); }}
                    className="px-5 py-2.5 rounded-xl text-sm font-black hover:-translate-y-0.5 transition-all"
                    style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
              + Add Mapping
            </button>
          )}
        </div>
      </div>

      {/* ── GRID TAB ── */}
      {tab === 'grid' && (
        !selClass
          ? <div className="glass rounded-2xl py-24 text-center">
              <div className="text-5xl mb-4 opacity-30">🗓️</div>
              <p className="text-base font-bold text-white mb-1">Select a class to manage its timetable</p>
              <p className="text-sm text-white/40">Use the dropdown above to pick a class</p>
            </div>
          : <div className="flex gap-4">

              {/* Paint panel */}
              {paintMode && (
                <div className="flex-shrink-0 w-52 glass rounded-2xl p-4" style={{border:'1px solid rgba(34,197,94,0.3)'}}>
                  <div className="text-xs font-bold text-green-400 mb-3 flex items-center gap-2">
                    🎨 Paint Mode
                  </div>
                  <p className="text-[10px] text-white/40 mb-4 leading-relaxed">
                    Select a subject + teacher below, then click any cell to instantly fill it.
                  </p>
                  <div className="space-y-2 mb-4">
                    <select value={paintSlot?.subject ?? ''} onChange={e => setPaintSlot(p => ({...p!,subject:e.target.value}))}
                            className="sims-input text-xs w-full">
                      <option value="">Pick subject</option>
                      {mappings.filter(m => m.className === selClass).map(m => (
                        <option key={m.subject} value={m.subject}>{m.subject}</option>
                      ))}
                      {SUBJECTS.filter(s => !mappings.find(m => m.className===selClass && m.subject===s)).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <select value={paintSlot?.teacherId ?? ''} onChange={e => setPaintSlot(p => ({...p!,teacherId:e.target.value}))}
                            className="sims-input text-xs w-full">
                      <option value="">Pick teacher</option>
                      {teachers.map(t => <option key={t.id} value={t.id}>{t.user?.name}</option>)}
                    </select>
                    <input value={paintSlot?.room ?? ''} onChange={e => setPaintSlot(p => ({...p!,room:e.target.value}))}
                           className="sims-input text-xs w-full" placeholder="Room (optional)"/>
                  </div>

                  {/* Subject legend */}
                  <div className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2">Subject Count</div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {mappings.filter(m => m.className === selClass).map(m => {
                      const used   = periodCount[m.subject] ?? 0;
                      const target = m.periodsPerWeek ?? 5;
                      const pct    = Math.min(100, Math.round((used/target)*100));
                      return (
                        <div key={m.subject} className="cursor-pointer rounded-lg p-1.5 transition-all hover:bg-white/5"
                             style={{background:paintSlot?.subject===m.subject?`${sc(m.subject)}15`:'transparent'}}
                             onClick={() => setPaintSlot({subject:m.subject,teacherId:m.teacherId,room:''})}>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[10px] font-bold truncate" style={{color:sc(m.subject)}}>{m.subject}</span>
                            <span className="text-[9px] text-white/40 flex-shrink-0 ml-1">{used}/{target}</span>
                          </div>
                          <div className="h-1 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.08)'}}>
                            <div style={{width:`${pct}%`,height:'100%',background:used>=target?'#86EFAC':sc(m.subject),borderRadius:99}}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button onClick={() => { setPaintMode(false); setPaintSlot(null); }}
                          className="w-full mt-4 py-2 rounded-xl text-xs font-bold glass hover:bg-white/10">
                    ✕ Exit Paint
                  </button>
                </div>
              )}

              {/* Grid */}
              <div className="flex-1 glass rounded-2xl overflow-hidden min-w-0">
                {/* Header info */}
                <div className="px-5 py-3 flex items-center justify-between" style={{borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
                  <div>
                    <span className="text-sm font-bold text-white">Class {selClass}</span>
                    <span className="text-xs text-white/40 ml-3">{totalFilled}/{totalCells} slots filled</span>
                    {saving && <span className="text-xs text-yellow-400 ml-3">⏳ Saving…</span>}
                  </div>
                  <div className="text-xs text-white/35">
                    {paintMode
                      ? <span className="text-green-400">🎨 Click any cell to paint</span>
                      : '↕ Drag a slot to copy it to another cell'}
                  </div>
                </div>

                {loading
                  ? <div className="p-5 space-y-2">{[...Array(5)].map((_,i) => <div key={i} className="skeleton h-12 rounded-xl"/>)}</div>
                  : <div className="overflow-x-auto">
                      <table className="w-full" style={{borderCollapse:'collapse',minWidth:860}}>
                        <thead>
                          <tr>
                            <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-white/30"
                                style={{background:'rgba(255,255,255,0.03)',width:90}}>Period</th>
                            {DAYS.map((d,di) => (
                              <th key={d} className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-white/40 group"
                                  style={{background:'rgba(255,255,255,0.03)'}}>
                                <div className="flex items-center justify-center gap-1.5">
                                  <span>{d.slice(0,3)}</span>
                                  <button onClick={() => void clearDay(di+1)}
                                          className="opacity-0 group-hover:opacity-100 w-4 h-4 rounded flex items-center justify-center text-[9px] transition-opacity"
                                          style={{background:'rgba(239,68,68,0.25)',color:'#FCA5A5'}}
                                          title={`Clear ${d}`}>✕</button>
                                </div>
                                <div className="text-[9px] text-white/25 mt-0.5 font-normal">
                                  {(slots[di+1] ?? []).length} slots
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {PTIMES.map(([st,et], pi) => {
                            const period = pi + 1;
                            return (
                              <tr key={period} style={{borderTop:'1px solid rgba(255,255,255,0.04)'}}>
                                {/* Period label */}
                                <td className="px-3 py-1.5 flex-shrink-0" style={{background:'rgba(255,255,255,0.015)'}}>
                                  <div className="text-xs font-bold text-white/60">P{period}</div>
                                  <div className="text-[9px] text-white/25">{st}–{et}</div>
                                </td>

                                {DAYS.map((_d, di) => {
                                  const day  = di + 1;
                                  const slot = getSlot(day, period);
                                  const key  = `${day}-${period}`;
                                  const isOver = dragOver === key;

                                  return (
                                    <td key={day} className="p-1" style={{minWidth:120}}
                                        onDragOver={e => onDragOver(e, key)}
                                        onDragLeave={() => setDragOver(null)}
                                        onDrop={e => void onDrop(e, day, period)}>

                                      {slot ? (
                                        /* Filled cell — draggable */
                                        <div
                                          draggable
                                          onDragStart={e => onDragStart(e, slot)}
                                          onDragEnd={() => setDragOver(null)}
                                          onClick={() => void handleCellClick(day, period, slot)}
                                          className="rounded-xl p-2 text-xs select-none group relative transition-all"
                                          style={{
                                            background: isOver ? `${sc(slot.subject)}35` : `${sc(slot.subject)}14`,
                                            border:`1px solid ${sc(slot.subject)}${isOver?'60':'30'}`,
                                            cursor: paintMode ? 'crosshair' : 'grab',
                                            minHeight:56,
                                            opacity: saving ? 0.6 : 1,
                                          }}>
                                          <div className="font-bold truncate leading-tight" style={{color:sc(slot.subject)}}>{slot.subject}</div>
                                          <div className="text-white/50 text-[10px] truncate mt-0.5">{slot.teacher?.user?.name ?? '—'}</div>
                                          {slot.room && <div className="text-white/25 text-[9px]">{slot.room}</div>}

                                          {/* Drag handle icon */}
                                          {!paintMode && (
                                            <div className="absolute top-1 left-1 text-[8px] opacity-0 group-hover:opacity-40 select-none pointer-events-none">⠿</div>
                                          )}

                                          {/* Delete X */}
                                          <button
                                            className="absolute top-0.5 right-0.5 w-4 h-4 rounded opacity-0 group-hover:opacity-100 flex items-center justify-center text-[9px] z-10 transition-opacity"
                                            style={{background:'rgba(239,68,68,0.5)',color:'#FCA5A5'}}
                                            onClick={e => void deleteSlot(slot.id, e)}>✕</button>
                                        </div>
                                      ) : (
                                        /* Empty cell — drop target */
                                        <div
                                          onClick={() => void handleCellClick(day, period)}
                                          className="rounded-xl flex items-center justify-center transition-all"
                                          style={{
                                            minHeight:56,
                                            border: isOver
                                              ? '2px dashed #F0C040'
                                              : '1px dashed rgba(255,255,255,0.09)',
                                            background: isOver ? 'rgba(212,160,23,0.1)' : 'transparent',
                                            color: isOver ? '#F0C040' : paintMode && paintSlot ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.12)',
                                            fontSize:18,
                                            cursor: paintMode && paintSlot ? 'crosshair' : 'pointer',
                                          }}>
                                          {isOver ? '↓' : paintMode && paintSlot ? '🎨' : '+'}
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>}

                {/* Legend */}
                {!loading && totalFilled > 0 && (
                  <div className="px-5 py-3 flex items-center gap-3 flex-wrap" style={{borderTop:'1px solid rgba(255,255,255,0.06)'}}>
                    <span className="text-[10px] font-bold text-white/25 uppercase tracking-wider">Subjects:</span>
                    {Object.keys(periodCount).map(sub => (
                      <div key={sub} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{background:sc(sub)}}/>
                        <span className="text-[10px] text-white/45">{sub}</span>
                        <span className="text-[9px] text-white/25">×{periodCount[sub]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
      )}

      {/* ── MAPPINGS TAB ── */}
      {tab === 'mapping' && (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="sims-table">
            <thead><tr><th>Class</th><th>Subject</th><th>Teacher</th><th>Periods/Week</th><th>Scheduled</th><th></th></tr></thead>
            <tbody>
              {mappings.length === 0
                ? <tr><td colSpan={6} className="text-center py-12 text-white/30">No mappings yet — add one to start building the timetable</td></tr>
                : mappings.map(m => {
                    const used = periodCount[m.subject] ?? 0;
                    const target = m.periodsPerWeek ?? 5;
                    return (
                      <tr key={m.id}>
                        <td><span className="px-2.5 py-1 rounded-lg text-xs font-bold" style={{background:'rgba(212,160,23,0.12)',color:'#F0C040'}}>{m.className}</span></td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{background:sc(m.subject)}}/>
                            <span className="font-bold text-white">{m.subject}</span>
                          </div>
                        </td>
                        <td className="text-white/70">{m.teacher?.user?.name ?? '—'}</td>
                        <td className="text-white/50">{target}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.08)'}}>
                              <div style={{width:`${Math.min(100,Math.round((used/target)*100))}%`,height:'100%',background:used>=target?'#86EFAC':sc(m.subject),borderRadius:99}}/>
                            </div>
                            <span className="text-xs text-white/40">{used}/{target}</span>
                          </div>
                        </td>
                        <td>
                          <button onClick={() => void delMapping(m)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold"
                                  style={{background:'rgba(239,68,68,0.1)',color:'#FCA5A5',border:'1px solid rgba(239,68,68,0.2)'}}>
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── SLOT EDIT MODAL ── */}
      {slotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)'}}>
          <div className="w-full max-w-md rounded-3xl p-7 shadow-2xl" style={{background:'#0F2044',border:'1px solid rgba(255,255,255,0.1)'}}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-extrabold text-white">{slotModal.existing ? 'Edit Slot' : 'Set Slot'}</h2>
                <p className="text-xs mt-0.5 text-white/40">{DAYS[slotModal.day-1]} · Period {slotModal.period} · Class {selClass}</p>
              </div>
              <button onClick={() => setSlotModal(null)} className="w-8 h-8 rounded-xl glass flex items-center justify-center text-white/50 text-sm">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold mb-1.5 uppercase tracking-wider text-white/35">Subject *</label>
                <select value={slotForm.subject ?? ''} onChange={e => setSlotForm(p => ({...p,subject:e.target.value}))} className="sims-input">
                  <option value="">Select subject</option>
                  {mappings.filter(m => m.className === selClass).map(m => <option key={m.subject} value={m.subject}>{m.subject}</option>)}
                  {SUBJECTS.filter(s => !mappings.find(m => m.className===selClass && m.subject===s)).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold mb-1.5 uppercase tracking-wider text-white/35">Teacher *</label>
                <select value={slotForm.teacherId ?? ''} onChange={e => setSlotForm(p => ({...p,teacherId:e.target.value}))} className="sims-input">
                  <option value="">Select teacher</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.user?.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold mb-1.5 uppercase tracking-wider text-white/35">Start</label>
                  <input type="time" value={slotForm.startTime ?? ''} onChange={e => setSlotForm(p => ({...p,startTime:e.target.value}))} className="sims-input"/>
                </div>
                <div>
                  <label className="block text-[10px] font-bold mb-1.5 uppercase tracking-wider text-white/35">End</label>
                  <input type="time" value={slotForm.endTime ?? ''} onChange={e => setSlotForm(p => ({...p,endTime:e.target.value}))} className="sims-input"/>
                </div>
                <div>
                  <label className="block text-[10px] font-bold mb-1.5 uppercase tracking-wider text-white/35">Room</label>
                  <input value={slotForm.room ?? ''} onChange={e => setSlotForm(p => ({...p,room:e.target.value}))} className="sims-input" placeholder="R-101"/>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5 pt-5" style={{borderTop:'1px solid rgba(255,255,255,0.07)'}}>
              {slotModal.existing && (
                <button onClick={() => { void deleteSlot(slotModal.existing!.id); setSlotModal(null); }}
                        className="px-4 py-3 rounded-xl text-sm font-bold"
                        style={{background:'rgba(239,68,68,0.1)',color:'#FCA5A5',border:'1px solid rgba(239,68,68,0.2)'}}>
                  🗑️ Clear
                </button>
              )}
              <button onClick={() => setSlotModal(null)} className="flex-1 py-3 rounded-xl text-sm font-bold glass hover:bg-white/10">Cancel</button>
              <button onClick={() => void saveSlot()} disabled={saving}
                      className="flex-1 py-3 rounded-xl text-sm font-black disabled:opacity-60"
                      style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
                {saving ? '⏳…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── COPY DAY MODAL ── */}
      {copyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)'}}>
          <div className="w-full max-w-sm rounded-3xl p-7 shadow-2xl" style={{background:'#0F2044',border:'1px solid rgba(255,255,255,0.1)'}}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-extrabold text-white">📋 Copy Day</h2>
              <button onClick={() => setCopyModal(false)} className="w-8 h-8 rounded-xl glass flex items-center justify-center text-white/50 text-sm">✕</button>
            </div>
            <p className="text-xs text-white/40 mb-5 leading-relaxed">
              Copy all slots from one day to another. Existing slots in the destination will be overwritten.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className="block text-[10px] font-bold mb-1.5 uppercase tracking-wider text-white/35">Copy From</label>
                <select value={copyFrom} onChange={e => setCopyFrom(Number(e.target.value))} className="sims-input">
                  {DAYS.map((d,i) => <option key={d} value={i+1}>{d} ({(slots[i+1]??[]).length} slots)</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold mb-1.5 uppercase tracking-wider text-white/35">Copy To</label>
                <select value={copyTo} onChange={e => setCopyTo(Number(e.target.value))} className="sims-input">
                  {DAYS.map((d,i) => <option key={d} value={i+1} disabled={i+1===copyFrom}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setCopyModal(false)} className="flex-1 py-3 rounded-xl text-sm font-bold glass hover:bg-white/10">Cancel</button>
              <button onClick={() => void copyDay()} disabled={saving || copyFrom === copyTo}
                      className="flex-1 py-3 rounded-xl text-sm font-black disabled:opacity-60"
                      style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
                {saving ? '⏳…' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD MAPPING MODAL ── */}
      {mapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)'}}>
          <div className="w-full max-w-md rounded-3xl p-7 shadow-2xl" style={{background:'#0F2044',border:'1px solid rgba(255,255,255,0.1)'}}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-extrabold text-white">+ Add Mapping</h2>
              <button onClick={() => setMapModal(false)} className="w-8 h-8 rounded-xl glass flex items-center justify-center text-white/50 text-sm">✕</button>
            </div>
            <div className="space-y-3">
              {[
                ['Class','className','select-class'],
                ['Subject','subject','select-subject'],
                ['Teacher','teacherId','select-teacher'],
              ].map(([lbl,key]) => (
                <div key={key}>
                  <label className="block text-[10px] font-bold mb-1.5 uppercase tracking-wider text-white/35">{lbl} *</label>
                  <select value={(mapForm[key] as string) ?? ''}
                          onChange={e => setMapForm(p => ({...p,[key]:e.target.value}))}
                          className="sims-input">
                    <option value="">Select {lbl.toLowerCase()}</option>
                    {key==='className' && classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    {key==='subject'   && SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    {key==='teacherId' && teachers.map(t => <option key={t.id} value={t.id}>{t.user?.name}</option>)}
                  </select>
                </div>
              ))}
              <div>
                <label className="block text-[10px] font-bold mb-1.5 uppercase tracking-wider text-white/35">Periods / Week</label>
                <input type="number" min={1} max={10} value={(mapForm.periodsPerWeek as number) ?? 5}
                       onChange={e => setMapForm(p => ({...p,periodsPerWeek:parseInt(e.target.value)||5}))} className="sims-input"/>
              </div>
            </div>
            <div className="flex gap-3 mt-5 pt-5" style={{borderTop:'1px solid rgba(255,255,255,0.07)'}}>
              <button onClick={() => setMapModal(false)} className="flex-1 py-3 rounded-xl text-sm font-bold glass hover:bg-white/10">Cancel</button>
              <button onClick={() => void saveMapping()} disabled={saving}
                      className="flex-1 py-3 rounded-xl text-sm font-black disabled:opacity-60"
                      style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
                {saving ? '⏳…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}