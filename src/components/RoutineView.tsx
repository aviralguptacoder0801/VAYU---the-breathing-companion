import { useState, useRef, useEffect } from 'react';
import {
  Check,
  Copy,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { CITY_PRESETS } from '../data/presets';
import {
  classifyAqi,
  findBestVentilationWindows,
  formatShareableFamilyBrief,
  getActivityGuidance,
} from '../utils/airQuality';
import { AqiOverviewCard } from './AqiOverviewCard';
import { ActivityGuideStrip } from './ActivityGuideStrip';
import { FilterGroup } from './FilterGroup';
import { HourlySmogChart } from './HourlySmogChart';
import type {
  AirQualityData,
  HouseholdProfile,
  ImpactSummary,
  RoutineItem,
  RoutinePeriod,
} from '../types';

interface RoutineViewProps {
  profile: HouseholdProfile;
  airQuality: AirQualityData;
  loadingAir: boolean;
  airError: string | null;
  routines: RoutineItem[];
  completedIds: string[];
  hasAiOverrides: boolean;
  impact: ImpactSummary;
  onToggleRoutine: (id: string) => void;
  onAddCustomRoutine: (item: RoutineItem) => void;
  onDeleteCustomRoutine: (id: string) => void;
  onResetAiRoutines: () => void;
  onSelectCity: (city: string) => void;
  onRefreshAir: () => void;
  onGoToAssistantPlan: () => void;
}

const PERIOD_FILTERS: Array<{ id: 'all' | RoutinePeriod; label: string }> = [
  { id: 'all', label: 'All day' },
  { id: 'morning', label: 'Morning' },
  { id: 'midday', label: 'Midday' },
  { id: 'evening', label: 'Evening' },
  { id: 'night', label: 'Night' },
];

const CATEGORY_LABELS: Record<RoutineItem['category'], string> = {
  commute: 'Commute',
  ventilation: 'Ventilation',
  indoor_air: 'Indoor air',
  cooking: 'Cooking',
  community: 'Community',
};

export function RoutineView({
  profile,
  airQuality,
  loadingAir,
  airError,
  routines,
  completedIds,
  hasAiOverrides,
  impact,
  onToggleRoutine,
  onAddCustomRoutine,
  onDeleteCustomRoutine,
  onResetAiRoutines,
  onSelectCity,
  onRefreshAir,
  onGoToAssistantPlan,
}: RoutineViewProps) {
  const [periodFilter, setPeriodFilter] = useState<'all' | RoutinePeriod>('all');
  const [cityInput, setCityInput] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customPeriod, setCustomPeriod] = useState<RoutinePeriod>('morning');
  const [customImpact, setCustomImpact] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [briefStatus, setBriefStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const aqiInfo = classifyAqi(airQuality.usAqi);
  const ventilation = findBestVentilationWindows(airQuality.hourly);
  const activityItems = getActivityGuidance(airQuality, profile.sensitivities);

  const completedVisibleCount = routines.filter((r) => completedIds.includes(r.id)).length;
  const routineProgressPct =
    routines.length > 0 ? Math.round((completedVisibleCount / routines.length) * 100) : 0;

  const visibleRoutines =
    periodFilter === 'all'
      ? routines
      : routines.filter((item) => item.period === periodFilter);

  const handleCitySearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = cityInput.trim();
    if (!cleaned) return;
    onSelectCity(cleaned);
    setCityInput('');
  };

  const scheduleBriefReset = () => {
    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = window.setTimeout(() => {
      setBriefStatus('idle');
      copyTimerRef.current = null;
    }, 2600);
  };

  const handleCopyBrief = async () => {
    const brief = formatShareableFamilyBrief(profile, airQuality, routines, impact);
    let copied = false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(brief);
        copied = true;
      }
    } catch {
      copied = false;
    }

    if (!copied && typeof document !== 'undefined') {
      try {
        const helper = document.createElement('textarea');
        helper.value = brief;
        helper.setAttribute('readonly', '');
        helper.className = 'sr-only';
        document.body.appendChild(helper);
        helper.select();
        copied = document.execCommand('copy');
        document.body.removeChild(helper);
      } catch {
        copied = false;
      }
    }

    setBriefStatus(copied ? 'copied' : 'error');
    scheduleBriefReset();
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customTitle.trim().length < 3) {
      setFormError('Enter a routine title of at least 3 characters.');
      return;
    }
    const timeDefaults: Record<RoutinePeriod, string> = {
      morning: '08:00 – 09:00',
      midday: `${ventilation.bestStartHour} – ${ventilation.bestEndHour}`,
      evening: '18:30 – 20:00',
      night: '21:30 – 06:30',
    };
    const newItem: RoutineItem = {
      id: `custom-${Date.now()}`,
      period: customPeriod,
      timeWindow: timeDefaults[customPeriod],
      title: customTitle.trim(),
      action: 'Household-defined low-emission habit added to your daily schedule.',
      category: 'indoor_air',
      directImpact:
        customImpact.trim() ||
        'Reduces daily household exposure and reinforces consistent clean-air routines during winter inversions.',
      exposureReductionPct: 8,
      dailyPm25AvoidedUg: 45,
      dailyCo2SavedKg: 0.5,
      dailyEmissionPm25Grams: 0.4,
    };
    onAddCustomRoutine(newItem);
    setCustomTitle('');
    setCustomImpact('');
    setFormError(null);
    setShowAddForm(false);
  };

  return (
    <div className="space-y-7">
      {/* Header & City Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {airQuality.city}
            {airQuality.country ? `, ${airQuality.country}` : ''}
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">{aqiInfo.shortGuidance}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <form onSubmit={handleCitySearch} className="flex items-center gap-2">
            <label htmlFor="city-quick-search" className="sr-only">
              Check another city air quality
            </label>
            <div className="relative">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="city-quick-search"
                type="text"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                placeholder="Search any city..."
                className="w-44 sm:w-52 pl-9 pr-3 py-2 text-xs text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-700"
              />
            </div>
            <button
              type="submit"
              disabled={loadingAir}
              className="px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              Check Air
            </button>
          </form>

          <button
            type="button"
            onClick={handleCopyBrief}
            aria-live="polite"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            {briefStatus === 'copied' ? (
              <Check className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
            )}
            {briefStatus === 'copied'
              ? 'Brief Copied'
              : briefStatus === 'error'
                ? 'Copy Unavailable'
                : 'Copy Family Brief'}
          </button>

          <button
            type="button"
            onClick={onRefreshAir}
            disabled={loadingAir}
            aria-busy={loadingAir}
            aria-label="Refresh air quality readings"
            className="p-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shrink-0 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loadingAir ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Quick preset city switcher */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs border-b border-slate-200 pb-3">
        <span className="text-slate-600 font-medium">Winter smog watch cities:</span>
        {CITY_PRESETS.map((preset) => {
          const active = preset.city.toLowerCase() === airQuality.city.toLowerCase();
          return (
            <button
              key={preset.city}
              type="button"
              aria-pressed={active}
              onClick={() => onSelectCity(preset.city)}
              className={`transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'text-teal-800 font-semibold underline underline-offset-4 decoration-teal-700'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {preset.city}
            </button>
          );
        })}
        <span className="ml-auto text-slate-600 hidden sm:inline">
          {airQuality.source === 'live'
            ? 'Live Open-Meteo telemetry'
            : 'Winter inversion baseline model'}
        </span>
      </div>

      {airError && (
        <div
          role="alert"
          className="p-3.5 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg"
        >
          {airError}
        </div>
      )}

      {/* 1. Visual AQI & Telemetry Strip */}
      <AqiOverviewCard airQuality={airQuality} ventilation={ventilation} />

      {/* 2. Plain-English Family Activity Guide */}
      <ActivityGuideStrip items={activityItems} city={airQuality.city} />

      {/* 3. 2-Column Middle Split: Inversion Chart + Direct Impact Ledger */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        <section className="xl:col-span-8 bg-white border border-slate-200 rounded-xl p-6">
          <HourlySmogChart hourly={airQuality.hourly} ventilation={ventilation} />
        </section>

        <section
          aria-label="Household direct impact ledger"
          data-testid="impact-ledger"
          className="xl:col-span-4 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between"
        >
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Direct Impact of Your Choices
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Updates live as you complete daily routines, apply indoor hacks, and adopt low-emission swaps.
            </p>

            <dl className="mt-5 divide-y divide-slate-200">
              <div className="py-3 flex items-baseline justify-between gap-4">
                <dt className="text-xs text-slate-600">Personal PM2.5 exposure cut</dt>
                <dd
                  data-testid="impact-exposure-pct"
                  className="font-mono tabular-nums text-lg font-semibold text-teal-800"
                >
                  −{impact.dailyExposureReductionPct}%
                </dd>
              </div>
              <div className="py-3 flex items-baseline justify-between gap-4">
                <dt className="text-xs text-slate-600">Lung PM2.5 dose avoided</dt>
                <dd className="font-mono tabular-nums text-base font-semibold text-slate-900">
                  {impact.dailyPm25InhalationAvoidedUg} µg/day
                </dd>
              </div>
              <div className="py-3 flex items-baseline justify-between gap-4">
                <dt className="text-xs text-slate-600">Outdoor PM2.5 prevented</dt>
                <dd className="font-mono tabular-nums text-base font-semibold text-slate-900">
                  {impact.monthlyPm25EmissionsPreventedGrams} g/mo
                </dd>
              </div>
              <div className="py-3 flex items-baseline justify-between gap-4">
                <dt className="text-xs text-slate-600">Household CO₂e avoided</dt>
                <dd className="font-mono tabular-nums text-base font-semibold text-slate-900">
                  {impact.monthlyCo2SavedKg} kg/mo
                </dd>
              </div>
            </dl>
          </div>

          <div className="pt-4 border-t border-slate-200 text-xs text-slate-500">
            Active commitments: <strong className="text-slate-800">{impact.completedRoutineCount}</strong> routines ·{' '}
            <strong className="text-slate-800">{impact.appliedHacksCount}</strong> indoor hacks ·{' '}
            <strong className="text-slate-800">{impact.adoptedSwapsCount}</strong> swaps
          </div>
        </section>
      </div>

      {/* 4. Tailored Low-Emission Daily Routine */}
      <section
        aria-label="Low-emission daily routine"
        className="bg-white border border-slate-200 rounded-xl"
      >
        <div className="p-6 border-b border-slate-200 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Low-Emission Daily Routine
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tailored for a household of {profile.householdSize} in {airQuality.city}. Check off actions to measure your protection and emissions prevented.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <FilterGroup
                label="Filter routine by time of day"
                options={PERIOD_FILTERS}
                value={periodFilter}
                onChange={setPeriodFilter}
              />

              <button
                type="button"
                aria-expanded={showAddForm}
                aria-controls="custom-routine-form"
                onClick={() => setShowAddForm((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                Add Habit
              </button>

              {hasAiOverrides && (
                <button
                  type="button"
                  onClick={onResetAiRoutines}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  Reset Baseline
                </button>
              )}

              <button
                type="button"
                onClick={onGoToAssistantPlan}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100/70 whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                Refresh with AI
              </button>
            </div>
          </div>

          {/* Daily Protection Completion Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Today&apos;s routine completion</span>
              <span
                data-testid="routine-progress-label"
                className="font-mono tabular-nums font-medium text-slate-800"
              >
                {completedVisibleCount} of {routines.length} completed ({routineProgressPct}%)
              </span>
            </div>
            <svg
              viewBox="0 0 100 2"
              preserveAspectRatio="none"
              role="progressbar"
              aria-label="Today's routine completion"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={routineProgressPct}
              className="w-full h-1.5 rounded-full overflow-hidden block"
            >
              <rect x="0" y="0" width="100" height="2" fill="#f1f5f9" />
              <rect x="0" y="0" width={routineProgressPct} height="2" fill="#0f766e" />
            </svg>
          </div>
        </div>

        {showAddForm && (
          <form
            id="custom-routine-form"
            onSubmit={handleCreateCustom}
            className="px-6 py-4 bg-slate-50 border-b border-slate-200 space-y-3"
          >
            {formError && (
              <p id="custom-routine-error" role="alert" className="text-xs font-medium text-red-700">
                {formError}
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-5">
                <label
                  htmlFor="custom-routine-title"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Habit title
                </label>
                <input
                  id="custom-routine-title"
                  type="text"
                  value={customTitle}
                  aria-invalid={Boolean(formError)}
                  aria-describedby={formError ? 'custom-routine-error' : undefined}
                  onChange={(e) => {
                    setCustomTitle(e.target.value);
                    setFormError(null);
                  }}
                  placeholder="e.g., Pack N95 masks in kids' school backpacks"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <div className="md:col-span-2">
                <label
                  htmlFor="custom-routine-period"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Time of day
                </label>
                <select
                  id="custom-routine-period"
                  value={customPeriod}
                  onChange={(e) => setCustomPeriod(e.target.value as RoutinePeriod)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                >
                  <option value="morning">Morning</option>
                  <option value="midday">Midday</option>
                  <option value="evening">Evening</option>
                  <option value="night">Night</option>
                </select>
              </div>
              <div className="md:col-span-5">
                <label
                  htmlFor="custom-routine-impact"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Why it helps (optional)
                </label>
                <input
                  id="custom-routine-impact"
                  type="text"
                  value={customImpact}
                  onChange={(e) => setCustomImpact(e.target.value)}
                  placeholder="e.g., Ensures safe breathing during bus wait"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800"
              >
                Add to Routine
              </button>
            </div>
          </form>
        )}

        <ul className="divide-y divide-slate-200">
          {visibleRoutines.length === 0 ? (
            <li className="p-8 text-center text-sm text-slate-500">
              No routine actions scheduled for this time window yet. Switch to All day or add a custom family habit.
            </li>
          ) : (
            visibleRoutines.map((item) => {
              const checked = completedIds.includes(item.id);
              const isCustom = item.id.startsWith('custom-');

              return (
                <li
                  key={item.id}
                  className={`p-5 sm:px-6 transition-colors ${
                    checked ? 'bg-teal-50/30' : 'hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      aria-label={`Mark "${item.title}" ${checked ? 'incomplete' : 'completed'}`}
                      onClick={() => onToggleRoutine(item.id)}
                      className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        checked
                          ? 'bg-teal-700 border-teal-700 text-white'
                          : 'bg-white border-slate-300 text-transparent hover:border-teal-600'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden="true" />
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                          <span className="font-mono tabular-nums text-slate-700 font-medium">
                            {item.timeWindow}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{CATEGORY_LABELS[item.category]}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums text-teal-800 font-medium">
                            −{item.exposureReductionPct}% exposure
                          </span>
                          {item.dailyCo2SavedKg > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums">
                                {item.dailyCo2SavedKg} kg CO₂e/day
                              </span>
                            </>
                          )}
                          {item.isAiGenerated && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-teal-700 font-medium">AI tailored</span>
                            </>
                          )}
                          {isCustom && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-slate-600 font-medium">Custom habit</span>
                            </>
                          )}
                        </div>

                        {isCustom && (
                          <button
                            type="button"
                            onClick={() => onDeleteCustomRoutine(item.id)}
                            aria-label={`Delete custom habit "${item.title}"`}
                            className="p-1.5 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>

                      <h3
                        className={`mt-1 text-base font-semibold leading-snug ${
                          checked ? 'text-slate-500 line-through' : 'text-slate-900'
                        }`}
                      >
                        {item.title}
                      </h3>

                      <p className="mt-1 text-sm text-slate-700 leading-relaxed max-w-3xl">
                        {item.action}
                      </p>

                      <p className="mt-2.5 text-xs text-slate-600 leading-relaxed max-w-3xl">
                        <span className="font-semibold text-slate-800">Direct impact: </span>
                        {item.directImpact}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </section>
    </div>
  );
}
