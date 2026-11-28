import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveInversionRisk,
  formatGeminiError,
  mapPlanToRoutineItems,
  sanitizeAiPlan,
  validateChatPayload,
  validateCityQuery,
  validatePlanPayload,
} from './serverHelpers';
import { CITY_PRESETS, DEFAULT_PROFILE } from '../data/presets';

test('deriveInversionRisk classifies Severe, High, Moderate, Low, and non-finite inputs', () => {
  assert.equal(deriveInversionRisk(220, 12, 15), 'Severe');
  assert.equal(deriveInversionRisk(155, 5, 12), 'Severe');
  assert.equal(deriveInversionRisk(125, 14, 15), 'High');
  assert.equal(deriveInversionRisk(50, 6, 4), 'High');
  assert.equal(deriveInversionRisk(85, 15, 16), 'Moderate');
  assert.equal(deriveInversionRisk(40, 18, 16), 'Low');
  assert.equal(deriveInversionRisk(Number.NaN, Number.NaN, Number.NaN), 'Low');
});

test('validateCityQuery accepts clean city names and rejects invalid lengths or control chars', () => {
  assert.equal(validateCityQuery(undefined).city, 'New Delhi');
  assert.equal(validateCityQuery('  Salt Lake City  ').city, 'Salt Lake City');
  assert.ok(validateCityQuery('').error);
  assert.ok(validateCityQuery('a'.repeat(81)).error);
  assert.ok(validateCityQuery('Delhi\n<script>').error);
});

test('validateChatPayload enforces user message presence, message cap, and content length limits', () => {
  assert.ok(validateChatPayload(null).error);
  assert.ok(validateChatPayload({ messages: [] }).error);
  assert.ok(validateChatPayload({ messages: [{ role: 'assistant', content: 'Hi' }] }).error);

  const oversized = 'x'.repeat(3000);
  const res = validateChatPayload({
    messages: [{ role: 'user', content: oversized }],
    profile: DEFAULT_PROFILE,
  });
  assert.equal(res.error, undefined);
  assert.equal(res.data?.messages.length, 1);
  assert.equal(res.data?.messages[0].content.length, 2000);
});

test('validatePlanPayload requires profile and airQuality and clamps household size and focusNote', () => {
  assert.ok(validatePlanPayload({}).error);
  assert.ok(
    validatePlanPayload({
      profile: DEFAULT_PROFILE,
      airQuality: { ...CITY_PRESETS[0].fallbackAir, city: '  ' },
    }).error
  );

  const res = validatePlanPayload({
    profile: { ...DEFAULT_PROFILE, householdSize: 99 },
    airQuality: CITY_PRESETS[0].fallbackAir,
    focusNote: 'N'.repeat(400),
  });
  assert.equal(res.error, undefined);
  assert.equal(res.data?.profile.householdSize, 20);
  assert.equal(res.data?.focusNote?.length, 300);
});

test('formatGeminiError maps status codes and extracts wrapped JSON error messages cleanly', () => {
  assert.equal(formatGeminiError(new Error('GEMINI_API_KEY is not configured')).status, 500);
  assert.equal(formatGeminiError(new Error('PERMISSION_DENIED invalid key')).status, 403);
  assert.equal(formatGeminiError(new Error('429 RESOURCE_EXHAUSTED')).status, 429);
  assert.equal(formatGeminiError(new Error('503 UNAVAILABLE high demand')).status, 503);

  const wrapped = formatGeminiError(
    new Error('API error {"error":{"message":"Temporary upstream timeout"}}')
  );
  assert.equal(wrapped.status, 502);
  assert.equal(wrapped.message, 'Temporary upstream timeout');
});

test('sanitizeAiPlan normalizes invalid categories/periods and mapPlanToRoutineItems creates RoutineItems', () => {
  assert.equal(sanitizeAiPlan(null), null);
  assert.equal(sanitizeAiPlan({ summary: '' }), null);

  const plan = sanitizeAiPlan({
    summary: 'Keep bedrooms sealed and filtered tonight.',
    smogRiskExplanation: 'Shallow valley inversion traps exhaust.',
    routines: [
      {
        period: 'INVALID_PERIOD',
        timeWindow: '07:30 – 08:30',
        title: 'Skip cold idling',
        action: 'Turn off engine immediately.',
        category: 'INVALID_CAT',
        directImpact: 'Cuts street-level PM2.5.',
        exposureReductionPct: 90,
        dailyCo2SavedKg: -2,
      },
    ],
    indoorPriorityHacks: [{ title: 'Seal drafts', room: 'Bedroom', whyItMatters: 'Cuts leakage.' }],
    sustainableSwaps: [],
    communityAction: {
      title: 'Block no-idle note',
      action: 'Share alert in group chat',
      collectiveImpact: 'Cleaner morning sidewalks',
    },
  });

  assert.ok(plan);
  assert.equal(plan.routines[0].period, 'morning');
  assert.equal(plan.routines[0].category, 'indoor_air');
  assert.equal(plan.routines[0].exposureReductionPct, 35);
  assert.equal(plan.routines[0].dailyCo2SavedKg, 0.1);

  const mapped = mapPlanToRoutineItems(plan, 'test-plan');
  assert.equal(mapped.length, 1);
  assert.equal(mapped[0].id, 'test-plan-0');
  assert.equal(mapped[0].isAiGenerated, true);
  assert.equal(mapped[0].dailyPm25AvoidedUg, 210);
});
