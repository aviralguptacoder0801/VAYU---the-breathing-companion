import { useState } from 'react';
import type { HourlyAirPoint } from '../types';
import type { VentilationWindowAnalysis } from '../utils/airQuality';

interface HourlySmogChartProps {
  hourly: HourlyAirPoint[];
  ventilation: VentilationWindowAnalysis;
}

export function HourlySmogChart({ hourly, ventilation }: HourlySmogChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!hourly || hourly.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-slate-500">
        Hourly inversion curve is unavailable for this location.
      </div>
    );
  }

  const maxPm25 = Math.max(60, ...hourly.map((h) => h.pm25)) * 1.15;
  const width = 680;
  const height = 210;
  const padLeft = 42;
  const padRight = 14;
  const padTop = 18;
  const padBottom = 30;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const getX = (idx: number) =>
    padLeft + (idx / Math.max(1, hourly.length - 1)) * chartW;
  const getY = (val: number) =>
    padTop + chartH - (Math.max(0, val) / maxPm25) * chartH;

  const linePath = hourly
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx).toFixed(1)} ${getY(pt.pm25).toFixed(1)}`)
    .join(' ');

  const areaPath = `${linePath} L ${getX(hourly.length - 1).toFixed(1)} ${(padTop + chartH).toFixed(1)} L ${padLeft} ${(padTop + chartH).toFixed(1)} Z`;

  const bestStartIdx = Math.max(
    0,
    hourly.findIndex((h) => h.hourLabel === ventilation.bestStartHour)
  );
  const bestEndIdx = Math.max(
    bestStartIdx,
    hourly.findIndex((h) => h.hourLabel === ventilation.bestEndHour)
  );

  const ventX1 = getX(bestStartIdx);
  const ventX2 = Math.max(ventX1 + 24, getX(bestEndIdx));

  const yTicks = [0, Math.round(maxPm25 * 0.35), Math.round(maxPm25 * 0.7), Math.round(maxPm25)];
  const activePoint = hoveredIdx !== null ? hourly[hoveredIdx] : null;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            24-Hour Winter Inversion &amp; PM2.5 Curve
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Shaded band highlights the lowest-smog afternoon mixing window ({ventilation.bestStartHour}–{ventilation.bestEndHour}).
          </p>
        </div>
        <div className="font-mono tabular-nums text-xs text-slate-600">
          {activePoint ? (
            <span>
              {activePoint.hourLabel} · PM2.5 <strong className="text-slate-900">{activePoint.pm25} µg/m³</strong> · AQI {activePoint.usAqi}
            </span>
          ) : (
            <span>
              Trough {ventilation.bestAveragePm25} µg/m³ · Peak {ventilation.peakAveragePm25} µg/m³
            </span>
          )}
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`24-hour PM2.5 concentration curve showing lowest smog between ${ventilation.bestStartHour} and ${ventilation.bestEndHour}`}
          className="w-full h-auto min-w-[460px] select-none"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            <linearGradient id="pm25Fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f766e" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#0f766e" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Horizontal gridlines */}
          {yTicks.map((tick) => {
            const y = getY(tick);
            return (
              <g key={tick}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-slate-400 font-mono text-[10px]"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Best ventilation window highlight */}
          <rect
            x={ventX1}
            y={padTop}
            width={Math.max(18, ventX2 - ventX1)}
            height={chartH}
            fill="#ccfbf1"
            fillOpacity="0.55"
          />
          <text
            x={(ventX1 + ventX2) / 2}
            y={padTop + 12}
            textAnchor="middle"
            className="fill-teal-800 text-[10px] font-medium"
          >
            Best window
          </text>

          {/* WHO 24h reference guideline if within scale */}
          {15 < maxPm25 && (
            <g>
              <line
                x1={padLeft}
                y1={getY(15)}
                x2={width - padRight}
                y2={getY(15)}
                stroke="#0f766e"
                strokeDasharray="3 3"
                strokeOpacity="0.55"
                strokeWidth="1"
              />
              <text
                x={width - padRight - 2}
                y={getY(15) - 4}
                textAnchor="end"
                className="fill-teal-700 font-mono text-[9px]"
              >
                WHO 24h limit (15)
              </text>
            </g>
          )}

          {/* Area and stroke */}
          <path d={areaPath} fill="url(#pm25Fill)" />
          <path
            d={linePath}
            fill="none"
            stroke="#0f172a"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive hit columns & X-axis labels */}
          {hourly.map((pt, idx) => {
            const x = getX(idx);
            const y = getY(pt.pm25);
            const isHovered = hoveredIdx === idx;
            const showLabel = idx % 4 === 0 || idx === hourly.length - 1;
            const colWidth = chartW / Math.max(1, hourly.length);

            return (
              <g key={pt.hourLabel}>
                {showLabel && (
                  <text
                    x={x}
                    y={height - 8}
                    textAnchor="middle"
                    className="fill-slate-500 font-mono text-[10px]"
                  >
                    {pt.hourLabel}
                  </text>
                )}
                {isHovered && (
                  <>
                    <line
                      x1={x}
                      y1={padTop}
                      x2={x}
                      y2={padTop + chartH}
                      stroke="#94a3b8"
                      strokeDasharray="2 2"
                      strokeWidth="1"
                    />
                    <circle cx={x} cy={y} r="4.5" fill="#0f766e" stroke="#ffffff" strokeWidth="2" />
                  </>
                )}
                <rect
                  x={x - colWidth / 2}
                  y={padTop}
                  width={colWidth}
                  height={chartH}
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={() => setHoveredIdx(idx)}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
