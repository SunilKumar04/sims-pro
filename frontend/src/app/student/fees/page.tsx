'use client';
// src/app/student/fees/page.tsx
import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { feesApi } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/components/ui/Toast';

export default function StudentFees() {
  const [feeData,  setFeeData]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [receipt,  setReceipt]  = useState<any>(null);
  const user = getUser();

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    feesApi.getByStudent(user?.id)
      .then(r => setFeeData(r.data.data||[]))
      .catch(() => {
        // Demo fallback
        setFeeData([{
          id:'demo-1', term:'Term 1 – 2024', amount:15000, paid:15000,
          status:'PAID', paidDate:'2024-01-10', receiptNo:'REC-2024-S001',
          tuition:12000, transport:2000, lab:1000, sports:500,
        }]);
      })
      .finally(()=>setLoading(false));
  }, []);

  const latest = feeData[0];
  const feeStatus = latest?.status || 'PENDING';
  const feeColors: Record<string,{col:string;bg:string;border:string}> = {
    PAID:    {col:'#86EFAC',bg:'rgba(34,197,94,0.12)',  border:'rgba(34,197,94,0.3)'  },
    PENDING: {col:'#FCA5A5',bg:'rgba(239,68,68,0.12)',  border:'rgba(239,68,68,0.3)'  },
    PARTIAL: {col:'#FCD34D',bg:'rgba(245,158,11,0.12)', border:'rgba(245,158,11,0.3)' },
  };
  const fc = feeColors[feeStatus]||feeColors.PENDING;

  if (loading) return <AppShell title="My Fees" subtitle="Fee status & payment"><div className="skeleton h-96 rounded-2xl"/></AppShell>;

  return (
    <AppShell title="My Fees" subtitle="Fee status & payment history">

      {/* STATUS BANNER */}
      <div className="rounded-2xl p-5 mb-6 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:p-6"
           style={{background:fc.bg,border:`1px solid ${fc.border}`}}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
             style={{background:fc.bg,border:`1px solid ${fc.border}`}}>
          {feeStatus==='PAID'?'✅':feeStatus==='PARTIAL'?'⚠️':'❌'}
        </div>
        <div className="flex-1">
          <div className="text-xl font-black" style={{color:fc.col}}>
            {feeStatus==='PAID'?'All Fees Paid — Thank You!':feeStatus==='PARTIAL'?'Partial Payment Received':'Fee Payment Pending'}
          </div>
          <p className="text-sm mt-1" style={{color:'rgba(255,255,255,0.5)'}}>
            {feeStatus==='PAID'
              ? `Receipt No: ${latest?.receiptNo||'—'} · Paid on ${latest?.paidDate?.slice(0,10)||'—'}`
              : feeStatus==='PARTIAL'
              ? `₹${((latest?.amount||0)-(latest?.paid||0)).toLocaleString()} remaining — please pay before the due date`
              : 'Please pay your fees before the due date to avoid late fee charges'}
          </p>
        </div>
        {feeStatus!=='PAID' && (
          <button
            onClick={()=>toast.info('💳 Online Payment Coming Soon', 'Please pay at the school accounts office. Account: GNPSS-2024 · IFSC: SBIN0001234')}
            className="w-full px-6 py-3 rounded-xl text-sm font-black transition-all hover:-translate-y-0.5 flex-shrink-0 sm:w-auto"
            style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
            💳 Pay Now
          </button>
        )}
      </div>

      {/* FEE BREAKDOWN */}
      {latest && (
        <div className="grid grid-cols-1 gap-6 mb-6 xl:grid-cols-2">
          <div className="glass rounded-2xl p-6">
            <h3 className="text-sm font-bold text-white mb-4">💰 Fee Breakdown — {latest.term}</h3>
            <div className="space-y-3">
              {[
                ['Tuition Fee',   latest.tuition   || Math.round(latest.amount*0.8)],
                ['Transport Fee', latest.transport || 2000],
                ['Lab Fee',       latest.lab       || 1000],
                ['Sports Fee',    latest.sports    || 500],
              ].map(([label,amount])=>(
                <div key={label as string} className="flex items-center justify-between py-2.5 px-4 rounded-xl"
                     style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
                  <span className="text-sm" style={{color:'rgba(255,255,255,0.6)'}}>{label}</span>
                  <span className="text-sm font-bold text-white">₹{(amount as number).toLocaleString()}</span>
                </div>
              ))}
              <div className="flex items-center justify-between py-3 px-4 rounded-xl mt-2"
                   style={{background:'rgba(212,160,23,0.1)',border:'1px solid rgba(212,160,23,0.25)'}}>
                <span className="text-sm font-black text-yellow-400">Total Amount</span>
                <span className="text-lg font-black text-yellow-400">₹{latest.amount?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <h3 className="text-sm font-bold text-white mb-4">📊 Payment Summary</h3>
            <div className="space-y-4">
              {[
                {label:'Total Fee',     value:latest.amount,           col:'rgba(255,255,255,0.7)'},
                {label:'Amount Paid',   value:latest.paid||0,          col:'#86EFAC'},
                {label:'Balance Due',   value:latest.amount-latest.paid||0, col:latest.paid===latest.amount?'#86EFAC':'#FCA5A5'},
              ].map(r=>(
                <div key={r.label}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs font-bold" style={{color:'rgba(255,255,255,0.4)'}}>{r.label}</span>
                    <span className="text-sm font-black" style={{color:r.col}}>₹{(r.value||0).toLocaleString()}</span>
                  </div>
                </div>
              ))}
              <div className="w-full h-3 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.07)'}}>
                <div className="h-full rounded-full transition-all"
                     style={{width:`${latest.amount ? Math.round((latest.paid/latest.amount)*100) : 0}%`,background:'#22C55E'}}/>
              </div>
              <div className="text-xs text-center" style={{color:'rgba(255,255,255,0.4)'}}>
                {latest.amount ? Math.round((latest.paid/latest.amount)*100) : 0}% paid
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {feeStatus==='PAID'
                ? <button onClick={()=>setReceipt(latest)}
                          className="w-full py-3 rounded-xl text-sm font-black transition-all hover:-translate-y-0.5 glass hover:bg-white/10">
                    🧾 Download Receipt
                  </button>
                : <button onClick={()=>toast.info('Payment Required', 'Please visit the school office or wait for online payment to be enabled.')}
                          className="w-full py-3 rounded-xl text-sm font-black transition-all hover:-translate-y-0.5"
                          style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
                    💳 Pay ₹{((latest.amount||0)-(latest.paid||0)).toLocaleString()} Now
                  </button>
              }
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT HISTORY */}
      {feeData.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-6 py-4" style={{borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
            <h3 className="text-sm font-bold text-white">📋 Payment History</h3>
          </div>
          <div className="space-y-3 p-4 md:hidden">
            {feeData.map(f => {
              const bal = f.amount - (f.paid||0);
              const sc = feeColors[f.status]||feeColors.PENDING;
              return (
                <div key={f.id} className="rounded-2xl p-4" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="text-sm font-bold text-white">{f.term}</div>
                      <div className="text-xs mt-1" style={{color:'rgba(255,255,255,0.4)'}}>Paid on {f.paidDate?.slice(0,10)||'—'}</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{background:sc.bg,color:sc.col,border:`1px solid ${sc.border}`}}>{f.status}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl p-2" style={{background:'rgba(255,255,255,0.04)'}}>
                      <div className="text-[11px] text-white/35">Total</div>
                      <div className="text-sm font-bold text-white">₹{f.amount?.toLocaleString()}</div>
                    </div>
                    <div className="rounded-xl p-2" style={{background:'rgba(255,255,255,0.04)'}}>
                      <div className="text-[11px] text-white/35">Paid</div>
                      <div className="text-sm font-bold text-green-400">₹{(f.paid||0).toLocaleString()}</div>
                    </div>
                    <div className="rounded-xl p-2" style={{background:'rgba(255,255,255,0.04)'}}>
                      <div className="text-[11px] text-white/35">Due</div>
                      <div className="text-sm font-bold" style={{color:bal>0?'#FCA5A5':'#86EFAC'}}>₹{bal.toLocaleString()}</div>
                    </div>
                  </div>
                  {f.status==='PAID' && (
                    <button onClick={()=>setReceipt(f)} className="mt-3 text-xs font-bold text-yellow-400 hover:text-yellow-300">🧾 View receipt</button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="sims-table">
              <thead>
                <tr><th>Term</th><th>Total Amount</th><th>Paid</th><th>Balance</th><th>Payment Date</th><th>Status</th><th>Receipt</th></tr>
              </thead>
              <tbody>
                {feeData.map(f=>{
                  const bal = f.amount - (f.paid||0);
                  const sc = feeColors[f.status]||feeColors.PENDING;
                  return (
                    <tr key={f.id}>
                      <td className="font-bold text-white">{f.term}</td>
                      <td>₹{f.amount?.toLocaleString()}</td>
                      <td className="font-bold" style={{color:'#86EFAC'}}>₹{(f.paid||0).toLocaleString()}</td>
                      <td className="font-bold" style={{color:bal>0?'#FCA5A5':'#86EFAC'}}>₹{bal.toLocaleString()}</td>
                      <td style={{color:'rgba(255,255,255,0.45)'}}>{f.paidDate?.slice(0,10)||'—'}</td>
                      <td><span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{background:sc.bg,color:sc.col,border:`1px solid ${sc.border}`}}>{f.status}</span></td>
                      <td>
                        {f.status==='PAID'
                          ? <button onClick={()=>setReceipt(f)} className="text-xs font-bold text-yellow-400 hover:text-yellow-300">🧾 View</button>
                          : <span style={{color:'rgba(255,255,255,0.25)'}}>—</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{background:'rgba(0,0,0,0.8)',backdropFilter:'blur(8px)'}}>
          <div className="w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
               style={{background:'#0F2044',border:'1px solid rgba(255,255,255,0.1)'}}>
            <div className="text-center px-5 py-6 sm:px-8 sm:py-7" style={{background:'linear-gradient(160deg,#0F2044,#162952)',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
              <div className="text-4xl mb-2">🎓</div>
              <div className="text-lg font-black text-white">Guru Nanak Public Sr. Sec. School</div>
              <div className="text-xs mt-1" style={{color:'rgba(255,255,255,0.4)'}}>Ludhiana, Punjab · CBSE Affiliated</div>
              <div className="text-xs font-black mt-2 text-yellow-400 uppercase tracking-wider">Official Fee Receipt</div>
            </div>
            <div className="px-5 py-5 space-y-2 sm:px-8">
              {([
                ['Student',       user?.name||'—'],
                ['Class',         user?.className||'—'],
                ['Roll No',       user?.roll||'—'],
                ['Receipt No',    receipt.receiptNo||'—'],
                ['Term',          receipt.term],
                ['Payment Date',  receipt.paidDate?.slice(0,10)||'—'],
                ['Total Fee',     `₹${receipt.amount?.toLocaleString()}`],
              ] as [string,string][]).map(([label,value])=>(
                <div key={label} className="flex justify-between items-center py-2 px-3 rounded-lg"
                     style={{background:'rgba(255,255,255,0.03)',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                  <span className="text-xs" style={{color:'rgba(255,255,255,0.45)'}}>{label}</span>
                  <span className="text-sm font-semibold text-white">{value}</span>
                </div>
              ))}
              <div className="flex justify-between items-center py-3 px-3 rounded-xl mt-2"
                   style={{background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.25)'}}>
                <span className="text-sm font-bold text-green-400">Amount Paid</span>
                <span className="text-xl font-black text-green-400">₹{receipt.paid?.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex gap-3 px-5 pb-6 sm:px-8 sm:pb-7">
              <button onClick={()=>setReceipt(null)} className="flex-1 py-3 rounded-xl text-sm font-bold glass hover:bg-white/10">Close</button>
              <button onClick={()=>window.print()} className="flex-1 py-3 rounded-xl text-sm font-black hover:-translate-y-0.5 transition-all"
                      style={{background:'linear-gradient(135deg,#D4A017,#F0C040)',color:'#0A1628'}}>
                🖨️ Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
