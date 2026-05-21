import { TickFrame } from './primitives';
import { PCInfo } from '../types';

interface HardwarePageProps {
  pc: PCInfo;
  loading?: boolean;
}

export function HardwarePage({ pc, loading: _loading }: HardwarePageProps) {
  const cards: Array<{ label: string; k: string; name: string; lines: string[]; highlight?: boolean }> = [
    {
      label: 'PROCESSADOR',
      k: '01',
      name: pc.cpu.model,
      lines: [
        `${pc.cpu.cores} núcleos físicos, ${pc.cpu.threads} threads`,
        `${pc.cpu.baseClock} GHz base · ${pc.cpu.boostClock} GHz boost`,
        `Socket AM4 · 105 W TDP`,
      ],
    },
    {
      label: 'PLACA DE VÍDEO',
      k: '02',
      name: pc.gpu.model,
      lines: [
        `${pc.gpu.vram} GB GDDR6 VRAM`,
        `Driver atual ${pc.gpu.driver} · NVIDIA Studio`,
        pc.gpu.driverUpdateAvailable ? `↑ Atualização disponível: ${pc.gpu.latestDriver}` : 'Driver atualizado',
      ],
      highlight: pc.gpu.driverUpdateAvailable,
    },
    {
      label: 'MEMÓRIA',
      k: '03',
      name: `${pc.ram.total} GB ${pc.ram.type}`,
      lines: [
        `${pc.ram.speed} MHz · CL16`,
        `2 × 16 GB dual-channel`,
        `XMP Profile 1 ativo`,
      ],
    },
    {
      label: 'PLACA-MÃE',
      k: '04',
      name: pc.mobo,
      lines: [
        `Chipset AMD B550`,
        `BIOS F16d · agosto/2025`,
        `4 slots DIMM · 2 ocupados`,
      ],
    },
    {
      label: 'ARMAZENAMENTO',
      k: '05',
      name: `${pc.disk.total} GB ${pc.disk.type}`,
      lines: [
        `${pc.disk.free} GB livres em C:`,
        `Leitura: 3500 MB/s · escrita: 3000 MB/s`,
        `Saúde: 98% · 24°C`,
      ],
    },
    {
      label: 'SISTEMA',
      k: '06',
      name: pc.os,
      lines: [
        pc.build,
        `Boot time: ${pc.bootTime}`,
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
