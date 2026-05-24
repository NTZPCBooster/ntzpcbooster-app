import { useState } from 'react';
import { affiliateLogin } from '../api';

interface LoginProps {
  onLogin: (token: string, role: 'admin' | 'affiliate', name?: string) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [tab, setTab] = useState<'admin' | 'affiliate'>('admin');
  const [secret, setSecret] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret.trim()) return;
    setLoading(true);
    setError('');
    try {
      const API_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || '';
      const API_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
      const res = await fetch(`${API_URL}/admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': API_KEY,
          'Authorization': `Bearer ${secret}`,
        },
        body: JSON.stringify({ action: 'admin.overview' }),
      });
      if (!res.ok) throw new Error('Senha incorreta');
      onLogin(secret, 'admin');
    } catch {
      setError('Senha admin incorreta.');
    } finally {
      setLoading(false);
    }
  };

  const handleAffiliate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await affiliateLogin(email.trim(), password);
      onLogin(res.token, 'affiliate', res.name);
    } catch (err: any) {
      setError(err.message || 'Credenciais invalidas.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <div className="login__card">
        <div className="login__logo">
          <img src="/favicon.png" alt="NTZ" width={32} height={32} style={{ borderRadius: 6 }} />
          <span>NTZ PCBooster</span>
        </div>

        <div className="login__tabs">
          <button
            className={`login__tab ${tab === 'admin' ? 'is-active' : ''}`}
            onClick={() => { setTab('admin'); setError(''); }}
          >
            Admin
          </button>
          <button
            className={`login__tab ${tab === 'affiliate' ? 'is-active' : ''}`}
            onClick={() => { setTab('affiliate'); setError(''); }}
          >
            Afiliado
          </button>
        </div>

        {tab === 'admin' ? (
          <form onSubmit={handleAdmin}>
            <label className="login__label">Senha admin</label>
            <input
              type="password"
              className="login__input"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="ADMIN_SECRET"
              autoFocus
            />
            {error && <div className="login__error">{error}</div>}
            <button className="btn btn--primary login__submit" type="submit" disabled={loading}>
              {loading ? 'Verificando...' : 'Entrar como admin'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleAffiliate}>
            <label className="login__label">Email</label>
            <input
              type="email"
              className="login__input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              autoFocus
            />
            <label className="login__label" style={{ marginTop: 12 }}>Senha</label>
            <input
              type="password"
              className="login__input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
            />
            {error && <div className="login__error">{error}</div>}
            <button className="btn btn--primary login__submit" type="submit" disabled={loading}>
              {loading ? 'Verificando...' : 'Entrar como afiliado'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
