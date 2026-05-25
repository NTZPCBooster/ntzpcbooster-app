import { TickFrame } from './primitives';
import { HistoryEntry } from '../types';
import { useI18n } from '../i18n';

interface HistoryPageProps {
  history: HistoryEntry[];
}

export function HistoryPage({ history }: HistoryPageProps) {
  const { t } = useI18n();

  return (
    <section className="optlist-page">
      <header className="optlist-page__head">
        <div>
          <div className="mono optlist-page__eyebrow">— {t('history.sectionLabel')}</div>
          <h1 className="optlist-page__title">{t('history.title')}</h1>
          <p className="optlist-page__sub">{t('history.subtitle')}</p>
        </div>
      </header>

      <TickFrame label="EVENT LOG" code="CHRONO" className="histcard">
        <ul className="histlist mono">
          {history.map((h, i) => (
            <li key={h.id} className="histlist__row">
              <span className="histlist__idx">{String(i + 1).padStart(2, '0')}</span>
              <span className={`histlist__kind histlist__kind--${h.kind}`}>{h.kind}</span>
              <span className="histlist__title">{h.title}</span>
              <span className="histlist__delta">{h.delta}</span>
              <span className="histlist__time">{h.time}</span>
            </li>
          ))}
        </ul>
      </TickFrame>
    </section>
  );
}
