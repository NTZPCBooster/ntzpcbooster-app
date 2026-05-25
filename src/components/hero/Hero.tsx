/**
 * Hero — Main dashboard view.
 *
 * Composes StatCard, DriverBanner, OneClickBar and several TickFrame
 * sections into the full "Painel" page the user sees on launch.
 */
import { Icon, TickFrame, ScoreGauge, Skeleton } from '../primitives';
import { CATEGORIES, OPTIMIZATIONS } from '../../data';
import type { PCInfo, HistoryEntry } from '../../types';
import { StatCard } from './StatCard';
import { DriverBanner } from './DriverBanner';
import { OneClickBar, type BulkProgress } from './OneClickBar';
import { useI18n } from '../../i18n';
import { useSystemMonitor } from '../../hooks/useSystemMonitor';

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

export function Hero({ pc, pcLoading, score, onNav, onRunOneClick, history, bulkRunning, bulkProgress, applied, storageTotalMB }: HeroProps) {
  const { t } = useI18n();

  // Real-time system monitoring (CPU, GPU, RAM, Disk, Net)
  const monitor = useSystemMonitor();
  const { current: metrics } = monitor;

  const cpuNow = metrics.cpu;
  const gpuNow = metrics.gpu;
  const ramNow = metrics.ram;
  const netNow = Math.round(metrics.netDown + metrics.netUp);
  const diskNow = Math.round((metrics.diskRead + metrics.diskWrite) * 10) / 10;
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
    if (score >= 90) return t('hero.quipFlying');
    if (score >= 80) return t('hero.quipGreat');
    if (score >= 72) return t('hero.quipAbove');
    return t('hero.quipRoom');
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

  // Temperatures from real monitor (or fallback mock data)
  const temps = { cpu: metrics.cpuTemp, gpu: metrics.gpuTemp };

  return (
    <section className="hero">
      {/* 1. greeting + machine header */}
      <header className="hero__head">
        <div className="hero__greeting">
          <div className="mono hero__eyebrow">— {t('hero.greeting', { user: pc.user.toUpperCase() })}</div>
          <h1 className="hero__title" dangerouslySetInnerHTML={{ __html: t('hero.title') }} />
          <p className="hero__lead">
            {t('hero.lead')}
          </p>
        </div>

        <TickFrame className="hero__id" label="MACHINE ID" code="0x7F2A">
          <div className="hero__id-grid">
            {(['HOSTNAME', t('common.system').toUpperCase(), 'BUILD', 'UPTIME'] as const).map((label, i) => {
              const vals = [pc.hostname, pc.os, pc.build, pc.uptime];
              return (
                <div key={label}>
                  <div className="kv__k mono">{label}</div>
                  {pcLoading
                    ? <Skeleton height={12} width={i < 2 ? 120 : 80} style={{ marginTop: 4 }} />
                    : <div className="kv__v mono">{vals[i]}</div>}
                </div>
              );
            })}
          </div>
        </TickFrame>
      </header>

      {/* 2. score + score breakdown */}
      <div className="hero__score">
        <TickFrame className="hero__score-main" label="PERFORMANCE SCORE" code="P-INDEX">
          <div className="hero__score-row">
            <ScoreGauge value={score} size={200} label={t('hero.scoreLabel')} />
            <div className="hero__score-side">
              <div className="hero__score-quip mono">
                ▸ {scoreQuip()}<br />
                {possibleGain > 0 && <>▸ {t('hero.boostGain', { gain: String(possibleGain) })}<br /></>}
                {lastAction
                  ? <>▸ {t('hero.lastAction', { title: lastAction.title })}</>
                  : <>▸ {t('hero.noAction')}</>}
              </div>
              <div className="hero__score-bars">
                {[
                  { k: 'Gaming', v: gamingPct },
                  { k: t('nav.limpeza'), v: limpezaPct },
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
          {t('hero.realtime')}
        </h2>
        <p className="sec__sub">{t('hero.realtimeSub')}</p>
      </div>

      <div className="hero__stats">
        <StatCard
          label={t('stat.cpu')} meta="01/05"
          model={pc.cpu.model}
          sub={`${pc.cpu.cores}C / ${pc.cpu.threads}T · ${pc.cpu.boostClock} GHz boost`}
          value={cpuNow} unit="%"
          series={monitor.cpuSeries} temp={temps.cpu || undefined}
          loading={pcLoading}
        />
        <StatCard
          label={t('stat.gpu')} meta="02/05"
          model={pc.gpu.model}
          sub={`${pc.gpu.vram} GB VRAM · driver ${pc.gpu.driver}`}
          value={gpuNow} unit="%"
          series={monitor.gpuSeries} temp={temps.gpu || undefined}
          accent="var(--accent-2)"
          loading={pcLoading}
        />
        <StatCard
          label={t('stat.ram')} meta="03/05"
          model={`${pc.ram.total} GB ${pc.ram.type}`}
          sub={`${pc.ram.speed} MHz · ${ramGB} / ${pc.ram.total} GB ${t('stat.inUse')}`}
          value={ramNow} unit="%"
          series={monitor.ramSeries}
          loading={pcLoading}
        />
        <StatCard
          label={t('stat.disk')} meta="04/05"
          model={t('stat.diskModel')}
          sub={`${t('stat.diskSub')} · R:${metrics.diskRead} / W:${metrics.diskWrite} MB/s`}
          value={diskNow} unit="MB/s"
          series={monitor.diskSeries}
          range={[0, 200]}
          loading={pcLoading}
        />
        <StatCard
          label={t('stat.net')} meta="05/05"
          model={t('stat.netModel')}
          sub={`${t('stat.netSub')} · ↓${metrics.netDown} / ↑${metrics.netUp} Mbps`}
          value={netNow} unit="Mbps"
          series={monitor.netSeries}
          range={[0, 100]}
          accent="var(--accent-2)"
          loading={pcLoading}
        />
      </div>

      {/* 5. disk + system */}
      <div className="hero__statsec">
        <h2 className="sec__title">
          <span className="mono sec__num">02</span>
          {t('hero.storage')}
        </h2>
        <p className="sec__sub">{t('hero.storageSub')}</p>
      </div>

      <TickFrame className="diskcard" label={pcLoading ? 'DISCO' : `DISCO ${pc.disk.letter}:`} code={pcLoading ? '...' : pc.disk.type}>
        {pcLoading ? (
          <>
            <div className="diskcard__row">
              <div className="diskcard__numbers">
                <Skeleton height={28} width={180} />
                <Skeleton height={12} width={220} style={{ marginTop: 8 }} />
              </div>
            </div>
            <Skeleton height={10} width="100%" style={{ marginTop: 16, borderRadius: 6 }} />
            <div className="diskcard__legend mono" style={{ marginTop: 12 }}>
              <Skeleton height={10} width={60} />
              <Skeleton height={10} width={80} />
              <Skeleton height={10} width={50} />
              <Skeleton height={10} width={100} />
            </div>
          </>
        ) : (
          <>
            <div className="diskcard__row">
              <div className="diskcard__numbers">
                <div className="diskcard__big mono">{pc.disk.free} <span>{t('hero.diskFree', { free: String(pc.disk.free) }).replace(`${pc.disk.free} `, '')}</span></div>
                <div className="diskcard__small mono">{t('hero.diskOf', { total: String(pc.disk.total), pct: String(Math.round(((pc.disk.total - pc.disk.free) / pc.disk.total) * 100)) })}</div>
              </div>
              <button className="btn btn--ghost" onClick={() => onNav('limpeza')}>
                {t('hero.cleanDisk')} <Icon name="chevron" size={14} />
              </button>
            </div>
            <div className="diskcard__bar">
              {[
                { k: t('hero.diskSystem'), v: sysPct, c: 'var(--line-strong)' },
                { k: t('hero.diskGames'), v: restPct, c: 'var(--accent)' },
                { k: t('hero.diskOther'), v: appPct, c: 'var(--accent-2)' },
                { k: t('hero.diskTemp'), v: tempPct, c: 'var(--warning)', realGB: tempGB > 0 ? tempGB : undefined },
              ].map((s, i) => (
                <div key={i} className="diskcard__seg" style={{ width: `${s.v}%`, background: s.c }} title={`${s.k} · ${s.realGB != null ? s.realGB.toFixed(1) : Math.round(s.v * pc.disk.total / 100)} GB`} />
              ))}
            </div>
            <div className="diskcard__legend mono">
              <span><i style={{ background: 'var(--line-strong)' }} /> {t('hero.diskSystem')}</span>
              <span><i style={{ background: 'var(--accent)' }} /> {t('hero.diskGames')}</span>
              <span><i style={{ background: 'var(--accent-2)' }} /> {t('hero.diskOther')}</span>
              <span><i style={{ background: 'var(--warning)' }} /> {t('hero.diskTemp')}{tempGB > 0 ? ` · ${tempGB.toFixed(1)} GB` : ''} <strong>↑ {t('hero.diskCanClean')}</strong></span>
            </div>
          </>
        )}
      </TickFrame>

      {/* 6. quick actions + recent */}
      <div className="hero__bottom">
        <TickFrame className="quickjump" label={t('hero.shortcuts')} code="JUMP">
          <div className="quickjump__grid">
            <button className="qaction" onClick={() => onNav('gaming')}>
              <Icon name="gamepad" size={18} />
              <div>
                <div className="qaction__t">Gaming Boost</div>
                <div className="qaction__s mono">{CATEGORIES.find(c => c.id === 'gaming')?.count} {t('hero.tweaks')}</div>
              </div>
            </button>
            <button className="qaction" onClick={() => onNav('limpeza')}>
              <Icon name="trash" size={18} />
              <div>
                <div className="qaction__t">{t('nav.limpeza')}</div>
                <div className="qaction__s mono">{CATEGORIES.find(c => c.id === 'limpeza')?.count} {t('hero.routines')}</div>
              </div>
            </button>
            <button className="qaction" onClick={() => onNav('tweaks')}>
              <Icon name="sliders" size={18} />
              <div>
                <div className="qaction__t">Tweaks</div>
                <div className="qaction__s mono">{CATEGORIES.find(c => c.id === 'tweaks')?.count} {t('hero.adjustments')}</div>
              </div>
            </button>
            <button className="qaction" onClick={() => onNav('hardware')}>
              <Icon name="cpu" size={18} />
              <div>
                <div className="qaction__t">Hardware</div>
                <div className="qaction__s mono">{t('hero.fullSpecs')}</div>
              </div>
            </button>
          </div>
        </TickFrame>

        <TickFrame className="recent" label={t('hero.recentActivity')} code="LOG">
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
            {t('hero.viewHistory')} <Icon name="chevron" size={12} />
          </button>
        </TickFrame>
      </div>
    </section>
  );
}
