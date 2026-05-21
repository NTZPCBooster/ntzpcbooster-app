import React, { useState, useEffect } from 'react';
import { Icon, TickFrame, Sparkline, ScoreGauge, useLiveSeries } from './primitives';
import { CATEGORIES } from '../data';
import { PCInfo, HistoryEntry } from '../types';

// ─────────────── STAT CARD (local) ───────────────
interface StatCardProps {
  label: string;
  model: string;
  value: number;
  unit: string;
  series: number[];
  temp?: number;
  sub: string;
  range?: [number, number];
  accent?: string;
  meta?: string;
}

function StatCard({ label, model, value, unit, series, temp, sub, range = [0, 100], accent = 'var(--accent)', meta }: StatCardProps) {
  return (
    <TickFrame className="statcard" label={label} code={meta}>
      <div className="statcard__head">
        <div>
          <div className="statcard__model mono">{model}</div>
          <div className="statcard__sub mono">{sub}</div>
        </div>
        {temp != null && (
          <div className="statcard__temp mono" data-hot={temp > 75 ? true : undefined}>
            <Icon name="thermo" size={12} /> {temp}°C
          </div>
        )}
      </div>
      <div className="statcard__readout">
        <div className="statcard__value mono">
          <span className="statcard__num">{value}</span>
          <span className="statcard__unit">{unit}</span>
        </div>
      </div>
      <Sparkline data={series} color={accent} range={range} height={48} />
      <div className="statcard__axis mono">
        <span>{range[0]}{unit}</span>
        <span>—</span>
        <span>{range[1]}{unit}</span>
      </div>
    </TickFrame>
  );
}

// ─────────────── DRIVER BANNER ───────────────
interface DriverBannerProps {
  pc: PCInfo;
}

function DriverBanner({ pc }: DriverBannerProps) {
  if (!pc.gpu.driverUpdateAvailable) return null;
  return (
    <div className="driverbanner">
      <div className="driverbanner__icon">
        <Icon name="download" size={18} />
      </div>
      <div className="driverbanner__body">
        <div className="driverbanner__title">
          <span className="pulse-dot" />
          Nova versão de driver disponível
          <span className="driverbanner__vchip mono">{pc.gpu.driver} → {pc.gpu.latestDriver}</span>
        </div>
        <div className="driverbanner__sub">
          A NVIDIA lançou o {pc.gpu.latestDriver} pra sua {pc.gpu.model}. Costuma melhorar FPS em jogos recentes.
        </div>
      </div>
      <button className="btn btn--accent">
        Atualizar agora <Icon name="external" size={14} />
      </button>
    </div>
  );
}

// ─────────────── ONE-CLICK BAR ───────────────
interface BulkProgress {
  done: number;
  total: number;
  current: string;
}

interface OneClickBarProps {
  onRun: (action: string) => void;
  bulkRunning: string | null;
  bulkProgress: BulkProgress | null;
}

