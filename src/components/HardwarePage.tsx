import { TickFrame } from './primitives';
import { PCInfo } from '../types';

interface HardwarePageProps {
  pc: PCInfo;
  loading?: boolean;
}

export function HardwarePage({ pc, loading: _loading }: HardwarePageProps) {
  const usedPct = pc.disk.total ? Math.round(((pc.disk.total - pc.disk.free) / pc.disk.total) * 100) : 0;

  const cards: Array<{ label: string; k: string; name: string; lines: string[]; highlight?: boolean }> = [
    {
      label: 'PROCESSADOR',
      k: '01',
      name: pc.cpu.model,
      lines: [
        `${pc.cpu.cores} núcleos físicos, ${pc.cpu.threads} threads`,
        `${pc.cpu.baseClock} GHz base · ${pc.cpu.boostClock} GHz boost`,
      ],
    },
    {
      label: 'PLACA DE VÍDEO',
      k: '02',
      name: pc.gpu.model,
      lines: [
        `${pc.gpu.vram} GB VRAM`,
        `Driver atual ${pc.gpu.driver}`,
        pc.gpu.driverUpdateAvailable ? `↑ Atualização disponível: ${pc.gpu.latestDriver}` : 'Driver atualizado',
      ],
      highlight: pc.gpu.driverUpdateAvailable,
    },
    {
      label: 'MEMÓRIA',
      k: '03',
      name: `${pc.ram.total} GB ${pc.ram.type}`,
      lines: [
        `${pc.ram.speed} MHz`,
      ],
    },
    {
      label: 'PLACA-MÃE',
      k: '04',
      name: pc.mobo,
      lines: [],
    },
    {
      label: 'ARMAZENAMENTO',
      k: '05',
      name: `${pc.disk.total} GB ${pc.disk.type}`,
      lines: [
        `${pc.disk.free} GB livres em ${pc.disk.letter}:`,
        `${usedPct}% ocupado`,
      ],
    },
    {
      label: 'SISTEMA',
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
          <div className="mono optlist-page__eyebrow">— SEÇÃO H/W</div>
          <h1 className="optlist-page__title">Hardware</h1>
          <p className="optlist-page__sub">Cada peça da sua máquina, e o que ela está fazendo.</p>
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
