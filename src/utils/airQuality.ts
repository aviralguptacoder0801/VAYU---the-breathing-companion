import type {
  AirQualityData,
  HouseholdProfile,
  HourlyAirPoint,
  ImpactSummary,
  IndoorHack,
  RoutineItem,
  SustainableSwap,
} from '../types';

export interface AqiClassification {
  level: 'good' | 'moderate' | 'sensitive' | 'unhealthy' | 'very_unhealthy' | 'hazardous';
  label: string;
  shortGuidance: string;
  maskAdvice: string;
  outdoorLimit: string;
  textClass: string;
  surfaceClass: string;
  barColor: string;
}

export function classifyAqi(aqi: number): AqiClassification {
  const safeAqi = Math.max(0, Math.round(aqi));
  if (safeAqi <= 50) {
    return {
      level: 'good',
      label: 'Good',
      shortGuidance: 'Air quality is clean. Standard ventilation and outdoor play are safe.',
      maskAdvice: 'No mask required',
      outdoorLimit: 'Unrestricted',
      textClass: 'text-emerald-700',
      surfaceClass: 'bg-emerald-50 border-emerald-200',
      barColor: '#15803D',
    };
  }
  if (safeAqi <= 100) {
    return {
      level: 'moderate',
      label: 'Moderate',
      shortGuidance: 'Acceptable for most people; sensitive children or elders should avoid roadside idling zones.',
      maskAdvice: 'Optional for sensitive lungs near traffic',
      outdoorLimit: 'Normal activity; avoid peak rush hour',
      textClass: 'text-amber-700',
      surfaceClass: 'bg-amber-50 border-amber-200',
      barColor: '#A16207',
    };
  }
  if (safeAqi <= 150) {
    return {
      level: 'sensitive',
      label: 'Unhealthy for Sensitive Groups',
      shortGuidance: 'Winter inversion is trapping fine particles. Shift strenuous play indoors and ventilate only at midday.',
      maskAdvice: 'Well-fitted N95/KF94 for children, seniors & asthma',
      outdoorLimit: 'Short trips only for sensitive groups',
      textClass: 'text-orange-700',
      surfaceClass: 'bg-orange-50 border-orange-200',
      barColor: '#C2410C',
    };
  }
  if (safeAqi <= 200) {
    return {
      level: 'unhealthy',
      label: 'Unhealthy',
      shortGuidance: 'Everyone breathes elevated PM2.5 outdoors. Keep windows sealed during morning/evening peaks and run HEPA filtration.',
      maskAdvice: 'N95 / FFP2 strongly recommended outdoors',
      outdoorLimit: 'Move exercise indoors; brief errands only',
      textClass: 'text-red-700',
      surfaceClass: 'bg-red-50 border-red-200',
      barColor: '#DC2626',
    };
  }
  if (safeAqi <= 300) {
    return {
      level: 'very_unhealthy',
      label: 'Very Unhealthy',
      shortGuidance: 'Severe winter smog episode. Seal exterior drafts, avoid gas/fry smoke indoors, and use continuous filtration in bedrooms.',
      maskAdvice: 'Fitted N95 / FFP2 required for any outdoor trip',
      outdoorLimit: 'Avoid outdoor exertion; consolidate essential trips',
      textClass: 'text-rose-800',
      surfaceClass: 'bg-rose-50 border-rose-200',
      barColor: '#991B1B',
    };
  }
  return {
    level: 'hazardous',
    label: 'Hazardous',
    shortGuidance: 'Emergency smog conditions. Create a dedicated clean-air bedroom, run purifiers on high, and avoid all non-essential vehicle trips.',
    maskAdvice: 'Tight-seal N95/P100 mandatory outdoors',
    outdoorLimit: 'Stay indoors; postpone outdoor school sports',
    textClass: 'text-purple-900',
    surfaceClass: 'bg-purple-50 border-purple-200',
    barColor: '#6B21A8',
  };
}

