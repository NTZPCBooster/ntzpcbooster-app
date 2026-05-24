import { useState, useEffect } from 'react';
import { getWithdrawals, processWithdrawal } from '../api';

export function Withdrawals() {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [filter, setFilter] = useState<'pending' | 'paid' | 'rejected'>('pending');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await getWithdrawals(filter);
      setWithdrawals(res.withdrawals || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleProcess = async (id: string, approve: boolean) => {
    const action = approve ? 'aprovar' : 'rejeitar';
    if (!confirm(`Deseja ${action} este saque?`)) return;

    setProcessing(id);
    try {
      await processWithdrawal(id, approve);
      showToast(`Saque ${approve ? 'aprovado' : 'rejeitado'}.`);
      load();
    } catch (err: any) {
      showToast(`Erro: ${err.message}`);
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="page">
      <div className="page__header">
        <h1>Saques</h1>
        <p>Solicitacoes de saque dos afiliados</p>
      </div>

      <div className="toolbar">
        <div className="filter-group">
          {(['pending', 'paid', 'rejected'] as const).map(f => (
            <button
              key={f}
              className={`btn btn--sm ${filter === f ? 'btn--primary' : 'btn--ghost'}`}
              onClick={() => setFilter(f)}
            >
              {f === 'pending' ? 'Pendentes' : f === 'paid' ? 'Pagos' : 'Rejeitados'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="page-loading"><div className="spinner" /> Carregando...</div>
      ) : withdrawals.length === 0 ? (
        <div className="empty-state">Nenhum saque {filter === 'pending' ? 'pendente' : filter === 'paid' ? 'pago' : 'rejeitado'}.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Afiliado</th>
              <th>Email</th>
              <th>Cupom</th>
              <th>Valor</th>
              <th>PIX</th>
              <th>Data</th>
              {filter === 'pending' && <th>Acoes</th>}
            </tr>
          </thead>
          <tbody>
            {withdrawals.map((w: any) => (
              <tr key={w.id}>
                <td>{w.affiliates?.name || '—'}</td>
                <td>{w.affiliates?.email || '—'}</td>
                <td className="mono">{w.affiliates?.coupon_code || '—'}</td>
                <td className="mono">R$ {(w.amount / 100).toFixed(2)}</td>
                <td className="mono">{w.pix_key || '—'}</td>
                <td className="mono">{new Date(w.requested_at).toLocaleDateString('pt-BR')}</td>
                {filter === 'pending' && (
                  <td>
                    <div className="action-btns">
                      <button
                        className="btn btn--sm btn--primary"
                        onClick={() => handleProcess(w.id, true)}
                        disabled={processing === w.id}
                      >
                        Aprovar
                      </button>
                      <button
                        className="btn btn--sm btn--danger"
                        onClick={() => handleProcess(w.id, false)}
                        disabled={processing === w.id}
                      >
                        Rejeitar
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
