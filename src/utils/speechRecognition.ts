export interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

export interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

export interface SpeechRecognitionResultListLike {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
}

export interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}

export interface SpeechRecognitionErrorEventLike {
  error: string;
}

export interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  start: () => void;
  stop: () => void;
}

export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export function formatSpeechErrorNotice(errorCode: string): string {
  if (errorCode === 'not-allowed' || errorCode === 'service-not-allowed') {
    return 'Microphone access was blocked. Allow microphone permission in your browser or type your symptoms directly below.';
  }
  if (errorCode === 'no-speech') {
    return 'No speech was detected. Click Record Symptoms to try again.';
  }
  if (errorCode === 'audio-capture') {
    return 'No microphone was detected on this device. You can type symptoms directly below.';
  }
  if (errorCode === 'aborted') {
    return 'Voice recording stopped. Review your note below or click Record Symptoms to continue.';
  }
  return `Voice capture stopped (${errorCode}). You can edit or finish typing your symptom note below.`;
}

export function extractSpeechChunks(event: SpeechRecognitionEventLike): {
  finalText: string;
  interimText: string;
} {
  let finalChunk = '';
  let interimChunk = '';
  for (let i = event.resultIndex; i < event.results.length; i++) {
    const result = event.results[i];
    const text = result[0]?.transcript ?? '';
    if (result.isFinal) {
      finalChunk += text;
    } else {
      interimChunk += text;
    }
  }
  return {
    finalText: finalChunk.trim(),
    interimText: interimChunk.trim(),
  };
}

export function mergeTranscriptText(existing: string, addition: string): string {
  const base = existing.trim();
  const next = addition.trim();
  if (!next) return base;
  if (!base) return next;
  return `${base} ${next}`;
}
