import { useState, useMemo } from 'react';
import { Icon, Switch } from './primitives';
import { Optimization } from '../types';

/** Format an ISO timestamp into a relative "há X" string. */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `há ${days}d`;
}

// ─────────────── OPTIMIZATION ROW ───────────────
interface OptimizationRowProps {
  item: Optimization;
  applied: boolean;
  onToggle: (value: boolean) => void;
  onApply: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
  isRunning: boolean;
  lastRanAt?: string;
}

function OptimizationRow({ item, applied, onToggle, onApply, expanded, onToggleExpand, isRunning, lastRanAt }: OptimizationRowProps) {
  const isToggle = !item.runOnce;
  return (
    <li className={`optrow ${expanded ? 'is-open' : ''} ${applied ? 'is-applied' : ''} ${isRunning ? 'is-running' : ''}`}>
      <button className="optrow__main" onClick={onToggleExpand}>
        <div className="optrow__icon"><Icon name={item.icon} size={18} /></div>
        <div className="optrow__text">
          <div className="optrow__head">
            <span className="optrow__title">{item.title}</span>
            {item.admin && <span className="badge badge--admin mono">ADMIN</span>}
            <span className={`badge badge--risk badge--risk-${item.risk}`}>
              risco: {item.risk}
            </span>
          </div>
          <div className="optrow__short">{item.short}</div>
        </div>
        <div className="optrow__expand mono">
          {expanded ? '−' : '+'}
        </div>
        <div className="optrow__action" onClick={(e) => e.stopPropagation()}>
          {isRunning ? (
            <div className="optrow__spinner">
              <div className="spinner" />
              <span className="mono spinner-label">...</span>
            </div>
          ) : isToggle ? (
            <div className="optrow__switch">
              <span className="mono switch-label">{applied ? 'ON' : 'OFF'}</span>
              <Switch on={applied} onChange={onToggle} />
            </div>
          ) : (
            <div className="optrow__run-group">
              {lastRanAt && (
                <span className="optrow__lastran mono">
                  <Icon name="check" size={10} /> {timeAgo(lastRanAt)}
                </span>
              )}
              <button className="btn btn--ghost btn--small" onClick={onApply}>
                <Icon name="rocket" size={12} /> executar
              </button>
            </div>
          )}
        </div>
      </button>
      {expanded && (
        <div className="optrow__detail">
          <div className="optrow__detail-text">
            <Icon name="info" size={14} />
            <p>{item.long}</p>
          </div>
          <div className="optrow__detail-meta mono">
            {item.admin && <span>↳ Requer privilégios de administrador</span>}
            {isToggle ? (
              <span>↳ Reversível a qualquer momento — basta desligar.</span>
            ) : (
              <span>↳ Ação única, não há "desfazer".</span>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

// ─────────────── OPTIMIZATION LIST PANEL ───────────────
interface OptListProps {
  category: string;
  items: Optimization[];
  applied: Record<string, boolean>;
  onToggle: (id: string, value: boolean) => void;
  onApply: (id: string) => void;
  title: string;
  subtitle: string;
  code: string;
  running: Set<string>;
  lastRan?: Record<string, string>;
}

export function OptList({ items, applied, onToggle, onApply, title, subtitle, code, running, lastRan }: OptListProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => items.filter(it => {
    if (filter === 'admin' && !it.admin) return false;
    if (filter === 'safe' && it.risk !== 'nenhum') return false;
    if (filter === 'applied' && !applied[it.id]) return false;
    if (search && !(it.title + ' ' + it.short + ' ' + it.long).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [items, filter, search, applied]);

  const onCount = Object.keys(applied).filter(k => applied[k] && items.find(i => i.id === k)).length;

  return (
    <section className="optlist-page">
      <header className="optlist-page__head">
        <div>
          <div className="mono optlist-page__eyebrow">— SEÇÃO {code}</div>
          <h1 className="optlist-page__title">{title}</h1>
          <p className="optlist-page__sub">{subtitle}</p>
        </div>
        <div className="optlist-page__stats mono">
          <div>
            <div className="kv__k">TOTAL</div>
            <div className="kv__big">{items.length.toString().padStart(2, '0')}</div>
          </div>
          <div>
            <div className="kv__k">ATIVOS</div>
            <div className="kv__big">{onCount.toString().padStart(2, '0')}</div>
          </div>
        </div>
      </header>

      <div className="optlist-page__toolbar">
        <div className="search">
          <Icon name="search" size={14} />
          <input
            type="text" placeholder="Buscar otimização…"
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filters mono">
          {[
            { id: 'all', l: 'Tudo' },
            { id: 'safe', l: 'Sem risco' },
            { id: 'admin', l: 'Requer admin' },
            { id: 'applied', l: 'Aplicados' },
          ].map(f => (
            <button key={f.id} className={`chip ${filter === f.id ? 'is-on' : ''}`} onClick={() => setFilter(f.id)}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      <ul className="optlist">
        {filtered.length === 0 && (
          <li className="optlist__empty mono">— sem resultados</li>
        )}
        {filtered.map(it => (
          <OptimizationRow
            key={it.id} item={it}
            applied={!!applied[it.id]}
            onToggle={(v) => onToggle(it.id, v)}
            onApply={() => onApply(it.id)}
            expanded={expanded === it.id}
            onToggleExpand={() => setExpanded(expanded === it.id ? null : it.id)}
            isRunning={running.has(it.id)}
            lastRanAt={lastRan?.[it.id]}
          />
        ))}
      </ul>
    </section>
  );
}
