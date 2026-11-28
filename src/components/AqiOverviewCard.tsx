import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import {
  calculateCigaretteEquivalence,
  classifyAqi,
  getAqiScalePercent,
  getSmogTrend,
  type VentilationWindowAnalysis,
} from '../utils/airQuality';
import type { AirQualityData } from '../types';

interface AqiOverviewCardProps {
  airQuality: AirQualityData;
  ventilation: VentilationWindowAnalysis;
}

export function AqiOverviewCard({ airQuality, ventilation }: AqiOverviewCardProps) {
  const aqiInfo = classifyAqi(airQuality.usAqi);
  const scalePct = getAqiScalePercent(airQuality.usAqi);
  const whoMultiple = Math.max(1, Math.round((airQuality.pm25 / 15) * 10) / 10);
  const cigEq = calculateCigaretteEquivalence(airQuality.pm25);
  const trend = getSmogTrend(airQuality.hourly);

  const TrendIcon =
    trend.direction === 'Clearing'
      ? TrendingDown
      : trend.direction === 'Rising'
        ? TrendingUp
        : Minus;

  const trendToneClass =
    trend.direction === 'Clearing'
      ? 'text-teal-800'
      : trend.direction === 'Rising'
        ? 'text-red-700'
        : 'text-slate-600';

  return (
    <section
      aria-label="Current air quality telemetry"
      className="bg-white border border-slate-200 rounded-xl overflow-hidden"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        {/* Column 1: US AQI + Visual Scale */}
        <div className="p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs text-slate-500">US Air Quality Index</div>
            <div className="mt-2 flex items-baseline gap-2.5">
              <span className="font-mono tabular-nums text-3xl font-semibold text-slate-900">
                {airQuality.usAqi}
              </span>
              <span className={`text-xs font-semibold ${aqiInfo.textClass}`}>
                {aqiInfo.label}
              </span>
            </div>
          </div>

          {/* Intuitive EPA Scale Bar */}
          <div className="mt-3">
            <svg
              viewBox="0 0 200 14"
              role="meter"
              aria-label={`US Air Quality Index ${airQuality.usAqi}, rated ${aqiInfo.label}`}
              aria-valuemin={0}
              aria-valuemax={350}
              aria-valuenow={Math.min(350, Math.max(0, airQuality.usAqi))}
              className="w-full h-3.5 overflow-visible"
            >
              <clipPath id="aqi-scale-clip">
                <rect x="0" y="3" width="200" height="8" rx="4" />
              </clipPath>
              <g clipPath="url(#aqi-scale-clip)">
                <rect x="0" y="3" width="28" height="8" fill="#059669" />
                <rect x="28" y="3" width="28" height="8" fill="#f59e0b" />
                <rect x="56" y="3" width="30" height="8" fill="#f97316" />
                <rect x="86" y="3" width="28" height="8" fill="#dc2626" />
                <rect x="114" y="3" width="58" height="8" fill="#9f1239" />
                <rect x="172" y="3" width="28" height="8" fill="#581c87" />
              </g>
              <circle
                cx={Math.min(194, Math.max(6, (scalePct / 100) * 200))}
                cy="7"
                r="5"
                fill="#ffffff"
                stroke="#0f172a"
                strokeWidth="2"
              />
            </svg>
            <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-slate-600">
              <span>0 Good</span>
              <span>150</span>
              <span>300+ Severe</span>
            </div>
          </div>
        </div>

        {/* Column 2: Fine Particulate PM2.5 + Plain Context */}
        <div className="p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs text-slate-500">Fine Particulate (PM2.5)</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono tabular-nums text-3xl font-semibold text-slate-900">
                {airQuality.pm25}
              </span>
              <span className="font-mono text-xs text-slate-500">µg/m³</span>
            </div>
          </div>
          <div className="mt-2 space-y-0.5 text-xs text-slate-600">
            <p>
              {airQuality.pm25 <= 15
                ? 'Within WHO 24-hour guideline (≤15 µg/m³)'
                : `${whoMultiple}× WHO 24-hour guideline (15 µg/m³)`}
            </p>
            <p className="text-slate-500">
              {cigEq >= 1
                ? `24h outdoor dose ≈ ${cigEq} cigarettes · NO₂ ${airQuality.no2} µg/m³`
                : `Low particle load · NO₂ ${airQuality.no2} µg/m³`}
            </p>
          </div>
        </div>

        {/* Column 3: Inversion & 3-Hour Trend */}
        <div className="p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs text-slate-500">Inversion &amp; 3-Hour Trend</div>
            <div className="mt-2 flex items-baseline gap-2.5">
              <span className="font-display text-2xl font-semibold text-slate-900">
                {airQuality.inversionRisk}
              </span>
              <span className={`inline-flex items-center gap-1 text-xs font-medium ${trendToneClass}`}>
                <TrendIcon className="w-3.5 h-3.5" aria-hidden="true" />
                {trend.direction}
              </span>
            </div>
          </div>
          <div className="mt-2 space-y-0.5 text-xs text-slate-600">
            <p>{trend.summary}</p>
            <p className="text-slate-500 font-mono tabular-nums">
              {airQuality.temperatureC}°C · {airQuality.windSpeedKmh} km/h wind · {airQuality.humidityPct}% RH
            </p>
          </div>
        </div>

        {/* Column 4: Safest Ventilation Window */}
        <div className="p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs text-slate-500">Safest Ventilation Window</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono tabular-nums text-2xl font-semibold text-teal-800">
                {ventilation.bestStartHour}–{ventilation.bestEndHour}
              </span>
            </div>
          </div>
          <div className="mt-2 space-y-0.5 text-xs text-slate-600">
            <p>
              {ventilation.shouldVentilateBriefly
                ? `Brief 10-min cross-flush (~${ventilation.bestAveragePm25} µg/m³)`
                : `Stay sealed; recirculate indoor air (~${ventilation.bestAveragePm25} µg/m³)`}
            </p>
            <p className="text-slate-500">
              Peak smog: {ventilation.peakStartHour}–{ventilation.peakEndHour} ({ventilation.peakAveragePm25} µg/m³)
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
