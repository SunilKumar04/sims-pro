'use client';
// src/components/ui/Confirm.tsx
// Professional confirm dialog — replaces browser confirm()
import { useState, useEffect, useCallback } from 'react';

interface ConfirmOptions {
  title:    string;
  message:  string;
  confirm?: string;
  cancel?:  string;
  danger?:  boolean;
}

type Resolver = (value: boolean) => void;

// ── Global trigger ────────────────────────────────────────────────
let _show: ((opts: ConfirmOptions) => Promise<boolean>) | null = null;

export function confirm(opts: ConfirmOptions | string): Promise<boolean> {
  const options: ConfirmOptions = typeof opts === 'string'
    ? { title: 'Confirm', message: opts, danger: true }
    : opts;

  if (_show) return _show(options);
  // Fallback to browser confirm before provider mounts
  return Promise.resolve(window.confirm(options.message));
}

// ── Provider ──────────────────────────────────────────────────────
export function ConfirmProvider() {
  const [state,    setState]   = useState<(ConfirmOptions & { resolver: Resolver }) | null>(null);
  const [visible,  setVisible] = useState(false);
  const [leaving,  setLeaving] = useState(false);

  const show = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setState({ ...opts, resolver: resolve });
      setTimeout(() => setVisible(true), 10);
    });
  }, []);

  useEffect(() => {
    _show = show;
    return () => { _show = null; };
  }, [show]);

  const respond = (value: boolean) => {
    setLeaving(true);
    setTimeout(() => {
      state?.resolver(value);
      setState(null);
      setVisible(false);
      setLeaving(false);
    }, 200);
  };

  if (!state) return null;

  return (
    <div
      style={{
        position:      'fixed',
        inset:         0,
        zIndex:        10000,
        display:       'flex',
        alignItems:    'center',
        justifyContent:'center',
        padding:       16,
        background:    `rgba(0,0,0,${visible && !leaving ? 0.7 : 0})`,
        backdropFilter: visible && !leaving ? 'blur(8px)' : 'none',
        transition:    'all 0.2s ease',
      }}
      onClick={() => respond(false)}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:   '#0F2044',
          border:       `1px solid ${state.danger ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: 20,
          padding:      '32px',
          width:        '100%',
          maxWidth:     420,
          boxShadow:    '0 24px 60px rgba(0,0,0,0.6)',
          fontFamily:   "'Outfit', sans-serif",
          transform:    visible && !leaving ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.96)',
          opacity:      visible && !leaving ? 1 : 0,
          transition:   'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
        {/* Icon */}
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: state.danger ? 'rgba(239,68,68,0.12)' : 'rgba(212,160,23,0.12)',
          border: `1px solid ${state.danger ? 'rgba(239,68,68,0.3)' : 'rgba(212,160,23,0.3)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, marginBottom: 20,
        }}>
          {state.danger ? '🗑️' : '❓'}
        </div>

        {/* Title */}
        <h3 style={{ fontSize: 18, fontWeight: 800, color: 'white', marginBottom: 8 }}>
          {state.title}
        </h3>

        {/* Message */}
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55, marginBottom: 28 }}>
          {state.message}
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => respond(false)}
            style={{
              flex: 1, padding: '11px 16px', borderRadius: 12,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}>
            {state.cancel || 'Cancel'}
          </button>
          <button
            onClick={() => respond(true)}
            style={{
              flex: 1, padding: '11px 16px', borderRadius: 12,
              background: state.danger
                ? 'linear-gradient(135deg,#dc2626,#ef4444)'
                : 'linear-gradient(135deg,#D4A017,#F0C040)',
              border: 'none',
              color: state.danger ? 'white' : '#0A1628',
              fontSize: 14, fontWeight: 800,
              cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
              transition: 'filter 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
            onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}>
            {state.confirm || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
