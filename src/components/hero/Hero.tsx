/**
 * Hero — Main dashboard view.
 *
 * Composes StatCard, DriverBanner, OneClickBar and several TickFrame
 * sections into the full "Painel" page the user sees on launch.
 */
import { useState, useEffect } from 'react';
import { Icon, TickFrame, ScoreGauge, useLiveSeries } from '../primitives';
import { CATEGORIES, OPTIMIZATIONS } from '../../data';
import type { PCInfo, HistoryEntry } from '../../types';
import { StatCard } from './StatCard';
import { DriverBanner } from './DriverBanner';
import { OneClickBar, type BulkProgress } from './OneClickBar';

// ─────────────── HERO ───────────────
interface HeroProps {
  pc: PCInfo;
  pcLoading: boolean;
  score: number;
  onNav: (id: string) => void;
  onRunOneClick: (action: string) => void;
  history: HistoryEntry[];
  bulkRunning: string | null;
  bulkProgress: BulkProgress | null;
  applied: Record<string, boolean>;
  storageTotalMB?: number;
}

export function Hero({ pc, pcLoading: _pcLoading, score, onNav, onRunOneClick, history, bulkRunning, bulkProgress, applied, storageTotalMB }: HeroProps) {
  // Live series for the 4 stat cards
  const cpuSeries = useLiveSeries(60, [15, 80], 900, 1);
  const gpuSeries = useLiveSeries(60, [10, 70], 1100, 2);
  const ramSeries = useLiveSeries(60, [40, 75], 1500, 3);
  const netSeries = useLiveSeries(60, [0, 60], 700, 4);

  const cpuNow = Math.round(cpuSeries[cpuSeries.length - 1]);
  const gpuNow = Math.round(gpuSeries[gpuSeries.length - 1]);
  const ramNow = Math.round(ramSeries[ramSeries.length - 1]);
  const netNow = Math.round(netSeries[netSeries.length - 1]);
  const ramGB = ((ramNow / 100) * pc.ram.total).toFixed(1);

  // ── Dynamic score breakdown bars ──
  const gamingTotal = OPTIMIZATIONS.filter(o => o.category === 'gaming').length;
  const gamingOn = OPTIMIZATIONS.filter(o => o.category === 'gaming' && applied[o.id]).length;
  const limpezaTotal = OPTIMIZATIONS.filter(o => o.category === 'limpeza').length;
  const limpezaOn = OPTIMIZATIONS.filter(o => o.category === 'limpeza' && applied[o.id]).length;
  const tweaksTotal = OPTIMIZATIONS.filter(o => o.category === 'tweaks').length;
  const tweaksOn = OPTIMIZATIONS.filter(o => o.category === 'tweaks' && applied[o.id]).length;

  const gamingPct = gamingTotal ? Math.round((gamingOn / gamingTotal) * 100) : 0;
  const limpezaPct = limpezaTotal ? Math.round((limpezaOn / limpezaTotal) * 100) : 0;
  const tweaksPct = tweaksTotal ? Math.round((tweaksOn / tweaksTotal) * 100) : 0;
  const driverPct = pc.gpu.driverUpdateAvailable ? 60 : 100;

  // ── Dynamic score quip ──
  const maxBoost = gamingTotal - gamingOn;
  const possibleGain = Math.round(maxBoost * 1.2);
  const lastAction = history.length > 0 ? history[0] : null;

  function scoreQuip(): string {
    if (score >= 90) return 'Sua maquina esta voando.';
    if (score >= 80) return 'Muito acima da media.';
    if (score >= 72) return 'Acima da media.';
    return 'Ha espaco pra melhorar bastante.';
  }

  // ── Dynamic disk breakdown (real temp data when available) ──
  const diskUsed = pc.disk.total - pc.disk.free;
  const diskUsedPct = pc.disk.total ? Math.round((diskUsed / pc.disk.total) * 100) : 0;
  // Temp & cache: use real measurement (MB → GB → % of total disk)
  const tempGB = storageTotalMB ? storageTotalMB / 1024 : 0;
  const tempPct = pc.disk.total && tempGB > 0
    ? Math.max(1, Math.round((tempGB / pc.disk.total) * 100))
    : Math.max(1, Math.round(diskUsedPct * 0.06)); // fallback estimate
  const sysPct = Math.max(1, Math.round(diskUsedPct * 0.35));
  const appPct = Math.max(1, Math.round(diskUsedPct * 0.15));
  const restPct = Math.max(0, diskUsedPct - tempPct - appPct - sysPct);

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
          <div className="mono hero__eyebrow">— OLA, {pc.user.toUpperCase()}</div>
          <h1 className="hero__title">Seu PC esta <em>pronto pra acelerar</em>.</h1>
          <p className="hero__lead">
            Aqui e o painel da sua maquina. Tudo que ta rolando agora, e o que da pra fazer pra melhorar.
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
                ▸ {scoreQuip()}<br />
                {possibleGain > 0 && <>▸ Ganhe +{possibleGain} aplicando o Boost Completo.<br /></>}
                {lastAction
                  ? <>▸ Ultima acao: {lastAction.title}.</>
                  : <>▸ Nenhuma otimizacao aplicada ainda.</>}
              </div>
              <div className="hero__score-bars">
                {[
                  { k: 'Gaming', v: gamingPct },
                  { k: 'Limpeza', v: limpezaPct },
                  { k: 'Drivers', v: driverPct },
                  { k: 'Tweaks', v: tweaksPct },
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
        <p className="sec__sub">O que sua maquina esta fazendo agora mesmo. Atualiza sozinho.</p>
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
          label="PLACA DE VIDEO · GPU" meta="02/04"
          model={pc.gpu.model}
          sub={`${pc.gpu.vram} GB VRAM · driver ${pc.gpu.driver}`}
          value={gpuNow} unit="%"
          series={gpuSeries} temp={Math.round(temps.gpu)}
          accent="var(--accent-2)"
        />
        <StatCard
          label="MEMORIA · RAM" meta="03/04"
          model={`${pc.ram.total} GB ${pc.ram.type}`}
          sub={`${pc.ram.speed} MHz · ${ramGB} / ${pc.ram.total} GB em uso`}
          value={ramNow} unit="%"
          series={ramSeries}
        />
        <StatCard
          label="REDE · NET" meta="04/04"
          model="Adaptador de rede"
          sub="atividade de rede em tempo real"
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
        <p className="sec__sub">Quanto espaco voce tem, e quanto a gente pode liberar.</p>
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
            { k: 'Sistema', v: sysPct, c: 'var(--line-strong)' },
            { k: 'Jogos & apps', v: restPct, c: 'var(--accent)' },
            { k: 'Outros', v: appPct, c: 'var(--accent-2)' },
            { k: 'Temp & cache', v: tempPct, c: 'var(--warning)', realGB: tempGB > 0 ? tempGB : undefined },
          ].map((s, i) => (
            <div key={i} className="diskcard__seg" style={{ width: `${s.v}%`, background: s.c }} title={`${s.k} · ${s.realGB != null ? s.realGB.toFixed(1) : Math.round(s.v * pc.disk.total / 100)} GB`} />
          ))}
        </div>
        <div className="diskcard__legend mono">
          <span><i style={{ background: 'var(--line-strong)' }} /> Sistema</span>
          <span><i style={{ background: 'var(--accent)' }} /> Jogos & apps</span>
          <span><i style={{ background: 'var(--accent-2)' }} /> Outros</span>
          <span><i style={{ background: 'var(--warning)' }} /> Temp & cache{tempGB > 0 ? ` · ${tempGB.toFixed(1)} GB` : ''} <strong>↑ pode limpar</strong></span>
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
            Ver historico completo <Icon name="chevron" size={12} />
          </button>
        </TickFrame>
      </div>
    </section>
  );
}
