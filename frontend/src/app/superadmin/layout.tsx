export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#07111f', color: '#fff' }}>
      <header style={{ padding: '18px 28px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>SIMS SaaS</div>
          <div style={{ fontSize: 12, opacity: 0.55 }}>Super Admin Console</div>
        </div>
        <nav style={{ display: 'flex', gap: 18, fontSize: 14, opacity: 0.8 }}>
          <a href="/superadmin/dashboard">Dashboard</a>
          <a href="/superadmin/schools">Schools</a>
          <a href="/superadmin/plans">Plans</a>
          <a href="/superadmin/subscriptions">Subscriptions</a>
          <a href="/superadmin/analytics">Analytics</a>
        </nav>
      </header>
      <main style={{ padding: 28 }}>{children}</main>
    </div>
  );
}
