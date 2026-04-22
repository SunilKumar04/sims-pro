'use client';
// src/components/ui/Toast.tsx
// Global toast notification system — drop-in replacement for alert()
import { useEffect, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id:      string;
  type:    ToastType;
  title:   string;
  message?: string;
}

// ── Global event bus ──────────────────────────────────────────────
let _emit: ((t: Omit<Toast,'id'>) => void) | null = null;

export function toast(type: ToastType, title: string, message?: string) {
  if (_emit) {
    _emit({ type, title, message });
  } else {
    // Fallback: queue until provider mounts
    setTimeout(() => { if (_emit) _emit({ type, title, message }); }, 100);
  }
}

// Convenience helpers
toast.success = (title: string, msg?: string) => toast('success', title, msg);
toast.error   = (title: string, msg?: string) => toast('error',   title, msg);
toast.warning = (title: string, msg?: string) => toast('warning', title, msg);
toast.info    = (title: string, msg?: string) => toast('info',    title, msg);

// ── Style map ──────────────────────────────────────────────────────
const STYLE: Record<ToastType, { icon:string; bg:string; border:string; iconBg:string; titleCol:string }> = {
  success: { icon:'✅', bg:'rgba(5,13,26,0.98)',  border:'rgba(34,197,94,0.5)',  iconBg:'rgba(34,197,94,0.15)',  titleCol:'#86EFAC' },
  error:   { icon:'❌', bg:'rgba(5,13,26,0.98)',  border:'rgba(239,68,68,0.5)',  iconBg:'rgba(239,68,68,0.15)',  titleCol:'#FCA5A5' },
  warning: { icon:'⚠️', bg:'rgba(5,13,26,0.98)',  border:'rgba(245,158,11,0.5)', iconBg:'rgba(245,158,11,0.15)', titleCol:'#FCD34D' },
  info:    { icon:'ℹ️', bg:'rgba(5,13,26,0.98)',  border:'rgba(30,144,255,0.5)', iconBg:'rgba(30,144,255,0.15)', titleCol:'#93C5FD' },
};

// ── Provider (mount once in layout) ──────────────────────────────
export function ToastProvider() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((t: Omit<Toast,'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev.slice(-4), { ...t, id }]); // max 5 at once
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 4500);
  }, []);

  useEffect(() => { _emit = add; return () => { _emit = null; }; }, [add]);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-5 right-5 z-[9999] flex flex-col gap-3"
      style={{ maxWidth: 380, minWidth: 320 }}>
      {toasts.map(t => (
        <ToastItem
          key={t.id}
          toast={t}
          onClose={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
        />
      ))}
    </div>
  );
}

// ── Single toast item ──────────────────────────────────────────────
function ToastItem({ toast: t, onClose }: { toast: Toast; onClose: () => void }) {
  const [visible, setVisible] = useState(false);
  const s = STYLE[t.type];

  useEffect(() => {
    // Animate in
    const tin = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(tin);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      onClick={handleClose}
      style={{
        background:   s.bg,
        border:       `1px solid ${s.border}`,
        borderLeft:   `4px solid ${s.titleCol}`,
        borderRadius: 14,
        padding:      '14px 16px',
        display:      'flex',
        alignItems:   'flex-start',
        gap:          12,
        boxShadow:    '0 8px 32px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(20px)',
        cursor:       'pointer',
        transform:    visible ? 'translateX(0) scale(1)' : 'translateX(100%) scale(0.95)',
        opacity:      visible ? 1 : 0,
        transition:   'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        fontFamily:   "'Outfit', sans-serif",
      }}>
      {/* Icon */}
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: s.iconBg, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 18,
      }}>
        {s.icon}
      </div>
      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: s.titleCol, marginBottom: 2 }}>
          {t.title}
        </div>
        {t.message && (
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.45 }}>
            {t.message}
          </div>
        )}
      </div>
      {/* Close */}
      <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 16, flexShrink: 0, marginTop: 1, fontWeight: 700 }}>✕</div>
    </div>
  );
}
