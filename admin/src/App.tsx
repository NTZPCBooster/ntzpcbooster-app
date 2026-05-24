import { useState, useEffect } from 'react';
import { getAdminToken, setAdminToken, clearAdminToken, getUserRole, getUserName, getOverview, affiliateDashboard } from './api';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Licenses } from './pages/Licenses';
import { Coupons } from './pages/Coupons';
import { Affiliates } from './pages/Affiliates';
import { Payments } from './pages/Payments';
import { Withdrawals } from './pages/Withdrawals';
import { AffDashboard } from './pages/AffDashboard';
import { AffSales } from './pages/AffSales';
import { AffWithdraw } from './pages/AffWithdraw';

type AdminPage = 'dashboard' | 'licenses' | 'coupons' | 'affiliates' | 'payments' | 'withdrawals';
type AffPage = 'aff-dashboard' | 'aff-sales' | 'aff-withdraw';
type Page = AdminPage | AffPage;

const ADMIN_NAV: { id: AdminPage; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '◎' },
  { id: 'licenses', label: 'Licencas', icon: '⊡' },
  { id: 'coupons', label: 'Cupons', icon: '✦' },
  { id: 'affiliates', label: 'Afiliados', icon: '⊕' },
  { id: 'payments', label: 'Pagamentos', icon: '⊘' },
  { id: 'withdrawals', label: 'Saques', icon: '⊗' },
];

const AFF_NAV: { id: AffPage; label: string; icon: string }[] = [
  { id: 'aff-dashboard', label: 'Dashboard', icon: '◎' },
  { id: 'aff-sales', label: 'Minhas vendas', icon: '⊡' },
  { id: 'aff-withdraw', label: 'Solicitar saque', icon: '⊗' },
];

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [role, setRole] = useState<'admin' | 'affiliate' | ''>('');
  const [name, setName] = useState('');
  const [checking, setChecking] = useState(true);
  const [page, setPage] = useState<Page>('dashboard');

  // Check if stored token is still valid
  useEffect(() => {
    const token = getAdminToken();
    const storedRole = getUserRole();
    if (!token || !storedRole) { setChecking(false); return; }

    const check = storedRole === 'admin'
      ? getOverview()
      : affiliateDashboard();

    check
      .then(() => {
        setAuthed(true);
        setRole(storedRole as 'admin' | 'affiliate');
        setName(getUserName());
        setPage(storedRole === 'admin' ? 'dashboard' : 'aff-dashboard');
      })
      .catch(() => clearAdminToken())
      .finally(() => setChecking(false));
  }, []);

  const handleLogin = (token: string, loginRole: 'admin' | 'affiliate', loginName?: string) => {
    setAdminToken(token, loginRole, loginName || '');
    setAuthed(true);
    setRole(loginRole);
    setName(loginName || '');
    setPage(loginRole === 'admin' ? 'dashboard' : 'aff-dashboard');
  };

  const handleLogout = () => {
    clearAdminToken();
    setAuthed(false);
    setRole('');
    setName('');
  };

  if (checking) {
    return <div className="loading-screen"><div className="spinner" /><span>Verificando...</span></div>;
  }

  if (!authed) {
    return <Login onLogin={handleLogin} />;
  }

  const nav = role === 'admin' ? ADMIN_NAV : AFF_NAV;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar__logo">
          <img src="/favicon.png" alt="NTZ" width={28} height={28} style={{ borderRadius: 4 }} />
          <span className="sidebar__title">{role === 'admin' ? 'Admin' : name || 'Afiliado'}</span>
        </div>
        <nav className="sidebar__nav">
          {nav.map(n => (
            <button
              key={n.id}
              className={`nav-btn ${page === n.id ? 'is-active' : ''}`}
              onClick={() => setPage(n.id)}
            >
              <span className="nav-btn__icon">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>
        <button className="nav-btn nav-btn--logout" onClick={handleLogout}>
          Sair
        </button>
      </aside>
      <main className="main">
        {/* Admin pages */}
        {page === 'dashboard' && <Dashboard />}
        {page === 'licenses' && <Licenses />}
        {page === 'coupons' && <Coupons />}
        {page === 'affiliates' && <Affiliates />}
        {page === 'payments' && <Payments />}
        {page === 'withdrawals' && <Withdrawals />}

        {/* Affiliate pages */}
        {page === 'aff-dashboard' && <AffDashboard />}
        {page === 'aff-sales' && <AffSales />}
        {page === 'aff-withdraw' && <AffWithdraw />}
      </main>
    </div>
  );
}
