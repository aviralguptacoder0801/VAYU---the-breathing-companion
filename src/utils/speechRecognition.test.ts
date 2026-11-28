import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractSpeechChunks,
  formatSpeechErrorNotice,
  mergeTranscriptText,
  type SpeechRecognitionEventLike,
} from './speechRecognition';

test('formatSpeechErrorNotice maps standard Web Speech API error codes to helpful guidance', () => {
  assert.ok(formatSpeechErrorNotice('not-allowed').toLowerCase().includes('microphone'));
  assert.ok(formatSpeechErrorNotice('service-not-allowed').toLowerCase().includes('microphone'));
  assert.ok(formatSpeechErrorNotice('no-speech').toLowerCase().includes('no speech'));
  assert.ok(formatSpeechErrorNotice('audio-capture').toLowerCase().includes('no microphone'));
  assert.ok(formatSpeechErrorNotice('aborted').toLowerCase().includes('stopped'));
  assert.ok(formatSpeechErrorNotice('network').includes('network'));
});

test('extractSpeechChunks separates final and interim speech recognition results from resultIndex', () => {
  const event: SpeechRecognitionEventLike = {
    resultIndex: 1,
    results: {
      length: 3,
      0: { isFinal: true, length: 1, 0: { transcript: 'old text' } },
      1: { isFinal: true, length: 1, 0: { transcript: 'dry coughing ' } },
      2: { isFinal: false, length: 1, 0: { transcript: 'and wheezing' } },
    },
  };

  const { finalText, interimText } = extractSpeechChunks(event);
  assert.equal(finalText, 'dry coughing');
  assert.equal(interimText, 'and wheezing');
});

test('mergeTranscriptText trims and joins transcript fragments cleanly', () => {
  assert.equal(mergeTranscriptText('', 'Coughing outdoors'), 'Coughing outdoors');
  assert.equal(mergeTranscriptText('Dry cough', '  '), 'Dry cough');
  assert.equal(mergeTranscriptText('Dry cough ', ' itchy eyes'), 'Dry cough itchy eyes');
});
