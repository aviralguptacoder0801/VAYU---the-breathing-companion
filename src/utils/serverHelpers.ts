import type {
  AiGeneratedPlan,
  AirQualityData,
  HouseholdProfile,
  RoutineCategory,
  RoutineItem,
  RoutinePeriod,
} from '../types';

export type InversionRisk = AirQualityData['inversionRisk'];

export interface ValidatedChatPayload {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  profile?: Partial<HouseholdProfile>;
  airQuality?: Partial<AirQualityData>;
}

export interface ValidatedPlanPayload {
  profile: HouseholdProfile;
  airQuality: AirQualityData;
  focusNote?: string;
}

const VALID_PERIODS = new Set<RoutinePeriod>(['morning', 'midday', 'evening', 'night']);
const VALID_CATEGORIES = new Set<RoutineCategory>([
  'commute',
  'ventilation',
  'indoor_air',
  'cooking',
  'community',
]);

export function deriveInversionRisk(
  usAqi: number,
  windSpeedKmh: number,
  temperatureC: number
): InversionRisk {
  const safeAqi = Number.isFinite(usAqi) ? usAqi : 0;
  const safeWind = Number.isFinite(windSpeedKmh) ? windSpeedKmh : 10;
  const safeTemp = Number.isFinite(temperatureC) ? temperatureC : 15;

  if (safeAqi >= 200 || (safeAqi >= 150 && safeWind <= 6)) return 'Severe';
  if (safeAqi >= 120 || (safeWind <= 8 && safeTemp <= 10)) return 'High';
  if (safeAqi >= 75) return 'Moderate';
  return 'Low';
}

