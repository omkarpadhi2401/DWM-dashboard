import { ReactNode, useState } from 'react';

// Small dependency-free SVG charts for the Admin / Technical panel.
// One hue (the FraudGuard purple) for magnitude, recessive grid, hover tooltips,
// and every chart is paired with exact values (labels or a table) so colour is never the only cue.

export const CHART_PURPLE = '#6d28d9';
export const CHART_PURPLE_SOFT = '#c4b5fd';
const GRID = '#e5e7eb';
const INK = '#4b5263';

export type Datum = { label: string; value: number; detail?: string };

function niceMax(value: number) {
  if (value <= 0) return 1;
  const power = Math.pow(10, Math.floor(Math.log10(value)));
  const scaled = value / power;
  const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 2.5 ? 2.5 : scaled <= 5 ? 5 : 10;
  return step * power;
}

/** Axis ticks that land on round numbers (4 divisions for 2·10ⁿ, otherwise 5). */
function axisTicks(max: number) {
  const power = Math.pow(10, Math.floor(Math.log10(max)));
  const divisions = Math.abs(max / power - 2) < 1e-9 ? 4 : 5;
  return Array.from({ length: divisions + 1 }, (_, index) => Number(((max / divisions) * index).toPrecision(6)));
}

export const compact = (value: number) =>
  Math.abs(value) >= 1e7 ? `${(value / 1e7).toFixed(2)} Cr` : Math.abs(value) >= 1e5 ? `${(value / 1e5).toFixed(1)} L` : Math.abs(value) >= 1e3 ? `${Number((value / 1e3).toFixed(1))}K` : String(Math.round(value * 100) / 100);

function Tooltip({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <div className="chart-tip" style={{ left: `${x}%`, top: `${y}%` }} role="status">
      {children}
    </div>
  );
}

/** Vertical bars. `format` renders the value in labels and tooltips. */
export function BarChart({ data, format = String, height = 230, yLabel, showValues = true, wide = false, ariaLabel }: { data: Datum[]; format?: (value: number) => string; height?: number; yLabel?: string; showValues?: boolean; wide?: boolean; ariaLabel: string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!data.length) return <p className="muted">No data.</p>;
  const width = wide ? 1080 : 540;
  const pad = { top: 24, right: 8, bottom: 52, left: 50 };
  const max = niceMax(Math.max(...data.map((item) => item.value)));
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const band = plotW / data.length;
  const barW = Math.min(wide ? 64 : 44, band - Math.max(2, band * 0.28));
  const ticks = axisTicks(max);
  const rotate = band < Math.max(...data.map((item) => item.label.length)) * 6.2;
  return (
    <div className="chart" style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel} onMouseLeave={() => setHover(null)}>
        {ticks.map((tick) => {
          const y = pad.top + plotH - (tick / max) * plotH;
          return (
            <g key={tick}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke={GRID} strokeWidth={1} />
              <text x={pad.left - 6} y={y + 3.5} textAnchor="end" fontSize={11} fill={INK}>{format(tick)}</text>
            </g>
          );
        })}
        {data.map((item, index) => {
          const h = Math.max(item.value > 0 ? 2 : 0, (item.value / max) * plotH);
          const x = pad.left + index * band + (band - barW) / 2;
          const y = pad.top + plotH - h;
          const cx = pad.left + index * band + band / 2;
          return (
            <g key={item.label} onMouseEnter={() => setHover(index)} onFocus={() => setHover(index)} tabIndex={0} aria-label={`${item.label}: ${format(item.value)}`}>
              <rect x={pad.left + index * band} y={pad.top} width={band} height={plotH} fill="transparent" />
              <path d={`M ${x} ${y + h} V ${y + Math.min(4, h)} Q ${x} ${y} ${x + Math.min(4, barW / 2)} ${y} H ${x + barW - Math.min(4, barW / 2)} Q ${x + barW} ${y} ${x + barW} ${y + Math.min(4, h)} V ${y + h} Z`} fill={CHART_PURPLE} opacity={hover === null || hover === index ? 1 : 0.55} />
              {showValues && data.length <= 14 && <text x={cx} y={y - 5} textAnchor="middle" fontSize={11} fontWeight={600} fill="#1f2430">{format(item.value)}</text>}
              <text x={cx} y={height - pad.bottom + 14} textAnchor={rotate ? 'end' : 'middle'} fontSize={11} fill={INK} transform={rotate ? `rotate(-32 ${cx} ${height - pad.bottom + 14})` : undefined}>{item.label}</text>
            </g>
          );
        })}
        <line x1={pad.left} x2={width - pad.right} y1={pad.top + plotH} y2={pad.top + plotH} stroke="#9ca3af" strokeWidth={1} />
        {yLabel && <text x={pad.left} y={11} fontSize={11} fill={INK}>{yLabel}</text>}
      </svg>
      {hover !== null && (
        <Tooltip x={((pad.left + hover * band + band / 2) / width) * 100} y={8}>
          <strong>{data[hover].label}</strong>
          <span>{format(data[hover].value)}</span>
          {data[hover].detail && <small>{data[hover].detail}</small>}
        </Tooltip>
      )}
    </div>
  );
}

