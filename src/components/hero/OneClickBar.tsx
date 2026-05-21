/**
 * Two side-by-side action cards for bulk operations:
 * "Boost Completo" (all gaming optimizations) and "Limpeza Completa".
 *
 * When running, shows a progress bar with step count and percentage.
 */
import { Icon } from '../primitives';

export interface BulkProgress {
  done: number;
  total: number;
  current: string;
}

interface OneClickBarProps {
  onRun: (action: string) => void;
  bulkRunning: string | null;
  bulkProgress: BulkProgress | null;
}

export function OneClickBar({ onRun, bulkRunning, bulkProgress }: OneClickBarProps) {
  const boostActive = bulkRunning === 'boost';
  const cleanActive = bulkRunning === 'clean';
  const anyRunning = bulkRunning !== null;
  const pct = bulkProgress ? Math.round((bulkProgress.done / bulkProgress.total) * 100) : 0;

  return (
    <div className="oneclick">
      <button
        className={`oneclick__card oneclick__card--boost ${boostActive ? 'is-running' : ''}`}
        onClick={() => !anyRunning && onRun('boost')}
        disabled={anyRunning}
      >
        <div className="oneclick__icon">
          {boostActive ? <div className="spinner spinner--lg" /> : <Icon name="rocket" size={22} />}
        </div>
        <div className="oneclick__body">
          <div className="oneclick__title">Boost Completo</div>
          <div className="oneclick__sub">
            {boostActive && bulkProgress
              ? `${bulkProgress.done + 1} de ${bulkProgress.total} · ${bulkProgress.current}`
              : boostActive
                ? 'Aplicando otimizacoes…'
                : 'Aplica todas as otimizacoes de gaming numa tacada so. Reversivel.'}
          </div>
          {boostActive && bulkProgress && (
            <div className="oneclick__progress">
              <div className="oneclick__progress-bar" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
        <div className="oneclick__cta mono">{boostActive ? `${pct}%` : 'EXECUTAR ↗'}</div>
      </button>

      <button
        className={`oneclick__card oneclick__card--clean ${cleanActive ? 'is-running' : ''}`}
        onClick={() => !anyRunning && onRun('clean')}
        disabled={anyRunning}
      >
        <div className="oneclick__icon">
          {cleanActive ? <div className="spinner spinner--lg" /> : <Icon name="trash" size={22} />}
        </div>
        <div className="oneclick__body">
          <div className="oneclick__title">Limpeza Completa</div>
          <div className="oneclick__sub">
            {cleanActive && bulkProgress
              ? `${bulkProgress.done + 1} de ${bulkProgress.total} · ${bulkProgress.current}`
              : cleanActive
                ? 'Limpando…'
                : 'Faxina geral — temp, prefetch, cache, lixeira. Costuma liberar ~5 GB.'}
          </div>
          {cleanActive && bulkProgress && (
            <div className="oneclick__progress">
              <div className="oneclick__progress-bar" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
        <div className="oneclick__cta mono">{cleanActive ? `${pct}%` : 'EXECUTAR ↗'}</div>
      </button>
    </div>
  );
}
