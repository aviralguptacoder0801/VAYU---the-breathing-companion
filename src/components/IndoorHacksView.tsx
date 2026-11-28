import { useState } from 'react';
import { Check, Wind } from 'lucide-react';
import { INDOOR_HACKS } from '../data/presets';
import { calculateCadrRecommendation } from '../utils/airQuality';
import { FilterGroup } from './FilterGroup';
import type { AirQualityData, HackCategory } from '../types';

interface IndoorHacksViewProps {
  airQuality: AirQualityData;
  appliedHackIds: string[];
  onToggleHack: (id: string) => void;
}

const FILTER_TABS: Array<{ id: 'all' | HackCategory; label: string }> = [
  { id: 'all', label: 'All hacks' },
  { id: 'filtration', label: 'Filtration' },
  { id: 'cooking', label: 'Kitchen & cooking' },
  { id: 'sealing', label: 'Sealing & dust' },
  { id: 'ventilation', label: 'Ventilation' },
];

export function IndoorHacksView({
  airQuality,
  appliedHackIds,
  onToggleHack,
}: IndoorHacksViewProps) {
  const [filter, setFilter] = useState<'all' | HackCategory>('all');
  const [roomAreaSqm, setRoomAreaSqm] = useState<number>(24);
  const [ceilingHeightM, setCeilingHeightM] = useState<number>(2.8);
  const [imgError, setImgError] = useState(false);

  const cadr = calculateCadrRecommendation(roomAreaSqm, ceilingHeightM, airQuality.usAqi);
  const visibleHacks =
    filter === 'all' ? INDOOR_HACKS : INDOOR_HACKS.filter((h) => h.category === filter);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Indoor Air Quality Hacks
        </h1>
        <p className="text-sm text-slate-600 mt-1 max-w-2xl">
          Practical, evidence-backed filtration, draft-sealing, and low-smoke cooking protocols that turn your home into a clean-air refuge during severe winter smog.
        </p>
      </div>

      {/* 2-Column Feature + CADR Sizing Calculator */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        <div className="xl:col-span-5 relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100 min-h-[260px]">
          {!imgError ? (
            <img
              src="/src/assets/images/indoor_clean_air_room_1795613594294.jpg"
              alt="Bright winter family living room with sealed double-glazed windows, minimalist HEPA air purifier, and indoor greenery"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-slate-500 bg-gradient-to-br from-slate-100 to-teal-50">
              <Wind className="w-10 h-10 text-teal-700 mb-3" aria-hidden="true" />
              <span className="text-sm font-medium text-slate-800">Indoor Clean-Air Sanctuary</span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/45 to-transparent p-5 text-white">
            <p className="text-xs font-medium text-teal-200">Clean-air sanctuary principle</p>
            <p className="text-sm font-medium leading-snug mt-1">
              Filtering one closed sleeping room cleanly beats running an undersized purifier in an open hallway.
            </p>
          </div>
        </div>

        <section
          aria-label="Room CADR and DIY purifier sizing calculator"
          className="xl:col-span-7 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between"
        >
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-900">
                Room Purifier &amp; DIY Corsi-Rosenthal Calculator
              </h2>
              <span className="font-mono tabular-nums text-xs text-slate-500">
                Calibrated for {airQuality.city} AQI {airQuality.usAqi} ({cadr.targetAch} ACH)
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Calculate the exact Clean Air Delivery Rate (CADR) needed to clear fine particles in your bedroom or living space during winter smog.
            </p>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <label htmlFor="cadr-room-area" className="font-medium text-slate-700">
                    Room floor area
                  </label>
                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                    {roomAreaSqm} m² ({Math.round(roomAreaSqm * 10.764)} ft²)
                  </span>
                </div>
                <input
                  id="cadr-room-area"
                  type="range"
                  min={10}
                  max={85}
                  step={1}
                  value={roomAreaSqm}
                  onChange={(e) => setRoomAreaSqm(Number(e.target.value))}
                  className="w-full accent-teal-700 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <label htmlFor="cadr-ceiling" className="font-medium text-slate-700">
                    Ceiling height
                  </label>
                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                    {ceilingHeightM.toFixed(1)} m
                  </span>
                </div>
                <input
                  id="cadr-ceiling"
                  type="range"
                  min={2.2}
                  max={4.0}
                  step={0.1}
                  value={ceilingHeightM}
                  onChange={(e) => setCeilingHeightM(Number(e.target.value))}
                  className="w-full accent-teal-700 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-slate-500">Required CADR</div>
              <div
                data-testid="cadr-m3h"
                className="mt-1 font-mono tabular-nums text-xl font-semibold text-teal-800"
              >
                {cadr.requiredCadrM3h} m³/h
              </div>
              <div className="font-mono tabular-nums text-xs text-slate-500">
                {cadr.requiredCadrCfm} CFM · {cadr.roomVolumeM3} m³ volume
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500">DIY Corsi-Rosenthal fit</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {cadr.corsiRosenthalCovers
                  ? '1 DIY box covers room'
                  : `${cadr.corsiRosenthalBoxesNeeded} units recommended`}
              </div>
              <div className="text-xs text-slate-500">
                1 box ≈ 500 m³/h (~$70 build)
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500">50% PM2.5 drop time</div>
              <div className="mt-1 font-mono tabular-nums text-xl font-semibold text-slate-900">
                ~{cadr.estimatedMinutesToClearHalf} min
              </div>
              <div className="text-xs text-slate-500">With windows sealed</div>
            </div>
          </div>
        </section>
      </div>

      {/* Filter Bar & Hacks Grid */}
      <section aria-labelledby="indoor-protocols-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="indoor-protocols-heading" className="text-base font-semibold text-slate-900">
              Evidence-Backed Home Protocols
            </h2>
            <FilterGroup
              label="Filter indoor air hacks by category"
              options={FILTER_TABS}
              value={filter}
              onChange={setFilter}
            />
          </div>

          <span className="text-xs text-slate-600 font-mono tabular-nums">
            {appliedHackIds.length} of {INDOOR_HACKS.length} applied at home
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {visibleHacks.map((hack) => {
            const applied = appliedHackIds.includes(hack.id);
            return (
              <article
                key={hack.id}
                className={`bg-white border rounded-xl p-6 flex flex-col justify-between transition-colors ${
                  applied ? 'border-teal-600 bg-teal-50/20' : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{hack.costTier}</span>
                    <span aria-hidden="true">·</span>
                    <span>{hack.setupMinutes} min setup</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums text-teal-800 font-semibold">
                      Up to −{hack.indoorPm25DropPct}% indoor PM2.5
                    </span>
                  </div>

                  <h3 className="mt-2 text-lg font-semibold text-slate-900 leading-snug">
                    {hack.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">{hack.roomScope}</p>

                  <ol className="mt-4 space-y-2 text-sm text-slate-700 list-decimal pl-5">
                    {hack.steps.map((step, i) => (
                      <li key={i} className="leading-relaxed">
                        {step}
                      </li>
                    ))}
                  </ol>

                  <div className="mt-4 pt-4 border-t border-slate-200 space-y-1.5 text-xs leading-relaxed">
                    <p className="text-slate-700">
                      <span className="font-semibold text-slate-900">Direct impact: </span>
                      {hack.directImpactExplanation}
                    </p>
                    <p className="text-slate-500">{hack.scienceNote}</p>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">
                    {applied ? 'Included in your household impact ledger' : 'Not yet active in your home'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onToggleHack(hack.id)}
                    aria-pressed={applied}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                      applied
                        ? 'bg-teal-700 text-white hover:bg-teal-800'
                        : 'bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    {applied && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                    {applied ? 'Applied at Home' : 'Mark Applied'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
