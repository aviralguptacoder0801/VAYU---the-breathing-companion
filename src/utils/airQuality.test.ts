import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTailoredRoutine,
  calculateCadrRecommendation,
  calculateCigaretteEquivalence,
  calculateImpactSummary,
  classifyAqi,
  findBestVentilationWindows,
  formatShareableFamilyBrief,
  getActivityGuidance,
  getAqiScalePercent,
  getPrioritizedSwaps,
  getSmogTrend,
  validateProfile,
} from './airQuality';
import type { AirQualityData, HouseholdProfile, IndoorHack, SustainableSwap } from '../types';

const sampleProfile: HouseholdProfile = {
  city: 'New Delhi',
  country: 'India',
  householdSize: 4,
  sensitivities: ['children_under_12', 'asthma_respiratory'],
  commuteMode: 'petrol_car',
  heatingSource: 'electric_space_heater',
  cookingFuel: 'gas_stove',
  homeType: 'apartment_sealed',
};

const sampleAir: AirQualityData = {
  city: 'New Delhi',
  country: 'India',
  latitude: 28.6139,
  longitude: 77.209,
  usAqi: 268,
  pm25: 192,
  pm10: 295,
  no2: 68,
  temperatureC: 11,
  windSpeedKmh: 5,
  humidityPct: 78,
  inversionRisk: 'Severe',
  updatedAt: '2026-11-25T08:00:00Z',
  source: 'seasonal_model',
  hourly: [
    { hourLabel: '06:00', hourIndex: 6, pm25: 230, usAqi: 295 },
    { hourLabel: '07:00', hourIndex: 7, pm25: 245, usAqi: 308 },
    { hourLabel: '08:00', hourIndex: 8, pm25: 225, usAqi: 290 },
    { hourLabel: '13:00', hourIndex: 13, pm25: 82, usAqi: 164 },
    { hourLabel: '14:00', hourIndex: 14, pm25: 76, usAqi: 158 },
    { hourLabel: '15:00', hourIndex: 15, pm25: 80, usAqi: 162 },
    { hourLabel: '20:00', hourIndex: 20, pm25: 210, usAqi: 274 },
  ],
};

test('classifyAqi maps EPA AQI breakpoints accurately', () => {
  assert.equal(classifyAqi(32).level, 'good');
  assert.equal(classifyAqi(88).level, 'moderate');
  assert.equal(classifyAqi(135).level, 'sensitive');
  assert.equal(classifyAqi(180).level, 'unhealthy');
  assert.equal(classifyAqi(268).level, 'very_unhealthy');
  assert.equal(classifyAqi(350).level, 'hazardous');
});

test('findBestVentilationWindows locates midday trough and morning smog peak', () => {
  const analysis = findBestVentilationWindows(sampleAir.hourly);
  assert.equal(analysis.bestStartHour, '13:00');
  assert.equal(analysis.bestEndHour, '15:00');
  assert.equal(analysis.bestAveragePm25, 79);
  assert.equal(analysis.shouldVentilateBriefly, true);
  assert.equal(analysis.peakStartHour, '06:00');
  assert.equal(analysis.peakAveragePm25, 233);
});

test('calculateCadrRecommendation scales target ACH with winter smog severity', () => {
  const mild = calculateCadrRecommendation(25, 2.8, 70);
  const severe = calculateCadrRecommendation(25, 2.8, 260);
  assert.equal(mild.targetAch, 4);
  assert.equal(severe.targetAch, 6);
  assert.equal(severe.roomVolumeM3, 70);
  assert.equal(severe.requiredCadrM3h, 420);
  assert.equal(severe.corsiRosenthalCovers, true);

  const largeRoom = calculateCadrRecommendation(60, 3.0, 260);
  assert.equal(largeRoom.corsiRosenthalCovers, false);
  assert.equal(largeRoom.corsiRosenthalBoxesNeeded, 3);
});

