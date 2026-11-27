import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeSymptomTranscript,
  createHealthJournalEntry,
  validateSymptomTranscript,
} from './symptomAlert';

test('analyzeSymptomTranscript detects urgent respiratory red flags', () => {
  const result = analyzeSymptomTranscript(
    'My child started coughing and wheezing with chest tightness after the school bus.',
    210,
    145
  );
  assert.equal(result.alertLevel, 'urgent');
  assert.equal(result.alertTitle, 'Urgent Respiratory Alert');
  assert.ok(result.detectedSymptoms.includes('Wheezing'));
  assert.ok(result.detectedSymptoms.includes('Chest tightness'));
  assert.ok(result.detectedSymptoms.includes('Coughing'));
});

test('analyzeSymptomTranscript elevates coughing & eye irritation during winter smog', () => {
  const elevated = analyzeSymptomTranscript(
    'Dry coughing and burning eyes after stepping out for groceries.',
    165,
    82
  );
  assert.equal(elevated.alertLevel, 'elevated');
  assert.ok(elevated.detectedSymptoms.includes('Coughing'));
  assert.ok(elevated.detectedSymptoms.includes('Eye irritation'));

  const routine = analyzeSymptomTranscript(
    'Mild runny nose this morning.',
    42,
    9.5
  );
  assert.equal(routine.alertLevel, 'routine');
  assert.ok(routine.detectedSymptoms.includes('Nasal congestion'));
});

test('validateSymptomTranscript rejects empty or overly short entries', () => {
  assert.ok(validateSymptomTranscript('') !== null);
  assert.ok(validateSymptomTranscript('  ') !== null);
  assert.ok(validateSymptomTranscript('ok') !== null);
  assert.equal(validateSymptomTranscript('Mild coughing since 7am'), null);
});

test('createHealthJournalEntry stamps city, AQI, symptoms, and alert triage', () => {
  const entry = createHealthJournalEntry({
    transcript: 'Scratchy throat and headache near traffic.',
    memberLabel: 'Self',
    inputMethod: 'voice',
    city: 'New Delhi',
    usAqi: 188,
    pm25: 118.4,
    recordedAt: '2026-11-25T14:00:00Z',
  });

  assert.equal(entry.city, 'New Delhi');
  assert.equal(entry.usAqi, 188);
  assert.equal(entry.pm25, 118.4);
  assert.equal(entry.inputMethod, 'voice');
  assert.equal(entry.alertLevel, 'elevated');
  assert.ok(entry.detectedSymptoms.includes('Sore or scratchy throat'));
  assert.ok(entry.detectedSymptoms.includes('Headache or dizziness'));
});