export interface VentilationWindowAnalysis {
  bestStartHour: string;
  bestEndHour: string;
  bestAveragePm25: number;
  peakStartHour: string;
  peakEndHour: string;
  peakAveragePm25: number;
  shouldVentilateBriefly: boolean;
  advice: string;
}

export function findBestVentilationWindows(hourly: HourlyAirPoint[]): VentilationWindowAnalysis {
  if (!hourly || hourly.length === 0) {
    return {
      bestStartHour: '13:00',
      bestEndHour: '15:00',
      bestAveragePm25: 55,
      peakStartHour: '07:00',
      peakEndHour: '10:00',
      peakAveragePm25: 140,
      shouldVentilateBriefly: true,
      advice: 'Mid-afternoon typically offers the deepest thermal mixing layer for brief 10-minute cross-ventilation.',
    };
  }

  const windowSize = Math.min(3, hourly.length);
  let bestIdx = 0;
  let bestAvg = Number.POSITIVE_INFINITY;
  let peakIdx = 0;
  let peakAvg = -1;

  for (let i = 0; i <= hourly.length - windowSize; i++) {
    let sum = 0;
    for (let j = 0; j < windowSize; j++) {
      sum += hourly[i + j].pm25;
    }
    const avg = sum / windowSize;
    if (avg < bestAvg) {
      bestAvg = avg;
      bestIdx = i;
    }
    if (avg > peakAvg) {
      peakAvg = avg;
      peakIdx = i;
    }
  }

  const bestStart = hourly[bestIdx].hourLabel;
  const bestEnd = hourly[Math.min(hourly.length - 1, bestIdx + windowSize - 1)].hourLabel;
  const peakStart = hourly[peakIdx].hourLabel;
  const peakEnd = hourly[Math.min(hourly.length - 1, peakIdx + windowSize - 1)].hourLabel;
  const roundedBest = Math.round(bestAvg);
  const roundedPeak = Math.round(peakAvg);
  const shouldVentilateBriefly = roundedBest < 95;

  const advice = shouldVentilateBriefly
    ? `Open opposite windows for 8–10 minutes between ${bestStart} and ${bestEnd} (PM2.5 dips to ~${roundedBest} µg/m³) to flush indoor CO₂ without pulling in peak smog.`
    : `Outdoor PM2.5 stays elevated even at its ${bestStart}–${bestEnd} trough (~${roundedBest} µg/m³). Keep windows sealed and rely on HEPA/MERV-13 recirculation; crack a window for 3 minutes only if CO₂ feels stuffy.`;

  return {
    bestStartHour: bestStart,
    bestEndHour: bestEnd,
    bestAveragePm25: roundedBest,
    peakStartHour: peakStart,
    peakEndHour: peakEnd,
    peakAveragePm25: roundedPeak,
    shouldVentilateBriefly,
    advice,
  };
}

export interface CadrRecommendation {
  roomVolumeM3: number;
  targetAch: number;
  requiredCadrM3h: number;
  requiredCadrCfm: number;
  corsiRosenthalCovers: boolean;
  corsiRosenthalBoxesNeeded: number;
  estimatedMinutesToClearHalf: number;
}

