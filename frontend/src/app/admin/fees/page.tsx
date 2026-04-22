'use client';
// src/app/admin/fees/page.tsx
import { useEffect, useState, useCallback } from 'react';
import AppShell from '@/components/layout/AppShell';
import { feesApi } from '@/lib/api';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { toast } from '@/components/ui/Toast';
import { confirm } from '@/components/ui/Confirm';

const STATUS_BADGE: Record<string, string> = {
  PAID:    'bg-green-500/15 text-green-400',
  PENDING: 'bg-red-500/15 text-red-400',
  PARTIAL: 'bg-yellow-500/15 text-yellow-400',
};

export default function AdminFees() {
  const [fees,    setFees]    = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('');
  const [receipt, setReceipt] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await feesApi.getAll({ status: filter || undefined });
      setFees(res.data.data || []);
      setSummary(res.data.summary || {});
    } catch { setFees([]); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleMarkPaid = async (id: string, name: string) => {
    if (!(await confirm({ title: 'Mark Fee as Paid', message: `Mark ${name}'s fee as PAID? This will record the payment.`, confirm: 'Yes, Mark Paid', cancel: 'Cancel', danger: false }))) return;
    try { await feesApi.markPaid(id); toast.success('Fee Marked Paid', `Payment recorded for ${name}`); load(); }
    catch (e: any) { toast.error('Error', e?.message || 'Error'); }
  };

  const statCards = [
    { label: 'Total Students', value: summary.total || 0,      icon: '📋', color: '#93C5FD' },
    { label: 'Fees Paid',      value: summary.paid || 0,       icon: '✅', color: '#86EFAC' },
    { label: 'Pending',        value: summary.pending || 0,    icon: '⏳', color: '#FCA5A5' },
    { label: 'Collected',      value: formatCurrency(summary.totalCollected || 0), icon: '💰', color: '#F0C040' },
  ];

  return (
    <AppShell title="Fee Management" subtitle="Track and manage fee payments">

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 gap-5 mb-6 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(c => (
          <div key={c.label} className="glass rounded-2xl p-5">
            <div className="text-2xl mb-2">{c.icon}</div>
            <div className="text-2xl font-black" style={{ color: c.color }}>{c.value}</div>
            <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* FILTER */}
      <div className="glass rounded-2xl p-4 sm:p-5 mb-5 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="sims-chip-row overflow-x-auto pb-1 sm:overflow-visible">
          {['', 'PAID', 'PENDING', 'PARTIAL'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
                    className={cn('shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all', filter === s ? 'text-navy-900' : 'glass hover:bg-white/10')}
                    style={filter === s ? { background: 'linear-gradient(135deg,#D4A017,#F0C040)', color: '#0A1628' } : {}}>
              {s || 'All'}
            </button>
          ))}
        </div>
        <div className="text-sm font-semibold sm:text-right" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Total Due: <span className="text-red-400 font-bold">{formatCurrency(summary.totalPending || 0)}</span>
        </div>
      </div>

      {/* TABLE */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="sims-table-wrap">
          <table className="sims-table">
            <thead>
              <tr>
                <th>Student</th><th>Class</th><th>Amount</th><th>Paid</th>
                <th>Balance</th><th>Status</th><th>Date</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? [...Array(6)].map((_, i) => (
                    <tr key={i}>{[...Array(8)].map((_, j) => <td key={j}><div className="skeleton h-5 rounded" /></td>)}</tr>
                  ))
                : fees.map(f => (
                    <tr key={f.id}>
                      <td>
                        <div className="font-bold text-white">{f.studentName}</div>
                        <div className="text-xs text-white/35">Roll: {f.roll}</div>
                      </td>
                      <td><span className="px-2 py-0.5 rounded-lg text-xs font-bold" style={{ background: 'rgba(30,144,255,0.15)', color: '#93C5FD' }}>{f.className}</span></td>
                      <td className="text-white/70">{formatCurrency(f.amount)}</td>
                      <td className="font-bold text-green-400">{formatCurrency(f.paid)}</td>
                      <td className="font-bold" style={{ color: f.balance > 0 ? '#FCA5A5' : '#86EFAC' }}>{formatCurrency(f.balance)}</td>
                      <td><span className={cn('px-2.5 py-1 rounded-full text-xs font-bold', STATUS_BADGE[f.status] || STATUS_BADGE.PENDING)}>{f.status}</span></td>
                      <td className="text-white/40 text-xs">{f.paidDate ? formatDate(f.paidDate) : '—'}</td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          {f.status !== 'PAID' && (
                            <button onClick={() => handleMarkPaid(f.id, f.studentName)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                    style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#86EFAC' }}>
                              Mark Paid
                            </button>
                          )}
                          <button onClick={() => setReceipt(f)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold glass hover:bg-white/10">
                            🧾
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECEIPT MODAL */}
      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md rounded-3xl p-5 shadow-2xl sm:p-8"
               style={{ background: '#0F2044', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-extrabold">🧾 Fee Receipt</h2>
              <button onClick={() => setReceipt(null)} className="w-8 h-8 rounded-xl glass flex items-center justify-center text-white/50 hover:text-white">✕</button>
            </div>
            <div className="text-center pb-5 mb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="text-4xl mb-2">🎓</div>
              <div className="text-lg font-black">Guru Nanak Public Sr. Sec. School</div>
              <div className="text-xs mt-1 text-white/40">Ludhiana, Punjab · CBSE Affiliated</div>
              <div className="text-xs mt-1 font-bold text-yellow-400">OFFICIAL FEE RECEIPT</div>
            </div>
            {[
              ['Student', receipt.studentName],
              ['Class', receipt.className],
              ['Roll No', receipt.roll],
              ['Term', receipt.term],
              ['Payment Date', receipt.paidDate ? formatDate(receipt.paidDate) : 'Not Paid'],
              ['Total Amount', formatCurrency(receipt.amount)],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-sm text-white/50">{k}</span>
                <span className="text-sm font-bold text-white sm:text-right">{v}</span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 py-3 mt-1">
              <span className="text-sm font-bold text-white/50">Amount Paid</span>
              <span className="text-base font-black text-green-400">{formatCurrency(receipt.paid)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="font-bold text-yellow-400">Balance Due</span>
              <span className="text-lg font-black text-yellow-400">{formatCurrency(receipt.balance)}</span>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button onClick={() => setReceipt(null)} className="flex-1 py-3 rounded-xl text-sm font-bold glass hover:bg-white/10">Close</button>
              <button onClick={() => window.print()} className="flex-1 py-3 rounded-xl text-sm font-black"
                      style={{ background: 'linear-gradient(135deg,#D4A017,#F0C040)', color: '#0A1628' }}>
                🖨️ Print
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
