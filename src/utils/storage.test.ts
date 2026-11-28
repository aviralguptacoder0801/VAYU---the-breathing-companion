import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PROFILE } from '../data/presets';
import {
  sanitizePositiveInteger,
  sanitizeStoredJournalEntries,
  sanitizeStoredProfile,
  sanitizeStoredRoutines,
  sanitizeStringArray,
} from './storage';

test('sanitizeStoredProfile recovers safely from corrupted or partial localStorage JSON', () => {
  assert.deepEqual(sanitizeStoredProfile(null), DEFAULT_PROFILE);
  assert.deepEqual(sanitizeStoredProfile('corrupt'), DEFAULT_PROFILE);

  const partial = sanitizeStoredProfile({
    city: 'Krakow',
    country: 'Poland',
    householdSize: 999,
    sensitivities: ['children_under_12', 'INVALID_FLAG'],
    commuteMode: 'flying_carpet',
    heatingSource: 'wood_biomass',
  });

  assert.equal(partial.city, 'Krakow');
  assert.equal(partial.householdSize, DEFAULT_PROFILE.householdSize);
  assert.deepEqual(partial.sensitivities, ['children_under_12']);
  assert.equal(partial.commuteMode, DEFAULT_PROFILE.commuteMode);
  assert.equal(partial.heatingSource, 'wood_biomass');
});

test('sanitizeStringArray and sanitizePositiveInteger guard primitive storage fields', () => {
  assert.deepEqual(sanitizeStringArray('bad', ['a']), ['a']);
  assert.deepEqual(sanitizeStringArray(['ok', 123, '', 'yes'], ['a']), ['ok', 'yes']);

  assert.equal(sanitizePositiveInteger('bad', 25), 25);
  assert.equal(sanitizePositiveInteger(0, 25, 1, 300), 1);
  assert.equal(sanitizePositiveInteger(999, 25, 1, 300), 300);
  assert.equal(sanitizePositiveInteger(42.6, 25, 1, 300), 43);
});

test('sanitizeStoredRoutines and sanitizeStoredJournalEntries drop malformed entries', () => {
  const routines = sanitizeStoredRoutines([
    null,
    { id: 'bad' },
    {
      id: 'custom-1',
      period: 'morning',
      timeWindow: '08:00',
      title: 'Pack N95',
      action: 'Pack masks',
      category: 'commute',
      directImpact: 'Reduces PM2.5',
      exposureReductionPct: 10,
      dailyPm25AvoidedUg: 50,
      dailyCo2SavedKg: 0.2,
      dailyEmissionPm25Grams: 0.1,
    },
  ]);
  assert.equal(routines.length, 1);
  assert.equal(routines[0].id, 'custom-1');

  const journal = sanitizeStoredJournalEntries(
    [{ id: 'broken' }, { id: 'j-1', transcript: 'Coughing', recordedAt: '2026-11-25T10:00:00Z', detectedSymptoms: ['Coughing'] }],
    []
  );
  assert.equal(journal.length, 1);
  assert.equal(journal[0].id, 'j-1');
});