export function calculateCadrRecommendation(
  areaSqm: number,
  ceilingHeightM: number,
  outdoorAqi: number
): CadrRecommendation {
  const safeArea = Math.max(6, Math.min(200, areaSqm));
  const safeHeight = Math.max(2.0, Math.min(5.0, ceilingHeightM));
  const volume = safeArea * safeHeight;

  // Standard 4 ACH for moderate air, 5 ACH for unhealthy, 6 ACH for severe winter smog (AQI > 200)
  const targetAch = outdoorAqi > 200 ? 6 : outdoorAqi > 120 ? 5 : 4;
  const requiredCadrM3h = Math.round(volume * targetAch);
  const requiredCadrCfm = Math.round(requiredCadrM3h * 0.5886);

  // A standard 4-filter 20x20 MERV-13 Corsi-Rosenthal box delivers ~450-550 m³/h (~280-325 CFM) on medium speed
  const crBoxCadrM3h = 500;
  const corsiRosenthalBoxesNeeded = Math.max(1, Math.ceil(requiredCadrM3h / crBoxCadrM3h));
  const corsiRosenthalCovers = requiredCadrM3h <= crBoxCadrM3h;

  // Exponential decay time to drop indoor PM2.5 by 50%: t = ln(2) / ACH * 60 min
  const estimatedMinutesToClearHalf = Math.max(5, Math.round((Math.log(2) / targetAch) * 60));

  return {
    roomVolumeM3: Math.round(volume),
    targetAch,
    requiredCadrM3h,
    requiredCadrCfm,
    corsiRosenthalCovers,
    corsiRosenthalBoxesNeeded,
    estimatedMinutesToClearHalf,
  };
}

export function calculateImpactSummary(
  completedRoutines: RoutineItem[],
  adoptedSwaps: SustainableSwap[],
  appliedHacks: IndoorHack[],
  communityHouseholds: number
): ImpactSummary {
  const safeHouseholds = Math.max(1, Math.round(communityHouseholds));

  // Combine exposure reductions using diminishing-return complement formula so % never unrealistically exceeds 92%
  let remainingExposureFactor = 1;
  for (const r of completedRoutines) {
    remainingExposureFactor *= 1 - Math.min(0.45, Math.max(0, r.exposureReductionPct) / 100);
  }
  for (const h of appliedHacks) {
    // Indoor hacks apply primarily to indoor hours (~75% of winter day)
    const weightedDrop = (Math.min(75, Math.max(0, h.indoorPm25DropPct)) / 100) * 0.45;
    remainingExposureFactor *= 1 - weightedDrop;
  }
  for (const s of adoptedSwaps) {
    remainingExposureFactor *= 1 - Math.min(0.25, Math.max(0, s.exposureReductionPct) / 100);
  }

  const dailyExposureReductionPct = Math.min(92, Math.round((1 - remainingExposureFactor) * 100));

  const dailyPm25InhalationAvoidedUg = Math.round(
    completedRoutines.reduce((acc, r) => acc + r.dailyPm25AvoidedUg, 0) +
      appliedHacks.reduce((acc, h) => acc + Math.round(h.indoorPm25DropPct * 2.4), 0)
  );

  const monthlyRoutinePm25Grams = completedRoutines.reduce(
    (acc, r) => acc + r.dailyEmissionPm25Grams * 24,
    0
  );
  const monthlySwapPm25Grams = adoptedSwaps.reduce(
    (acc, s) => acc + s.monthlyPm25PreventedGrams,
    0
  );
  const monthlyPm25EmissionsPreventedGrams = Math.round(
    (monthlyRoutinePm25Grams + monthlySwapPm25Grams) * 10
  ) / 10;

  const monthlyRoutineCo2Kg = completedRoutines.reduce(
    (acc, r) => acc + r.dailyCo2SavedKg * 24,
    0
  );
  const monthlySwapCo2Kg = adoptedSwaps.reduce((acc, s) => acc + s.monthlyCo2SavedKg, 0);
  const monthlyCo2SavedKg = Math.round((monthlyRoutineCo2Kg + monthlySwapCo2Kg) * 10) / 10;

  // Negative costDelta means savings; convert to positive savings number
  const monthlyCostSavingsUsd = Math.round(
    adoptedSwaps.reduce((acc, s) => acc - s.monthlyCostDeltaUsd, 0)
  );

  const communityPm25PreventedGrams =
    Math.round(monthlyPm25EmissionsPreventedGrams * safeHouseholds * 10) / 10;
  const communityCo2SavedKg = Math.round(monthlyCo2SavedKg * safeHouseholds * 10) / 10;

  return {
    dailyExposureReductionPct,
    dailyPm25InhalationAvoidedUg,
    monthlyPm25EmissionsPreventedGrams,
    monthlyCo2SavedKg,
    monthlyCostSavingsUsd,
    communityPm25PreventedGrams,
    communityCo2SavedKg,
    completedRoutineCount: completedRoutines.length,
    appliedHacksCount: appliedHacks.length,
    adoptedSwapsCount: adoptedSwaps.length,
  };
}

