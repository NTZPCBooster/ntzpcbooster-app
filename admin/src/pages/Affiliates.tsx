import { useState, useEffect } from 'react';
import { getAffiliates, createAffiliate, toggleAffiliate } from '../api';

export function Affiliates() {
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', couponCode: '', password: '', commissionPct: 20, discountPct: 10 });
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await getAffiliates();
      setAffiliates(res.affiliates || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createAffiliate(form);
      showToastMsg(`Afiliado ${form.name} criado.`);
      setShowCreate(false);
      setForm({ name: '', email: '', couponCode: '', password: '', commissionPct: 20, discountPct: 10 });
      load();
    } catch (err: any) {
      showToastMsg(`Erro: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await toggleAffiliate(id, active);
      showToastMsg(`Afiliado ${active ? 'ativado' : 'desativado'}.`);
      load();
    } catch (err: any) {
      showToastMsg(`Erro: ${err.message}`);
    }
  };

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1>Afiliados</h1>
          <p>{affiliates.length} afiliados cadastrados</p>
        </div>
        <button className="btn btn--primary" onClick={() => setShowCreate(true)}>
          + Novo afiliado
        </button>
      </div>

      {loading ? (
        <div className="page-loading"><div className="spinner" /> Carregando...</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Cupom</th>
              <th>Comissao</th>
              <th>Desconto</th>
              <th>Vendas</th>
              <th>Comissao total</th>
              <th>Status</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {affiliates.map((a: any) => (
              <tr key={a.affiliate_id}>
                <td>{a.name}</td>
                <td>{a.email}</td>
                <td className="mono">{a.coupon_code}</td>
                <td>{a.commission_pct}%</td>
                <td>{a.discount_pct}%</td>
                <td>{a.total_sales}</td>
                <td className="mono">R$ {((a.total_commission || 0) / 100).toFixed(2)}</td>
                <td>
                  <span className={`badge badge--${a.active ? 'active' : 'revoked'}`}>
                    {a.active ? 'ativo' : 'inativo'}
                  </span>
                </td>
                <td>
                  <button
                    className={`btn btn--sm ${a.active ? 'btn--danger' : 'btn--primary'}`}
                    onClick={() => handleToggle(a.affiliate_id, !a.active)}
                  >
                    {a.active ? 'Desativar' : 'Ativar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="modal modal--wide" onClick={e => e.stopPropagation()}>
            <h3>Novo afiliado</h3>
            <form onSubmit={handleCreate} className="form-grid">
              <div>
                <label>Nome</label>
                <input className="search-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label>Email</label>
                <input className="search-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div>
                <label>Cupom</label>
                <input className="search-input" value={form.couponCode} onChange={e => setForm({ ...form, couponCode: e.target.value.toUpperCase() })} placeholder="EX: GAMER10" required />
              </div>
              <div>
                <label>Senha</label>
                <input className="search-input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
              </div>
              <div>
                <label>Comissao (%)</label>
                <input className="search-input" type="number" value={form.commissionPct} onChange={e => setForm({ ...form, commissionPct: +e.target.value })} />
              </div>
              <div>
                <label>Desconto (%)</label>
                <input className="search-input" type="number" value={form.discountPct} onChange={e => setForm({ ...form, discountPct: +e.target.value })} />
              </div>
              <div className="modal__actions" style={{ gridColumn: '1 / -1' }}>
                <button type="button" className="btn btn--ghost" onClick={() => setShowCreate(false)}>Cancelar</button>
                <button type="submit" className="btn btn--primary" disabled={creating}>{creating ? 'Criando...' : 'Criar afiliado'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
