export default function SuperAdminHomePage() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
      <h1 style={{ fontSize: 36, fontWeight: 900, marginBottom: 12 }}>Super Admin Console</h1>
      <p style={{ opacity: 0.75, marginBottom: 24 }}>
        Manage schools, plans, subscriptions, and SaaS metrics from one place.
      </p>
      <a href="/superadmin/login" style={{ display: 'inline-block', padding: '12px 22px', borderRadius: 10, background: '#f0c040', color: '#07111f', fontWeight: 800 }}>
        Go to Login
      </a>
    </div>
  );
}