export function buildTailoredRoutine(
  profile: HouseholdProfile,
  airQuality: AirQualityData
): RoutineItem[] {
  const vent = findBestVentilationWindows(airQuality.hourly);
  const isSevere = airQuality.usAqi >= 151;
  const hasKidsOrAsthma =
    profile.sensitivities.includes('children_under_12') ||
    profile.sensitivities.includes('asthma_respiratory');

  const items: RoutineItem[] = [];

  // 1. Morning routine tailored to commute & inversion
  if (profile.commuteMode === 'petrol_car' || profile.commuteMode === 'diesel_car') {
    items.push({
      id: 'r-morning-commute',
      period: 'morning',
      timeWindow: '07:15 – 08:30',
      title: 'Zero-Idle Departure & Cabin Recirculation',
      action:
        'Skip cold-engine warm-up idling, combine errands/school drop-off with one neighbor, and switch cabin HVAC to Recirculate (not Fresh Air) through congested intersections.',
      category: 'commute',
      directImpact:
        'Eliminating 8 minutes of cold winter idling cuts local tailpipe PM2.5 & NO₂ right at street breathing height by ~1.8 g/day and prevents cabin PM2.5 spikes by 65%.',
      exposureReductionPct: isSevere ? 18 : 12,
      dailyPm25AvoidedUg: isSevere ? 110 : 55,
      dailyCo2SavedKg: 1.9,
      dailyEmissionPm25Grams: 1.8,
    });
  } else if (profile.commuteMode === 'two_wheeler' || profile.commuteMode === 'walking_cycling') {
    items.push({
      id: 'r-morning-commute',
      period: 'morning',
      timeWindow: '07:30 – 08:45',
      title: 'Side-Street Low-Exposure Route & Fitted N95',
      action: `Shift two blocks off arterial roads during the ${vent.peakStartHour}–${vent.peakEndHour} inversion trap${isSevere ? ' and wear a pinch-sealed N95/KF94 mask' : ''}.`,
      category: 'commute',
      directImpact:
        'Moving just 100 meters away from stop-and-go diesel corridors drops ultrafine black-carbon inhalation by 35–45%; a snug N95 filters >94% of PM2.5.',
      exposureReductionPct: isSevere ? 28 : 15,
      dailyPm25AvoidedUg: isSevere ? 165 : 65,
      dailyCo2SavedKg: 0.4,
      dailyEmissionPm25Grams: 0.2,
    });
  } else {
    items.push({
      id: 'r-morning-commute',
      period: 'morning',
      timeWindow: '07:30 – 09:00',
      title: 'Peak-Inversion Shelter & Transit Timing',
      action: `Avoid outdoor workouts during ${vent.peakStartHour}–${vent.peakEndHour} thermal trapping in ${airQuality.city}; run indoor HEPA/box-fan filtration while morning traffic peaks.`,
      category: 'indoor_air',
      directImpact:
        'Cold ground air traps morning exhaust under a shallow atmospheric lid—shifting exertion indoors cuts fine particle lung deposition by up to 4x compared to jogging in smog.',
      exposureReductionPct: isSevere ? 22 : 14,
      dailyPm25AvoidedUg: isSevere ? 130 : 50,
      dailyCo2SavedKg: 1.4,
      dailyEmissionPm25Grams: 0.6,
    });
  }

  // 2. Midday ventilation window derived directly from hourly telemetry
  items.push({
    id: 'r-midday-vent',
    period: 'midday',
    timeWindow: `${vent.bestStartHour} – ${vent.bestEndHour}`,
    title: vent.shouldVentilateBriefly
      ? 'Timed 10-Minute Cross-Ventilation Flush'
      : 'Closed-Window Recirculation Check',
    action: vent.advice,
    category: 'ventilation',
    directImpact: vent.shouldVentilateBriefly
      ? `Ventilating strictly during the midday mixing trough (${vent.bestAveragePm25} µg/m³ vs ${vent.peakAveragePm25} µg/m³ peak) flushes stale CO₂ while admitting ~60% fewer outdoor particles.`
      : 'Keeping exterior windows sealed when midday PM2.5 stays above 95 µg/m³ prevents indoor particle levels from equalizing with hazardous outdoor haze.',
    exposureReductionPct: 16,
    dailyPm25AvoidedUg: isSevere ? 95 : 40,
    dailyCo2SavedKg: 0.3,
    dailyEmissionPm25Grams: 0.1,
  });

  // 3. Evening cooking & indoor emissions
  if (profile.cookingFuel === 'gas_stove' || profile.cookingFuel === 'biomass_chulha') {
    items.push({
      id: 'r-evening-cook',
      period: 'evening',
      timeWindow: '18:00 – 20:00',
      title: 'Low-Smoke Dinner Prep & Active Exhaust Capture',
      action:
        profile.cookingFuel === 'biomass_chulha'
          ? 'Use dry seasoned fuel or electric kettle/pressure cooker for boiling and simmering; keep kitchen door closed from sleeping rooms.'
          : 'Cook on back burners under high range-hood exhaust, use lids or a pressure cooker/induction plate, and avoid high-temp oil frying during sealed-window nights.',
      category: 'cooking',
      directImpact:
        'Indoor frying on open gas burners can spike kitchen PM2.5 above 300 µg/m³—worse than outside smog. Back-burner capture + pressure cooking cuts indoor smoke spikes by 70–85%.',
      exposureReductionPct: 24,
      dailyPm25AvoidedUg: 145,
      dailyCo2SavedKg: 0.9,
      dailyEmissionPm25Grams: profile.cookingFuel === 'biomass_chulha' ? 4.5 : 0.7,
    });
  } else {
    items.push({
      id: 'r-evening-cook',
      period: 'evening',
      timeWindow: '18:00 – 20:00',
      title: 'Steam/Simmer Dinner & Damp-Cloth Dust Reset',
      action:
        'Favor low-smoke simmering or covered baking on induction, and damp-mop entryways instead of dry sweeping so settled soot is not kicked back into the air.',
      category: 'cooking',
      directImpact:
        'Dry brooms resuspend fine winter soot for 2+ hours; damp microfiber capture removes settled particles permanently and keeps evening indoor PM2.5 under 15 µg/m³.',
      exposureReductionPct: 14,
      dailyPm25AvoidedUg: 75,
      dailyCo2SavedKg: 0.5,
      dailyEmissionPm25Grams: 0.3,
    });
  }

  // 4. Evening heating / neighborhood choice
  if (profile.heatingSource === 'wood_biomass') {
    items.push({
      id: 'r-evening-heat',
      period: 'evening',
      timeWindow: '19:30 – 21:30',
      title: 'No-Burn Inversion Pledge & Layered Warmth',
      action:
        'Skip the wood stove/fireplace on high-inversion evenings; lower thermostat 1–2°C, layer thermal throws, and use an electric oil radiator only in the occupied room.',
      category: 'community',
      directImpact:
        'One evening of residential wood burning emits as much PM2.5 as driving 350+ km in a petrol car. Skipping a single burn prevents ~45 g of neighborhood smoke tonight.',
      exposureReductionPct: 15,
      dailyPm25AvoidedUg: 90,
      dailyCo2SavedKg: 3.4,
      dailyEmissionPm25Grams: 18.0,
    });
  } else {
    items.push({
      id: 'r-evening-heat',
      period: 'evening',
      timeWindow: '19:30 – 21:00',
      title: 'Neighborhood Smog Check & No-Burn / No-Idle Alert',
      action: `Share tomorrow's ${airQuality.city} air-window timing in your family or apartment chat and remind neighbors to avoid leaf/trash burning or idling cars during evening fog.`,
      category: 'community',
      directImpact:
        'Local open burning and evening idling account for sharp block-level smog spikes; coordinating just 10 neighbors amplifies clean-air impact by an order of magnitude.',
      exposureReductionPct: 8,
      dailyPm25AvoidedUg: 35,
      dailyCo2SavedKg: 0.8,
      dailyEmissionPm25Grams: 1.2,
    });
  }

  // 5. Night clean-air bedroom sanctuary
  items.push({
    id: 'r-night-sanctuary',
    period: 'night',
    timeWindow: '21:30 – 06:30',
    title: hasKidsOrAsthma
      ? 'Clean-Air Sanctuary Bedroom (Priority Respiratory Recovery)'
      : 'Overnight Bedroom Filtration & Draft Seal',
    action:
      'Close bedroom doors, place a rolled damp towel or weatherstrip along drafty window sills, and run your HEPA purifier or DIY MERV-13 box fan on continuous medium-low overnight.',
    category: 'indoor_air',
    directImpact:
      'Because families spend 8+ continuous hours asleep, dropping bedroom PM2.5 below 12 µg/m³ cuts total 24-hour cumulative lung dose by over a third and lowers overnight airway inflammation.',
    exposureReductionPct: isSevere ? 26 : 18,
    dailyPm25AvoidedUg: isSevere ? 160 : 80,
    dailyCo2SavedKg: 0.1,
    dailyEmissionPm25Grams: 0,
  });

  return items;
}

