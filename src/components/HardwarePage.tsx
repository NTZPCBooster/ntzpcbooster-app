import { TickFrame } from './primitives';
import { PCInfo } from '../types';
import { useI18n } from '../i18n';

interface HardwarePageProps {
  pc: PCInfo;
  loading?: boolean;
}

export function HardwarePage({ pc, loading: _loading }: HardwarePageProps) {
  const { t } = useI18n();
  const usedPct = pc.disk.total ? Math.round(((pc.disk.total - pc.disk.free) / pc.disk.total) * 100) : 0;

  const cards: Array<{ label: string; k: string; name: string; lines: string[]; highlight?: boolean }> = [
    {
      label: t('hw.cpu'),
      k: '01',
      name: pc.cpu.model,
      lines: [
        t('hw.cpuCores', { cores: String(pc.cpu.cores), threads: String(pc.cpu.threads) }),
        t('hw.cpuClock', { base: String(pc.cpu.baseClock), boost: String(pc.cpu.boostClock) }),
      ],
    },
    {
      label: t('hw.gpu'),
      k: '02',
      name: pc.gpu.model,
      lines: [
        t('hw.gpuVram', { vram: String(pc.gpu.vram) }),
        t('hw.gpuDriver', { driver: pc.gpu.driver }),
        pc.gpu.driverUpdateAvailable ? t('hw.gpuUpdate', { version: pc.gpu.latestDriver }) : t('hw.gpuUpToDate'),
      ],
      highlight: pc.gpu.driverUpdateAvailable,
    },
    {
      label: t('hw.ram'),
      k: '03',
      name: `${pc.ram.total} GB ${pc.ram.type}`,
      lines: [
        `${pc.ram.speed} MHz`,
      ],
    },
    {
      label: t('hw.mobo'),
      k: '04',
      name: pc.mobo,
      lines: [],
    },
    {
      label: t('hw.storage'),
      k: '05',
      name: `${pc.disk.total} GB ${pc.disk.type}`,
      lines: [
        t('hw.diskFree', { free: String(pc.disk.free), letter: pc.disk.letter }),
        t('hw.diskUsed', { pct: String(usedPct) }),
      ],
    },
    {
      label: t('hw.system'),
      k: '06',
      name: pc.os,
      lines: [
        pc.build,
        `Uptime: ${pc.uptime}`,
      ],
    },
  ];

  return (
    <section className="optlist-page">
      <header className="optlist-page__head">
        <div>
          <div className="mono optlist-page__eyebrow">— {t('hw.sectionLabel')}</div>
          <h1 className="optlist-page__title">Hardware</h1>
          <p className="optlist-page__sub">{t('hw.subtitle')}</p>
        </div>
      </header>

      <div className="hw-grid">
        {cards.map((c) => (
          <TickFrame key={c.k} label={c.label} code={c.k} className={`hwcard ${c.highlight ? 'hwcard--alert' : ''}`}>
            <div className="hwcard__name mono">{c.name}</div>
            <ul className="hwcard__lines mono">
              {c.lines.map((l, i) => <li key={i}>{l}</li>)}
            </ul>
          </TickFrame>
        ))}
      </div>
    </section>
  );
}
