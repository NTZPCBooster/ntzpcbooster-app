/** Dismissible banner shown when a newer GPU driver is available. */
import { useCallback } from 'react';
import { Icon } from '../primitives';
import type { PCInfo } from '../../types';
import { useI18n } from '../../i18n';

interface DriverBannerProps {
  pc: PCInfo;
}

export function DriverBanner({ pc }: DriverBannerProps) {
  const { t } = useI18n();

  const openDriverPage = useCallback(async () => {
    const url = 'https://www.nvidia.com/Download/index.aspx';
    try {
      const { open } = await import('@tauri-apps/plugin-shell');
      await open(url);
    } catch {
      window.open(url, '_blank');
    }
  }, []);

  if (!pc.gpu.driverUpdateAvailable) return null;
  return (
    <div className="driverbanner">
      <div className="driverbanner__icon">
        <Icon name="download" size={18} />
      </div>
      <div className="driverbanner__body">
        <div className="driverbanner__title">
          <span className="pulse-dot" />
          {t('driver.title')}
          <span className="driverbanner__vchip mono">{pc.gpu.driver} → {pc.gpu.latestDriver}</span>
        </div>
        <div className="driverbanner__sub">
          {t('driver.sub', { version: pc.gpu.latestDriver, model: pc.gpu.model })}
        </div>
      </div>
      <button className="btn btn--accent" onClick={openDriverPage}>
        {t('driver.cta')} <Icon name="external" size={14} />
      </button>
    </div>
  );
}