export function getPrioritizedSwaps(
  profile: HouseholdProfile,
  swaps: SustainableSwap[]
): Array<SustainableSwap & { isTailoredMatch: boolean }> {
  return swaps
    .map((swap) => {
      const commuteMatch = swap.matchingCommutes?.includes(profile.commuteMode) ?? false;
      const heatingMatch = swap.matchingHeating?.includes(profile.heatingSource) ?? false;
      const cookingMatch = swap.matchingCooking?.includes(profile.cookingFuel) ?? false;
      const isTailoredMatch = commuteMatch || heatingMatch || cookingMatch;
      return { ...swap, isTailoredMatch };
    })
    .sort((a, b) => Number(b.isTailoredMatch) - Number(a.isTailoredMatch));
}

export function validateProfile(profile: HouseholdProfile): string | null {
  if (!profile.city || profile.city.trim().length < 2) {
    return 'Please enter a valid city name (at least 2 characters).';
  }
  if (!Number.isFinite(profile.householdSize) || profile.householdSize < 1 || profile.householdSize > 20) {
    return 'Household size must be between 1 and 20 people.';
  }
  return null;
}

export function getAqiScalePercent(aqi: number): number {
  const clamped = Math.max(0, Math.min(350, aqi));
  return Math.round((clamped / 350) * 100);
}

