import { Icon, Switch } from './primitives';
import type { SchedulerConfig } from '../hooks/useScheduler';
import { LOCALE_LABELS, useI18n } from '../i18n';
import type { Locale } from '../i18n';

interface AppearancePanelProps {
  open: boolean;
  onClose: () => void;
  theme: string;
  onThemeChange: (t: string) => void;
  accent: string;
  onAccentChange: (a: string) => void;
  density: string;
  onDensityChange: (d: string) => void;
  grid: boolean;
  onGridChange: (v: boolean) => void;
  minimizeToTray: boolean;
  onMinimizeToTrayChange: (v: boolean) => void;
  locale: Locale;
  onLocaleChange: (l: Locale) => void;
  onExport: () => void;
  onImport: () => void;
  scheduler: SchedulerConfig;
  onSchedulerChange: (s: SchedulerConfig) => void;
  lastScheduledRun: string | null;
}

const ACCENTS = [
  { id: 'green', color: '#00d958', colorLight: '#15803d' },
  { id: 'cyan',  color: '#06b6d4', colorLight: '#0891b2' },
  { id: 'amber', color: '#f59e0b', colorLight: '#b45309' },
];

export function AppearancePanel({
  open, onClose, theme, onThemeChange,
  accent, onAccentChange, density, onDensityChange,
  grid, onGridChange, minimizeToTray, onMinimizeToTrayChange,
  locale, onLocaleChange,
  onExport, onImport, scheduler, onSchedulerChange, lastScheduledRun,
}: AppearancePanelProps) {
  const { t } = useI18n();

  if (!open) return null;

  const isDark = theme === 'dark';

  return (
    <>
      <div className="ap-backdrop" onClick={onClose} />
      <div className="ap-panel">
        <div className="ap-panel__head">
          <span className="ap-panel__title">{t('settings.title')}</span>
          <button className="ap-panel__close" onClick={onClose}>
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* TEMA */}
        <div className="ap-panel__section-label mono">{t('settings.theme')}</div>

        <div className="ap-panel__field-label">{t('settings.mode')}</div>
        <div className="ap-segmented">
          <button
            className={`ap-segmented__btn ${isDark ? 'is-on' : ''}`}
            onClick={() => onThemeChange('dark')}
          >
            dark
          </button>
          <button
            className={`ap-segmented__btn ${!isDark ? 'is-on' : ''}`}
            onClick={() => onThemeChange('light')}
          >
            light
          </button>
        </div>

        <div className="ap-panel__field-label">{t('settings.accent')}</div>
        <div className="ap-swatches">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              className={`ap-swatch ${accent === a.id ? 'is-on' : ''}`}
              style={{ background: isDark ? a.color : a.colorLight }}
              onClick={() => onAccentChange(a.id)}
            >
              {accent === a.id && <Icon name="check" size={18} strokeWidth={2.5} />}
            </button>
          ))}
        </div>

        {/* LAYOUT */}
        <div className="ap-panel__section-label mono">{t('settings.layout')}</div>

        <div className="ap-panel__field-label">{t('settings.density')}</div>
        <div className="ap-segmented">
          <button
            className={`ap-segmented__btn ${density === 'cozy' ? 'is-on' : ''}`}
            onClick={() => onDensityChange('cozy')}
          >
            cozy
          </button>
          <button
            className={`ap-segmented__btn ${density === 'compact' ? 'is-on' : ''}`}
            onClick={() => onDensityChange('compact')}
          >
            compact
          </button>
        </div>

        <div className="ap-panel__row">
          <span className="ap-panel__field-label" style={{ marginBottom: 0 }}>{t('settings.grid')}</span>
          <Switch on={grid} onChange={onGridChange} size="sm" />
        </div>

        {/* IDIOMA */}
        <div className="ap-panel__section-label mono">{t('settings.language')}</div>

        <div className="ap-panel__field-label">{t('settings.languageLabel')}</div>
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

        {/* COMPORTAMENTO */}
        <div className="ap-panel__section-label mono">{t('settings.behavior')}</div>

        <div className="ap-panel__row">
          <span className="ap-panel__field-label" style={{ marginBottom: 0 }}>{t('settings.minimizeToTray')}</span>
          <Switch on={minimizeToTray} onChange={onMinimizeToTrayChange} size="sm" />
        </div>

        {/* AGENDAMENTO */}
        <div className="ap-panel__section-label mono">{t('settings.scheduler')}</div>

        <div className="ap-panel__row">
          <span className="ap-panel__field-label" style={{ marginBottom: 0 }}>{t('settings.schedulerToggle')}</span>
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

        {/* CONFIGURACAO */}
        <div className="ap-panel__section-label mono">{t('settings.config')}</div>

        <div className="ap-panel__field-label">{t('settings.configDesc')}</div>
        <div className="ap-panel__actions">
          <button className="btn btn--ghost btn--small" onClick={onExport}>
            <Icon name="download" size={13} /> {t('settings.export')}
          </button>
          <button className="btn btn--ghost btn--small" onClick={onImport}>
            <Icon name="upload" size={13} /> {t('settings.import')}
          </button>
        </div>
      </div>
    </>
  );
}