/** Line chart for an ordered series (e.g. fraud rate per quarter). */
export function LineChart({ data, format = String, height = 240, yLabel, wide = true, ariaLabel }: { data: Datum[]; format?: (value: number) => string; height?: number; yLabel?: string; wide?: boolean; ariaLabel: string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (data.length < 2) return <p className="muted">Not enough data points for a trend.</p>;
  const width = wide ? 1080 : 540;
  const pad = { top: 24, right: 18, bottom: 52, left: 50 };
  const max = niceMax(Math.max(...data.map((item) => item.value)));
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const x = (index: number) => pad.left + (index / (data.length - 1)) * plotW;
  const y = (value: number) => pad.top + plotH - (value / max) * plotH;
  const ticks = axisTicks(max);
  const peak = data.reduce((best, item, index) => (item.value > data[best].value ? index : best), 0);
  return (
    <div className="chart" style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={ariaLabel}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          const position = ((event.clientX - box.left) / box.width) * width;
          setHover(Math.max(0, Math.min(data.length - 1, Math.round(((position - pad.left) / plotW) * (data.length - 1)))));
        }}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke={GRID} strokeWidth={1} />
            <text x={pad.left - 6} y={y(tick) + 3.5} textAnchor="end" fontSize={11} fill={INK}>{format(tick)}</text>
          </g>
        ))}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + plotH} stroke="#9ca3af" strokeDasharray="3 3" />}
        <path d={data.map((item, index) => `${index ? 'L' : 'M'} ${x(index).toFixed(1)} ${y(item.value).toFixed(1)}`).join(' ')} fill="none" stroke={CHART_PURPLE} strokeWidth={2} strokeLinejoin="round" />
        {data.map((item, index) => (
          <g key={item.label}>
            <circle cx={x(index)} cy={y(item.value)} r={hover === index ? 5 : 4} fill={CHART_PURPLE} stroke="#fff" strokeWidth={2} />
            <text x={x(index)} y={height - pad.bottom + 14} textAnchor="end" fontSize={11} fill={INK} transform={`rotate(-32 ${x(index)} ${height - pad.bottom + 14})`}>{item.label}</text>
          </g>
        ))}
        <text x={x(peak)} y={y(data[peak].value) - 9} textAnchor="middle" fontSize={11} fontWeight={600} fill="#1f2430">{format(data[peak].value)}</text>
        <line x1={pad.left} x2={width - pad.right} y1={pad.top + plotH} y2={pad.top + plotH} stroke="#9ca3af" strokeWidth={1} />
        {yLabel && <text x={pad.left} y={11} fontSize={11} fill={INK}>{yLabel}</text>}
      </svg>
      {hover !== null && (
        <Tooltip x={(x(hover) / width) * 100} y={8}>
          <strong>{data[hover].label}</strong>
          <span>{format(data[hover].value)}</span>
          {data[hover].detail && <small>{data[hover].detail}</small>}
        </Tooltip>
      )}
    </div>
  );
}

