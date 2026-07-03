'use client';
// src/app/admin/report-card/bulk/page.tsx
import React, { useCallback, useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { reportCardApi, classesApi } from '@/lib/api';
import { toast } from '@/components/ui/Toast';
import { printMarksheet } from '@/lib/pdf-generator';

const EXAM_TYPES = ['UNIT_TEST', 'MID_TERM', 'MST1', 'MST2', 'FINAL', 'PRACTICALS'];
const YEARS      = [2026, 2025, 2024, 2023];

export default function BulkGeneratePage() {
  const [templates,     setTemplates]     = useState<any[]>([]);
  const [classes,       setClasses]       = useState<any[]>([]);
  const [selectedTpl,   setSelectedTpl]   = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [examType,      setExamType]      = useState('FINAL');
  const [year,          setYear]          = useState(2026);
  const [loading,       setLoading]       = useState(false);
  const [generating,    setGenerating]    = useState(false);
  const [bulkData,      setBulkData]      = useState<any>(null);
  const [progress,      setProgress]      = useState({ done: 0, total: 0 });

  const loadBase = useCallback(async () => {
    const [tr, cr] = await Promise.all([reportCardApi.getTemplates(), classesApi.getAll({})]);
    const tplList = tr.data.data ?? [];
    setTemplates(tplList);
    setClasses(cr.data.data ?? []);
    const def = tplList.find((t: any) => t.isDefault) ?? tplList[0];
    if (def) setSelectedTpl(def.id);
  }, []);

  useEffect(() => { void loadBase(); }, [loadBase]);

  const loadBulkData = async () => {
    if (!selectedClass || !selectedTpl) {
      toast.warning('Required', 'Select class and template');
      return;
    }
    setLoading(true);
    try {
      const r = await reportCardApi.getBulkMarksheetData(selectedClass, examType, year, selectedTpl);
      setBulkData(r.data.data);
    } catch (e: any) {
      toast.error('Error', e?.message ?? 'Could not load data');
    } finally {
      setLoading(false);
    }
  };

  const generateAll = async () => {
    if (!bulkData?.students?.length) return;
    setGenerating(true);
    const students = bulkData.students;
    setProgress({ done: 0, total: students.length });

    for (let i = 0; i < students.length; i++) {
      const entry = students[i];
      await new Promise<void>(res => {
        setTimeout(() => {
          printMarksheet({
            template: bulkData.template,
            school:   bulkData.school,
            student:  entry.student,
            exam:     bulkData.exam,
            subjects: entry.subjects,
            summary:  entry.summary,
          });
          setProgress({ done: i + 1, total: students.length });
          res();
        }, 400); // small delay so browser can open each window
      });
    }

    toast.success('Done', `Opened ${students.length} print dialogs`);
    setGenerating(false);
  };

  const generateSingle = (entry: any) => {
    printMarksheet({
      template: bulkData.template,
      school:   bulkData.school,
      student:  entry.student,
      exam:     bulkData.exam,
      subjects: entry.subjects,
      summary:  entry.summary,
    });
  };

  const gradeColor = (g: string) => {
    if (g === 'A+' || g === 'A') return '#86EFAC';
    if (g === 'B+' || g === 'B') return '#FCD34D';
    if (g === 'C') return '#FDBA74';
    return '#FCA5A5';
  };

  return (
    <AppShell title="Bulk Generate" subtitle="Generate report cards for an entire class at once">
      {/* Controls */}
      <div className="glass rounded-2xl p-5 mb-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-5">
          <div>
            <label className="block text-[10px] font-bold mb-1.5 uppercase tracking-wider text-white/40">Template</label>
            <select value={selectedTpl} onChange={e => setSelectedTpl(e.target.value)} className="sims-input w-full">
              <option value="">-- Select --</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}{t.isDefault ? ' ★' : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold mb-1.5 uppercase tracking-wider text-white/40">Class</label>
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="sims-input w-full">
              <option value="">-- Select --</option>
              {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold mb-1.5 uppercase tracking-wider text-white/40">Exam Type</label>
            <select value={examType} onChange={e => setExamType(e.target.value)} className="sims-input w-full">
              {EXAM_TYPES.map(e => <option key={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold mb-1.5 uppercase tracking-wider text-white/40">Year</label>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="sims-input w-full">
              {YEARS.map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={loadBulkData} disabled={loading || !selectedClass || !selectedTpl}
                  className="px-6 py-2.5 rounded-xl text-sm font-black disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#D4A017,#F0C040)', color: '#0A1628' }}>
            {loading ? '⏳ Loading…' : '🔍 Load Class Data'}
          </button>

          {bulkData && (
            <button onClick={generateAll} disabled={generating || !bulkData?.students?.length}
                    className="px-6 py-2.5 rounded-xl text-sm font-black disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: 'white' }}>
              {generating ? `⏳ Printing ${progress.done}/${progress.total}…` : `🖨️ Print All (${bulkData?.students?.length ?? 0})`}
            </button>
          )}
        </div>

        {/* Progress */}
        {generating && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-white/60">Generating…</span>
              <span className="text-xs font-bold text-yellow-400">{progress.done}/{progress.total}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%`, background: 'linear-gradient(90deg,#D4A017,#F0C040)' }}/>
            </div>
          </div>
        )}
      </div>

      {/* Summary cards */}
      {bulkData && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Students', value: bulkData.students?.length ?? 0, color: '#F0C040' },
              { label: 'With Marks',     value: bulkData.students?.filter((s: any) => s.hasData).length ?? 0, color: '#86EFAC' },
              { label: 'Passed',         value: bulkData.students?.filter((s: any) => s.summary?.result === 'PASS').length ?? 0, color: '#93C5FD' },
              { label: 'Failed',         value: bulkData.students?.filter((s: any) => s.summary?.result === 'FAIL').length ?? 0, color: '#FCA5A5' },
            ].map(c => (
              <div key={c.label} className="glass rounded-2xl p-4">
                <div className="text-2xl font-black" style={{ color: c.color }}>{c.value}</div>
                <div className="text-xs text-white/40 mt-1">{c.label}</div>
              </div>
            ))}
          </div>

          {/* Student table */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="text-sm font-bold text-white">Class {bulkData.className} — {bulkData.exam?.type}</h3>
              <span className="text-xs text-white/40">{bulkData.students?.length} students</span>
            </div>
            <div className="overflow-x-auto">
              <table className="sims-table">
                <thead>
                  <tr>
                    <th>#</th><th>Student</th><th>Roll</th><th>Total</th><th>%</th><th>Grade</th><th>Rank</th><th>Result</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(bulkData.students ?? []).map((entry: any, idx: number) => (
                    <tr key={entry.student.id}>
                      <td className="text-white/40">{idx + 1}</td>
                      <td className="font-bold text-white">{entry.student.name}</td>
                      <td className="font-mono text-white/60">{entry.student.roll}</td>
                      <td className="text-white">{entry.hasData ? `${entry.summary.totalMarks}/${entry.summary.totalMax}` : '—'}</td>
                      <td>
                        {entry.hasData
                          ? <span className="font-bold" style={{ color: gradeColor(entry.summary.grade) }}>{entry.summary.percentage}%</span>
                          : <span className="text-white/30">—</span>}
                      </td>
                      <td>
                        {entry.hasData
                          ? <span className="px-2 py-0.5 rounded-full text-xs font-black" style={{ background: gradeColor(entry.summary.grade) + '20', color: gradeColor(entry.summary.grade) }}>{entry.summary.grade}</span>
                          : '—'}
                      </td>
                      <td className="text-white/70">{entry.summary.rank ?? '—'}</td>
                      <td>
                        {entry.hasData
                          ? <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                                  style={{ background: entry.summary.result === 'PASS' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: entry.summary.result === 'PASS' ? '#86EFAC' : '#FCA5A5' }}>
                              {entry.summary.result}
                            </span>
                          : <span className="text-white/30 text-xs">No marks</span>}
                      </td>
                      <td>
                        <button onClick={() => generateSingle(entry)}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold"
                                style={{ background: 'rgba(30,144,255,0.15)', color: '#93C5FD', border: '1px solid rgba(30,144,255,0.25)' }}>
                          🖨️ Print
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!bulkData && !loading && (
        <div className="glass rounded-2xl py-24 text-center">
          <div className="text-6xl mb-4 opacity-20">📦</div>
          <h3 className="text-lg font-extrabold text-white mb-2">Bulk Report Card Generator</h3>
          <p className="text-sm text-white/40 max-w-sm mx-auto">
            Select a template, class, and exam type, then click "Load Class Data" to see all students and generate their report cards.
          </p>
        </div>
      )}
    </AppShell>
  );
}