export function validateCityQuery(raw: unknown): { city?: string; error?: string } {
  const city = typeof raw === 'string' ? raw.trim() : 'New Delhi';
  if (!city || city.length > 80) {
    return { error: 'Please provide a valid city name (1–80 characters).' };
  }
  // Reject control characters or suspicious URL injection characters
  if (/[\r\n\t<>`{}[\]\\]/.test(city)) {
    return { error: 'City name contains invalid characters.' };
  }
  return { city };
}

export function validateChatPayload(body: unknown): {
  data?: ValidatedChatPayload;
  error?: string;
} {
  if (!body || typeof body !== 'object') {
    return { error: 'Invalid request payload.' };
  }
  const obj = body as Record<string, unknown>;
  if (!Array.isArray(obj.messages)) {
    return { error: 'Please enter a question for the Clean-Air Assistant.' };
  }

  const normalized: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const item of obj.messages.slice(-12)) {
    if (!item || typeof item !== 'object') continue;
    const msg = item as Record<string, unknown>;
    const role = msg.role === 'user' || msg.role === 'assistant' ? msg.role : null;
    const content = typeof msg.content === 'string' ? msg.content.trim().slice(0, 2000) : '';
    if (role && content) {
      normalized.push({ role, content });
    }
  }

  const hasUserMessage = normalized.some((m) => m.role === 'user');
  if (!hasUserMessage) {
    return { error: 'Please enter a question for the Clean-Air Assistant.' };
  }

  return {
    data: {
      messages: normalized,
      profile:
        obj.profile && typeof obj.profile === 'object'
          ? (obj.profile as Partial<HouseholdProfile>)
          : undefined,
      airQuality:
        obj.airQuality && typeof obj.airQuality === 'object'
          ? (obj.airQuality as Partial<AirQualityData>)
          : undefined,
    },
  };
}

export function validatePlanPayload(body: unknown): {
  data?: ValidatedPlanPayload;
  error?: string;
} {
  if (!body || typeof body !== 'object') {
    return { error: 'Household profile and air quality data are required.' };
  }
  const obj = body as Record<string, unknown>;
  if (!obj.profile || typeof obj.profile !== 'object' || !obj.airQuality || typeof obj.airQuality !== 'object') {
    return { error: 'Household profile and air quality data are required.' };
  }

  const profile = obj.profile as HouseholdProfile;
  const airQuality = obj.airQuality as AirQualityData;

  if (typeof airQuality.city !== 'string' || !airQuality.city.trim()) {
    return { error: 'Air quality city information is required.' };
  }

  const rawNote = typeof obj.focusNote === 'string' ? obj.focusNote.trim() : '';
  const focusNote = rawNote ? rawNote.slice(0, 300) : undefined;

  return {
    data: {
      profile: {
        ...profile,
        sensitivities: Array.isArray(profile.sensitivities) ? profile.sensitivities : [],
        householdSize: Number.isFinite(profile.householdSize)
          ? Math.max(1, Math.min(20, Math.round(profile.householdSize)))
          : 3,
      },
      airQuality,
      focusNote,
    },
  };
}

export function formatGeminiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : 'Unable to reach Gemini right now.';
  if (raw.includes('GEMINI_API_KEY')) {
    return { status: 500, message: raw };
  }
  if (raw.includes('PERMISSION_DENIED') || raw.includes('API_KEY_INVALID')) {
    return {
      status: 403,
      message: 'Please check your Gemini API key in the Settings > Secrets panel and try again.',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message: 'Gemini quota limit was reached temporarily. Please wait a moment and retry.',
    };
  }
  if (raw.includes('503') || raw.includes('UNAVAILABLE') || raw.includes('high demand')) {
    return {
      status: 503,
      message: 'Gemini is experiencing a brief demand spike. Please click Retry in a few seconds.',
    };
  }
  try {
    const start = raw.indexOf('{');
    if (start !== -1) {
      const parsed = JSON.parse(raw.slice(start)) as { error?: { message?: string } };
      if (parsed?.error?.message) {
        return { status: 502, message: parsed.error.message };
      }
    }
  } catch {
    // ignore nested JSON parse failure
  }
  return { status: 502, message: raw };
}

export function sanitizeAiPlan(raw: unknown): AiGeneratedPlan | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  const summary = typeof obj.summary === 'string' ? obj.summary.trim() : '';
  const smogRiskExplanation =
    typeof obj.smogRiskExplanation === 'string' ? obj.smogRiskExplanation.trim() : '';
  if (!summary) return null;

  const rawRoutines = Array.isArray(obj.routines) ? obj.routines : [];
  const routines: AiGeneratedPlan['routines'] = rawRoutines
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((r) => {
      const periodStr = typeof r.period === 'string' ? r.period.toLowerCase() : 'morning';
      const catStr = typeof r.category === 'string' ? r.category.toLowerCase() : 'indoor_air';
      const exp = Number(r.exposureReductionPct);
      const co2 = Number(r.dailyCo2SavedKg);
      return {
        period: (VALID_PERIODS.has(periodStr as RoutinePeriod)
          ? periodStr
          : 'morning') as RoutinePeriod,
        timeWindow: typeof r.timeWindow === 'string' && r.timeWindow.trim() ? r.timeWindow.trim() : '08:00 – 09:00',
        title: typeof r.title === 'string' && r.title.trim() ? r.title.trim() : 'Clean-Air Action',
        action: typeof r.action === 'string' ? r.action.trim() : '',
        category: (VALID_CATEGORIES.has(catStr as RoutineCategory)
          ? catStr
          : 'indoor_air') as RoutineCategory,
        directImpact: typeof r.directImpact === 'string' ? r.directImpact.trim() : '',
        exposureReductionPct: Number.isFinite(exp) ? Math.min(35, Math.max(5, Math.round(exp))) : 15,
        dailyCo2SavedKg: Number.isFinite(co2) ? Math.max(0.1, Math.round(co2 * 10) / 10) : 0.8,
      };
    });

  const rawHacks = Array.isArray(obj.indoorPriorityHacks) ? obj.indoorPriorityHacks : [];
  const indoorPriorityHacks = rawHacks
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((h) => ({
      title: typeof h.title === 'string' ? h.title.trim() : 'Indoor Priority',
      room: typeof h.room === 'string' ? h.room.trim() : 'Home',
      whyItMatters: typeof h.whyItMatters === 'string' ? h.whyItMatters.trim() : '',
    }));

  const rawSwaps = Array.isArray(obj.sustainableSwaps) ? obj.sustainableSwaps : [];
  const sustainableSwaps = rawSwaps
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((s) => ({
      title: typeof s.title === 'string' ? s.title.trim() : 'Sustainable Swap',
      insteadOf: typeof s.insteadOf === 'string' ? s.insteadOf.trim() : '',
      switchTo: typeof s.switchTo === 'string' ? s.switchTo.trim() : '',
      directImpact: typeof s.directImpact === 'string' ? s.directImpact.trim() : '',
    }));

  const rawCommunity =
    obj.communityAction && typeof obj.communityAction === 'object'
      ? (obj.communityAction as Record<string, unknown>)
      : {};

  return {
    summary,
    smogRiskExplanation,
    routines,
    indoorPriorityHacks,
    sustainableSwaps,
    communityAction: {
      title:
        typeof rawCommunity.title === 'string' && rawCommunity.title.trim()
          ? rawCommunity.title.trim()
          : 'Neighborhood Clean-Air Check',
      action: typeof rawCommunity.action === 'string' ? rawCommunity.action.trim() : '',
      collectiveImpact:
        typeof rawCommunity.collectiveImpact === 'string'
          ? rawCommunity.collectiveImpact.trim()
          : '',
    },
  };
}

export function mapPlanToRoutineItems(plan: AiGeneratedPlan, idPrefix = `ai-plan-${Date.now()}`): RoutineItem[] {
  return plan.routines.map((r, idx) => {
    const exposureReductionPct = Math.min(35, Math.max(5, Math.round(r.exposureReductionPct || 15)));
    const dailyCo2SavedKg = Math.max(0.1, Math.round((r.dailyCo2SavedKg || 0.8) * 10) / 10);
    return {
      id: `${idPrefix}-${idx}`,
      period: VALID_PERIODS.has(r.period) ? r.period : 'morning',
      timeWindow: r.timeWindow,
      title: r.title,
      action: r.action,
      category: VALID_CATEGORIES.has(r.category) ? r.category : 'indoor_air',
      directImpact: r.directImpact,
      exposureReductionPct,
      dailyPm25AvoidedUg: Math.round(exposureReductionPct * 6),
      dailyCo2SavedKg,
      dailyEmissionPm25Grams: Math.round(dailyCo2SavedKg * 1.4 * 10) / 10,
      isAiGenerated: true,
    };
  });
}
