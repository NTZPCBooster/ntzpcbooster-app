import { useState, useMemo } from 'react';
import { Icon, Switch } from './primitives';
import { Optimization } from '../types';
import { formatSize } from '../hooks/useStorageInfo';
import type { StorageSizes } from '../hooks/useStorageInfo';
import { useI18n } from '../i18n';

/** Format an ISO timestamp into a relative string using i18n. */
function useTimeAgo() {
  const { t } = useI18n();
  return (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return t('common.now');
    if (mins < 60) return t('common.minsAgo', { mins: String(mins) });
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return t('common.hrsAgo', { hrs: String(hrs) });
    const days = Math.floor(hrs / 24);
    return t('common.daysAgo', { days: String(days) });
  };
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
  isWin11?: boolean;
  sizeMB?: number;
}

function OptimizationRow({ item, applied, onToggle, onApply, expanded, onToggleExpand, isRunning, lastRanAt, isWin11, sizeMB }: OptimizationRowProps) {
  const { t } = useI18n();
  const timeAgo = useTimeAgo();
  const isToggle = !item.runOnce;
  const isLocked = !!(isWin11 && item.win11Note);

  // Try translated strings, fall back to item.title/short/long for compatibility
  const title = t(`opt.${item.id}.title`) !== `opt.${item.id}.title` ? t(`opt.${item.id}.title`) : item.title;
  const short = t(`opt.${item.id}.short`) !== `opt.${item.id}.short` ? t(`opt.${item.id}.short`) : item.short;
  const long = t(`opt.${item.id}.long`) !== `opt.${item.id}.long` ? t(`opt.${item.id}.long`) : item.long;
  const win11Note = item.win11Note
    ? (t(`opt.${item.id}.win11Note`) !== `opt.${item.id}.win11Note` ? t(`opt.${item.id}.win11Note`) : item.win11Note)
    : undefined;

  return (
    <li className={`optrow ${expanded ? 'is-open' : ''} ${applied ? 'is-applied' : ''} ${isRunning ? 'is-running' : ''}`}>
      <button className="optrow__main" onClick={onToggleExpand}>
        <div className="optrow__icon"><Icon name={item.icon} size={18} /></div>
        <div className="optrow__text">
          <div className="optrow__head">
            <span className="optrow__title">{title}</span>
            {item.admin && <span className="badge badge--admin mono">ADMIN</span>}
            <span className={`badge badge--risk badge--risk-${item.risk}`}>
              {t('optlist.risk')}: {t(`risk.${item.risk}`)}
            </span>
          </div>
          <div className="optrow__short">
            {short}
            {sizeMB != null && sizeMB > 0 && (
              <span className="optrow__size mono"> — {formatSize(sizeMB)}</span>
            )}
          </div>
        </div>
        <div className="optrow__expand mono">
          {expanded ? '−' : '+'}
        </div>
        <div className="optrow__action" onClick={(e) => e.stopPropagation()}>
          {isLocked ? (
            <div className="optrow__switch">
              <span className="mono switch-label" style={{ opacity: 0.4 }}>{t('common.na')}</span>
              <Switch on={false} onChange={() => {}} disabled />
            </div>
          ) : isRunning ? (
            <div className="optrow__spinner">
              <div className="spinner" />
              <span className="mono spinner-label">...</span>
            </div>
          ) : isToggle ? (
            <div className="optrow__switch">
              <span className="mono switch-label">{applied ? t('common.on') : t('common.off')}</span>
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
                <Icon name="rocket" size={12} /> {t('common.run')}
              </button>
            </div>
          )}
        </div>
      </button>
      {expanded && (
        <div className="optrow__detail">
          <div className="optrow__detail-text">
            <Icon name="info" size={14} />
            <p>{long}</p>
          </div>
          {isLocked ? (
            <div className="optrow__detail-meta optrow__detail-meta--warn mono">
              <span>⚠ {win11Note}</span>
            </div>
          ) : (
            <div className="optrow__detail-meta mono">
              {item.admin && <span>↳ {t('optlist.requiresAdmin')}</span>}
              {isToggle ? (
                <span>↳ {t('optlist.reversible')}</span>
              ) : (
                <span>↳ {t('optlist.oneTime')}</span>
              )}
            </div>
          )}
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
  onBulkToggle?: (enable: boolean) => void;
  title: string;
  subtitle: string;
  code: string;
  running: Set<string>;
  bulkRunning?: boolean;
  lastRan?: Record<string, string>;
  isWin11?: boolean;
  storageSizes?: StorageSizes;
  storageTotalMB?: number;
}

export function OptList({ items, applied, onToggle, onApply, onBulkToggle, title, subtitle, code, running, bulkRunning, lastRan, isWin11, storageSizes, storageTotalMB }: OptListProps) {
  const { t } = useI18n();
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

  const toggleableItems = useMemo(() => items.filter(it => !it.runOnce), [items]);
  const onCount = Object.keys(applied).filter(k => applied[k] && items.find(i => i.id === k)).length;
  const toggleableOnCount = toggleableItems.filter(it => applied[it.id]).length;
  const allOn = toggleableOnCount === toggleableItems.length && toggleableItems.length > 0;
  const allOff = toggleableOnCount === 0;
  const isBusy = bulkRunning || running.size > 0;

  return (
    <section className="optlist-page">
      <header className="optlist-page__head">
        <div>
          <div className="mono optlist-page__eyebrow">— {t('optlist.section')} {code}</div>
          <h1 className="optlist-page__title">{title}</h1>
          <p className="optlist-page__sub">{subtitle}</p>
          {storageTotalMB != null && storageTotalMB > 0 && (
            <p className="optlist-page__storage-hint mono">{t('optlist.recoverable')}: <strong>{formatSize(storageTotalMB)}</strong></p>
          )}
        </div>
        <div className="optlist-page__stats mono">
          <div>
            <div className="kv__k">{t('common.total')}</div>
            <div className="kv__big">{items.length.toString().padStart(2, '0')}</div>
          </div>
          <div>
            <div className="kv__k">{t('common.active')}</div>
            <div className="kv__big">{onCount.toString().padStart(2, '0')}</div>
          </div>
          <div>
            <div className="kv__k">{t('common.inactive')}</div>
            <div className="kv__big">{(items.length - onCount).toString().padStart(2, '0')}</div>
          </div>
        </div>
      </header>

      {onBulkToggle && toggleableItems.length > 0 && (
        <div className="optlist-page__bulk">
          <button
            className="btn btn--ghost btn--small"
            disabled={allOn || !!isBusy}
            onClick={() => onBulkToggle(true)}
          >
            <Icon name="check" size={13} />
            {t('optlist.enableAll')} ({toggleableItems.length - toggleableOnCount})
          </button>
          <button
            className="btn btn--ghost btn--small"
            disabled={allOff || !!isBusy}
            onClick={() => onBulkToggle(false)}
          >
            <Icon name="x" size={13} />
            {t('optlist.disableAll')} ({toggleableOnCount})
          </button>
        </div>
      )}

      <div className="optlist-page__toolbar">
        <div className="search">
          <Icon name="search" size={14} />
          <input
            type="text" placeholder={t('optlist.searchPlaceholder')}
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filters mono">
          {[
            { id: 'all', l: t('optlist.filterAll') },
            { id: 'safe', l: t('optlist.filterSafe') },
            { id: 'admin', l: t('optlist.filterAdmin') },
            { id: 'applied', l: t('optlist.filterApplied') },
          ].map(f => (
            <button key={f.id} className={`chip ${filter === f.id ? 'is-on' : ''}`} onClick={() => setFilter(f.id)}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      <ul className="optlist">
        {filtered.length === 0 && (
          <li className="optlist__empty mono">{t('common.noResults')}</li>
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
            isWin11={isWin11}
            sizeMB={storageSizes?.[it.id]}
          />
        ))}
      </ul>
    </section>
  );
}