/** Horizontal bars with the exact value at the end of every row. */
export function HBarChart({ data, format = String, max, tone = 'primary' }: { data: Datum[]; format?: (value: number) => string; max?: number; tone?: 'primary' | 'soft' }) {
  if (!data.length) return <p className="muted">No data.</p>;
  const top = max ?? Math.max(...data.map((item) => Math.abs(item.value)), 0.000001);
  return (
    <div className="hbars">
      {data.map((item) => (
        <div className="hbar" key={item.label} title={item.detail ? `${item.label}: ${format(item.value)} — ${item.detail}` : `${item.label}: ${format(item.value)}`}>
          <span className="hbar-label">{item.label}</span>
          <div className="hbar-track"><i style={{ width: `${Math.max(item.value ? 1.5 : 0, (Math.abs(item.value) / top) * 100)}%`, background: tone === 'soft' ? '#a78bfa' : CHART_PURPLE }} /></div>
          <b>{format(item.value)}</b>
        </div>
      ))}
    </div>
  );
}

/** Two-part proportion bar with direct labels (e.g. fraud vs genuine). */
export function SplitBar({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const total = parts.reduce((sum, part) => sum + part.value, 0) || 1;
  return (
    <div>
      <div className="split-bar" role="img" aria-label={parts.map((part) => `${part.label} ${part.value}`).join(', ')}>
        {parts.map((part) => <i key={part.label} style={{ width: `${(part.value / total) * 100}%`, background: part.color, minWidth: part.value ? 3 : 0 }} />)}
      </div>
      <div className="legend">
        {parts.map((part) => (
          <span key={part.label}><i style={{ background: part.color }} /> {part.label}: <b>{part.value.toLocaleString()}</b> ({((part.value / total) * 100).toFixed(2)}%)</span>
        ))}
      </div>
    </div>
  );
}

/** ROC / precision-recall style curve on a 0–1 square. */
export function CurveChart({ points, xKey, yKey, xLabel, yLabel, diagonal, ariaLabel }: { points: Record<string, number>[]; xKey: string; yKey: string; xLabel: string; yLabel: string; diagonal?: boolean; ariaLabel: string }) {
  const size = 300;
  const pad = { top: 12, right: 12, bottom: 38, left: 42 };
  const plot = size - pad.left - pad.right;
  const plotH = size - pad.top - pad.bottom;
  const px = (value: number) => pad.left + value * plot;
  const py = (value: number) => pad.top + plotH - value * plotH;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={ariaLabel} className="curve-svg">
      {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
        <g key={tick}>
          <line x1={pad.left} x2={size - pad.right} y1={py(tick)} y2={py(tick)} stroke={GRID} />
          <line y1={pad.top} y2={pad.top + plotH} x1={px(tick)} x2={px(tick)} stroke={GRID} />
          <text x={pad.left - 6} y={py(tick) + 3.5} textAnchor="end" fontSize={10} fill={INK}>{tick}</text>
          <text x={px(tick)} y={pad.top + plotH + 13} textAnchor="middle" fontSize={10} fill={INK}>{tick}</text>
        </g>
      ))}
      {diagonal && <line x1={px(0)} y1={py(0)} x2={px(1)} y2={py(1)} stroke="#9ca3af" strokeDasharray="4 4" />}
      <path d={points.map((point, index) => `${index ? 'L' : 'M'} ${px(point[xKey]).toFixed(1)} ${py(point[yKey]).toFixed(1)}`).join(' ')} fill="none" stroke={CHART_PURPLE} strokeWidth={2} strokeLinejoin="round" />
      <text x={pad.left + plot / 2} y={size - 6} textAnchor="middle" fontSize={11} fill={INK}>{xLabel}</text>
      <text x={12} y={pad.top + plotH / 2} textAnchor="middle" fontSize={11} fill={INK} transform={`rotate(-90 12 ${pad.top + plotH / 2})`}>{yLabel}</text>
    </svg>
  );
}

/** Background tint for heat-map table cells: one hue, light to dark. */
export function heatColor(value: number | null, max: number) {
  if (value === null || max <= 0) return { background: 'transparent', color: 'var(--muted)' };
  const ratio = Math.max(0, Math.min(1, value / max));
  return { background: `rgba(109, 40, 217, ${(0.06 + ratio * 0.74).toFixed(3)})`, color: ratio > 0.55 ? '#fff' : 'var(--text)' };
}
