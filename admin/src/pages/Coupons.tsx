import { useState, useEffect } from 'react';
import { getCoupons, createCoupon, toggleCoupon } from '../api';

export function Coupons() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ code: '', discountPct: 10, maxUses: 1 });
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await getCoupons();
      setCoupons(res.coupons || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) return;
    setCreating(true);
    try {
      await createCoupon(form);
      showToast(`Cupom ${form.code} criado.`);
      setShowCreate(false);
      setForm({ code: '', discountPct: 10, maxUses: 1 });
      load();
    } catch (err: any) {
      showToast(`Erro: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await toggleCoupon(id, active);
      showToast(`Cupom ${active ? 'ativado' : 'desativado'}.`);
      load();
    } catch (err: any) {
      showToast(`Erro: ${err.message}`);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    showToast('Codigo copiado.');
  };

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1>Cupons</h1>
          <p>{coupons.length} cupons cadastrados</p>
        </div>
        <button className="btn btn--primary" onClick={() => setShowCreate(true)}>
          + Novo cupom
        </button>
      </div>

      {loading ? (
        <div className="page-loading"><div className="spinner" /> Carregando...</div>
      ) : coupons.length === 0 ? (
        <div className="empty-state">Nenhum cupom criado ainda.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Codigo</th>
              <th>Desconto</th>
              <th>Usos</th>
              <th>Status</th>
              <th>Criado em</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c: any) => {
              const exhausted = c.current_uses >= c.max_uses;
              return (
                <tr key={c.id}>
                  <td>
                    <span className="mono copyable" onClick={() => copyCode(c.code)} title="Clique pra copiar">
                      {c.code}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${c.discount_pct === 100 ? 'badge--vitalicio' : 'badge--mensal'}`}>
                      {c.discount_pct}%
                    </span>
                  </td>
                  <td className="mono">
                    <span className={exhausted ? 'text-danger' : ''}>
                      {c.current_uses} / {c.max_uses}
                    </span>
                  </td>
                  <td>
                    {!c.active ? (
                      <span className="badge badge--revoked">inativo</span>
                    ) : exhausted ? (
                      <span className="badge badge--expired">esgotado</span>
                    ) : (
                      <span className="badge badge--active">ativo</span>
                    )}
                  </td>
                  <td className="mono">{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                  <td>
                    <button
                      className={`btn btn--sm ${c.active ? 'btn--danger' : 'btn--primary'}`}
                      onClick={() => handleToggle(c.id, !c.active)}
                    >
                      {c.active ? 'Desativar' : 'Ativar'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Novo cupom</h3>
            <form onSubmit={handleCreate}>
              <label>Codigo do cupom</label>
              <input
                className="search-input"
                value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="EX: SPONSOR50"
                required
                autoFocus
              />
              <label>Desconto (%)</label>
              <input
                className="search-input"
                type="number"
                min={1}
                max={100}
                value={form.discountPct}
                onChange={e => setForm({ ...form, discountPct: +e.target.value })}
                required
              />
              {form.discountPct === 100 && (
                <p className="hint hint--accent">100% = gera licenca direto sem Stripe</p>
              )}
              <label>Limite de usos</label>
              <input
                className="search-input"
                type="number"
                min={1}
                value={form.maxUses}
                onChange={e => setForm({ ...form, maxUses: +e.target.value })}
                required
              />
              <div className="modal__actions">
                <button type="button" className="btn btn--ghost" onClick={() => setShowCreate(false)}>Cancelar</button>
                <button type="submit" className="btn btn--primary" disabled={creating}>
                  {creating ? 'Criando...' : 'Criar cupom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
