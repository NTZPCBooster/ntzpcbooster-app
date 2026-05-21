import React from 'react';
import { Icon, Switch } from './primitives';

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
}

const ACCENTS = [
  { id: 'blue', color: '#4f8df5', colorLight: '#1d4ed8' },
  { id: 'cyan', color: '#06b6d4', colorLight: '#0891b2' },
  { id: 'amber', color: '#f59e0b', colorLight: '#b45309' },
];

export function AppearancePanel({
  open, onClose, theme, onThemeChange,
  accent, onAccentChange, density, onDensityChange,
  grid, onGridChange,
}: AppearancePanelProps) {
  if (!open) return null;

  const isDark = theme === 'dark';

  return (
    <>
      <div className="ap-backdrop" onClick={onClose} />
      <div className="ap-panel">
        <div className="ap-panel__head">
          <span className="ap-panel__title">Aparência</span>
          <button className="ap-panel__close" onClick={onClose}>
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* TEMA */}
        <div className="ap-panel__section-label mono">TEMA</div>

        <div className="ap-panel__field-label">Modo</div>
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

        <div className="ap-panel__field-label">Acento</div>
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
        <div className="ap-panel__section-label mono">LAYOUT</div>

        <div className="ap-panel__field-label">Densidade</div>
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
          <span className="ap-panel__field-label" style={{ marginBottom: 0 }}>Grade blueprint</span>
          <Switch on={grid} onChange={onGridChange} size="sm" />
        </div>
      </div>
    </>
  );
}