test('buildTailoredRoutine adapts to wood heating and children sensitivity', () => {
  const woodProfile: HouseholdProfile = {
    ...sampleProfile,
    heatingSource: 'wood_biomass',
    commuteMode: 'two_wheeler',
  };
  const routine = buildTailoredRoutine(woodProfile, sampleAir);
  assert.ok(routine.length >= 5);
  assert.ok(routine.some((r) => r.title.toLowerCase().includes('no-burn')));
  assert.ok(routine.some((r) => r.title.toLowerCase().includes('n95')));
  assert.ok(routine.some((r) => r.title.toLowerCase().includes('sanctuary')));
});

test('calculateImpactSummary computes personal and community impact with diminishing exposure cap', () => {
  const routines = buildTailoredRoutine(sampleProfile, sampleAir);
  const sampleHack: IndoorHack = {
    id: 'h1',
    title: 'Corsi-Rosenthal Box',
    category: 'filtration',
    costTier: 'DIY build ($60–$85)',
    roomScope: 'Living room',
    indoorPm25DropPct: 65,
    setupMinutes: 25,
    steps: ['Tape filters'],
    directImpactExplanation: 'Removes fine particles',
    scienceNote: 'MERV-13 captures PM2.5',
  };
  const sampleSwap: SustainableSwap = {
    id: 's1',
    title: 'School Carpool',
    category: 'commute',
    currentHabit: 'Solo drive',
    sustainableAlternative: 'Shared 3-family carpool',
    monthlyPm25PreventedGrams: 42,
    monthlyCo2SavedKg: 58,
    exposureReductionPct: 12,
    monthlyCostDeltaUsd: -48,
    directImpactExplanation: 'Cuts cold-start exhaust',
    communityRippleNote: 'Clears school drop-off air',
  };

  const summary = calculateImpactSummary(routines.slice(0, 2), [sampleSwap], [sampleHack], 20);
  assert.ok(summary.dailyExposureReductionPct > 30 && summary.dailyExposureReductionPct <= 92);
  assert.equal(summary.monthlyCostSavingsUsd, 48);
  assert.equal(
    summary.communityPm25PreventedGrams,
    Math.round(summary.monthlyPm25EmissionsPreventedGrams * 20 * 10) / 10
  );
  assert.equal(summary.completedRoutineCount, 2);
  assert.equal(summary.appliedHacksCount, 1);
  assert.equal(summary.adoptedSwapsCount, 1);
});

test('getPrioritizedSwaps places lifestyle-matched swaps first', () => {
  const swaps: SustainableSwap[] = [
    {
      id: 'wood',
      title: 'Stop Wood Burning',
      category: 'heating',
      currentHabit: 'Wood stove',
      sustainableAlternative: 'Oil radiator',
      monthlyPm25PreventedGrams: 500,
      monthlyCo2SavedKg: 80,
      exposureReductionPct: 20,
      monthlyCostDeltaUsd: -15,
      directImpactExplanation: 'Major PM2.5 drop',
      communityRippleNote: 'Cleaner street air',
      matchingHeating: ['wood_biomass'],
    },
    {
      id: 'car',
      title: 'Transit Shift',
      category: 'commute',
      currentHabit: 'Petrol car',
      sustainableAlternative: 'Metro',
      monthlyPm25PreventedGrams: 45,
      monthlyCo2SavedKg: 75,
      exposureReductionPct: 14,
      monthlyCostDeltaUsd: -60,
      directImpactExplanation: 'Less exhaust',
      communityRippleNote: 'Fewer cars',
      matchingCommutes: ['petrol_car'],
    },
  ];

  const sorted = getPrioritizedSwaps(sampleProfile, swaps);
  assert.equal(sorted[0].id, 'car');
  assert.equal(sorted[0].isTailoredMatch, true);
  assert.equal(sorted[1].isTailoredMatch, false);
});