export function calculateCigaretteEquivalence(pm25: number): number {
  if (!Number.isFinite(pm25) || pm25 < 5) return 0;
  // Berkeley Earth approximation: ~22 µg/m³ of PM2.5 over 24h ≈ 1 cigarette/day
  return Math.round((pm25 / 22) * 10) / 10;
}

export interface ActivityGuidanceItem {
  id: 'outdoor_play' | 'windows' | 'commute' | 'filtration';
  activity: string;
  status: 'safe' | 'caution' | 'avoid';
  verdict: string;
  detail: string;
}

export function getActivityGuidance(
  airQuality: AirQualityData,
  sensitivities: HouseholdProfile['sensitivities']
): ActivityGuidanceItem[] {
  const aqi = Math.max(0, Math.round(airQuality.usAqi));
  const vent = findBestVentilationWindows(airQuality.hourly);
  const hasSensitive =
    sensitivities.includes('children_under_12') ||
    sensitivities.includes('older_adults_65') ||
    sensitivities.includes('asthma_respiratory');

  const outdoorPlay: ActivityGuidanceItem =
    aqi <= 50
      ? {
          id: 'outdoor_play',
          activity: 'Outdoor play & exercise',
          status: 'safe',
          verdict: 'Safe outdoors',
          detail: 'Clean air for parks, school recess, and outdoor sports.',
        }
      : aqi <= 100
        ? {
            id: 'outdoor_play',
            activity: 'Outdoor play & exercise',
            status: hasSensitive ? 'caution' : 'safe',
            verdict: hasSensitive ? 'Avoid busy roads' : 'Generally safe',
            detail: hasSensitive
              ? 'Keep children and sensitive adults away from idling traffic.'
              : 'Normal outdoor activity is fine; favor parks over main roads.',
          }
        : aqi <= 150
          ? {
              id: 'outdoor_play',
              activity: 'Outdoor play & exercise',
              status: hasSensitive ? 'avoid' : 'caution',
              verdict: hasSensitive ? 'Move indoors' : 'Keep trips brief',
              detail: hasSensitive
                ? 'Shift kids’ sports and vigorous play indoors today.'
                : 'Limit strenuous outdoor workouts to under 25 minutes.',
            }
          : {
              id: 'outdoor_play',
              activity: 'Outdoor play & exercise',
              status: 'avoid',
              verdict: 'Stay indoors',
              detail: 'Skip outdoor running or recess; fine particles penetrate deep lungs.',
            };

  const windows: ActivityGuidanceItem =
    aqi <= 75
      ? {
          id: 'windows',
          activity: 'Windows & fresh air',
          status: 'safe',
          verdict: 'Open freely',
          detail: 'Natural cross-ventilation keeps indoor CO₂ and cooking fumes low.',
        }
      : vent.shouldVentilateBriefly
        ? {
            id: 'windows',
            activity: 'Windows & fresh air',
            status: 'caution',
            verdict: `Open ${vent.bestStartHour}–${vent.bestEndHour}`,
            detail: `Keep sealed now; flush rooms 10 min during the afternoon dip (~${vent.bestAveragePm25} µg/m³).`,
          }
        : {
            id: 'windows',
            activity: 'Windows & fresh air',
            status: 'avoid',
            verdict: 'Keep sealed',
            detail: 'Outdoor PM2.5 remains high all day—seal drafts and recirculate filtered air.',
          };

  const commute: ActivityGuidanceItem =
    aqi <= 100
      ? {
          id: 'commute',
          activity: 'Commute & masking',
          status: 'safe',
          verdict: 'No mask needed',
          detail: 'Walk, cycle, or take transit normally; avoid standing by tailpipes.',
        }
      : aqi <= 150
        ? {
            id: 'commute',
            activity: 'Commute & masking',
            status: 'caution',
            verdict: hasSensitive ? 'N95 for sensitive' : 'Side-street route',
            detail: 'Use car cabin recirculation and avoid peak arterial traffic lanes.',
          }
        : {
            id: 'commute',
            activity: 'Commute & masking',
            status: 'avoid',
            verdict: 'Wear fitted N95',
            detail: 'Pinch-sealed N95/KF94 outdoors; consolidate errands or share a ride.',
          };

  const filtration: ActivityGuidanceItem =
    aqi <= 75
      ? {
          id: 'filtration',
          activity: 'Indoor air filtration',
          status: 'safe',
          verdict: 'Low / standby',
          detail: 'Run kitchen range hood while cooking; purifier optional.',
        }
      : aqi <= 150
        ? {
            id: 'filtration',
            activity: 'Indoor air filtration',
            status: 'caution',
            verdict: 'Run on medium',
            detail: 'Filter occupied living areas and bedrooms overnight.',
          }
        : {
            id: 'filtration',
            activity: 'Indoor air filtration',
            status: 'avoid',
            verdict: 'Run on high',
            detail: 'Run HEPA or DIY MERV-13 box continuously in closed sleeping rooms.',
          };

  return [outdoorPlay, windows, commute, filtration];
}

