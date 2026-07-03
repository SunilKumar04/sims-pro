'use client';
// src/app/admin/report-card/page.tsx
import React, { useCallback, useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import Link from 'next/link';
import { reportCardApi } from '@/lib/api';
import { toast } from '@/components/ui/Toast';
import { confirm } from '@/components/ui/Confirm';

const TITLE_OPTIONS = ['REPORT CARD', 'PROGRESS REPORT', 'MARKSHEET', 'ACADEMIC REPORT', 'ANNUAL REPORT'];
const FONT_OPTIONS  = [
  'Arial, sans-serif',
  'Georgia, serif',
  'Times New Roman, serif',
  "'Trebuchet MS', sans-serif",
  'Verdana, sans-serif',
  "'Courier New', monospace",
];
const PAPER_SIZES   = ['A4', 'LETTER', 'LEGAL'];
const ORIENTATIONS  = ['PORTRAIT', 'LANDSCAPE'];

// ── Quick-create modal ─────────────────────────────────────────────────────
function CreateModal({
  onClose, onCreate,
}: { onClose: () => void; onCreate: (d: any) => Promise<void> }) {
  const [form, setForm] = useState({
    name:            '',
    description:     '',
    reportTitle:     'REPORT CARD',
    headerBgColor:   '#1a3a6b',
    headerTextColor: '#ffffff',
    paperSize:       'A4',
    orientation:     'PORTRAIT',
    isDefault:       false,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim()) { toast.warning('Required', 'Template name is required'); return; }
    setSaving(true);
    try { await onCreate(form); }
    finally { setSaving(false); }
  };

  const F = (key: string, value: any) => setForm(p => ({ ...p, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-lg rounded-3xl p-7 shadow-2xl"
           style={{ background: '#0F2044', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-extrabold text-white">Create New Template</h2>
            <p className="text-xs mt-1 text-white/40">Set up a report card design for your school</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl glass flex items-center justify-center text-white/50">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold mb-1.5 uppercase tracking-wider text-white/40">Template Name *</label>
            <input value={form.name} onChange={e => F('name', e.target.value)} placeholder="e.g. CBSE Report Card"
                   className="sims-input w-full" autoFocus/>
          </div>
          <div>
            <label className="block text-[10px] font-bold mb-1.5 uppercase tracking-wider text-white/40">Description</label>
            <input value={form.description} onChange={e => F('description', e.target.value)}
                   placeholder="Optional description" className="sims-input w-full"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold mb-1.5 uppercase tracking-wider text-white/40">Report Title</label>
              <select value={form.reportTitle} onChange={e => F('reportTitle', e.target.value)} className="sims-input w-full">
                {TITLE_OPTIONS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold mb-1.5 uppercase tracking-wider text-white/40">Paper Size</label>
              <select value={form.paperSize} onChange={e => F('paperSize', e.target.value)} className="sims-input w-full">
                {PAPER_SIZES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold mb-1.5 uppercase tracking-wider text-white/40">Header Color</label>
              <div className="flex gap-2">
                <input type="color" value={form.headerBgColor} onChange={e => F('headerBgColor', e.target.value)}
                       className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0" style={{ background: 'none' }}/>
                <input value={form.headerBgColor} onChange={e => F('headerBgColor', e.target.value)}
                       className="sims-input flex-1" placeholder="#1a3a6b"/>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold mb-1.5 uppercase tracking-wider text-white/40">Orientation</label>
              <select value={form.orientation} onChange={e => F('orientation', e.target.value)} className="sims-input w-full">
                {ORIENTATIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.isDefault} onChange={e => F('isDefault', e.target.checked)}
                   className="w-4 h-4 rounded accent-yellow-400"/>
            <span className="text-sm text-white/70">Set as default template</span>
          </label>
        </div>

        <div className="flex gap-3 mt-6 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-bold glass hover:bg-white/10">Cancel</button>
          <button onClick={save} disabled={saving}
                  className="flex-1 py-3 rounded-xl text-sm font-black disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#D4A017,#F0C040)', color: '#0A1628' }}>
            {saving ? '⏳ Creating…' : '✨ Create Template'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Template Card ──────────────────────────────────────────────────────────
function TemplateCard({
  tpl, onDelete, onDuplicate, onSetDefault,
}: {
  tpl: any;
  onDelete:    (id: string) => void;
  onDuplicate: (id: string) => void;
  onSetDefault:(id: string) => void;
}) {
  return (
    <div className="glass rounded-2xl overflow-hidden hover:-translate-y-1 transition-all"
         style={{ border: tpl.isDefault ? '1px solid rgba(212,160,23,0.4)' : '1px solid rgba(255,255,255,0.08)' }}>

      {/* Color preview strip */}
      <div style={{ height: 6, background: tpl.headerBgColor ?? '#1a3a6b' }}/>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-white truncate">{tpl.name}</h3>
              {tpl.isDefault && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black"
                      style={{ background: 'rgba(212,160,23,0.2)', color: '#F0C040' }}>DEFAULT</span>
              )}
              {!tpl.isActive && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ background: 'rgba(239,68,68,0.12)', color: '#FCA5A5' }}>INACTIVE</span>
              )}
            </div>
            {tpl.description && <p className="text-xs text-white/40 mt-0.5 truncate">{tpl.description}</p>}
          </div>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
               style={{ background: tpl.headerBgColor + '22' }}>📄</div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { l: 'Title',  v: tpl.reportTitle ?? 'REPORT CARD' },
            { l: 'Paper',  v: `${tpl.paperSize ?? 'A4'} ${tpl.orientation ?? 'PORTRAIT'}` },
            { l: 'Grading', v: `${(tpl.gradingSystem as any[])?.length ?? 7} grades` },
            { l: 'Pass %', v: `≥ ${tpl.passingPercentage ?? 40}%` },
          ].map(r => (
            <div key={r.l} className="rounded-lg p-2.5"
                 style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="text-[9px] font-bold uppercase tracking-wider text-white/30">{r.l}</div>
              <div className="text-xs font-bold text-white/80 mt-0.5 truncate">{r.v}</div>
            </div>
          ))}
        </div>

        {/* Feature badges */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {tpl.showRank      && <span className="feature-badge">🏆 Rank</span>}
          {tpl.showResult    && <span className="feature-badge">✅ Result</span>}
          {tpl.showAttendance && <span className="feature-badge">📅 Attendance</span>}
          {tpl.showQrCode    && <span className="feature-badge">📱 QR Code</span>}
          {tpl.showWatermark && <span className="feature-badge">💧 Watermark</span>}
          {tpl.principalSignatureUrl && <span className="feature-badge">✍️ Signature</span>}
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          <Link href={`/admin/report-card/builder/${tpl.id}`}
                className="flex-1 text-center py-2 rounded-xl text-xs font-black transition-all hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg,#D4A017,#F0C040)', color: '#0A1628' }}>
            ✏️ Edit
          </Link>
          <Link href={`/admin/report-card/generate?templateId=${tpl.id}`}
                className="py-2 px-3 rounded-xl text-xs font-bold glass hover:bg-white/10">
            📄 Generate
          </Link>
          <button onClick={() => onDuplicate(tpl.id)}
                  className="py-2 px-3 rounded-xl text-xs font-bold glass hover:bg-white/10"
                  title="Duplicate template">📋</button>
          {!tpl.isDefault && (
            <button onClick={() => onSetDefault(tpl.id)}
                    className="py-2 px-3 rounded-xl text-xs font-bold"
                    style={{ background: 'rgba(212,160,23,0.1)', color: '#F0C040', border: '1px solid rgba(212,160,23,0.2)' }}
                    title="Set as default">⭐</button>
          )}
          <button onClick={() => onDelete(tpl.id)}
                  className="py-2 px-3 rounded-xl text-xs font-bold"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)' }}
                  title="Delete template">🗑️</button>
        </div>
      </div>

      <style jsx>{`
        .feature-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 99px;
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.5);
          border: 1px solid rgba(255,255,255,0.08);
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function ReportCardPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await reportCardApi.getTemplates();
      setTemplates(r.data.data ?? []);
    } catch {
      toast.error('Error', 'Could not load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleCreate = async (dto: any) => {
    await reportCardApi.createTemplate(dto);
    toast.success('Created', 'Template created successfully');
    setShowCreate(false);
    void load();
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: 'Delete Template', message: 'This will permanently delete the template. Continue?', danger: true, confirm: 'Delete' }))) return;
    await reportCardApi.deleteTemplate(id);
    toast.success('Deleted', 'Template deleted');
    void load();
  };

  const handleDuplicate = async (id: string) => {
    await reportCardApi.duplicateTemplate(id);
    toast.success('Duplicated', 'Template duplicated');
    void load();
  };

  const handleSetDefault = async (id: string) => {
    await reportCardApi.updateTemplate(id, { isDefault: true });
    toast.success('Default Set', 'This template is now the default');
    void load();
  };

  return (
    <AppShell title="Report Card Templates" subtitle="Create and manage report card designs for your school">

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/admin/report-card/generate"
                className="px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 glass hover:bg-white/10 transition-all">
            📄 Generate Marksheet
          </Link>
          <Link href="/admin/report-card/bulk"
                className="px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 glass hover:bg-white/10 transition-all">
            📦 Bulk Generate
          </Link>
          <Link href="/admin/report-card/history"
                className="px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 glass hover:bg-white/10 transition-all">
            🕐 History
          </Link>
        </div>
        <button onClick={() => setShowCreate(true)}
                className="px-5 py-2.5 rounded-xl text-sm font-black hover:-translate-y-0.5 transition-all flex items-center gap-2"
                style={{ background: 'linear-gradient(135deg,#D4A017,#F0C040)', color: '#0A1628' }}>
          + New Template
        </button>
      </div>

      {/* Stats strip */}
      {!loading && templates.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { icon: '📄', label: 'Total Templates', value: templates.length, color: '#F0C040' },
            { icon: '⭐', label: 'Default',          value: templates.filter(t => t.isDefault).length, color: '#86EFAC' },
            { icon: '✅', label: 'Active',           value: templates.filter(t => t.isActive).length, color: '#93C5FD' },
          ].map(s => (
            <div key={s.label} className="glass rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                     style={{ background: s.color + '18' }}>{s.icon}</div>
                <div>
                  <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs text-white/40">{s.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Templates grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-64 rounded-2xl"/>)}
        </div>
      ) : templates.length === 0 ? (
        <div className="glass rounded-2xl py-24 text-center">
          <div className="text-6xl mb-4 opacity-30">📄</div>
          <h3 className="text-xl font-extrabold text-white mb-2">No Templates Yet</h3>
          <p className="text-sm text-white/40 mb-8 max-w-sm mx-auto">
            Create your first report card template. You can customize colors, fields, grading, and layout.
          </p>
          <button onClick={() => setShowCreate(true)}
                  className="px-8 py-3 rounded-xl text-sm font-black"
                  style={{ background: 'linear-gradient(135deg,#D4A017,#F0C040)', color: '#0A1628' }}>
            + Create First Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {templates.map(tpl => (
            <TemplateCard key={tpl.id} tpl={tpl}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onSetDefault={handleSetDefault}/>
          ))}
          {/* Add new card */}
          <button onClick={() => setShowCreate(true)}
                  className="glass rounded-2xl p-8 flex flex-col items-center justify-center gap-3 hover:bg-white/5 transition-all"
                  style={{ border: '2px dashed rgba(255,255,255,0.1)', minHeight: 280 }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                 style={{ background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.2)' }}>+</div>
            <div className="text-sm font-bold text-white/50">New Template</div>
          </button>
        </div>
      )}

      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate}/>
      )}
    </AppShell>
  );
}
