'use client';
// src/app/student/report-card/page.tsx
import React, { useCallback, useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { reportCardApi } from '@/lib/api';
import { toast } from '@/components/ui/Toast';
import ReportCardPreview from '@/components/report-card/ReportCardPreview';
import { printMarksheet } from '@/lib/pdf-generator';

const EXAM_TYPES = ['UNIT_TEST', 'MID_TERM', 'MST1', 'MST2', 'FINAL', 'PRACTICALS'];
const YEARS      = [2026, 2025, 2024, 2023];

export default function StudentReportCardPage() {
  const [examType, setExamType] = useState('FINAL');
  const [year,     setYear]     = useState(2026);
  const [loading,  setLoading]  = useState(false);
  const [data,     setData]     = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await reportCardApi.getMyMarksheet(examType, year);
      setData(r.data.data);
    } catch (e: any) {
      toast.error('Error', e?.message ?? 'Could not load report card');
    } finally {
      setLoading(false);
    }
  }, [examType, year]);

  useEffect(() => { void load(); }, [load]);

  const handlePrint = () => {
    if (!data) return;
    printMarksheet({
      template: data.template,
      school:   data.school,
      student:  data.student,
      exam:     data.exam,
      subjects: data.subjects,
      summary:  data.summary,
      attendance: data.attendance,
    });
  };

  return (
    <AppShell title="My Report Card" subtitle="View and download your academic performance report">
      {/* Controls */}
      <div className="glass rounded-2xl p-4 mb-6 flex items-center gap-4 flex-wrap">
        <div>
          <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider text-white/40">Exam Type</label>
          <select value={examType} onChange={e => setExamType(e.target.value)} className="sims-input" style={{ width: 140 }}>
            {EXAM_TYPES.map(e => <option key={e}>{e}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider text-white/40">Year</label>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="sims-input" style={{ width: 100 }}>
            {YEARS.map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
        {data && (
          <button onClick={handlePrint}
                  className="ml-auto px-5 py-2.5 rounded-xl text-sm font-black"
                  style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: 'white' }}>
            🖨️ Print / Download PDF
          </button>
        )}
      </div>

      {/* Summary stats if data */}
      {data?.hasData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { l: 'Percentage', v: `${data.summary.percentage}%`, c: '#F0C040' },
            { l: 'Grade',      v: data.summary.grade,             c: '#86EFAC' },
            { l: 'Rank',       v: data.summary.rank ?? '—',       c: '#93C5FD' },
            { l: 'Result',     v: data.summary.result,            c: data.summary.result === 'PASS' ? '#86EFAC' : '#FCA5A5' },
          ].map(s => (
            <div key={s.l} className="glass rounded-2xl p-5 text-center">
              <div className="text-2xl font-black" style={{ color: s.c }}>{s.v}</div>
              <div className="text-xs text-white/40 mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      )}

      {/* Report Card */}
      {loading ? (
        <div className="skeleton h-96 rounded-2xl"/>
      ) : !data ? (
        <div className="glass rounded-2xl py-24 text-center">
          <div className="text-5xl mb-4 opacity-30">📄</div>
          <p className="text-white/40">Could not load report card.</p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <ReportCardPreview
            template={data.template}
            studentData={data.student}
            subjectsData={data.subjects}
            summaryData={data.summary}/>
        </div>
      )}
    </AppShell>
  );
}
