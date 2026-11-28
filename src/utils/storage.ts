import { DEFAULT_PROFILE } from '../data/presets';
import type {
  CommuteMode,
  CookingFuel,
  HealthJournalEntry,
  HeatingSource,
  HomeType,
  HouseholdProfile,
  RoutineItem,
  SensitivityGroup,
} from '../types';

const VALID_COMMUTES = new Set<CommuteMode>([
  'petrol_car',
  'diesel_car',
  'two_wheeler',
  'public_transit',
  'walking_cycling',
  'remote',
]);
const VALID_HEATING = new Set<HeatingSource>([
  'wood_biomass',
  'gas_furnace',
  'electric_space_heater',
  'heat_pump',
  'minimal_heating',
]);
const VALID_COOKING = new Set<CookingFuel>([
  'gas_stove',
  'biomass_chulha',
  'induction_electric',
  'mixed',
]);
const VALID_HOMES = new Set<HomeType>([
  'apartment_sealed',
  'older_drafty_home',
  'independent_house',
]);
const VALID_SENSITIVITIES = new Set<SensitivityGroup>([
  'children_under_12',
  'older_adults_65',
  'asthma_respiratory',
  'outdoor_commuter',
]);

export function sanitizeStoredProfile(raw: unknown): HouseholdProfile {
  if (!raw || typeof raw !== 'object') return DEFAULT_PROFILE;
  const obj = raw as Record<string, unknown>;

  const city =
    typeof obj.city === 'string' && obj.city.trim().length >= 2
      ? obj.city.trim()
      : DEFAULT_PROFILE.city;
  const country = typeof obj.country === 'string' ? obj.country.trim() : DEFAULT_PROFILE.country;
  const householdSize =
    typeof obj.householdSize === 'number' &&
    Number.isFinite(obj.householdSize) &&
    obj.householdSize >= 1 &&
    obj.householdSize <= 20
      ? Math.round(obj.householdSize)
      : DEFAULT_PROFILE.householdSize;

  const sensitivities = Array.isArray(obj.sensitivities)
    ? obj.sensitivities.filter(
        (s): s is SensitivityGroup =>
          typeof s === 'string' && VALID_SENSITIVITIES.has(s as SensitivityGroup)
      )
    : DEFAULT_PROFILE.sensitivities;

  const commuteMode =
    typeof obj.commuteMode === 'string' && VALID_COMMUTES.has(obj.commuteMode as CommuteMode)
      ? (obj.commuteMode as CommuteMode)
      : DEFAULT_PROFILE.commuteMode;
  const heatingSource =
    typeof obj.heatingSource === 'string' && VALID_HEATING.has(obj.heatingSource as HeatingSource)
      ? (obj.heatingSource as HeatingSource)
      : DEFAULT_PROFILE.heatingSource;
  const cookingFuel =
    typeof obj.cookingFuel === 'string' && VALID_COOKING.has(obj.cookingFuel as CookingFuel)
      ? (obj.cookingFuel as CookingFuel)
      : DEFAULT_PROFILE.cookingFuel;
  const homeType =
    typeof obj.homeType === 'string' && VALID_HOMES.has(obj.homeType as HomeType)
      ? (obj.homeType as HomeType)
      : DEFAULT_PROFILE.homeType;

  return {
    city,
    country,
    latitude: typeof obj.latitude === 'number' && Number.isFinite(obj.latitude) ? obj.latitude : DEFAULT_PROFILE.latitude,
    longitude: typeof obj.longitude === 'number' && Number.isFinite(obj.longitude) ? obj.longitude : DEFAULT_PROFILE.longitude,
    householdSize,
    sensitivities,
    commuteMode,
    heatingSource,
    cookingFuel,
    homeType,
  };
}

export function sanitizeStringArray(raw: unknown, fallback: string[]): string[] {
  if (!Array.isArray(raw)) return fallback;
  return raw.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

export function sanitizePositiveInteger(
  raw: unknown,
  fallback: number,
  min = 1,
  max = 300
): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return fallback;
  return Math.max(min, Math.min(max, Math.round(raw)));
}

export function sanitizeStoredRoutines(raw: unknown): RoutineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is RoutineItem => {
    if (!item || typeof item !== 'object') return false;
    const obj = item as Record<string, unknown>;
    return (
      typeof obj.id === 'string' &&
      typeof obj.title === 'string' &&
      typeof obj.period === 'string' &&
      typeof obj.timeWindow === 'string' &&
      typeof obj.exposureReductionPct === 'number'
    );
  });
}

export function sanitizeStoredJournalEntries(
  raw: unknown,
  fallback: HealthJournalEntry[]
): HealthJournalEntry[] {
  if (!Array.isArray(raw)) return fallback;
  return raw.filter((item): item is HealthJournalEntry => {
    if (!item || typeof item !== 'object') return false;
    const obj = item as Record<string, unknown>;
    return (
      typeof obj.id === 'string' &&
      typeof obj.transcript === 'string' &&
      typeof obj.recordedAt === 'string' &&
      Array.isArray(obj.detectedSymptoms)
    );
  });
}
