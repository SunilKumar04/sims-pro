'use client';
// src/app/admin/report-card/history/page.tsx
import React, { useCallback, useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { reportCardApi } from '@/lib/api';
import { toast } from '@/components/ui/Toast';

export default function ReportCardHistoryPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await reportCardApi.getHistory({ limit: 100 });
      setRecords(r.data.data ?? []);
    } catch {
      toast.error('Error', 'Could not load history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <AppShell title="Generation History" subtitle="Track all generated report cards">
      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 rounded-2xl"/>)}</div>
      ) : records.length === 0 ? (
        <div className="glass rounded-2xl py-24 text-center">
          <div className="text-6xl mb-4 opacity-20">🕐</div>
          <h3 className="text-lg font-extrabold text-white mb-2">No History Yet</h3>
          <p className="text-sm text-white/40">Generated report cards will appear here.</p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="sims-table">
            <thead>
              <tr><th>Student</th><th>Class</th><th>Exam</th><th>Year</th><th>Template</th><th>Generated At</th></tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id}>
                  <td className="font-bold text-white">{r.student?.user?.name ?? '—'}</td>
                  <td className="text-white/70">{r.className}</td>
                  <td>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold"
                          style={{ background: 'rgba(212,160,23,0.12)', color: '#F0C040' }}>
                      {r.examType}
                    </span>
                  </td>
                  <td className="text-white/60">{r.academicYear}</td>
                  <td className="text-white/70">{r.template?.name ?? '—'}</td>
                  <td className="text-white/40 text-xs">
                    {new Date(r.generatedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
