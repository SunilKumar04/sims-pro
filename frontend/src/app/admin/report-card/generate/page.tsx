'use client';
// src/app/admin/report-card/generate/page.tsx
import React, { useCallback, useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { reportCardApi, studentsApi, classesApi } from '@/lib/api';
import { toast } from '@/components/ui/Toast';
import ReportCardPreview from '@/components/report-card/ReportCardPreview';
import { printMarksheet } from '@/lib/pdf-generator';

const EXAM_TYPES = ['UNIT_TEST', 'MID_TERM', 'MST1', 'MST2', 'FINAL', 'PRACTICALS'];
const YEARS      = [2026, 2025, 2024, 2023];

export default function GenerateMarksheetPage() {
  const [templates,    setTemplates]    = useState<any[]>([]);
  const [classes,      setClasses]      = useState<any[]>([]);
  const [students,     setStudents]     = useState<any[]>([]);
  const [selectedTpl,  setSelectedTpl]  = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [examType,     setExamType]     = useState('FINAL');
  const [year,         setYear]         = useState(2026);
  const [includePhoto, setIncludePhoto] = useState(true);
  const [includeQr,    setIncludeQr]    = useState(false);
  const [teacherRemark, setTeacherRemark]  = useState('');
  const [principalRemark, setPrincipalRemark] = useState('');
  const [loading,      setLoading]      = useState(false);
  const [marksheetData, setMarksheetData] = useState<any>(null);

  const loadBase = useCallback(async () => {
    const [tr, cr] = await Promise.all([reportCardApi.getTemplates(), classesApi.getAll({})]);
    const tplList  = tr.data.data ?? [];
    setTemplates(tplList);
    setClasses(cr.data.data ?? []);
    const def = tplList.find((t: any) => t.isDefault) ?? tplList[0];
    if (def) setSelectedTpl(def.id);
  }, []);

  useEffect(() => { void loadBase(); }, [loadBase]);

  const loadStudents = useCallback(async () => {
    if (!selectedClass) { setStudents([]); return; }
    const r = await studentsApi.getAll({ className: selectedClass });
    const list = r.data.data ?? [];
    setStudents(list);
    setSelectedStudent(list[0]?.id ?? '');
  }, [selectedClass]);

  useEffect(() => { void loadStudents(); }, [loadStudents]);

  const generate = async () => {
    if (!selectedStudent) { toast.warning('Required', 'Please select a student'); return; }
    if (!selectedTpl)     { toast.warning('Required', 'Please select a template'); return; }
    setLoading(true);
    try {
      const r = await reportCardApi.getMarksheetData(selectedStudent, examType, year, selectedTpl);
      setMarksheetData(r.data.data);
      // Record it
      await reportCardApi.recordGenerated({
        studentId: selectedStudent, templateId: selectedTpl,
        examType, academicYear: year,
        className: selectedClass,
        includePhoto, includeQrCode: includeQr,
      }).catch(() => {});
    } catch (e: any) {
      toast.error('Error', e?.message ?? 'Could not generate marksheet');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!marksheetData) return;
    printMarksheet({
      template:         marksheetData.template,
      school:           marksheetData.school,
      student:          marksheetData.student,
      exam:             marksheetData.exam,
      subjects:         marksheetData.subjects,
      summary:          marksheetData.summary,
      attendance:       marksheetData.attendance,
      teacherRemarks:   teacherRemark,
      principalRemarks: principalRemark,
      includePhoto,
      includeQrCode:    includeQr,
    });
  };

  return (
    <AppShell title="Generate Marksheet" subtitle="Generate a professional PDF report card for any student">
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">

        {/* Left: Controls */}
        <div className="space-y-4">

          {/* Template */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">📄 Select Template</h3>
            <select value={selectedTpl} onChange={e => setSelectedTpl(e.target.value)} className="sims-input w-full mb-3">
              <option value="">-- Select Template --</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name}{t.isDefault ? ' ★' : ''}</option>
              ))}
            </select>
            {templates.length === 0 && (
              <p className="text-xs text-yellow-400">⚠️ No templates found. <a href="/admin/report-card" className="underline">Create one first.</a></p>
            )}
          </div>

          {/* Student Selection */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">👤 Select Student</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold mb-1.5 uppercase tracking-wider text-white/40">Class</label>
                <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="sims-input w-full">
                  <option value="">-- Select Class --</option>
                  {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold mb-1.5 uppercase tracking-wider text-white/40">Student</label>
                <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} className="sims-input w-full">
                  <option value="">-- Select Student --</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.user?.name ?? s.name} (Roll {s.roll})</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Exam Selection */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">📋 Exam Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold mb-1.5 uppercase tracking-wider text-white/40">Exam Type</label>
                <select value={examType} onChange={e => setExamType(e.target.value)} className="sims-input w-full">
                  {EXAM_TYPES.map(e => <option key={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold mb-1.5 uppercase tracking-wider text-white/40">Academic Year</label>
                <select value={year} onChange={e => setYear(Number(e.target.value))} className="sims-input w-full">
                  {YEARS.map(y => <option key={y}>{y}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">⚙️ Options</h3>
            <div className="space-y-3">
              {[
                ['includePhoto',  'Include Student Photo',  includePhoto,  setIncludePhoto],
                ['includeQr',     'Include QR Code',        includeQr,     setIncludeQr],
              ].map(([k, l, v, s]) => (
                <label key={k as string} className="flex items-center justify-between p-3 rounded-xl cursor-pointer"
                       style={{ background: (v as boolean) ? 'rgba(212,160,23,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${(v as boolean) ? 'rgba(212,160,23,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
                  <span className="text-sm font-bold text-white/80">{l as string}</span>
                  <input type="checkbox" checked={v as boolean} onChange={e => (s as any)(e.target.checked)} className="w-4 h-4 accent-yellow-400"/>
                </label>
              ))}
              <div>
                <label className="block text-[10px] font-bold mb-1.5 uppercase tracking-wider text-white/40">Teacher Remarks</label>
                <textarea value={teacherRemark} onChange={e => setTeacherRemark(e.target.value)}
                          className="sims-input w-full resize-none h-16" placeholder="Optional remarks…"/>
              </div>
              <div>
                <label className="block text-[10px] font-bold mb-1.5 uppercase tracking-wider text-white/40">Principal Remarks</label>
                <textarea value={principalRemark} onChange={e => setPrincipalRemark(e.target.value)}
                          className="sims-input w-full resize-none h-16" placeholder="Optional remarks…"/>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <button onClick={generate} disabled={loading || !selectedStudent || !selectedTpl}
                  className="w-full py-4 rounded-2xl text-base font-black disabled:opacity-50 transition-all hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg,#D4A017,#F0C040)', color: '#0A1628' }}>
            {loading ? '⏳ Generating…' : '🚀 Generate Report Card'}
          </button>
        </div>

        {/* Right: Preview */}
        <div>
          {marksheetData ? (
            <div>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div>
                  <h2 className="text-base font-extrabold text-white">
                    {marksheetData.student?.name} — {marksheetData.exam?.type}
                  </h2>
                  <p className="text-xs text-white/40 mt-0.5">
                    Class {marksheetData.student?.className} · Year {marksheetData.exam?.year} ·
                    Rank {marksheetData.summary?.rank ?? '—'} · {marksheetData.summary?.percentage}%
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handlePrint}
                          className="px-5 py-2.5 rounded-xl text-sm font-black transition-all hover:-translate-y-0.5"
                          style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: 'white' }}>
                    🖨️ Print / Download PDF
                  </button>
                </div>
              </div>

              {!marksheetData.hasData && (
                <div className="mb-4 p-4 rounded-xl" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#FCD34D' }}>
                  ⚠️ No marks found for {examType} exam in year {year}. The preview shows structure only.
                </div>
              )}

              <div className="glass rounded-2xl overflow-hidden">
                <ReportCardPreview
                  template={marksheetData.template}
                  studentData={marksheetData.student}
                  subjectsData={marksheetData.subjects}
                  summaryData={marksheetData.summary}/>
              </div>
            </div>
          ) : (
            <div className="glass rounded-2xl py-32 flex flex-col items-center justify-center text-center">
              <div className="text-6xl mb-4 opacity-20">📄</div>
              <h3 className="text-lg font-extrabold text-white mb-2">Ready to Generate</h3>
              <p className="text-sm text-white/40 max-w-xs">
                Select a template, student, and exam type on the left, then click Generate.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