function OneClickBar({ onRun, bulkRunning, bulkProgress }: OneClickBarProps) {
  const boostActive = bulkRunning === 'boost';
  const cleanActive = bulkRunning === 'clean';
  const anyRunning = bulkRunning !== null;
  const pct = bulkProgress ? Math.round((bulkProgress.done / bulkProgress.total) * 100) : 0;

  return (
    <div className="oneclick">
      <button
        className={`oneclick__card oneclick__card--boost ${boostActive ? 'is-running' : ''}`}
        onClick={() => !anyRunning && onRun('boost')}
        disabled={anyRunning}
      >
        <div className="oneclick__icon">
          {boostActive ? <div className="spinner spinner--lg" /> : <Icon name="rocket" size={22} />}
        </div>
        <div className="oneclick__body">
          <div className="oneclick__title">Boost Completo</div>
          <div className="oneclick__sub">
            {boostActive && bulkProgress
              ? `${bulkProgress.done + 1} de ${bulkProgress.total} · ${bulkProgress.current}`
              : boostActive
                ? 'Aplicando otimizações…'
                : 'Aplica todas as otimizações de gaming numa tacada só. Reversível.'}
          </div>
          {boostActive && bulkProgress && (
            <div className="oneclick__progress">
              <div className="oneclick__progress-bar" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
        <div className="oneclick__cta mono">{boostActive ? `${pct}%` : 'EXECUTAR ↗'}</div>
      </button>

      <button
        className={`oneclick__card oneclick__card--clean ${cleanActive ? 'is-running' : ''}`}
        onClick={() => !anyRunning && onRun('clean')}
        disabled={anyRunning}
      >
        <div className="oneclick__icon">
          {cleanActive ? <div className="spinner spinner--lg" /> : <Icon name="trash" size={22} />}
        </div>
        <div className="oneclick__body">
          <div className="oneclick__title">Limpeza Completa</div>
          <div className="oneclick__sub">
            {cleanActive && bulkProgress
              ? `${bulkProgress.done + 1} de ${bulkProgress.total} · ${bulkProgress.current}`
              : cleanActive
                ? 'Limpando…'
                : 'Faxina geral — temp, prefetch, cache, lixeira. Costuma liberar ~5 GB.'}
          </div>
          {cleanActive && bulkProgress && (
            <div className="oneclick__progress">
              <div className="oneclick__progress-bar" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
        <div className="oneclick__cta mono">{cleanActive ? `${pct}%` : 'EXECUTAR ↗'}</div>
      </button>
    </div>
  );
}

// ─────────────── HERO (dashboard) ───────────────
interface HeroProps {
  pc: PCInfo;
  pcLoading: boolean;
  score: number;
  onNav: (id: string) => void;
  onRunOneClick: (action: string) => void;
  history: HistoryEntry[];
  bulkRunning: string | null;
  bulkProgress: BulkProgress | null;
}

export function Hero({ pc, pcLoading, score, onNav, onRunOneClick, history, bulkRunning, bulkProgress }: HeroProps) {
  // Live series
  const cpuSeries = useLiveSeries(60, [15, 80], 900, 1);
  const gpuSeries = useLiveSeries(60, [10, 70], 1100, 2);
  const ramSeries = useLiveSeries(60, [40, 75], 1500, 3);
  const netSeries = useLiveSeries(60, [0, 60], 700, 4);

  const cpuNow = Math.round(cpuSeries[cpuSeries.length - 1]);
  const gpuNow = Math.round(gpuSeries[gpuSeries.length - 1]);
  const ramNow = Math.round(ramSeries[ramSeries.length - 1]);
  const netNow = Math.round(netSeries[netSeries.length - 1]);
  const ramGB = ((ramNow / 100) * pc.ram.total).toFixed(1);

  // CPU/GPU faux temps that wobble
  const [temps, setTemps] = useState({ cpu: 62, gpu: 58 });
  useEffect(() => {
    const id = setInterval(() => {
      setTemps(t => ({
        cpu: Math.max(40, Math.min(85, t.cpu + (Math.random() - 0.5) * 3)),
        gpu: Math.max(35, Math.min(80, t.gpu + (Math.random() - 0.5) * 2.5)),
      }));
    }, 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="hero">
      {/* 1. greeting + machine header */}
      <header className="hero__head">
        <div className="hero__greeting">
          <div className="mono hero__eyebrow">— OLÁ, {pc.user.toUpperCase()}</div>
          <h1 className="hero__title">Seu PC está <em>pronto pra acelerar</em>.</h1>
          <p className="hero__lead">
            Aqui é o painel da sua máquina. Tudo que tá rolando agora, e o que dá pra fazer pra melhorar.
          </p>
        </div>

        <TickFrame className="hero__id" label="MACHINE ID" code="0x7F2A">
          <div className="hero__id-grid">
            <div>
              <div className="kv__k mono">HOSTNAME</div>
              <div className="kv__v mono">{pc.hostname}</div>
            </div>
            <div>
              <div className="kv__k mono">SISTEMA</div>
              <div className="kv__v mono">{pc.os}</div>
            </div>
            <div>
              <div className="kv__k mono">BUILD</div>
              <div className="kv__v mono">{pc.build}</div>
            </div>
            <div>
              <div className="kv__k mono">UPTIME</div>
              <div className="kv__v mono">{pc.uptime}</div>
            </div>
          </div>
        </TickFrame>
      </header>

      {/* 2. score + score breakdown */}
      <div className="hero__score">
        <TickFrame className="hero__score-main" label="PERFORMANCE SCORE" code="P-INDEX">
          <div className="hero__score-row">
            <ScoreGauge value={score} size={200} label="DE 100" />
            <div className="hero__score-side">
              <div className="hero__score-quip mono">
                ▸ Acima da média.<br />
                ▸ Ganhe +14 aplicando o Boost Completo.<br />
                ▸ Última otimização: há 2 horas.
              </div>
              <div className="hero__score-bars">
                {[
                  { k: 'Gaming', v: 78 },
                  { k: 'Limpeza', v: 94 },
                  { k: 'Drivers', v: 70 },
                  { k: 'Privacidade', v: 65 },
                ].map(b => (
                  <div key={b.k} className="scorebar">
                    <div className="scorebar__k mono">{b.k}</div>
                    <div className="scorebar__track">
                      <div className="scorebar__fill" style={{ width: `${b.v}%` }} />
                    </div>
                    <div className="scorebar__v mono">{b.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TickFrame>
      </div>

      {/* 3. driver banner + one-click */}
      <DriverBanner pc={pc} />
      <OneClickBar onRun={onRunOneClick} bulkRunning={bulkRunning} bulkProgress={bulkProgress} />

      {/* 4. live stats grid */}
      <div className="hero__statsec">
        <h2 className="sec__title">
          <span className="mono sec__num">01</span>
          Em tempo real
        </h2>
        <p className="sec__sub">O que sua máquina está fazendo agora mesmo. Atualiza sozinho.</p>
      </div>

      <div className="hero__stats">
        <StatCard
          label="PROCESSADOR · CPU" meta="01/04"
          model={pc.cpu.model}
          sub={`${pc.cpu.cores}C / ${pc.cpu.threads}T · ${pc.cpu.boostClock} GHz boost`}
          value={cpuNow} unit="%"
          series={cpuSeries} temp={Math.round(temps.cpu)}
        />
        <StatCard
          label="PLACA DE VÍDEO · GPU" meta="02/04"
          model={pc.gpu.model}
          sub={`${pc.gpu.vram} GB VRAM · driver ${pc.gpu.driver}`}
          value={gpuNow} unit="%"
          series={gpuSeries} temp={Math.round(temps.gpu)}
          accent="var(--accent-2)"
        />
        <StatCard
          label="MEMÓRIA · RAM" meta="03/04"
          model={`${pc.ram.total} GB ${pc.ram.type}`}
          sub={`${pc.ram.speed} MHz · ${ramGB} / ${pc.ram.total} GB em uso`}
          value={ramNow} unit="%"
          series={ramSeries}
        />
        <StatCard
          label="REDE · NET" meta="04/04"
          model="Ethernet 1 Gbps"
          sub="ping 12 ms · download estável"
          value={netNow} unit="Mb/s"
          series={netSeries}
          range={[0, 100]}
          accent="var(--accent-2)"
        />
      </div>

      {/* 5. disk + system */}
      <div className="hero__statsec">
        <h2 className="sec__title">
          <span className="mono sec__num">02</span>
          Armazenamento
        </h2>
        <p className="sec__sub">Quanto espaço você tem, e quanto a gente pode liberar.</p>
      </div>

      <TickFrame className="diskcard" label={`DISCO ${pc.disk.letter}:`} code={pc.disk.type}>
        <div className="diskcard__row">
          <div className="diskcard__numbers">
            <div className="diskcard__big mono">{pc.disk.free} <span>GB livres</span></div>
            <div className="diskcard__small mono">de {pc.disk.total} GB · {Math.round(((pc.disk.total - pc.disk.free) / pc.disk.total) * 100)}% ocupado</div>
          </div>
          <button className="btn btn--ghost" onClick={() => onNav('limpeza')}>
            Limpar disco <Icon name="chevron" size={14} />
          </button>
        </div>
        <div className="diskcard__bar">
          {[
            { k: 'Sistema', v: 18, c: 'var(--line-strong)' },
            { k: 'Jogos', v: 32, c: 'var(--accent)' },
            { k: 'Apps & docs', v: 8, c: 'var(--accent-2)' },
            { k: 'Temp & cache', v: 4, c: 'var(--warning)' },
          ].map((s, i) => (
            <div key={i} className="diskcard__seg" style={{ width: `${s.v}%`, background: s.c }} title={`${s.k} · ${Math.round(s.v * pc.disk.total / 100)} GB`} />
          ))}
        </div>
        <div className="diskcard__legend mono">
          <span><i style={{ background: 'var(--line-strong)' }} /> Sistema</span>
          <span><i style={{ background: 'var(--accent)' }} /> Jogos</span>
          <span><i style={{ background: 'var(--accent-2)' }} /> Apps</span>
          <span><i style={{ background: 'var(--warning)' }} /> Temp & cache <strong>↑ pode limpar</strong></span>
        </div>
      </TickFrame>

      {/* 6. quick actions + recent */}
      <div className="hero__bottom">
        <TickFrame className="quickjump" label="ATALHOS" code="JUMP">
          <div className="quickjump__grid">
            <button className="qaction" onClick={() => onNav('gaming')}>
              <Icon name="gamepad" size={18} />
              <div>
                <div className="qaction__t">Gaming Boost</div>
                <div className="qaction__s mono">{CATEGORIES.find(c => c.id === 'gaming')?.count} tweaks</div>
              </div>
            </button>
            <button className="qaction" onClick={() => onNav('limpeza')}>
              <Icon name="trash" size={18} />
              <div>
                <div className="qaction__t">Limpeza</div>
                <div className="qaction__s mono">{CATEGORIES.find(c => c.id === 'limpeza')?.count} rotinas</div>
              </div>
            </button>
            <button className="qaction" onClick={() => onNav('tweaks')}>
              <Icon name="sliders" size={18} />
              <div>
                <div className="qaction__t">Tweaks</div>
                <div className="qaction__s mono">{CATEGORIES.find(c => c.id === 'tweaks')?.count} ajustes</div>
              </div>
            </button>
            <button className="qaction" onClick={() => onNav('hardware')}>
              <Icon name="cpu" size={18} />
              <div>
                <div className="qaction__t">Hardware</div>
                <div className="qaction__s mono">specs completas</div>
              </div>
            </button>
          </div>
        </TickFrame>

        <TickFrame className="recent" label="ATIVIDADE RECENTE" code="LOG">
          <ul className="recent__list">
            {history.slice(0, 4).map(h => (
              <li key={h.id} className="recent__row">
                <span className={`recent__kind recent__kind--${h.kind}`} />
                <span className="recent__title">{h.title}</span>
                <span className="recent__delta mono">{h.delta}</span>
                <span className="recent__time mono">{h.time}</span>
              </li>
            ))}
          </ul>
          <button className="recent__more" onClick={() => onNav('historico')}>
            Ver histórico completo <Icon name="chevron" size={12} />
          </button>
        </TickFrame>
      </div>
    </section>
  );
}
