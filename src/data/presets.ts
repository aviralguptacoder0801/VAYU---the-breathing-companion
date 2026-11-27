import type {
  AirQualityData,
  HouseholdProfile,
  IndoorHack,
  SustainableSwap,
} from '../types';

export const DEFAULT_PROFILE: HouseholdProfile = {
  city: 'New Delhi',
  country: 'India',
  latitude: 28.6139,
  longitude: 77.209,
  householdSize: 4,
  sensitivities: ['children_under_12', 'asthma_respiratory'],
  commuteMode: 'petrol_car',
  heatingSource: 'electric_space_heater',
  cookingFuel: 'gas_stove',
  homeType: 'apartment_sealed',
};

export interface CityPreset {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  winterNote: string;
  fallbackAir: AirQualityData;
}

function buildHourlyCurve(basePm25: number): AirQualityData['hourly'] {
  // Typical winter thermal inversion curve: high morning/evening peaks, midday boundary-layer trough
  const multipliers = [
    1.12, 1.16, 1.18, 1.15, 1.18, 1.24, 1.32, 1.36, 1.28, 1.12, 0.92, 0.72,
    0.58, 0.52, 0.50, 0.56, 0.68, 0.88, 1.08, 1.22, 1.28, 1.25, 1.18, 1.14,
  ];
  return multipliers.map((mult, hourIndex) => {
    const pm25 = Math.max(8, Math.round(basePm25 * mult));
    const usAqi = pm25ToApproxUsAqi(pm25);
    return {
      hourLabel: `${String(hourIndex).padStart(2, '0')}:00`,
      hourIndex,
      pm25,
      usAqi,
    };
  });
}

function pm25ToApproxUsAqi(pm25: number): number {
  if (pm25 <= 12) return Math.round((pm25 / 12) * 50);
  if (pm25 <= 35.4) return Math.round(51 + ((pm25 - 12.1) / 23.3) * 49);
  if (pm25 <= 55.4) return Math.round(101 + ((pm25 - 35.5) / 19.9) * 49);
  if (pm25 <= 150.4) return Math.round(151 + ((pm25 - 55.5) / 94.9) * 49);
  if (pm25 <= 250.4) return Math.round(201 + ((pm25 - 150.5) / 99.9) * 99);
  return Math.min(500, Math.round(301 + ((pm25 - 250.5) / 150) * 199));
}

export const CITY_PRESETS: CityPreset[] = [
  {
    city: 'New Delhi',
    country: 'India',
    latitude: 28.6139,
    longitude: 77.209,
    winterNote: 'Shallow Indo-Gangetic inversion traps traffic, dust, and seasonal biomass smoke.',
    fallbackAir: {
      city: 'New Delhi',
      country: 'India',
      latitude: 28.6139,
      longitude: 77.209,
      usAqi: 268,
      pm25: 192,
      pm10: 298,
      no2: 64,
      temperatureC: 12,
      windSpeedKmh: 5,
      humidityPct: 76,
      inversionRisk: 'Severe',
      updatedAt: new Date().toISOString(),
      source: 'seasonal_model',
      hourly: buildHourlyCurve(178),
    },
  },
  {
    city: 'Lahore',
    country: 'Pakistan',
    latitude: 31.5204,
    longitude: 74.3587,
    winterNote: 'Calm winter winds and high humidity create dense morning smog corridors.',
    fallbackAir: {
      city: 'Lahore',
      country: 'Pakistan',
      latitude: 31.5204,
      longitude: 74.3587,
      usAqi: 294,
      pm25: 224,
      pm10: 326,
      no2: 59,
      temperatureC: 11,
      windSpeedKmh: 4,
      humidityPct: 82,
      inversionRisk: 'Severe',
      updatedAt: new Date().toISOString(),
      source: 'seasonal_model',
      hourly: buildHourlyCurve(204),
    },
  },
  {
    city: 'Salt Lake City',
    country: 'United States',
    latitude: 40.7608,
    longitude: -111.891,
    winterNote: 'Wasatch Basin cold-air pool traps valley vehicle and heating emissions for days.',
    fallbackAir: {
      city: 'Salt Lake City',
      country: 'United States',
      latitude: 40.7608,
      longitude: -111.891,
      usAqi: 158,
      pm25: 68,
      pm10: 84,
      no2: 46,
      temperatureC: -1,
      windSpeedKmh: 6,
      humidityPct: 68,
      inversionRisk: 'High',
      updatedAt: new Date().toISOString(),
      source: 'seasonal_model',
      hourly: buildHourlyCurve(64),
    },
  },
  {
    city: 'Krakow',
    country: 'Poland',
    latitude: 50.0647,
    longitude: 19.945,
    winterNote: 'Vistula valley winter inversion concentrates residential heating particulates.',
    fallbackAir: {
      city: 'Krakow',
      country: 'Poland',
      latitude: 50.0647,
      longitude: 19.945,
      usAqi: 164,
      pm25: 79,
      pm10: 108,
      no2: 41,
      temperatureC: 0,
      windSpeedKmh: 7,
      humidityPct: 81,
      inversionRisk: 'High',
      updatedAt: new Date().toISOString(),
      source: 'seasonal_model',
      hourly: buildHourlyCurve(74),
    },
  },
  {
    city: 'Milan',
    country: 'Italy',
    latitude: 45.4642,
    longitude: 9.19,
    winterNote: 'Po Valley high-pressure winter domes slow air exchange across northern Italy.',
    fallbackAir: {
      city: 'Milan',
      country: 'Italy',
      latitude: 45.4642,
      longitude: 9.19,
      usAqi: 146,
      pm25: 54,
      pm10: 76,
      no2: 52,
      temperatureC: 4,
      windSpeedKmh: 6,
      humidityPct: 79,
      inversionRisk: 'High',
      updatedAt: new Date().toISOString(),
      source: 'seasonal_model',
      hourly: buildHourlyCurve(52),
    },
  },
  {
    city: 'Beijing',
    country: 'China',
    latitude: 39.9042,
    longitude: 116.4074,
    winterNote: 'Regional coal/heating haze builds rapidly when northern winds pause.',
    fallbackAir: {
      city: 'Beijing',
      country: 'China',
      latitude: 39.9042,
      longitude: 116.4074,
      usAqi: 184,
      pm25: 118,
      pm10: 164,
      no2: 54,
      temperatureC: 1,
      windSpeedKmh: 8,
      humidityPct: 58,
      inversionRisk: 'High',
      updatedAt: new Date().toISOString(),
      source: 'seasonal_model',
      hourly: buildHourlyCurve(110),
    },
  },
];

