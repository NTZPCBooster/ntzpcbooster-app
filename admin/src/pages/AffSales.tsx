import { useState, useEffect, useCallback } from 'react';
import { affiliateSales } from '../api';

export function AffSales() {
  const [sales, setSales] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const perPage = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await affiliateSales(page);
      setSales(res.sales || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / perPage);
  const fmt = (v: number) => `R$ ${(v / 100).toFixed(2)}`;

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1>Minhas vendas</h1>
          <p>{total} vendas no total</p>
        </div>
      </div>

      {loading ? (
        <div className="page-loading"><div className="spinner" /> Carregando...</div>
      ) : sales.length === 0 ? (
        <div className="empty-state">Nenhuma venda ainda.</div>
      ) : (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>Email do comprador</th>
                <th>Valor</th>
                <th>Sua comissao</th>
                <th>Cupom</th>
                <th>Status</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s: any) => {
                const isPending = s.refund_grace_until && new Date(s.refund_grace_until) > new Date();
                return (
                  <tr key={s.id}>
                    <td>{s.buyer_email}</td>
                    <td className="mono">{fmt(s.amount)}</td>
                    <td className="mono">{fmt(s.commission_amount)}</td>
                    <td className="mono">{s.coupon_code_used}</td>
                    <td>
                      <span className={`badge badge--${s.status === 'refunded' ? 'refunded' : isPending ? 'pending' : 'active'}`}>
                        {s.status === 'refunded' ? 'reembolsado' : isPending ? 'em garantia' : 'confirmada'}
                      </span>
                    </td>
                    <td className="mono">{new Date(s.created_at).toLocaleDateString('pt-BR')}</td>
                  </tr>
                );
              })}
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