export interface SmogTrend {
  direction: 'Clearing' | 'Rising' | 'Steady';
  deltaPm25: number;
  summary: string;
}

export function getSmogTrend(
  hourly: HourlyAirPoint[],
  currentHourIndex?: number
): SmogTrend {
  if (!hourly || hourly.length < 4) {
    return {
      direction: 'Steady',
      deltaPm25: 0,
      summary: 'Stable levels expected over the next few hours.',
    };
  }

  const nowIdx =
    currentHourIndex !== undefined
      ? Math.max(0, Math.min(hourly.length - 1, currentHourIndex))
      : Math.min(hourly.length - 1, new Date().getHours());

  const hasForwardWindow = nowIdx + 3 < hourly.length;
  const startIdx = hasForwardWindow ? nowIdx : Math.max(0, hourly.length - 4);
  const endIdx = hasForwardWindow ? nowIdx + 3 : hourly.length - 1;

  const startVal = hourly[startIdx]?.pm25 ?? hourly[0].pm25;
  const endVal = hourly[endIdx]?.pm25 ?? startVal;
  const delta = Math.round(endVal - startVal);
  const horizonLabel = hasForwardWindow ? 'over the next 3 hours' : 'into late evening';

  if (delta <= -12) {
    return {
      direction: 'Clearing',
      deltaPm25: delta,
      summary: `Expected to dip by ~${Math.abs(delta)} µg/m³ ${horizonLabel}.`,
    };
  }
  if (delta >= 12) {
    return {
      direction: 'Rising',
      deltaPm25: delta,
      summary: `Expected to climb by ~${delta} µg/m³ ${horizonLabel}.`,
    };
  }
  return {
    direction: 'Steady',
    deltaPm25: delta,
    summary: `PM2.5 expected to stay near current levels ${horizonLabel}.`,
  };
}

