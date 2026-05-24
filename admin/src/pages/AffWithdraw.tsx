import { useState, useEffect } from 'react';
import { affiliateDashboard, affiliateWithdraw } from '../api';

export function AffWithdraw() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await affiliateDashboard();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = Math.round(parseFloat(amount) * 100);
    if (isNaN(cents) || cents < 1000) {
      showToast('Valor minimo: R$ 10,00');
      return;
    }
    if (!pixKey.trim()) {
      showToast('Informe sua chave PIX.');
      return;
    }
    setSubmitting(true);
    try {
      await affiliateWithdraw(cents, pixKey.trim());
      showToast('Saque solicitado! Aguarde aprovacao.');
      setAmount('');
      setPixKey('');
      load();
    } catch (err: any) {
      showToast(`Erro: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (v: number) => `R$ ${(v / 100).toFixed(2)}`;
  const available = data?.balance_available || 0;

  if (loading) {
    return <div className="page-loading"><div className="spinner" /> Carregando...</div>;
  }

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1>Solicitar saque</h1>
          <p>Saldo disponivel: <strong className="accent">{fmt(available)}</strong></p>
        </div>
      </div>

      {available < 1000 ? (
        <div className="info-box">
          Saldo minimo pra saque: <strong>R$ 10,00</strong>.
          Continue divulgando seu cupom pra acumular comissoes!
        </div>
      ) : (
        <div className="withdraw-card">
          <form onSubmit={handleSubmit}>
            <label>Valor do saque (R$)</label>
            <input
              className="search-input"
              type="number"
              step="0.01"
              min="10"
              max={(available / 100).toFixed(2)}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Ex: 50.00"
              required
            />
            <label>Chave PIX</label>
            <input
              className="search-input"
              value={pixKey}
              onChange={e => setPixKey(e.target.value)}
              placeholder="CPF, email, telefone ou chave aleatoria"
              required
            />
            <div className="modal__actions" style={{ marginTop: 20 }}>
              <button type="submit" className="btn btn--primary" disabled={submitting}>
                {submitting ? 'Solicitando...' : 'Solicitar saque'}
              </button>
            </div>
          </form>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
