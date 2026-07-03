'use client';
// src/app/admin/report-card/builder/[id]/page.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { reportCardApi } from '@/lib/api';
import { toast } from '@/components/ui/Toast';
import ReportCardPreview from '@/components/report-card/ReportCardPreview';

const TITLE_OPTIONS = ['REPORT CARD', 'PROGRESS REPORT', 'MARKSHEET', 'ACADEMIC REPORT', 'ANNUAL REPORT', 'TERM REPORT'];
const FONT_OPTIONS  = ['Arial, sans-serif', 'Georgia, serif', 'Times New Roman, serif', "'Trebuchet MS', sans-serif", 'Verdana, sans-serif'];
const ALIGN_OPTIONS = ['left', 'center', 'right'];
const PAPER_SIZES   = ['A4', 'LETTER', 'LEGAL'];
const ORIENTATIONS  = ['PORTRAIT', 'LANDSCAPE'];

const DEFAULT_STUDENT_FIELDS = [
  { key: 'name',       label: "Student Name",    enabled: true,  order: 1 },
  { key: 'roll',       label: 'Roll Number',     enabled: true,  order: 2 },
  { key: 'admissionNo', label: 'Admission No',   enabled: true,  order: 3 },
  { key: 'class',      label: 'Class',           enabled: true,  order: 4 },
  { key: 'section',    label: 'Section',         enabled: false, order: 5 },
  { key: 'dob',        label: 'Date of Birth',   enabled: true,  order: 6 },
  { key: 'gender',     label: 'Gender',          enabled: true,  order: 7 },
  { key: 'fatherName', label: "Father's Name",   enabled: true,  order: 8 },
  { key: 'motherName', label: "Mother's Name",   enabled: false, order: 9 },
  { key: 'photo',      label: 'Student Photo',   enabled: true,  order: 10 },
  { key: 'studentId',  label: 'Student ID',      enabled: false, order: 11 },
  { key: 'session',    label: 'Academic Session', enabled: true, order: 12 },
];

const DEFAULT_TABLE_COLS = [
  { key: 'subject',       label: 'Subject',        enabled: true,  order: 1, width: 'auto' },
  { key: 'maxMarks',      label: 'Max Marks',      enabled: true,  order: 2, width: '80px' },
  { key: 'marksObtained', label: 'Marks Obtained', enabled: true,  order: 3, width: '90px' },
  { key: 'passingMarks',  label: 'Passing Marks',  enabled: false, order: 4, width: '80px' },
  { key: 'grade',         label: 'Grade',          enabled: true,  order: 5, width: '60px' },
  { key: 'percentage',    label: 'Percentage',     enabled: true,  order: 6, width: '80px' },
  { key: 'remarks',       label: 'Remarks',        enabled: false, order: 7, width: '120px' },
];

const DEFAULT_SECTIONS = [
  { id: 'header',      label: 'Header',             enabled: true,  order: 1 },
  { id: 'studentInfo', label: 'Student Information', enabled: true,  order: 2 },
  { id: 'marksTable',  label: 'Marks Table',        enabled: true,  order: 3 },
  { id: 'summary',     label: 'Summary',            enabled: true,  order: 4 },
  { id: 'remarks',     label: 'Remarks',            enabled: true,  order: 5 },
  { id: 'attendance',  label: 'Attendance',         enabled: false, order: 6 },
  { id: 'signature',   label: 'Signatures',         enabled: true,  order: 7 },
  { id: 'footer',      label: 'Footer',             enabled: true,  order: 8 },
];

const DEFAULT_GRADING = [
  { from: 90, to: 100, grade: 'A+', point: 10 },
  { from: 80, to: 89,  grade: 'A',  point: 9  },
  { from: 70, to: 79,  grade: 'B+', point: 8  },
  { from: 60, to: 69,  grade: 'B',  point: 7  },
  { from: 50, to: 59,  grade: 'C',  point: 6  },
  { from: 40, to: 49,  grade: 'D',  point: 5  },
  { from: 0,  to: 39,  grade: 'F',  point: 0  },
];

