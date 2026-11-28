import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Mic,
  Square,
  AlertTriangle,
  ShieldAlert,
  FileText,
  Trash2,
  MessageSquare,
} from 'lucide-react';
import { FilterGroup } from './FilterGroup';
import { useLocalStorage } from '../hooks/useLocalStorage';
import {
  analyzeSymptomTranscript,
  createHealthJournalEntry,
  validateSymptomTranscript,
} from '../utils/symptomAlert';
import {
  extractSpeechChunks,
  formatSpeechErrorNotice,
  mergeTranscriptText,
  type SpeechRecognitionConstructor,
  type SpeechRecognitionErrorEventLike,
  type SpeechRecognitionEventLike,
  type SpeechRecognitionLike,
} from '../utils/speechRecognition';
import { sanitizeStoredJournalEntries } from '../utils/storage';
import type { AirQualityData, HealthJournalEntry, SymptomAlertLevel } from '../types';

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface VoiceSymptomJournalProps {
  airQuality: AirQualityData;
  onAskAssistantAboutEntry: (entry: HealthJournalEntry) => void;
}

const STORAGE_KEY = 'vayu_health_journal_v1';

const MEMBER_OPTIONS = ['Self', 'Child', 'Older Adult', 'Family Member'];

const FILTER_OPTIONS: Array<{ id: 'all' | SymptomAlertLevel; label: string }> = [
  { id: 'all', label: 'All entries' },
  { id: 'urgent', label: 'Urgent' },
  { id: 'elevated', label: 'Elevated' },
  { id: 'routine', label: 'Routine' },
];

function getDefaultSeedEntries(airQuality: AirQualityData): HealthJournalEntry[] {
  return [
    createHealthJournalEntry({
      transcript:
        'Dry coughing and scratchy throat after walking outside during morning haze.',
      memberLabel: 'Child',
      inputMethod: 'voice',
      city: airQuality.city,
      usAqi: Math.max(155, airQuality.usAqi),
      pm25: Math.max(72, airQuality.pm25),
      recordedAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    }),
  ];
}

function getAlertTone(level: SymptomAlertLevel) {
  if (level === 'urgent') {
    return {
      surface: 'bg-red-50 border-red-200',
      labelClass: 'text-red-800',
      icon: ShieldAlert,
    };
  }
  if (level === 'elevated') {
    return {
      surface: 'bg-amber-50 border-amber-200',
      labelClass: 'text-amber-900',
      icon: AlertTriangle,
    };
  }
  return {
    surface: 'bg-slate-50 border-slate-200',
    labelClass: 'text-teal-800',
    icon: FileText,
  };
}

