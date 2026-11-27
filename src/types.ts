export type CommuteMode = 'petrol_car' | 'diesel_car' | 'two_wheeler' | 'public_transit' | 'walking_cycling' | 'remote';
export type HeatingSource = 'wood_biomass' | 'gas_furnace' | 'electric_space_heater' | 'heat_pump' | 'minimal_heating';
export type CookingFuel = 'gas_stove' | 'biomass_chulha' | 'induction_electric' | 'mixed';
export type HomeType = 'apartment_sealed' | 'older_drafty_home' | 'independent_house';

export type SensitivityGroup = 'children_under_12' | 'older_adults_65' | 'asthma_respiratory' | 'outdoor_commuter';

export interface HouseholdProfile {
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  householdSize: number;
  sensitivities: SensitivityGroup[];
  commuteMode: CommuteMode;
  heatingSource: HeatingSource;
  cookingFuel: CookingFuel;
  homeType: HomeType;
}

export interface HourlyAirPoint {
  hourLabel: string; // e.g., "06:00"
  hourIndex: number; // 0-23
  pm25: number; // µg/m³
  usAqi: number;
}

export interface AirQualityData {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  usAqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  temperatureC: number;
  windSpeedKmh: number;
  humidityPct: number;
  inversionRisk: 'Low' | 'Moderate' | 'High' | 'Severe';
  updatedAt: string;
  source: 'live' | 'seasonal_model';
  hourly: HourlyAirPoint[];
}

export type RoutinePeriod = 'morning' | 'midday' | 'evening' | 'night';
export type RoutineCategory = 'commute' | 'ventilation' | 'indoor_air' | 'cooking' | 'community';

export interface RoutineItem {
  id: string;
  period: RoutinePeriod;
  timeWindow: string;
  title: string;
  action: string;
  category: RoutineCategory;
  directImpact: string;
  exposureReductionPct: number; // Estimated % reduction in daily personal PM2.5 inhalation
  dailyPm25AvoidedUg: number; // Micrograms inhaled avoided per person/day
  dailyCo2SavedKg: number; // Direct kg CO2e saved per day
  dailyEmissionPm25Grams: number; // Outdoor PM2.5 emissions prevented (grams/day)
  isAiGenerated?: boolean;
}

export type HackCategory = 'filtration' | 'cooking' | 'sealing' | 'ventilation';

export interface IndoorHack {
  id: string;
  title: string;
  category: HackCategory;
  costTier: 'Zero cost' | 'Low cost ($10–$30)' | 'DIY build ($60–$85)' | 'Equipment ($120+)';
  roomScope: string;
  indoorPm25DropPct: number;
  setupMinutes: number;
  steps: string[];
  directImpactExplanation: string;
  scienceNote: string;
}

export type SwapCategory = 'commute' | 'heating' | 'cooking' | 'community';

export interface SustainableSwap {
  id: string;
  title: string;
  category: SwapCategory;
  currentHabit: string;
  sustainableAlternative: string;
  monthlyPm25PreventedGrams: number;
  monthlyCo2SavedKg: number;
  exposureReductionPct: number;
  monthlyCostDeltaUsd: number; // negative = saves money, positive = small cost
  directImpactExplanation: string;
  communityRippleNote: string;
  matchingCommutes?: CommuteMode[];
  matchingHeating?: HeatingSource[];
  matchingCooking?: CookingFuel[];
}

export interface ImpactSummary {
  dailyExposureReductionPct: number;
  dailyPm25InhalationAvoidedUg: number;
  monthlyPm25EmissionsPreventedGrams: number;
  monthlyCo2SavedKg: number;
  monthlyCostSavingsUsd: number;
  communityPm25PreventedGrams: number;
  communityCo2SavedKg: number;
  completedRoutineCount: number;
  appliedHacksCount: number;
  adoptedSwapsCount: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  error?: boolean;
}

export interface AiGeneratedPlan {
  summary: string;
  smogRiskExplanation: string;
  routines: Array<{
    period: RoutinePeriod;
    timeWindow: string;
    title: string;
    action: string;
    category: RoutineCategory;
    directImpact: string;
    exposureReductionPct: number;
    dailyCo2SavedKg: number;
  }>;
  indoorPriorityHacks: Array<{
    title: string;
    room: string;
    whyItMatters: string;
  }>;
  sustainableSwaps: Array<{
    title: string;
    insteadOf: string;
    switchTo: string;
    directImpact: string;
  }>;
  communityAction: {
    title: string;
    action: string;
    collectiveImpact: string;
  };
}

export type SymptomAlertLevel = 'routine' | 'elevated' | 'urgent';

export interface SymptomAlertAssessment {
  detectedSymptoms: string[];
  alertLevel: SymptomAlertLevel;
  alertTitle: string;
  immediateAction: string;
  medicalDisclaimer: string;
}

export interface HealthJournalEntry {
  id: string;
  recordedAt: string;
  memberLabel: string;
  transcript: string;
  inputMethod: 'voice' | 'text';
  city: string;
  usAqi: number;
  pm25: number;
  detectedSymptoms: string[];
  alertLevel: SymptomAlertLevel;
  alertTitle: string;
  immediateAction: string;
}