type TabKey = 'branding' | 'header' | 'fields' | 'table' | 'result' | 'grading' | 'footer' | 'layout' | 'sections';


export default function TemplateBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const id     = params.id as string;

  const [tpl,      setTpl]      = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('branding');
  const [showPreview, setShowPreview] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await reportCardApi.getTemplate(id);
      const d = r.data.data;
      // Ensure arrays are parsed
      if (typeof d.studentFields === 'string') d.studentFields = JSON.parse(d.studentFields);
      if (typeof d.tableColumns  === 'string') d.tableColumns  = JSON.parse(d.tableColumns);
      if (typeof d.sectionLayout === 'string') d.sectionLayout = JSON.parse(d.sectionLayout);
      if (typeof d.gradingSystem === 'string') d.gradingSystem = JSON.parse(d.gradingSystem);
      // Fill defaults if missing
      if (!Array.isArray(d.studentFields) || !d.studentFields.length) d.studentFields = DEFAULT_STUDENT_FIELDS;
      if (!Array.isArray(d.tableColumns)  || !d.tableColumns.length)  d.tableColumns  = DEFAULT_TABLE_COLS;
      if (!Array.isArray(d.sectionLayout) || !d.sectionLayout.length) d.sectionLayout = DEFAULT_SECTIONS;
      if (!Array.isArray(d.gradingSystem) || !d.gradingSystem.length) d.gradingSystem = DEFAULT_GRADING;
      setTpl(d);
    } catch {
      toast.error('Error', 'Could not load template');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const upd = (key: string, value: any) => setTpl((p: any) => ({ ...p, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      await reportCardApi.updateTemplate(id, tpl);
      toast.success('Saved', 'Template saved successfully');
    } catch {
      toast.error('Error', 'Could not save template');
    } finally {
      setSaving(false);
    }
  };

  // ── Field array helpers ──────────────────────────────────────
  const toggleField = (arr: string, idx: number) => {
    const next = [...(tpl[arr] as any[])];
    next[idx] = { ...next[idx], enabled: !next[idx].enabled };
    upd(arr, next);
  };

  const moveField = (arr: string, idx: number, dir: -1 | 1) => {
    const next  = [...(tpl[arr] as any[])];
    const swap  = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    next.forEach((f, i) => { f.order = i + 1; });
    upd(arr, next);
  };

  const renameField = (arr: string, idx: number, label: string) => {
    const next = [...(tpl[arr] as any[])];
    next[idx] = { ...next[idx], label };
    upd(arr, next);
  };

  // ── Section reorder ──────────────────────────────────────────
  const moveSection = (idx: number, dir: -1 | 1) => {
    const next = [...(tpl.sectionLayout as any[])];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    next.forEach((s, i) => { s.order = i + 1; });
    upd('sectionLayout', next);
  };

  const toggleSection = (idx: number) => {
    const next = [...(tpl.sectionLayout as any[])];
    next[idx] = { ...next[idx], enabled: !next[idx].enabled };
    upd('sectionLayout', next);
  };

  // ── Grading system helpers ───────────────────────────────────
  const updateGradeRow = (idx: number, key: string, val: any) => {
    const next = [...(tpl.gradingSystem as any[])];
    next[idx] = { ...next[idx], [key]: typeof next[idx][key] === 'number' ? Number(val) : val };
    upd('gradingSystem', next);
  };

  const addGradeRow = () => {
    upd('gradingSystem', [...tpl.gradingSystem, { from: 0, to: 10, grade: 'NEW', point: 1 }]);
  };

  const removeGradeRow = (idx: number) => {
    upd('gradingSystem', (tpl.gradingSystem as any[]).filter((_: any, i: number) => i !== idx));
  };

  if (loading) return (
    <AppShell title="Template Builder" subtitle="Loading…">
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl"/>)}
      </div>
    </AppShell>
  );

  if (!tpl) return (
    <AppShell title="Template Builder" subtitle="Template not found">
      <div className="glass rounded-2xl py-24 text-center">
        <div className="text-5xl mb-4 opacity-30">❌</div>
        <p className="text-white/50">Template not found.</p>
      </div>
    </AppShell>
  );

  const TABS: { key: TabKey; icon: string; label: string }[] = [
    { key: 'branding', icon: '🎨', label: 'Branding'   },
    { key: 'header',   icon: '🖼️', label: 'Header'     },
    { key: 'fields',   icon: '👤', label: 'Student Fields' },
    { key: 'table',    icon: '📊', label: 'Marks Table' },
    { key: 'result',   icon: '📋', label: 'Result'      },
    { key: 'grading',  icon: '🎯', label: 'Grading'     },
    { key: 'layout',   icon: '📐', label: 'Layout'      },
    { key: 'sections', icon: '📦', label: 'Sections'    },
    { key: 'footer',   icon: '🖊️',  label: 'Footer'     },
  ];

  return (
    <AppShell title={`Builder: ${tpl.name}`} subtitle="Customize every aspect of your report card">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/admin/report-card')}
                  className="px-3 py-2 rounded-xl text-xs font-bold glass hover:bg-white/10">← Back</button>
          <span className="text-white/40 text-sm">|</span>
          <span className="text-sm font-bold text-white">{tpl.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowPreview(v => !v)}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
                  style={showPreview ? { background: 'rgba(34,197,94,0.15)', color: '#86EFAC', border: '1px solid rgba(34,197,94,0.3)' }
                                     : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
            👁️ Preview {showPreview ? 'ON' : 'OFF'}
          </button>
          <button onClick={save} disabled={saving}
                  className="px-6 py-2 rounded-xl text-sm font-black disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#D4A017,#F0C040)', color: '#0A1628' }}>
            {saving ? '⏳ Saving…' : '💾 Save Template'}
          </button>
        </div>
      </div>

      <div className={`flex gap-5 ${showPreview ? 'xl:grid xl:grid-cols-[380px_1fr]' : ''}`}>

        {/* ── Left panel ── */}
        <div className="flex-shrink-0 w-full xl:w-auto">
          {/* Tab nav */}
          <div className="glass rounded-2xl p-1.5 mb-4 flex flex-wrap gap-1">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                      className="px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                      style={{ background: activeTab === t.key ? 'rgba(212,160,23,0.2)' : 'transparent',
                               color: activeTab === t.key ? '#F0C040' : 'rgba(255,255,255,0.4)' }}>
                <span>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>

          <div className="glass rounded-2xl p-5 space-y-4">

            {/* BRANDING */}
            {activeTab === 'branding' && (
              <BrandingTab tpl={tpl} upd={upd}/>
            )}

            {/* HEADER */}
            {activeTab === 'header' && (
              <HeaderTab tpl={tpl} upd={upd}/>
            )}

            {/* STUDENT FIELDS */}
            {activeTab === 'fields' && (
              <FieldsTab fields={tpl.studentFields} onToggle={i => toggleField('studentFields', i)}
                onMove={(i, d) => moveField('studentFields', i, d)} onRename={(i, l) => renameField('studentFields', i, l)}/>
            )}

            {/* MARKS TABLE COLS */}
            {activeTab === 'table' && (
              <FieldsTab fields={tpl.tableColumns} onToggle={i => toggleField('tableColumns', i)}
                onMove={(i, d) => moveField('tableColumns', i, d)} onRename={(i, l) => renameField('tableColumns', i, l)}
                showWidth onWidthChange={(i, w) => {
                  const next = [...tpl.tableColumns];
                  next[i] = { ...next[i], width: w };
                  upd('tableColumns', next);
                }}/>
            )}

            {/* RESULT TOGGLES */}
            {activeTab === 'result' && (
              <ResultTab tpl={tpl} upd={upd}/>
            )}

            {/* GRADING */}
            {activeTab === 'grading' && (
              <GradingTab grades={tpl.gradingSystem} passingPct={tpl.passingPercentage ?? 40}
                onUpdate={updateGradeRow} onAdd={addGradeRow} onRemove={removeGradeRow}
                onPassingChange={v => upd('passingPercentage', Number(v))}/>
            )}

            {/* LAYOUT */}
            {activeTab === 'layout' && (
              <LayoutTab tpl={tpl} upd={upd}/>
            )}

            {/* SECTIONS */}
            {activeTab === 'sections' && (
              <SectionsTab sections={tpl.sectionLayout}
                onToggle={toggleSection} onMove={moveSection}/>
            )}

            {/* FOOTER */}
            {activeTab === 'footer' && (
              <FooterTab tpl={tpl} upd={upd}/>
            )}
          </div>
        </div>

        {/* ── Live Preview ── */}
        {showPreview && (
          <div className="flex-1 min-w-0">
            <div className="sticky top-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Live Preview</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.12)', color: '#86EFAC' }}>Auto-updates</span>
              </div>
              <div className="glass rounded-2xl overflow-hidden" style={{ maxHeight: '85vh', overflowY: 'auto' }}>
                <ReportCardPreview template={tpl}/>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ── Sub-tab components ─────────────────────────────────────────────────────

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold mb-1.5 uppercase tracking-wider text-white/40">{label}</label>
      {children}
    </div>
  );
}

function BrandingTab({ tpl, upd }: { tpl: any; upd: (k: string, v: any) => void }) {
  return (
    <>
      <FormRow label="School Name">
        <input value={tpl.schoolName ?? ''} onChange={e => upd('schoolName', e.target.value)} className="sims-input w-full" placeholder="Your School Name"/>
      </FormRow>
      <FormRow label="School Address">
        <input value={tpl.schoolAddress ?? ''} onChange={e => upd('schoolAddress', e.target.value)} className="sims-input w-full" placeholder="Full Address"/>
      </FormRow>
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Phone">
          <input value={tpl.schoolPhone ?? ''} onChange={e => upd('schoolPhone', e.target.value)} className="sims-input w-full" placeholder="+91 ..."/>
        </FormRow>
        <FormRow label="Email">
          <input value={tpl.schoolEmail ?? ''} onChange={e => upd('schoolEmail', e.target.value)} className="sims-input w-full" placeholder="info@..."/>
        </FormRow>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Website">
          <input value={tpl.schoolWebsite ?? ''} onChange={e => upd('schoolWebsite', e.target.value)} className="sims-input w-full" placeholder="www..."/>
        </FormRow>
        <FormRow label="Affiliation No">
          <input value={tpl.affiliationNo ?? ''} onChange={e => upd('affiliationNo', e.target.value)} className="sims-input w-full" placeholder="AFF-..."/>
        </FormRow>
      </div>
      <FormRow label="Academic Session">
        <input value={tpl.academicSession ?? ''} onChange={e => upd('academicSession', e.target.value)} className="sims-input w-full" placeholder="2025–2026"/>
      </FormRow>
      <FormRow label="School Motto">
        <input value={tpl.schoolMotto ?? ''} onChange={e => upd('schoolMotto', e.target.value)} className="sims-input w-full" placeholder="Excellence in Education"/>
      </FormRow>
      <FormRow label="School Logo URL">
        <input value={tpl.logoUrl ?? ''} onChange={e => upd('logoUrl', e.target.value)} className="sims-input w-full" placeholder="https://..."/>
        {tpl.logoUrl && <img src={tpl.logoUrl} alt="Logo" className="mt-2 h-12 object-contain rounded-lg" onError={e => ((e.target as HTMLImageElement).style.display = 'none')}/>}
      </FormRow>
    </>
  );
}

function HeaderTab({ tpl, upd }: { tpl: any; upd: (k: string, v: any) => void }) {
  return (
    <>
      <FormRow label="Report Title">
        <select value={tpl.reportTitle ?? 'REPORT CARD'} onChange={e => upd('reportTitle', e.target.value)} className="sims-input w-full">
          {TITLE_OPTIONS.map(t => <option key={t}>{t}</option>)}
        </select>
      </FormRow>
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Header Background">
          <div className="flex gap-2">
            <input type="color" value={tpl.headerBgColor ?? '#1a3a6b'} onChange={e => upd('headerBgColor', e.target.value)}
                   className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0" style={{ background: 'none' }}/>
            <input value={tpl.headerBgColor ?? '#1a3a6b'} onChange={e => upd('headerBgColor', e.target.value)} className="sims-input flex-1"/>
          </div>
        </FormRow>
        <FormRow label="Header Text Color">
          <div className="flex gap-2">
            <input type="color" value={tpl.headerTextColor ?? '#ffffff'} onChange={e => upd('headerTextColor', e.target.value)}
                   className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0" style={{ background: 'none' }}/>
            <input value={tpl.headerTextColor ?? '#ffffff'} onChange={e => upd('headerTextColor', e.target.value)} className="sims-input flex-1"/>
          </div>
        </FormRow>
      </div>
      <FormRow label="Font Family">
        <select value={tpl.fontFamily ?? 'Arial, sans-serif'} onChange={e => upd('fontFamily', e.target.value)} className="sims-input w-full">
          {FONT_OPTIONS.map(f => <option key={f} value={f}>{f.split(',')[0]}</option>)}
        </select>
      </FormRow>
      <FormRow label="Header Alignment">
        <div className="flex gap-2">
          {ALIGN_OPTIONS.map(a => (
            <button key={a} onClick={() => upd('headerAlignment', a)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all"
                    style={{ background: tpl.headerAlignment === a ? 'rgba(212,160,23,0.2)' : 'rgba(255,255,255,0.05)',
                             color: tpl.headerAlignment === a ? '#F0C040' : 'rgba(255,255,255,0.4)',
                             border: `1px solid ${tpl.headerAlignment === a ? 'rgba(212,160,23,0.3)' : 'transparent'}` }}>
              {a}
            </button>
          ))}
        </div>
      </FormRow>
    </>
  );
}

function FieldsTab({ fields, onToggle, onMove, onRename, showWidth, onWidthChange }: {
  fields: any[]; onToggle: (i: number) => void; onMove: (i: number, d: -1 | 1) => void;
  onRename: (i: number, l: string) => void; showWidth?: boolean; onWidthChange?: (i: number, w: string) => void;
}) {
  return (
    <div className="space-y-2">
      {fields.map((f, i) => (
        <div key={f.key} className="flex items-center gap-2 p-3 rounded-xl"
             style={{ background: f.enabled ? 'rgba(212,160,23,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${f.enabled ? 'rgba(212,160,23,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
          <input type="checkbox" checked={f.enabled} onChange={() => onToggle(i)} className="w-4 h-4 accent-yellow-400 flex-shrink-0"/>
          <input value={f.label} onChange={e => onRename(i, e.target.value)}
                 className="flex-1 text-xs font-bold bg-transparent border-none outline-none text-white/80 min-w-0"/>
          {showWidth && onWidthChange && (
            <input value={f.width ?? 'auto'} onChange={e => onWidthChange(i, e.target.value)}
                   className="w-16 text-xs bg-transparent border border-white/10 rounded px-1 py-0.5 text-white/50 outline-none"/>
          )}
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={() => onMove(i, -1)} disabled={i === 0}
                    className="w-6 h-6 rounded flex items-center justify-center text-xs glass disabled:opacity-30">↑</button>
            <button onClick={() => onMove(i, 1)} disabled={i === fields.length - 1}
                    className="w-6 h-6 rounded flex items-center justify-center text-xs glass disabled:opacity-30">↓</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ResultTab({ tpl, upd }: { tpl: any; upd: (k: string, v: any) => void }) {
  const toggles = [
    ['showTotal',          'Total Marks'],
    ['showPercentage',     'Percentage'],
    ['showGrade',          'Overall Grade'],
    ['showRank',           'Class Rank'],
    ['showResult',         'Result (Pass/Fail)'],
    ['showAttendance',     'Attendance'],
    ['showPromotion',      'Promotion Status'],
    ['showTeacherRemarks', "Teacher's Remarks"],
    ['showPrincipalRemarks', "Principal's Remarks"],
  ];
  return (
    <div className="space-y-2">
      {toggles.map(([key, label]) => (
        <label key={key} className="flex items-center justify-between p-3 rounded-xl cursor-pointer"
               style={{ background: tpl[key] ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${tpl[key] ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
          <span className="text-sm font-bold text-white/80">{label}</span>
          <input type="checkbox" checked={!!tpl[key]} onChange={e => upd(key, e.target.checked)} className="w-4 h-4 accent-green-400"/>
        </label>
      ))}
    </div>
  );
}

function GradingTab({ grades, passingPct, onUpdate, onAdd, onRemove, onPassingChange }: {
  grades: any[]; passingPct: number;
  onUpdate: (i: number, k: string, v: any) => void;
  onAdd: () => void; onRemove: (i: number) => void;
  onPassingChange: (v: number) => void;
}) {
  return (
    <>
      <div className="mb-4 p-3 rounded-xl" style={{ background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.2)' }}>
        <label className="block text-[10px] font-bold mb-2 uppercase tracking-wider text-yellow-400">Passing Percentage</label>
        <div className="flex items-center gap-2">
          <input type="number" value={passingPct} min={1} max={100} onChange={e => onPassingChange(Number(e.target.value))}
                 className="sims-input w-24"/>
          <span className="text-sm font-bold text-white/60">%</span>
        </div>
      </div>
      <div className="grid grid-cols-[50px_50px_60px_50px_32px] gap-1 mb-2 px-1">
        {['From', 'To', 'Grade', 'GPA', ''].map(h => (
          <div key={h} className="text-[10px] font-bold uppercase tracking-wider text-white/30">{h}</div>
        ))}
      </div>
      <div className="space-y-1.5">
        {grades.map((g, i) => (
          <div key={i} className="grid grid-cols-[50px_50px_60px_50px_32px] gap-1 items-center">
            <input type="number" value={g.from} onChange={e => onUpdate(i, 'from', e.target.value)} className="sims-input text-xs px-2 py-1.5"/>
            <input type="number" value={g.to}   onChange={e => onUpdate(i, 'to',   e.target.value)} className="sims-input text-xs px-2 py-1.5"/>
            <input value={g.grade} onChange={e => onUpdate(i, 'grade', e.target.value)} className="sims-input text-xs px-2 py-1.5 font-bold"/>
            <input type="number" value={g.point} onChange={e => onUpdate(i, 'point', e.target.value)} className="sims-input text-xs px-2 py-1.5"/>
            <button onClick={() => onRemove(i)} className="w-8 h-8 rounded-lg flex items-center justify-center text-xs"
                    style={{ background: 'rgba(239,68,68,0.15)', color: '#FCA5A5' }}>✕</button>
          </div>
        ))}
      </div>
      <button onClick={onAdd} className="mt-3 w-full py-2 rounded-xl text-xs font-bold glass hover:bg-white/10">+ Add Grade Row</button>
    </>
  );
}

function LayoutTab({ tpl, upd }: { tpl: any; upd: (k: string, v: any) => void }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Paper Size">
          <select value={tpl.paperSize ?? 'A4'} onChange={e => upd('paperSize', e.target.value)} className="sims-input w-full">
            {PAPER_SIZES.map(s => <option key={s}>{s}</option>)}
          </select>
        </FormRow>
        <FormRow label="Orientation">
          <select value={tpl.orientation ?? 'PORTRAIT'} onChange={e => upd('orientation', e.target.value)} className="sims-input w-full">
            {ORIENTATIONS.map(o => <option key={o}>{o}</option>)}
          </select>
        </FormRow>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {(['marginTop','marginBottom','marginLeft','marginRight'] as const).map(k => (
          <FormRow key={k} label={k.replace('margin', 'Margin ')}>
            <div className="flex items-center gap-2">
              <input type="number" value={tpl[k] ?? 15} min={0} max={50} onChange={e => upd(k, Number(e.target.value))} className="sims-input flex-1"/>
              <span className="text-xs text-white/40">mm</span>
            </div>
          </FormRow>
        ))}
      </div>
    </>
  );
}

function SectionsTab({ sections, onToggle, onMove }: {
  sections: any[]; onToggle: (i: number) => void; onMove: (i: number, d: -1 | 1) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-white/40 mb-3">Drag to reorder sections using the arrows. Toggle to show/hide.</p>
      {sections.map((s, i) => (
        <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl"
             style={{ background: s.enabled ? 'rgba(30,144,255,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${s.enabled ? 'rgba(30,144,255,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
          <span className="text-lg w-6 text-center flex-shrink-0">{['🖼️','👤','📊','📋','💬','📅','✍️','🖊️'][i] ?? '📦'}</span>
          <span className="flex-1 text-sm font-bold text-white/80">{s.label}</span>
          <input type="checkbox" checked={s.enabled} onChange={() => onToggle(i)} className="w-4 h-4 accent-blue-400"/>
          <div className="flex gap-1">
            <button onClick={() => onMove(i, -1)} disabled={i === 0}
                    className="w-6 h-6 rounded flex items-center justify-center text-xs glass disabled:opacity-30">↑</button>
            <button onClick={() => onMove(i, 1)} disabled={i === sections.length - 1}
                    className="w-6 h-6 rounded flex items-center justify-center text-xs glass disabled:opacity-30">↓</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function FooterTab({ tpl, upd }: { tpl: any; upd: (k: string, v: any) => void }) {
  return (
    <>
      <FormRow label="Footer Note">
        <textarea value={tpl.footerNote ?? ''} onChange={e => upd('footerNote', e.target.value)}
                  className="sims-input w-full resize-none h-20" placeholder="e.g. This is a computer generated report card."/>
      </FormRow>
      <FormRow label="Principal Signature URL">
        <input value={tpl.principalSignatureUrl ?? ''} onChange={e => upd('principalSignatureUrl', e.target.value)} className="sims-input w-full" placeholder="https://..."/>
      </FormRow>
      <FormRow label="Class Teacher Signature URL">
        <input value={tpl.classTeacherSignatureUrl ?? ''} onChange={e => upd('classTeacherSignatureUrl', e.target.value)} className="sims-input w-full" placeholder="https://..."/>
      </FormRow>
      <FormRow label="School Seal URL">
        <input value={tpl.schoolSealUrl ?? ''} onChange={e => upd('schoolSealUrl', e.target.value)} className="sims-input w-full" placeholder="https://..."/>
      </FormRow>
      <div className="space-y-2 mt-2">
        {[
          ['showGeneratedDate', 'Show Generated Date'],
          ['showQrCode',        'Show QR Code'],
          ['showWatermark',     'Show Watermark'],
        ].map(([k, l]) => (
          <label key={k} className="flex items-center justify-between p-3 rounded-xl cursor-pointer glass">
            <span className="text-sm font-bold text-white/80">{l}</span>
            <input type="checkbox" checked={!!tpl[k]} onChange={e => upd(k, e.target.checked)} className="w-4 h-4 accent-yellow-400"/>
          </label>
        ))}
      </div>
      {tpl.showWatermark && (
        <FormRow label="Watermark Text">
          <input value={tpl.watermarkText ?? ''} onChange={e => upd('watermarkText', e.target.value)} className="sims-input w-full" placeholder="CONFIDENTIAL"/>
        </FormRow>
      )}
    </>
  );
}
