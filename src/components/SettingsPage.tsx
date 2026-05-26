import { Icon, Switch, TickFrame } from './primitives';
import type { SchedulerConfig } from '../hooks/useScheduler';
import { LOCALE_LABELS, useI18n } from '../i18n';
import type { Locale } from '../i18n';

interface SettingsPageProps {
  locale: Locale;
  onLocaleChange: (l: Locale) => void;
  minimizeToTray: boolean;
  onMinimizeToTrayChange: (v: boolean) => void;
  scheduler: SchedulerConfig;
  onSchedulerChange: (s: SchedulerConfig) => void;
  lastScheduledRun: string | null;
  onExport: () => void;
  onImport: () => void;
}

export function SettingsPage({
  locale, onLocaleChange,
  minimizeToTray, onMinimizeToTrayChange,
  scheduler, onSchedulerChange,
  lastScheduledRun,
  onExport, onImport,
}: SettingsPageProps) {
  const { t } = useI18n();

  return (
    <section className="settings-page">
      <TickFrame label="SETTINGS" code="CONFIG" className="settings-page__frame">
      {/* IDIOMA */}
      <div className="settings-page__section">
        <div className="settings-page__section-label mono">{t('settings.language')}</div>

        <div className="settings-page__field-label">{t('settings.languageLabel')}</div>
        <div className="ap-segmented">
          {(Object.keys(LOCALE_LABELS) as Locale[]).map((loc) => (
            <button
              key={loc}
              className={`ap-segmented__btn ${locale === loc ? 'is-on' : ''}`}
              onClick={() => onLocaleChange(loc)}
            >
              {LOCALE_LABELS[loc]}
            </button>
          ))}
        </div>
      </div>

      {/* COMPORTAMENTO */}
      <div className="settings-page__section">
        <div className="settings-page__section-label mono">{t('settings.behavior')}</div>

        <div className="settings-page__row">
          <span className="settings-page__field-label" style={{ marginBottom: 0 }}>{t('settings.minimizeToTray')}</span>
          <Switch on={minimizeToTray} onChange={onMinimizeToTrayChange} size="sm" />
        </div>
      </div>

      {/* AGENDAMENTO */}
      <div className="settings-page__section">
        <div className="settings-page__section-label mono">{t('settings.scheduler')}</div>

        <div className="settings-page__row">
          <span className="settings-page__field-label" style={{ marginBottom: 0 }}>{t('settings.schedulerToggle')}</span>
          <Switch
            on={scheduler.enabled}
            onChange={(v) => onSchedulerChange({ ...scheduler, enabled: v })}
            size="sm"
          />
        </div>

        {scheduler.enabled && (
          <div className="ap-scheduler">
            <div className="ap-scheduler__row">
              <label className="ap-scheduler__label">{t('settings.schedulerDay')}</label>
              <select
                className="ap-scheduler__select"
                value={scheduler.dayOfWeek}
                onChange={(e) => onSchedulerChange({ ...scheduler, dayOfWeek: Number(e.target.value) })}
              >
                {[0, 1, 2, 3, 4, 5, 6].map(d => (
                  <option key={d} value={d}>{t(`day.${d}`)}</option>
                ))}
              </select>
            </div>
            <div className="ap-scheduler__row">
              <label className="ap-scheduler__label">{t('settings.schedulerTime')}</label>
              <input
                type="time"
                className="ap-scheduler__input"
                value={scheduler.time}
                onChange={(e) => onSchedulerChange({ ...scheduler, time: e.target.value })}
              />
            </div>
            <p className="ap-scheduler__hint">
              {t('settings.schedulerHint')}
            </p>
            {lastScheduledRun && (
              <p className="ap-scheduler__last">
                {t('settings.schedulerLast', { date: new Date(lastScheduledRun).toLocaleString() })}
              </p>
            )}
          </div>
        )}
      </div>

      {/* CONFIGURACAO */}
      <div className="settings-page__section">
        <div className="settings-page__section-label mono">{t('settings.config')}</div>

        <div className="settings-page__field-label">{t('settings.configDesc')}</div>
        <div className="settings-page__actions">
          <button className="btn btn--ghost btn--small" onClick={onExport}>
            <Icon name="download" size={13} /> {t('settings.export')}
          </button>
          <button className="btn btn--ghost btn--small" onClick={onImport}>
            <Icon name="upload" size={13} /> {t('settings.import')}
          </button>
        </div>
      </div>
      </TickFrame>
    </section>
  );
}
