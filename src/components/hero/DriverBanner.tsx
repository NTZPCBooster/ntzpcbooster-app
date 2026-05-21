/** Dismissible banner shown when a newer GPU driver is available. */
import { Icon } from '../primitives';
import type { PCInfo } from '../../types';

interface DriverBannerProps {
  pc: PCInfo;
}

export function DriverBanner({ pc }: DriverBannerProps) {
  if (!pc.gpu.driverUpdateAvailable) return null;
  return (
    <div className="driverbanner">
      <div className="driverbanner__icon">
        <Icon name="download" size={18} />
      </div>
      <div className="driverbanner__body">
        <div className="driverbanner__title">
          <span className="pulse-dot" />
          Nova versao de driver disponivel
          <span className="driverbanner__vchip mono">{pc.gpu.driver} → {pc.gpu.latestDriver}</span>
        </div>
        <div className="driverbanner__sub">
          A NVIDIA lancou o {pc.gpu.latestDriver} pra sua {pc.gpu.model}. Costuma melhorar FPS em jogos recentes.
        </div>
      </div>
      <button className="btn btn--accent">
        Atualizar agora <Icon name="external" size={14} />
      </button>
    </div>
  );
}
