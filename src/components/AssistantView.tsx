import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';
import { VoiceSymptomJournal } from './VoiceSymptomJournal';
import type {
  AiGeneratedPlan,
  AirQualityData,
  ChatMessage,
  HealthJournalEntry,
  HouseholdProfile,
  RoutineItem,
} from '../types';

interface AssistantViewProps {
  profile: HouseholdProfile;
  airQuality: AirQualityData;
  generatedPlan: AiGeneratedPlan | null;
  onPlanGenerated: (plan: AiGeneratedPlan) => void;
  onApplyPlanToRoutine: (items: RoutineItem[]) => void;
  autoGenerateSignal: number;
}

function FormattedMessage({ text, isUser }: { text: string; isUser: boolean }) {
  if (isUser) {
    return <span className="whitespace-pre-wrap">{text}</span>;
  }

  const lines = text.split('\n');
  return (
    <div className="space-y-1.5">
      {lines.map((rawLine, lineIdx) => {
        const line = rawLine.trim();
        if (!line) return <div key={lineIdx} className="h-1" />;

        const isBullet = line.startsWith('- ') || line.startsWith('* ');
        const cleanLine = isBullet ? line.slice(2) : line.replace(/^#{1,3}\s+/, '');
        const isHeading = /^#{1,3}\s+/.test(line);

        const parts = cleanLine
          .split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
          .map((segment, segIdx) => {
            if (segment.startsWith('**') && segment.endsWith('**')) {
              return (
                <strong key={segIdx} className="font-semibold text-slate-900">
                  {segment.slice(2, -2)}
                </strong>
              );
            }
            if (segment.startsWith('*') && segment.endsWith('*') && segment.length > 2) {
              return (
                <em key={segIdx} className="italic text-slate-700">
                  {segment.slice(1, -1)}
                </em>
              );
            }
            return <span key={segIdx}>{segment}</span>;
          });

        if (isHeading) {
          return (
            <p key={lineIdx} className="font-semibold text-slate-900 pt-1">
              {parts}
            </p>
          );
        }

        if (isBullet) {
          return (
            <div key={lineIdx} className="flex items-start gap-2 pl-1">
              <span className="text-teal-700 mt-0.5 shrink-0" aria-hidden="true">
                •
              </span>
              <span>{parts}</span>
            </div>
          );
        }

        return <p key={lineIdx}>{parts}</p>;
      })}
    </div>
  );
}

export function AssistantView({
  profile,
  airQuality,
  generatedPlan,
  onPlanGenerated,
  onApplyPlanToRoutine,
  autoGenerateSignal,
}: AssistantViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello from Vayu. I have your ${airQuality.city} air quality telemetry (US AQI ${airQuality.usAqi}, PM2.5 ${airQuality.pm25} µg/m³) and your household profile loaded. Ask me about school commutes, indoor filtration on a budget, low-smoke winter cooking, or neighborhood clean-air actions.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const [focusNote, setFocusNote] = useState('');
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [planAppliedNotice, setPlanAppliedNotice] = useState(false);

  const lastSignalRef = useRef(autoGenerateSignal);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, sending]);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === 'welcome') {
        return [
          {
            ...prev[0],
            content: `Hello from Vayu. I have your ${airQuality.city} air quality telemetry (US AQI ${airQuality.usAqi}, PM2.5 ${airQuality.pm25} µg/m³) and your household profile loaded. Ask me about school commutes, indoor filtration on a budget, low-smoke winter cooking, or neighborhood clean-air actions.`,
          },
        ];
      }
      return prev;
    });
  }, [airQuality.city, airQuality.usAqi, airQuality.pm25]);

  const starterPrompts = [
    `Is it safe to walk our child to school in ${airQuality.city} tomorrow morning when AQI is around ${airQuality.usAqi}?`,
    'How can we cook dinner tonight in a small closed apartment without spiking indoor PM2.5?',
    'Draft a friendly message for our apartment group proposing a winter no-idling and no-leaf-burning pledge.',
  ];

  const handleGeneratePlan = async () => {
    setPlanLoading(true);
    setPlanError(null);
    setPlanAppliedNotice(false);
    try {
      const res = await fetch('/api/assistant/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          airQuality,
          focusNote: focusNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not generate a tailored action plan right now.');
      }
      onPlanGenerated(data.plan as AiGeneratedPlan);
    } catch (err) {
      setPlanError(
        err instanceof Error ? err.message : 'Unable to generate tailored action plan.'
      );
    } finally {
      setPlanLoading(false);
    }
  };

  useEffect(() => {
    if (autoGenerateSignal > lastSignalRef.current) {
      lastSignalRef.current = autoGenerateSignal;
      handleGeneratePlan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerateSignal]);

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || sending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setChatError(null);
    setSending(true);

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextHistory
            .filter((m) => !m.error)
            .map((m) => ({ role: m.role, content: m.content })),
          profile,
          airQuality,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to get a response from the Clean-Air Assistant.');
      }

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to connect to the assistant.';
      setChatError(message);
    } finally {
      setSending(false);
    }
  };

  const handleSubmitChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) {
      setChatError('Enter a question about winter smog, indoor air, or daily routines first.');
      return;
    }
    sendMessage(input);
  };

  const handleApplyPlan = () => {
    if (!generatedPlan) return;
    const validPeriods = new Set(['morning', 'midday', 'evening', 'night']);
    const validCategories = new Set([
      'commute',
      'ventilation',
      'indoor_air',
      'cooking',
      'community',
    ]);

    const mapped: RoutineItem[] = generatedPlan.routines.map((r, idx) => ({
      id: `ai-plan-${Date.now()}-${idx}`,
      period: (validPeriods.has(r.period) ? r.period : 'morning') as RoutineItem['period'],
      timeWindow: r.timeWindow,
      title: r.title,
      action: r.action,
      category: (validCategories.has(r.category)
        ? r.category
        : 'indoor_air') as RoutineItem['category'],
      directImpact: r.directImpact,
      exposureReductionPct: Math.min(35, Math.max(5, Math.round(r.exposureReductionPct || 15))),
      dailyPm25AvoidedUg: Math.round((r.exposureReductionPct || 15) * 6),
      dailyCo2SavedKg: Math.max(0.1, Math.round((r.dailyCo2SavedKg || 0.8) * 10) / 10),
      dailyEmissionPm25Grams: Math.round((r.dailyCo2SavedKg || 0.8) * 1.4 * 10) / 10,
      isAiGenerated: true,
    }));

    onApplyPlanToRoutine(mapped);
    setPlanAppliedNotice(true);
  };

  const handleAskAboutJournalEntry = (entry: HealthJournalEntry) => {
    const symptomList =
      entry.detectedSymptoms.length > 0
        ? ` (detected: ${entry.detectedSymptoms.join(', ')})`
        : '';
    const prompt = `Health journal symptom alert for ${entry.memberLabel} in ${entry.city} at AQI ${entry.usAqi} (PM2.5 ${entry.pm25} µg/m³): "${entry.transcript}"${symptomList}. What immediate indoor air steps and low-emission routine adjustments should we take today?`;
    sendMessage(prompt);
    const chatEl = document.getElementById('assistant-chat-panel');
    chatEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          GenAI Clean-Air Assistant
        </h1>
        <p className="text-sm text-slate-600 mt-1 max-w-2xl">
          Context-aware guidance powered by Gemini for {airQuality.city} (US AQI {airQuality.usAqi}, PM2.5 {airQuality.pm25} µg/m³) and your household of {profile.householdSize}.
        </p>
      </div>

      {/* Voice-to-Alert & Family Health Journal */}
      <VoiceSymptomJournal
        airQuality={airQuality}
        onAskAssistantAboutEntry={handleAskAboutJournalEntry}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Conversational Assistant */}
        <section
          id="assistant-chat-panel"
          aria-label="Clean-air conversation"
          className="xl:col-span-7 bg-white border border-slate-200 rounded-xl flex flex-col min-h-[540px] max-h-[700px]"
        >
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Ask Vayu Anything</h2>
              <p className="text-xs text-slate-500">
                Every answer explains the direct health or emission impact of your options.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setMessages([
                  {
                    id: `reset-${Date.now()}`,
                    role: 'assistant',
                    content: `Conversation reset. I'm ready with ${airQuality.city} telemetry (AQI ${airQuality.usAqi})—what would you like help navigating today?`,
                    timestamp: new Date().toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    }),
                  },
                ]);
                setChatError(null);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              New Chat
            </button>
          </div>

          {/* Starter Prompts */}
          <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-200">
            <div className="text-xs text-slate-500 mb-2">Suggested family &amp; community questions:</div>
            <div className="flex flex-col gap-1.5">
              {starterPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={sending}
                  onClick={() => sendMessage(prompt)}
                  className="text-left text-xs text-slate-700 hover:text-teal-900 hover:bg-teal-50/60 px-2.5 py-1.5 rounded-md border border-slate-200/80 bg-white transition-colors disabled:opacity-60"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div className="text-[11px] text-slate-400 mb-1">
                  {msg.role === 'user' ? 'You' : 'Vayu'} · {msg.timestamp}
                </div>
                <div
                  data-testid={`chat-msg-${msg.role}`}
                  className={`max-w-[90%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-teal-700 text-white'
                      : 'bg-slate-50 border border-slate-200 text-slate-800'
                  }`}
                >
                  <FormattedMessage text={msg.content} isUser={msg.role === 'user'} />
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex flex-col items-start">
                <div className="text-[11px] text-slate-400 mb-1">Vayu · Thinking</div>
                <div className="rounded-xl px-4 py-3 text-xs text-slate-600 bg-slate-50 border border-slate-200">
                  Analyzing {airQuality.city} inversion data and your household context...
                </div>
              </div>
            )}

            {chatError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3.5 text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{chatError}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={handleSubmitChat}
            className="p-4 border-t border-slate-200 flex items-center gap-2.5"
          >
            <label htmlFor="assistant-chat-input" className="sr-only">
              Ask the clean-air assistant a question
            </label>
            <input
              id="assistant-chat-input"
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setChatError(null);
              }}
              placeholder="Ask about outdoor play, DIY filters, safe cooking, or local swaps..."
              className="flex-1 px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
            />
            <button
              type="submit"
              disabled={sending}
              aria-label="Send message to assistant"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              <Send className="w-3.5 h-3.5" aria-hidden="true" />
              Send
            </button>
          </form>
        </section>

        {/* Right: AI Tailored Smog Action Plan Generator */}
        <section
          aria-label="AI tailored smog action plan"
          className="xl:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-5"
        >
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              AI Tailored Daily Smog Action Plan
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Synthesize your live {airQuality.city} air quality, commute, heating, cooking setup, and family sensitivities into a custom routine you can load directly into Today&apos;s Routine.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor="plan-focus-note" className="block text-xs font-medium text-slate-700 mb-1.5">
                Optional household note for today
              </label>
              <input
                id="plan-focus-note"
                type="text"
                value={focusNote}
                onChange={(e) => setFocusNote(e.target.value)}
                placeholder="e.g., Elderly parent visits today; no commercial HEPA yet"
                className="w-full px-3.5 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
              />
            </div>

            <button
              type="button"
              onClick={handleGeneratePlan}
              disabled={planLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap disabled:opacity-60"
            >
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              {planLoading ? 'Generating Tailored Plan...' : 'Generate Tailored Action Plan'}
            </button>
          </div>

          {planError && (
            <div
              role="alert"
              className="flex items-start justify-between gap-2.5 p-3.5 text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{planError}</span>
              </div>
              <button
                type="button"
                onClick={handleGeneratePlan}
                className="px-2.5 py-1 text-xs font-medium text-red-900 bg-white border border-red-200 rounded-md hover:bg-red-50 whitespace-nowrap shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          {planLoading && !generatedPlan && (
            <div className="space-y-3 py-4">
              <div className="h-4 bg-slate-100 rounded w-3/4 animate-pulse" />
              <div className="h-3 bg-slate-100 rounded w-full animate-pulse" />
              <div className="h-3 bg-slate-100 rounded w-5/6 animate-pulse" />
              <div className="h-20 bg-slate-100 rounded-lg w-full animate-pulse" />
            </div>
          )}

          {generatedPlan && (
            <div className="space-y-5 pt-4 border-t border-slate-200">
              <div>
                <p className="text-sm font-medium text-slate-900 leading-relaxed">
                  {generatedPlan.summary}
                </p>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                  {generatedPlan.smogRiskExplanation}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <h3 className="text-xs font-semibold text-slate-900">
                    Tailored Routines ({generatedPlan.routines.length})
                  </h3>
                  <button
                    type="button"
                    onClick={handleApplyPlan}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-md hover:bg-teal-100 transition-colors whitespace-nowrap shrink-0"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Apply to Today&apos;s Routine
                  </button>
                </div>

                {planAppliedNotice && (
                  <p className="mb-2.5 text-xs font-medium text-teal-800">
                    Applied to Today&apos;s Air &amp; Routine schedule.
                  </p>
                )}

                <ul className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
                  {generatedPlan.routines.map((r, idx) => (
                    <li key={idx} className="p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-900">{r.title}</span>
                        <span className="font-mono tabular-nums text-slate-500 shrink-0">
                          {r.timeWindow}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{r.action}</p>
                      <p className="text-teal-800 leading-relaxed">
                        <strong>Impact:</strong> {r.directImpact}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-slate-900 mb-2">
                  Top Indoor Priorities
                </h3>
                <ul className="space-y-2 text-xs text-slate-700">
                  {generatedPlan.indoorPriorityHacks.map((h, i) => (
                    <li key={i} className="leading-relaxed">
                      <strong className="text-slate-900">{h.title}</strong> ({h.room}) —{' '}
                      {h.whyItMatters}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-3 border-t border-slate-200">
                <h3 className="text-xs font-semibold text-slate-900">
                  Neighborhood Action This Week
                </h3>
                <p className="mt-1 text-xs font-medium text-slate-800">
                  {generatedPlan.communityAction.title}
                </p>
                <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                  {generatedPlan.communityAction.action}
                </p>
                <p className="mt-1 text-xs text-teal-800 leading-relaxed">
                  <strong>Collective impact:</strong> {generatedPlan.communityAction.collectiveImpact}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
