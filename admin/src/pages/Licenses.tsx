import { useState, useEffect, useCallback } from 'react';
import { getLicenses, createLicense, editLicense, revokeLicense, transferLicense } from '../api';

const DURATION_OPTIONS = [
  { value: '7', label: '7 dias' },
  { value: '30', label: '1 mes' },
  { value: '90', label: '3 meses' },
  { value: '365', label: '1 ano' },
  { value: 'lifetime', label: 'Vitalicio' },
];

export function Licenses() {
  const [licenses, setLicenses] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', plan: 'anual' as 'anual' | 'mensal' | 'vitalicio', duration: '365' });
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState('');

  // Edit modal
  const [editModal, setEditModal] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ email: '', plan: '', status: '', moboId: '' });
  const [editing, setEditing] = useState(false);

  // Transfer modal
  const [transferModal, setTransferModal] = useState<{ id: string; key: string } | null>(null);
  const [newMobo, setNewMobo] = useState('');

  const perPage = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getLicenses(page, search);
      setLicenses(res.licenses || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // ── Create ──
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.email) return;
    setCreating(true);
    try {
      const res = await createLicense(createForm);
      setCreatedKey(res.license.key);
      showToast('Licenca criada com sucesso.');
      load();
    } catch (err: any) {
      showToast(`Erro: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const closeCreate = () => {
    setShowCreate(false);
    setCreatedKey('');
    setCreateForm({ email: '', plan: 'anual' as 'anual' | 'mensal' | 'vitalicio', duration: '365' });
  };

  // ── Edit ──
  const openEdit = (l: any) => {
    setEditModal(l);
    setEditForm({
      email: l.email || '',
      plan: l.plan || 'vitalicio',
      status: l.status || 'pending',
      moboId: l.mobo_id || '',
    });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal) return;
    setEditing(true);
    try {
      await editLicense(editModal.id, {
        email: editForm.email,
        plan: editForm.plan,
        status: editForm.status,
        moboId: editForm.moboId || null,
      });
      showToast('Licenca atualizada.');
      setEditModal(null);
      load();
    } catch (err: any) {
      showToast(`Erro: ${err.message}`);
    } finally {
      setEditing(false);
    }
  };

  // ── Revoke ──
  const handleRevoke = async (id: string, key: string) => {
    if (!confirm(`Revogar licenca ${key}?`)) return;
    setActionLoading(id);
    try {
      await revokeLicense(id);
      showToast(`Licenca ${key} revogada.`);
      load();
    } catch (err: any) {
      showToast(`Erro: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // ── Transfer ──
  const handleTransfer = async () => {
    if (!transferModal || !newMobo.trim()) return;
    setActionLoading(transferModal.id);
    try {
      await transferLicense(transferModal.id, newMobo.trim());
      showToast(`Licenca transferida.`);
      setTransferModal(null);
      setNewMobo('');
      load();
    } catch (err: any) {
      showToast(`Erro: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.ceil(total / perPage);

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    showToast('Chave copiada.');
  };

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1>Licencas</h1>
          <p>{total} licencas no total</p>
        </div>
        <button className="btn btn--primary" onClick={() => setShowCreate(true)}>
          + Nova licenca
        </button>
      </div>

      <div className="toolbar">
        <input
          type="text"
          className="search-input"
          placeholder="Buscar por chave, email ou mobo..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {loading ? (
        <div className="page-loading"><div className="spinner" /> Carregando...</div>
      ) : (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>Chave</th>
                <th>Email</th>
                <th>Plano</th>
                <th>Status</th>
                <th>Mobo ID</th>
                <th>Expira em</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {licenses.map((l: any) => (
                <tr key={l.id}>
                  <td>
                    <span className="mono copyable" onClick={() => copyKey(l.key)} title="Clique pra copiar">
                      {l.key}
                    </span>
                  </td>
                  <td>{l.email}</td>
                  <td><span className={`badge badge--${l.plan}`}>{l.plan}</span></td>
                  <td><span className={`badge badge--${l.status}`}>{l.status}</span></td>
                  <td className="mono" title={l.mobo_id || ''}>{l.mobo_id ? l.mobo_id.slice(0, 16) + '...' : '—'}</td>
                  <td className="mono">{l.expires_at ? new Date(l.expires_at).toLocaleDateString('pt-BR') : 'nunca'}</td>
                  <td>
                    <div className="action-btns">
                      <button
                        className="btn btn--sm btn--ghost"
                        onClick={() => openEdit(l)}
                      >
                        Editar
                      </button>
                      {l.status === 'active' && (
                        <button
                          className="btn btn--sm btn--danger"
                          onClick={() => handleRevoke(l.id, l.key)}
                          disabled={actionLoading === l.id}
                        >
                          Revogar
                        </button>
                      )}
                      {l.mobo_id && (
                        <button
                          className="btn btn--sm btn--ghost"
                          onClick={() => { setTransferModal({ id: l.id, key: l.key }); setNewMobo(''); }}
                          disabled={actionLoading === l.id}
                        >
                          Transferir
                        </button>
                      )}
                    </div>
                  </td>
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

      {/* ── Create Modal ── */}
      {showCreate && (
        <div className="modal-backdrop" onClick={closeCreate}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            {createdKey ? (
              <>
                <h3>Licenca criada</h3>
                <p>Envie essa chave para o usuario:</p>
                <div className="key-display" onClick={() => copyKey(createdKey)}>
                  <span className="mono">{createdKey}</span>
                  <span className="key-display__hint">clique pra copiar</span>
                </div>
                <div className="modal__actions">
                  <button className="btn btn--primary" onClick={closeCreate}>Fechar</button>
                </div>
              </>
            ) : (
              <>
                <h3>Nova licenca</h3>
                <form onSubmit={handleCreate}>
                  <label>Email do usuario</label>
                  <input
                    className="search-input"
                    type="email"
                    value={createForm.email}
                    onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="usuario@email.com"
                    required
                    autoFocus
                  />
                  <label>Plano</label>
                  <select
                    className="search-input"
                    value={createForm.plan}
                    onChange={e => {
                      const plan = e.target.value as 'anual' | 'mensal' | 'vitalicio';
                      let duration = createForm.duration;
                      if (plan === 'vitalicio') duration = 'lifetime';
                      else if (plan === 'anual') duration = '365';
                      else if (duration === 'lifetime' || duration === '365') duration = '30';
                      setCreateForm({ ...createForm, plan, duration });
                    }}
                  >
                    <option value="anual">Anual</option>
                    <option value="mensal">Mensal</option>
                    <option value="vitalicio">Vitalicio (legacy)</option>
                  </select>
                  <label>Duracao</label>
                  <select
                    className="search-input"
                    value={createForm.duration}
                    onChange={e => setCreateForm({ ...createForm, duration: e.target.value })}
                    disabled={createForm.plan === 'vitalicio' || createForm.plan === 'anual'}
                  >
                    {DURATION_OPTIONS
                      .filter(d => {
                        if (createForm.plan === 'vitalicio') return d.value === 'lifetime';
                        if (createForm.plan === 'anual') return d.value === '365';
                        return d.value !== 'lifetime' && d.value !== '365';
                      })
                      .map(d => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                  </select>
                  <div className="modal__actions">
                    <button type="button" className="btn btn--ghost" onClick={closeCreate}>Cancelar</button>
                    <button type="submit" className="btn btn--primary" disabled={creating}>
                      {creating ? 'Gerando...' : 'Gerar licenca'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editModal && (
        <div className="modal-backdrop" onClick={() => setEditModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Editar licenca</h3>
            <p className="mono">{editModal.key}</p>
            <form onSubmit={handleEdit}>
              <label>Email</label>
              <input
                className="search-input"
                type="email"
                value={editForm.email}
                onChange={e => setEditForm({ ...editForm, email: e.target.value })}
              />
              <label>Plano</label>
              <select
                className="search-input"
                value={editForm.plan}
                onChange={e => setEditForm({ ...editForm, plan: e.target.value })}
              >
                <option value="anual">Anual</option>
                <option value="mensal">Mensal</option>
                <option value="vitalicio">Vitalicio (legacy)</option>
              </select>
              <label>Status</label>
              <select
                className="search-input"
                value={editForm.status}
                onChange={e => setEditForm({ ...editForm, status: e.target.value })}
              >
                <option value="pending">Pendente</option>
                <option value="active">Ativa</option>
                <option value="revoked">Revogada</option>
                <option value="expired">Expirada</option>
              </select>
              <label>Mobo ID (vazio = desvincular)</label>
              <input
                className="search-input"
                value={editForm.moboId}
                onChange={e => setEditForm({ ...editForm, moboId: e.target.value })}
                placeholder="Deixe vazio pra desvincular"
              />
              <div className="modal__actions">
                <button type="button" className="btn btn--ghost" onClick={() => setEditModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn--primary" disabled={editing}>
                  {editing ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Transfer Modal ── */}
      {transferModal && (
        <div className="modal-backdrop" onClick={() => setTransferModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Transferir licenca</h3>
            <p className="mono">{transferModal.key}</p>
            <label>Novo Mobo ID:</label>
            <input
              type="text"
              className="search-input"
              value={newMobo}
              onChange={e => setNewMobo(e.target.value)}
              placeholder="Serial da nova placa-mae"
              autoFocus
            />
            <div className="modal__actions">
              <button className="btn btn--ghost" onClick={() => setTransferModal(null)}>Cancelar</button>
              <button className="btn btn--primary" onClick={handleTransfer} disabled={!newMobo.trim()}>Transferir</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
