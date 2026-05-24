import { useState, useEffect } from 'react';
import { getOverview, getLicenses } from '../api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Overview {
  total_licenses: number;
  active_licenses: number;
  pending_licenses: number;
  lifetime_active: number;
  monthly_active: number;
  unique_devices: number;
  total_revenue: number;
  active_affiliates: number;
}

const COLORS = ['#00d958', '#06b6d4', '#f59e0b', '#ef4444'];

export function Dashboard() {
  const [data, setData] = useState<Overview | null>(null);
  const [recentLicenses, setRecentLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getOverview(), getLicenses(1)])
      .then(([ov, lic]) => {
        setData(ov);
        setRecentLicenses(lic.licenses?.slice(0, 5) || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <div className="page-loading"><div className="spinner" /> Carregando dashboard...</div>;
  }

  const cards = [
    { label: 'Licencas ativas', value: data.active_licenses, color: '#00d958' },
    { label: 'Pendentes', value: data.pending_licenses, color: '#f59e0b' },
    { label: 'Dispositivos', value: data.unique_devices, color: '#06b6d4' },
    { label: 'Receita total', value: `R$ ${(data.total_revenue / 100).toFixed(2)}`, color: '#a78bfa' },
    { label: 'Afiliados ativos', value: data.active_affiliates, color: '#f472b6' },
    { label: 'Total de licencas', value: data.total_licenses, color: '#94a3b8' },
  ];

  const planData = [
    { name: 'Vitalicio', value: data.lifetime_active },
    { name: 'Mensal', value: data.monthly_active },
  ];

  const barData = [
    { name: 'Ativas', value: data.active_licenses },
    { name: 'Pendentes', value: data.pending_licenses },
    { name: 'Total', value: data.total_licenses },
  ];

  return (
    <div className="page">
      <div className="page__header">
        <h1>Dashboard</h1>
        <p>Visao geral do sistema</p>
      </div>

      <div className="cards-grid">
        {cards.map(c => (
          <div key={c.label} className="stat-card">
            <div className="stat-card__label">{c.label}</div>
            <div className="stat-card__value" style={{ color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="charts-row">
        <div className="chart-box">
          <h3>Licencas</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData}>
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: '#1e1e2e', border: '1px solid #333', borderRadius: 8, color: '#e2e8f0' }}
              />
              <Bar dataKey="value" fill="#00d958" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-box">
          <h3>Planos ativos</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={planData}
                cx="50%" cy="50%"
                outerRadius={80} innerRadius={50}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {planData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1e1e2e', border: '1px solid #333', borderRadius: 8, color: '#e2e8f0' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="table-section">
        <h3>Licencas recentes</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Chave</th>
              <th>Email</th>
              <th>Plano</th>
              <th>Status</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            {recentLicenses.map((l: any) => (
              <tr key={l.id}>
                <td className="mono">{l.key}</td>
                <td>{l.email}</td>
                <td><span className={`badge badge--${l.plan}`}>{l.plan}</span></td>
                <td><span className={`badge badge--${l.status}`}>{l.status}</span></td>
                <td className="mono">{new Date(l.created_at).toLocaleDateString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
