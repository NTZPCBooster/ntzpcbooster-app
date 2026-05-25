/**
 * Two side-by-side action cards for bulk operations:
 * "Boost Completo" (all gaming optimizations) and "Limpeza Completa".
 *
 * When running, shows a progress bar with step count and percentage.
 */
import { Icon } from '../primitives';
import { useI18n } from '../../i18n';

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
  const { t } = useI18n();
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
          <div className="oneclick__title">{t('oneclick.boostTitle')}</div>
          <div className="oneclick__sub">
            {boostActive && bulkProgress
              ? t('oneclick.progress', { done: String(bulkProgress.done + 1), total: String(bulkProgress.total), current: bulkProgress.current })
              : boostActive
                ? t('oneclick.boostRunning')
                : t('oneclick.boostDesc')}
          </div>
          {boostActive && bulkProgress && (
            <div className="oneclick__progress">
              <div className="oneclick__progress-bar" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
        <div className="oneclick__cta mono">{boostActive ? `${pct}%` : t('oneclick.cta')}</div>
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
          <div className="oneclick__title">{t('oneclick.cleanTitle')}</div>
          <div className="oneclick__sub">
            {cleanActive && bulkProgress
              ? t('oneclick.progress', { done: String(bulkProgress.done + 1), total: String(bulkProgress.total), current: bulkProgress.current })
              : cleanActive
                ? t('oneclick.cleanRunning')
                : t('oneclick.cleanDesc')}
          </div>
          {cleanActive && bulkProgress && (
            <div className="oneclick__progress">
              <div className="oneclick__progress-bar" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
        <div className="oneclick__cta mono">{cleanActive ? `${pct}%` : t('oneclick.cta')}</div>
      </button>
    </div>
  );
}
