import { useState } from 'react';
import { ArrowRight, Check, Users } from 'lucide-react';
import { SUSTAINABLE_SWAPS } from '../data/presets';
import { getPrioritizedSwaps } from '../utils/airQuality';
import type { HouseholdProfile, ImpactSummary, SwapCategory } from '../types';

interface SwapsViewProps {
  profile: HouseholdProfile;
  adoptedSwapIds: string[];
  communityHouseholds: number;
  impact: ImpactSummary;
  onToggleSwap: (id: string) => void;
  onChangeCommunityHouseholds: (count: number) => void;
}

const SWAP_FILTERS: Array<{ id: 'all' | SwapCategory; label: string }> = [
  { id: 'all', label: 'All swaps' },
  { id: 'commute', label: 'Commute' },
  { id: 'heating', label: 'Heating' },
  { id: 'cooking', label: 'Cooking' },
  { id: 'community', label: 'Community' },
];

const SCALE_PRESETS = [
  { label: 'My Family (1)', count: 1 },
  { label: 'Building (15)', count: 15 },
  { label: 'Block (50)', count: 50 },
  { label: 'School (200)', count: 200 },
];

export function SwapsView({
  profile,
  adoptedSwapIds,
  communityHouseholds,
  impact,
  onToggleSwap,
  onChangeCommunityHouseholds,
}: SwapsViewProps) {
  const [filter, setFilter] = useState<'all' | SwapCategory>('all');
  const [imgError, setImgError] = useState(false);

  const prioritized = getPrioritizedSwaps(profile, SUSTAINABLE_SWAPS);
  const visibleSwaps =
    filter === 'all' ? prioritized : prioritized.filter((s) => s.category === filter);

  const formatMass = (grams: number) => {
    if (grams >= 1000) return `${(grams / 1000).toFixed(2)} kg`;
    return `${Math.round(grams)} g`;
  };

  const formatCo2 = (kg: number) => {
    if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`;
    return `${Math.round(kg)} kg`;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Sustainable Alternatives &amp; Community Impact
        </h1>
        <p className="text-sm text-slate-600 mt-1 max-w-2xl">
          Practical low-emission swaps prioritized for your {profile.city} household—showing both what changes for your family and what happens when neighbors join in.
        </p>
      </div>

      {/* 2-Column Community Multiplier Hero */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        <div className="xl:col-span-5 relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100 min-h-[260px]">
          {!imgError ? (
            <img
              src="/src/assets/images/winter_clean_commute_1795613597169.jpg"
              alt="Families walking along a crisp winter tree-lined neighborhood street alongside a clean electric streetcar"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-slate-500 bg-gradient-to-br from-slate-100 to-teal-50">
              <Users className="w-10 h-10 text-teal-700 mb-3" aria-hidden="true" />
              <span className="text-sm font-medium text-slate-800">Collective Clean-Air Impact</span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/45 to-transparent p-5 text-white">
            <p className="text-xs font-medium text-teal-200">Why neighborhood scale matters</p>
            <p className="text-sm font-medium leading-snug mt-1">
              During winter inversions, local street-level emissions stay trapped right in the neighborhood where they are created.
            </p>
          </div>
        </div>

        <section
          aria-label="Community impact multiplier"
          className="xl:col-span-7 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between"
        >
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-900">
                Community Ripple Calculator
              </h2>
              <span className="font-mono tabular-nums text-xs text-slate-500">
                {adoptedSwapIds.length} active household swaps
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Scale your adopted low-emission routines and swaps to see the direct monthly emissions prevented across your building, block, or school community.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {SCALE_PRESETS.map((preset) => (
                <button
                  key={preset.count}
                  type="button"
                  onClick={() => onChangeCommunityHouseholds(preset.count)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                    communityHouseholds === preset.count
                      ? 'bg-teal-50 border-teal-700 text-teal-900'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label htmlFor="community-households-slider" className="font-medium text-slate-700">
                  Participating households
                </label>
                <span
                  data-testid="community-household-count"
                  className="font-mono tabular-nums font-semibold text-slate-900"
                >
                  {communityHouseholds} {communityHouseholds === 1 ? 'household' : 'households'}
                </span>
              </div>
              <input
                id="community-households-slider"
                type="range"
                min={1}
                max={300}
                step={1}
                value={communityHouseholds}
                onChange={(e) => onChangeCommunityHouseholds(Number(e.target.value))}
                className="w-full accent-teal-700 cursor-pointer"
              />
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-slate-500">Collective PM2.5 prevented</div>
              <div
                data-testid="community-pm25-prevented"
                className="mt-1 font-mono tabular-nums text-xl font-semibold text-teal-800"
              >
                {formatMass(impact.communityPm25PreventedGrams)}/mo
              </div>
              <div className="text-xs text-slate-500">Direct neighborhood smoke</div>
            </div>

            <div>
              <div className="text-xs text-slate-500">Collective CO₂e avoided</div>
              <div
                data-testid="community-co2-avoided"
                className="mt-1 font-mono tabular-nums text-xl font-semibold text-slate-900"
              >
                {formatCo2(impact.communityCo2SavedKg)}/mo
              </div>
              <div className="text-xs text-slate-500">Winter season emissions</div>
            </div>

            <div>
              <div className="text-xs text-slate-500">Your household savings</div>
              <div className="mt-1 font-mono tabular-nums text-xl font-semibold text-slate-900">
                ${Math.max(0, impact.monthlyCostSavingsUsd)}/mo
              </div>
              <div className="text-xs text-slate-500">Estimated fuel &amp; utility cut</div>
            </div>
          </div>
        </section>
      </div>

      {/* Category Filter + Swap Cards */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Filter sustainable swaps by category"
            className="inline-flex flex-wrap items-center p-1 bg-slate-100 rounded-lg"
          >
            {SWAP_FILTERS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={filter === tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  filter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-500">
            Matches for your household profile appear first
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {visibleSwaps.map((swap) => {
            const adopted = adoptedSwapIds.includes(swap.id);
            const monthlySaveText =
              swap.monthlyCostDeltaUsd < 0
                ? `Saves ~$${Math.abs(swap.monthlyCostDeltaUsd)}/mo`
                : swap.monthlyCostDeltaUsd === 0
                  ? 'Zero added cost'
                  : `+$${swap.monthlyCostDeltaUsd}/mo`;

            return (
              <article
                key={swap.id}
                className={`bg-white border rounded-xl p-6 flex flex-col justify-between transition-colors ${
                  adopted ? 'border-teal-600 bg-teal-50/20' : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                    {swap.isTailoredMatch && (
                      <>
                        <span className="font-semibold text-teal-800">
                          Recommended for your household
                        </span>
                        <span aria-hidden="true">·</span>
                      </>
                    )}
                    <span className="capitalize">{swap.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{monthlySaveText}</span>
                  </div>

                  <h3 className="mt-2 text-lg font-semibold text-slate-900 leading-snug">
                    {swap.title}
                  </h3>

                  <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200/80 rounded-lg grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-3 text-xs">
                    <div>
                      <div className="text-slate-500 font-medium">Instead of</div>
                      <div className="text-slate-800 mt-0.5 leading-snug">{swap.currentHabit}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-teal-700 hidden sm:block" aria-hidden="true" />
                    <div>
                      <div className="text-teal-800 font-medium">Switch to</div>
                      <div className="text-slate-900 font-medium mt-0.5 leading-snug">
                        {swap.sustainableAlternative}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3 py-3 border-y border-slate-200 text-xs">
                    <div>
                      <div className="text-slate-500">PM2.5 cut</div>
                      <div className="font-mono tabular-nums font-semibold text-teal-800 mt-0.5">
                        {swap.monthlyPm25PreventedGrams} g/mo
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">CO₂e saved</div>
                      <div className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                        {swap.monthlyCo2SavedKg} kg/mo
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Exposure</div>
                      <div className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                        −{swap.exposureReductionPct}%
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-xs leading-relaxed">
                    <p className="text-slate-700">
                      <span className="font-semibold text-slate-900">Direct impact: </span>
                      {swap.directImpactExplanation}
                    </p>
                    <p className="text-slate-600">
                      <span className="font-semibold text-slate-800">Community ripple: </span>
                      {swap.communityRippleNote}
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">
                    {adopted ? 'Counted in personal & community totals' : 'Add to household plan'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onToggleSwap(swap.id)}
                    aria-pressed={adopted}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                      adopted
                        ? 'bg-teal-700 text-white hover:bg-teal-800'
                        : 'bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    {adopted && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                    {adopted ? 'Swap Adopted' : 'Adopt Swap'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
