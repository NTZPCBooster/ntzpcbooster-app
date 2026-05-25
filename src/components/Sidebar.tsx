import { Icon, Logo } from './primitives';
import { CATEGORIES } from '../data';
import { useI18n } from '../i18n';

interface SidebarProps {
  current: string;
  onNav: (id: string) => void;
  theme: string;
  onThemeChange: (theme: string) => void;
  onOpenAppearance: () => void;
  dynamicCounts?: Record<string, number>;
}

export function Sidebar({ current, onNav, theme, onThemeChange, onOpenAppearance, dynamicCounts }: SidebarProps) {
  const { t } = useI18n();

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <Logo size={36} />
        <div className="sidebar__brand-text">
          <div className="sidebar__wordmark mono">PCBOOST</div>
          <div className="sidebar__codestamp mono">REV.04 · 2026</div>
        </div>
      </div>

      <nav className="sidebar__nav">
        <div className="sidebar__section-label mono">— {t('sidebar.navigation')}</div>
        {CATEGORIES.map((c, i) => {
          const active = c.id === current;
          return (
            <button
              key={c.id}
              className={`navitem ${active ? 'is-active' : ''}`}
              onClick={() => onNav(c.id)}
            >
              <span className="navitem__index mono">{String(i + 1).padStart(2, '0')}</span>
              <Icon name={c.short} size={16} />
              <span className="navitem__label">{t(`nav.${c.id}`)}</span>
              {(dynamicCounts?.[c.id] ?? c.count) != null && (
                <span className="navitem__count mono">{dynamicCounts?.[c.id] ?? c.count}</span>
              )}
              {active && <span className="navitem__marker" />}
            </button>
          );
        })}
      </nav>

      <div className="sidebar__spacer" />

      {/* Appearance */}
      <div className="sidebar__theme">
        <div className="sidebar__section-label mono">— {t('sidebar.appearance')}</div>
        <div className="themetoggle">
          <button
            className={`themetoggle__btn ${theme === 'dark' ? 'is-on' : ''}`}
            onClick={() => onThemeChange('dark')}
          >
            <Icon name="moon" size={14} /> {t('sidebar.dark')}
          </button>
          <button
            className={`themetoggle__btn ${theme === 'light' ? 'is-on' : ''}`}
            onClick={() => onThemeChange('light')}
          >
            <Icon name="sparkles" size={14} /> {t('sidebar.light')}
          </button>
        </div>
        <button className="sidebar__appearance-btn" onClick={onOpenAppearance}>
          <Icon name="palette" size={14} />
          <span>{t('sidebar.customize')}</span>
        </button>
      </div>

      <div className="sidebar__foot mono">
        <span>{t('sidebar.status')}</span>
        <span className="dot dot--ok" /> {t('sidebar.operational')}
      </div>
    </aside>
  );
}