export function formatShareableFamilyBrief(
  profile: HouseholdProfile,
  airQuality: AirQualityData,
  routines: RoutineItem[],
  impact: ImpactSummary
): string {
  const aqiInfo = classifyAqi(airQuality.usAqi);
  const vent = findBestVentilationWindows(airQuality.hourly);
  const topActions = routines
    .slice(0, 3)
    .map((r) => `- ${r.timeWindow}: ${r.title}`)
    .join('\n');

  return [
    `Vayu Clean-Air Brief — ${airQuality.city}${airQuality.country ? `, ${airQuality.country}` : ''}`,
    `Air Quality: US AQI ${airQuality.usAqi} (${aqiInfo.label}) | PM2.5 ${airQuality.pm25} µg/m³ | Inversion: ${airQuality.inversionRisk}`,
    `Masking: ${aqiInfo.maskAdvice}`,
    `Safest Window: ${vent.bestStartHour}–${vent.bestEndHour} (${vent.shouldVentilateBriefly ? 'brief 10-min cross-ventilation' : 'keep windows sealed'})`,
    `Top Routine Steps (Family of ${profile.householdSize}):`,
    topActions,
    `Current Household Impact: -${impact.dailyExposureReductionPct}% PM2.5 exposure | ${impact.monthlyPm25EmissionsPreventedGrams} g/mo PM2.5 & ${impact.monthlyCo2SavedKg} kg/mo CO₂e prevented.`,
  ].join('\n');
}

