/** Live-updating metric card with sparkline chart and temperature badge. */
import { Icon, TickFrame, Sparkline, Skeleton } from '../primitives';

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
  loading?: boolean;
}

export function StatCard({ label, model, value, unit, series, temp, sub, range = [0, 100], accent = 'var(--accent)', meta, loading }: StatCardProps) {
  if (loading) {
    return (
      <TickFrame className="statcard" label={label} code={meta}>
        <div className="statcard__head">
          <div>
            <Skeleton height={13} width="70%" />
            <Skeleton height={10} width="90%" style={{ marginTop: 6 }} />
          </div>
        </div>
        <div className="statcard__readout">
          <Skeleton height={36} width={80} style={{ marginTop: 8 }} />
        </div>
        <Skeleton height={48} width="100%" style={{ marginTop: 12 }} />
        <div className="statcard__axis mono">
          <Skeleton height={9} width={40} />
          <span />
          <Skeleton height={9} width={40} />
        </div>
      </TickFrame>
    );
  }

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
