import { useState, useEffect, useCallback } from 'react';
import { getPayments } from '../api';

export function Payments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const perPage = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPayments(page);
      setPayments(res.payments || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="page">
      <div className="page__header">
        <h1>Pagamentos</h1>
        <p>{total} pagamentos registrados</p>
      </div>

      {loading ? (
        <div className="page-loading"><div className="spinner" /> Carregando...</div>
      ) : (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Valor</th>
                <th>Licenca</th>
                <th>Plano</th>
                <th>Afiliado</th>
                <th>Comissao</th>
                <th>Status</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p: any) => (
                <tr key={p.id}>
                  <td>{p.buyer_email}</td>
                  <td className="mono">R$ {(p.amount / 100).toFixed(2)}</td>
                  <td className="mono">{p.licenses?.key || '—'}</td>
                  <td><span className={`badge badge--${p.licenses?.plan || 'pending'}`}>{p.licenses?.plan || '—'}</span></td>
                  <td>{p.affiliates?.name || '—'}</td>
                  <td className="mono">{p.commission_amount ? `R$ ${(p.commission_amount / 100).toFixed(2)}` : '—'}</td>
                  <td><span className={`badge badge--${p.status}`}>{p.status}</span></td>
                  <td className="mono">{new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
              <span className="mono">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Proximo</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
