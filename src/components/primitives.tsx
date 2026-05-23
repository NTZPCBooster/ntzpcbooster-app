import React, { useState, useEffect } from 'react';
import { ICONS } from '../icons';
import { GearSix } from '@phosphor-icons/react';

// ─────────────── LOGO ───────────────
interface LogoProps {
  size?: number;
  accent?: string;
  mark?: string;
}

export function Logo({ size = 36 }: LogoProps) {
  return (
    <img
      src="/logo.png"
      alt="NTZ PCBooster"
      width={size}
      height={size}
      style={{ borderRadius: 6, objectFit: 'contain' }}
    />
  );
}

// ─────────────── ICON ───────────────

interface IconProps {
  name: string;
  size?: number;
  strokeWidth?: number;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
  className?: string;
  style?: React.CSSProperties;
}

export function Icon({ name, size = 16, weight = 'regular', className = '', style = {} }: IconProps) {
  const PhIcon = ICONS[name] || GearSix;
  return (
    <PhIcon
      size={size}
      weight={weight}
      className={`icon ${className}`}
      style={style}
    />
  );
}

// ─────────────── SWITCH ───────────────
interface SwitchProps {
  on: boolean;
  onChange: (value: boolean) => void;
  size?: 'sm' | 'md';
  disabled?: boolean;
}

export function Switch({ on, onChange, size = 'md', disabled = false }: SwitchProps) {
  const w = size === 'sm' ? 30 : 38;
  const h = size === 'sm' ? 16 : 20;
  const knob = h - 6;
  const pad = 3;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => !disabled && onChange(!on)}
      className={`switch ${on ? 'is-on' : ''}`}
      style={{ width: w, height: h }}
    >
      <span className="switch__knob" style={{
        width: knob,
        height: knob,
        top: '50%',
        left: 0,
        transform: `translateX(${on ? w - knob - pad : pad}px) translateY(-50%)`,
      }} />
    </button>
  );
}

// ─────────────── TICK FRAME ───────────────
interface TickFrameProps {
  children: React.ReactNode;
  label?: string;
  code?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function TickFrame({ children, label, code, className = '', style = {} }: TickFrameProps) {
  return (
    <div className={`tickframe ${className}`} style={style}>
      <span className="tickframe__corner tickframe__corner--tl" />
      <span className="tickframe__corner tickframe__corner--tr" />
      <span className="tickframe__corner tickframe__corner--bl" />
      <span className="tickframe__corner tickframe__corner--br" />
      {(label || code) && (
        <div className="tickframe__label">
          {label && <span className="tickframe__label-text">{label}</span>}
          {code && <span className="tickframe__label-code">{code}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

// ─────────────── SPARKLINE ───────────────
export function useLiveSeries(length: number = 60, range: [number, number] = [10, 90], speed: number = 800, seed: number = 0): number[] {
  const [series, setSeries] = useState<number[]>(() => {
    const arr: number[] = [];
    let v = (range[0] + range[1]) / 2 + (seed % 7);
    for (let i = 0; i < length; i++) {
      v += (Math.random() - 0.5) * 10;
      v = Math.max(range[0], Math.min(range[1], v));
      arr.push(v);
    }
    return arr;
  });

  useEffect(() => {
    const id = setInterval(() => {
      setSeries(prev => {
        const last = prev[prev.length - 1];
        let next = last + (Math.random() - 0.5) * 12;
        next = Math.max(range[0], Math.min(range[1], next));
        return [...prev.slice(1), next];
      });
    }, speed);
    return () => clearInterval(id);
  }, [speed, range[0], range[1]]);

  return series;
}

interface SparklineProps {
  data: number[];
  height?: number;
  color?: string;
  fill?: boolean;
  grid?: boolean;
  range?: [number, number];
}

export function Sparkline({ data, height = 44, color = 'var(--accent)', fill = true, grid = true, range = [0, 100] }: SparklineProps) {
  const w = 240;
  const h = height;
  const [lo, hi] = range;
  const norm = (v: number) => h - ((v - lo) / (hi - lo)) * h;
  const step = w / (data.length - 1);
  const pathD = data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i * step).toFixed(2)} ${norm(v).toFixed(2)}`).join(' ');
  const area = `${pathD} L ${w} ${h} L 0 ${h} Z`;
  const last = data[data.length - 1];
  return (
    <svg className="sparkline" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height={h}>
      {grid && (
        <g className="sparkline__grid">
          {[0.25, 0.5, 0.75].map((t, i) => (
            <line key={i} x1="0" x2={w} y1={h * t} y2={h * t} />
          ))}
        </g>
      )}
      {fill && <path d={area} fill={color} opacity="0.12" />}
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w - 1} cy={norm(last)} r="2.5" fill={color} />
    </svg>
  );
}

// ─────────────── RADIAL GAUGE ───────────────
interface ScoreGaugeProps {
  value?: number;
  size?: number;
  label?: string;
}

export function ScoreGauge({ value = 86, size = 200, label = 'PERFORMANCE' }: ScoreGaugeProps) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const arc = 0.75; // 270 degrees
  const filled = c * arc * (value / 100);
  const dash = `${filled} ${c}`;
  const rotation = -90 - (360 * (1 - arc)) / 2;
  return (
    <div className="gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(${rotation} ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--line-strong)" strokeWidth={stroke} fill="none" strokeDasharray={`${c * arc} ${c}`} strokeLinecap="butt" />
          <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--accent)" strokeWidth={stroke} fill="none" strokeDasharray={dash} strokeLinecap="butt" />
        </g>
        <g>
          {Array.from({ length: 16 }).map((_, i) => {
            const a = ((i / 15) * arc - 0.5 - (1 - arc) / 2) * Math.PI * 2;
            const x1 = size / 2 + Math.cos(a) * (r - stroke - 2);
            const y1 = size / 2 + Math.sin(a) * (r - stroke - 2);
            const x2 = size / 2 + Math.cos(a) * (r - stroke - 8);
            const y2 = size / 2 + Math.sin(a) * (r - stroke - 8);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--line)" strokeWidth="1" />;
          })}
        </g>
      </svg>
      <div className="gauge__inner">
        <div className="gauge__value mono">{value}</div>
        <div className="gauge__label mono">{label}</div>
        <div className="gauge__delta mono">+12 desde ontem</div>
      </div>
    </div>
  );
}