export const INDOOR_HACKS: IndoorHack[] = [
  {
    id: 'hack-cr-box',
    title: 'Build a 4-Filter Corsi-Rosenthal Box Fan Purifier',
    category: 'filtration',
    costTier: 'DIY build ($60–$85)',
    roomScope: 'Living room or shared family space (up to 45 m²)',
    indoorPm25DropPct: 68,
    setupMinutes: 25,
    steps: [
      'Arrange four 20×20-inch MERV-13 pleated HVAC filters into a square cube with airflow arrows pointing inward.',
      'Tape the four filter corners and the cardboard bottom base tightly using duct tape so air cannot bypass the filter media.',
      'Place a standard 20-inch box fan facing upward on top, tape the perimeter, and cut a 15-inch circular cardboard shroud over the fan corners to stop backflow.',
    ],
    directImpactExplanation:
      'Delivers ~500 m³/h of Clean Air Delivery Rate (rivaling $400 commercial purifiers) for ~$70, dropping indoor PM2.5 by 60–75% within 30 minutes.',
    scienceNote:
      'Tested by UC Davis and EPA researchers: four MERV-13 filters drastically lower pressure drop so a box fan moves high airflow safely and quietly on medium speed.',
  },
  {
    id: 'hack-back-burner',
    title: 'Back-Burner Exhaust & Covered Simmer Protocol',
    category: 'cooking',
    costTier: 'Zero cost',
    roomScope: 'Kitchen & adjacent dining area',
    indoorPm25DropPct: 48,
    setupMinutes: 2,
    steps: [
      'Always cook on the rear burners closest to the wall and switch your range hood on 2 minutes before lighting the burner.',
      'Keep lids on pots, favor pressure-cooking or steaming over high-smoke searing on smog-alert nights, and leave the exhaust fan running 10 minutes after cooking.',
      'Close interior bedroom doors while cooking so cooking aerosols do not drift into sleeping areas.',
    ],
    directImpactExplanation:
      'High-heat cooking on front gas burners releases both PM2.5 oil droplets and NO₂ gas. Rear-burner hood capture removes ~75% of fumes before they enter your lungs.',
    scienceNote:
      'Lawrence Berkeley National Lab studies show rear burners improve capture efficiency from ~40% to over 75% on standard residential hoods.',
  },
  {
    id: 'hack-draft-seal',
    title: 'Silicone Weatherstripping & Entryway Threshold Seal',
    category: 'sealing',
    costTier: 'Low cost ($10–$30)',
    roomScope: 'Exterior windows & main door',
    indoorPm25DropPct: 32,
    setupMinutes: 30,
    steps: [
      'Run a hand along window sashes and exterior door bottoms on a breezy evening to feel cold infiltration drafts.',
      'Apply adhesive EPDM/silicone V-seal tape around leaky window frames and slide a foam draft stopper beneath the front door.',
      'In an emergency severe-smog night, press a lightly damp rolled towel across the gap of bedroom window tracks.',
    ],
    directImpactExplanation:
      'Slows outdoor-to-indoor smog infiltration (I/O ratio) by up to 40%, allowing your purifier to hold clean indoor air at a lower fan speed and cutting heating loss.',
    scienceNote:
      'In leaky urban apartments, outdoor PM2.5 enters mainly through perimeter cracks—reducing air leakage rate halves the particle load purifiers must fight.',
  },
  {
    id: 'hack-damp-clean',
    title: 'Damp Microfiber Wiping & Shoes-Off Entry Zone',
    category: 'sealing',
    costTier: 'Zero cost',
    roomScope: 'Whole home',
    indoorPm25DropPct: 22,
    setupMinutes: 10,
    steps: [
      'Place a dedicated shoe rack and washable mat right inside the door so outdoor soot, road dust, and tire particles stay out of bedrooms.',
      'Replace dry broom sweeping and feather dusting with a damp microfiber mop or cloth during winter smog months.',
      'If vacuuming, use only a sealed HEPA-filter vacuum and run room air filtration for 20 minutes afterward.',
    ],
    directImpactExplanation:
      'Prevents re-aerosolizing settled black carbon and heavy-metal street dust—especially vital for toddlers crawling and playing near floor level.',
    scienceNote:
      'Indoor particle sensors routinely record 3x–5x PM2.5 spikes for over 90 minutes after dry sweeping or unsealed vacuuming.',
  },
  {
    id: 'hack-inversion-vent',
    title: 'Midday Mixing-Layer Purge Ventilation',
    category: 'ventilation',
    costTier: 'Zero cost',
    roomScope: 'Whole home',
    indoorPm25DropPct: 26,
    setupMinutes: 10,
    steps: [
      'Never open windows at dawn (06:00–09:30) or late evening (19:00–23:00), when winter temperature inversions pin smoke near ground level.',
      'Check the Vayu hourly curve for the afternoon trough (typically 13:00–15:30) when sunlight warms the ground and dilutes smog.',
      'If trough PM2.5 drops below 95 µg/m³, open opposite windows for 8–10 minutes to clear stale CO₂, then close and run filtration on high for 15 minutes.',
    ],
    directImpactExplanation:
      'Balances fresh oxygen / low CO₂ (which prevents afternoon fatigue and headaches) while avoiding the 2x–3x higher smog load of morning and evening hours.',
    scienceNote:
      'Sealed bedrooms can exceed 1,800 ppm CO₂ overnight; timed short purges refresh oxygen rapidly without cooling interior thermal mass.',
  },
  {
    id: 'hack-bedroom-sanctuary',
    title: 'Dedicated Clean-Air Bedroom Sanctuary Sizing',
    category: 'filtration',
    costTier: 'Equipment ($120+)',
    roomScope: 'Primary or children’s bedroom',
    indoorPm25DropPct: 72,
    setupMinutes: 15,
    steps: [
      'Rather than trying to filter an entire open apartment with one undersized purifier, concentrate filtration in the closed bedroom where your family sleeps 8–9 hours.',
      'Position the purifier at least 30 cm away from walls and curtains, aiming clean airflow gently across the sleeping zone.',
      'Keep it on continuous Medium/Quiet mode all night so lungs get 8 full hours of recovery below 12 µg/m³.',
    ],
    directImpactExplanation:
      'Eight hours of clean overnight breathing cuts total 24-hour respiratory PM2.5 dose by 35–45% and measurably reduces morning coughing and wheezing.',
    scienceNote:
      'Clinical intervention studies in polluted winter cities link overnight bedroom HEPA filtration to lower systolic blood pressure and improved pediatric airway markers.',
  },
];

