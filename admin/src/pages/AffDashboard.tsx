import { useState, useEffect } from 'react';
import { affiliateDashboard } from '../api';

export function AffDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    affiliateDashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="page-loading"><div className="spinner" /> Carregando...</div>;
  }

  if (!data) {
    return <div className="empty-state">Erro ao carregar dados.</div>;
  }

  const fmt = (v: number) => `R$ ${(v / 100).toFixed(2)}`;

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1>Meu painel</h1>
          <p>Cupom: <span className="mono">{data.coupon_code}</span></p>
        </div>
      </div>

      <div className="cards-grid">
        <div className="stat-card">
          <div className="stat-card__label">Total de vendas</div>
          <div className="stat-card__value">{data.total_sales || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Comissao total</div>
          <div className="stat-card__value">{fmt(data.total_commission || 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Disponivel p/ saque</div>
          <div className="stat-card__value accent">{fmt(data.balance_available || 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Ja sacado</div>
          <div className="stat-card__value">{fmt(data.total_withdrawn || 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Comissao pendente</div>
          <div className="stat-card__value">{fmt(data.commission_pending || 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Sua comissao</div>
          <div className="stat-card__value">{data.commission_pct}%</div>
        </div>
      </div>

      <div className="info-box">
        <strong>Como funciona:</strong> Voce recebe {data.commission_pct}% de cada venda feita com seu cupom.
        A comissao fica disponivel pra saque 14 dias apos a venda (periodo de reembolso).
      </div>
    </div>
  );
}