export function VoiceSymptomJournal({
  airQuality,
  onAskAssistantAboutEntry,
}: VoiceSymptomJournalProps) {
  const [entries, setEntries] = useLocalStorage<HealthJournalEntry[]>(
    STORAGE_KEY,
    () => getDefaultSeedEntries(airQuality),
    sanitizeStoredJournalEntries
  );
  const [filter, setFilter] = useState<'all' | SymptomAlertLevel>('all');
  const [memberLabel, setMemberLabel] = useState<string>('Self');
  const [transcript, setTranscript] = useState<string>('');
  const [interimText, setInterimText] = useState<string>('');
  const [usedVoice, setUsedVoice] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechNotice, setSpeechNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const isSpeechSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }, []);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore cleanup stop errors
      }
    };
  }, []);

  const combinedText = `${transcript}${interimText ? (transcript ? ' ' : '') + interimText : ''}`;

  const liveAssessment = useMemo(() => {
    if (combinedText.trim().length < 3) return null;
    return analyzeSymptomTranscript(combinedText, airQuality.usAqi, airQuality.pm25);
  }, [combinedText, airQuality.usAqi, airQuality.pm25]);

  const stopRecording = () => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore stop errors
    }
    setIsListening(false);
    setInterimText('');
  };

  const startRecording = () => {
    setSpeechNotice(null);
    setFormError(null);

    const SpeechCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechCtor) {
      setSpeechNotice(
        'Web Speech API is not supported in this browser. You can still type symptoms below for instant smog-alert triage.'
      );
      return;
    }

    try {
      const recognition = new SpeechCtor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setUsedVoice(true);
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        const { finalText, interimText: nextInterim } = extractSpeechChunks(event);
        if (finalText) {
          setTranscript((prev) => mergeTranscriptText(prev, finalText));
        }
        setInterimText(nextInterim);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        setIsListening(false);
        setInterimText('');
        setSpeechNotice(formatSpeechErrorNotice(event.error));
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimText('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      setSpeechNotice(
        'Could not start voice recording right now. You can type your symptoms directly below.'
      );
    }
  };

  const handleLogEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (isListening) {
      stopRecording();
    }
    const finalTranscript = combinedText.trim();
    const validationError = validateSymptomTranscript(finalTranscript);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const newEntry = createHealthJournalEntry({
      transcript: finalTranscript,
      memberLabel,
      inputMethod: usedVoice ? 'voice' : 'text',
      city: airQuality.city,
      usAqi: airQuality.usAqi,
      pm25: airQuality.pm25,
    });

    setEntries((prev) => [newEntry, ...prev]);
    setTranscript('');
    setInterimText('');
    setUsedVoice(false);
    setFormError(null);
    setSpeechNotice(null);
  };

  const handleDeleteEntry = (id: string) => {
    setEntries((prev) => prev.filter((item) => item.id !== id));
  };

  const visibleEntries =
    filter === 'all' ? entries : entries.filter((item) => item.alertLevel === filter);

  const liveTone = liveAssessment ? getAlertTone(liveAssessment.alertLevel) : null;
  const LiveIcon = liveTone?.icon ?? FileText;

  return (
    <section
      aria-label="Voice-to-Alert symptom recorder and health journal"
      className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch"
    >
      {/* Left: Voice-to-Alert Recorder */}
      <div className="xl:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
        <form onSubmit={handleLogEntry} className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Voice-to-Alert Symptom Logger
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Speak physical symptoms (e.g., coughing, wheezing, burning eyes) to triage smog impact and log into your journal.
              </p>
            </div>
            <span className="font-mono tabular-nums text-xs text-slate-500 shrink-0">
              AQI {airQuality.usAqi}
            </span>
          </div>

          {/* Controls Row: Mic Button + Member Selector */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={isListening ? stopRecording : startRecording}
              aria-pressed={isListening}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                isListening
                  ? 'bg-red-700 text-white hover:bg-red-800'
                  : 'bg-teal-700 text-white hover:bg-teal-800'
              }`}
            >
              {isListening ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5" aria-hidden="true" />
                  Record Symptoms
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              <label htmlFor="journal-member-select" className="text-xs text-slate-600 whitespace-nowrap">
                For:
              </label>
              <select
                id="journal-member-select"
                value={memberLabel}
                onChange={(e) => setMemberLabel(e.target.value)}
                className="px-2.5 py-1.5 text-xs text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-700"
              >
                {MEMBER_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {isListening && (
              <span
                role="status"
                aria-live="polite"
                className="text-xs font-medium text-red-700 whitespace-nowrap"
              >
                Listening via microphone...
              </span>
            )}
          </div>

          {!isSpeechSupported && !speechNotice && (
            <p className="text-xs text-slate-500">
              Voice capture requires Chrome, Edge, or Safari Web Speech support. Type symptoms below to generate alerts.
            </p>
          )}

          {speechNotice && (
            <div
              role="status"
              className="p-3 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg"
            >
              {speechNotice}
            </div>
          )}

          <div>
            <label
              htmlFor="voice-symptom-transcript"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Recorded symptom transcript
            </label>
            <textarea
              id="voice-symptom-transcript"
              rows={3}
              value={combinedText}
              aria-invalid={Boolean(formError)}
              aria-describedby={formError ? 'voice-symptom-error' : undefined}
              onChange={(e) => {
                setTranscript(e.target.value);
                setInterimText('');
                setFormError(null);
              }}
              placeholder='Click "Record Symptoms" and say e.g., "My child has been coughing and wheezing after walking outside"...'
              className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700 resize-none"
            />
          </div>

          {formError && (
            <p id="voice-symptom-error" role="alert" className="text-xs font-medium text-red-700">
              {formError}
            </p>
          )}

          {/* Live Voice-to-Alert Triage Preview */}
          {liveAssessment && liveTone && (
            <div
              role="status"
              aria-live="polite"
              data-testid="live-symptom-alert"
              className={`p-3.5 rounded-lg border space-y-1.5 ${liveTone.surface}`}
            >
              <div className="flex items-center gap-2">
                <LiveIcon
                  className={`w-4 h-4 shrink-0 ${liveTone.labelClass}`}
                  aria-hidden="true"
                />
                <span className={`text-xs font-semibold ${liveTone.labelClass}`}>
                  {liveAssessment.alertTitle}
                </span>
                {liveAssessment.detectedSymptoms.length > 0 && (
                  <span className="text-xs text-slate-600 truncate">
                    · {liveAssessment.detectedSymptoms.join(' · ')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {liveAssessment.immediateAction}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-[11px] text-slate-500">
              Stamped with {airQuality.city} · PM2.5 {airQuality.pm25} µg/m³
            </span>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              Log to Health Journal
            </button>
          </div>
        </form>
      </div>

      {/* Right: Health Journal History */}
      <div
        data-testid="health-journal-panel"
        className="xl:col-span-7 bg-white border border-slate-200 rounded-xl flex flex-col"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Family Health Journal
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Track symptoms alongside live AQI &amp; PM2.5 to spot smog triggers early.
            </p>
          </div>

          <FilterGroup
            label="Filter health journal by alert severity"
            options={FILTER_OPTIONS}
            value={filter}
            onChange={setFilter}
            compact
          />
        </div>

        <div className="flex-1 max-h-[340px] overflow-y-auto divide-y divide-slate-200">
          {visibleEntries.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              {entries.length === 0
                ? 'No symptoms logged yet. Use Record Symptoms on the left to capture voice notes and smog alerts.'
                : 'No journal entries match this alert filter.'}
            </div>
          ) : (
            visibleEntries.map((entry) => {
              const tone = getAlertTone(entry.alertLevel);
              const EntryIcon = tone.icon;
              const formattedTime = new Date(entry.recordedAt).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <article
                  key={entry.id}
                  data-testid="journal-entry"
                  className="p-5 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                      <EntryIcon
                        className={`w-3.5 h-3.5 shrink-0 ${tone.labelClass}`}
                        aria-hidden="true"
                      />
                      <span className={`font-semibold ${tone.labelClass}`}>
                        {entry.alertTitle}
                      </span>
                      <span className="text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <span className="font-medium text-slate-800">{entry.memberLabel}</span>
                      <span className="text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <span className="font-mono tabular-nums text-slate-500">
                        {formattedTime}
                      </span>
                      <span className="text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <span className="font-mono tabular-nums text-slate-600">
                        {entry.city} AQI {entry.usAqi} ({entry.pm25} µg/m³)
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onAskAssistantAboutEntry(entry)}
                        aria-label={`Ask Vayu about ${entry.memberLabel} symptom entry`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-md hover:bg-teal-100/70 transition-colors whitespace-nowrap shrink-0"
                      >
                        <MessageSquare className="w-3 h-3" aria-hidden="true" />
                        Ask Vayu
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEntry(entry.id)}
                        aria-label={`Delete symptom entry "${entry.transcript.slice(0, 32)}"`}
                        className="p-1.5 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <p className="mt-2 text-sm text-slate-900 leading-relaxed">
                    &ldquo;{entry.transcript}&rdquo;
                  </p>

                  {entry.detectedSymptoms.length > 0 && (
                    <p className="mt-1.5 text-xs text-slate-500">
                      Detected: {entry.detectedSymptoms.join(' · ')}
                      {' · '}
                      {entry.inputMethod === 'voice' ? 'Voice logged' : 'Text logged'}
                    </p>
                  )}

                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    <span className="font-semibold text-slate-800">Alert guidance: </span>
                    {entry.immediateAction}
                  </p>
                </article>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