test('validateProfile catches invalid city or household size', () => {
  assert.equal(validateProfile(sampleProfile), null);
  assert.ok(validateProfile({ ...sampleProfile, city: ' ' }) !== null);
  assert.ok(validateProfile({ ...sampleProfile, householdSize: 0 }) !== null);
});

test('getAqiScalePercent clamps cleanly to 0-100 range', () => {
  assert.equal(getAqiScalePercent(-10), 0);
  assert.equal(getAqiScalePercent(175), 50);
  assert.equal(getAqiScalePercent(420), 100);
});

test('calculateCigaretteEquivalence follows Berkeley Earth 22 ug/m3 ratio', () => {
  assert.equal(calculateCigaretteEquivalence(3.2), 0);
  assert.equal(calculateCigaretteEquivalence(22), 1);
  assert.equal(calculateCigaretteEquivalence(110), 5);
});

test('getActivityGuidance adapts plain-English verdicts to AQI and sensitivities', () => {
  const severeGuidance = getActivityGuidance(sampleAir, ['children_under_12']);
  assert.equal(severeGuidance.length, 4);
  assert.equal(severeGuidance[0].status, 'avoid');
  assert.equal(severeGuidance[2].verdict, 'Wear fitted N95');
  assert.equal(severeGuidance[3].verdict, 'Run on high');

  const cleanAir: AirQualityData = { ...sampleAir, usAqi: 38, pm25: 9 };
  const cleanGuidance = getActivityGuidance(cleanAir, []);
  assert.equal(cleanGuidance[0].status, 'safe');
  assert.equal(cleanGuidance[1].verdict, 'Open freely');
  assert.equal(cleanGuidance[2].verdict, 'No mask needed');
});

test('getSmogTrend identifies clearing and rising windows over 3 hours', () => {
  const clearing = getSmogTrend(sampleAir.hourly, 0);
  assert.equal(clearing.direction, 'Clearing');
  assert.ok(clearing.deltaPm25 <= -12);

  const rising = getSmogTrend(sampleAir.hourly, 3);
  assert.equal(rising.direction, 'Rising');
  assert.ok(rising.deltaPm25 >= 12);
});

test('formatShareableFamilyBrief produces structured copyable summary', () => {
  const routines = buildTailoredRoutine(sampleProfile, sampleAir);
  const impact = calculateImpactSummary(routines.slice(0, 1), [], [], 10);
  const brief = formatShareableFamilyBrief(sampleProfile, sampleAir, routines, impact);
  assert.ok(brief.includes('New Delhi'));
  assert.ok(brief.includes('US AQI 268'));
  assert.ok(brief.includes('13:00–15:00'));
});

test('edge cases: empty hourly series, negative AQI, late-night trend, and remote/induction routine branch', () => {
  const emptyVent = findBestVentilationWindows([]);
  assert.equal(emptyVent.bestStartHour, '13:00');
  assert.equal(classifyAqi(-25).level, 'good');
  assert.equal(classifyAqi(50).level, 'good');
  assert.equal(classifyAqi(51).level, 'moderate');
  assert.equal(classifyAqi(150).level, 'sensitive');
  assert.equal(classifyAqi(151).level, 'unhealthy');

  const lateNightTrend = getSmogTrend(sampleAir.hourly, sampleAir.hourly.length - 1);
  assert.equal(lateNightTrend.direction, 'Rising');
  assert.ok(lateNightTrend.summary.includes('late evening'));

  const remoteProfile: HouseholdProfile = {
    ...sampleProfile,
    commuteMode: 'remote',
    cookingFuel: 'induction_electric',
    sensitivities: [],
  };
  const remoteRoutine = buildTailoredRoutine(remoteProfile, { ...sampleAir, usAqi: 90 });
  assert.ok(remoteRoutine.some((r) => r.title.toLowerCase().includes('shelter')));
  assert.ok(remoteRoutine.some((r) => r.title.toLowerCase().includes('damp-cloth')));
});