export const SUSTAINABLE_SWAPS: SustainableSwap[] = [
  {
    id: 'swap-school-carpool',
    title: '3-Family School & Commute Carpool Rotation',
    category: 'commute',
    currentHabit: 'Daily solo petrol/diesel car trip during peak morning inversion',
    sustainableAlternative: 'Shared 3-family neighborhood carpool + strict zero-idling drop-off',
    monthlyPm25PreventedGrams: 54,
    monthlyCo2SavedKg: 82,
    exposureReductionPct: 14,
    monthlyCostDeltaUsd: -65,
    directImpactExplanation:
      'Takes 2 cold-start cars off congested neighborhood streets every morning—cold engines emit up to 5x more fine particulates during the first 3 km.',
    communityRippleNote:
      'When 20 school families adopt carpool rotations, morning drop-off gate NO₂ and PM2.5 plumes drop noticeably for every child walking into school.',
    matchingCommutes: ['petrol_car', 'diesel_car'],
  },
  {
    id: 'swap-metro-transit',
    title: 'Shift 3 Workdays/Week to Electric Transit or Rail',
    category: 'commute',
    currentHabit: '5-day private car or petrol two-wheeler commute in stop-and-go traffic',
    sustainableAlternative: 'Electric metro, bus, or commuter rail on heavy-smog weekdays',
    monthlyPm25PreventedGrams: 72,
    monthlyCo2SavedKg: 115,
    exposureReductionPct: 18,
    monthlyCostDeltaUsd: -85,
    directImpactExplanation:
      'Eliminates both tailpipe exhaust and brake/tire wear PM2.5 on high-inversion corridors while shielding riders from open roadside fumes.',
    communityRippleNote:
      'Shifting 50 commuters off arterial roads removes ~5.7 metric tons of CO₂e and 3.6 kg of urban PM2.5 every winter month.',
    matchingCommutes: ['petrol_car', 'diesel_car', 'two_wheeler'],
  },
  {
    id: 'swap-no-wood-heat',
    title: 'Replace Fireplace / Wood Stove Evenings with Zoned Electric Warmth',
    category: 'heating',
    currentHabit: 'Burning firewood, coal, or briquettes during winter evenings',
    sustainableAlternative: 'Heat-pump / oil-filled electric radiator in occupied room + thermal draft seal',
    monthlyPm25PreventedGrams: 620,
    monthlyCo2SavedKg: 94,
    exposureReductionPct: 24,
    monthlyCostDeltaUsd: -18,
    directImpactExplanation:
      'Residential wood smoke is one of the single highest per-household PM2.5 sources in winter valleys—one fireplace evening equals hundreds of kilometers of car exhaust.',
    communityRippleNote:
      'Just 15 households pausing wood burning on inversion nights eliminates over 9 kg of toxic smoke sitting directly at roof and bedroom window height.',
    matchingHeating: ['wood_biomass'],
  },
  {
    id: 'swap-electric-cook',
    title: 'Single-Burner Induction & Electric Kettle Daily Swap',
    category: 'cooking',
    currentHabit: 'Open gas stove or biomass cooking for daily tea, boiling, and stews',
    sustainableAlternative: 'Portable $55 countertop induction hob + electric kettle for 70% of meals',
    monthlyPm25PreventedGrams: 88,
    monthlyCo2SavedKg: 38,
    exposureReductionPct: 22,
    monthlyCostDeltaUsd: -14,
    directImpactExplanation:
      'Cuts indoor kitchen NO₂ and combustion particulates at the source without waiting for a full kitchen remodel, while boiling water twice as fast.',
    communityRippleNote:
      'Widespread electric cooking eliminates daily indoor NO₂ peaks linked to childhood asthma flare-ups in tightly sealed winter homes.',
    matchingCooking: ['gas_stove', 'biomass_chulha', 'mixed'],
  },
  {
    id: 'swap-no-burn-compost',
    title: 'Community Dry-Leaf Mulching Instead of Winter Open Burning',
    category: 'community',
    currentHabit: 'Sweeping winter leaves or yard waste into roadside burn piles',
    sustainableAlternative: 'Shared apartment/block compost bin or municipal mulch collection',
    monthlyPm25PreventedGrams: 195,
    monthlyCo2SavedKg: 42,
    exposureReductionPct: 10,
    monthlyCostDeltaUsd: 0,
    directImpactExplanation:
      'Smoldering damp winter leaves burn at low temperatures, releasing dense clouds of PM2.5, PAHs, and carbon monoxide right beside ground-floor windows.',
    communityRippleNote:
      'Organizing a single apartment society or street block to ban leaf burning removes one of the most preventable local smog spikes every evening.',
  },
  {
    id: 'swap-smart-thermostat',
    title: '1.5°C Winter Setback + Draft-Sealed Zone Heating',
    category: 'heating',
    currentHabit: 'Heating unoccupied rooms all day with gas furnace or continuous space heaters',
    sustainableAlternative: '1.5°C thermostat setback, closed doors to unused rooms, and warm layers',
    monthlyPm25PreventedGrams: 28,
    monthlyCo2SavedKg: 64,
    exposureReductionPct: 6,
    monthlyCostDeltaUsd: -36,
    directImpactExplanation:
      'Reduces residential boiler NOx and peak winter power-plant demand by ~12–15% immediately with zero comfort loss once drafts are sealed.',
    communityRippleNote:
      'Across 100 neighborhood homes, a modest 1.5°C setback avoids 6.4 tons of CO₂e per winter month and cuts gas heating bills significantly.',
    matchingHeating: ['gas_furnace', 'electric_space_heater'],
  },
];
