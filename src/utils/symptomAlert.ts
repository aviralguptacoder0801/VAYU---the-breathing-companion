import type {
  HealthJournalEntry,
  SymptomAlertAssessment,
  SymptomAlertLevel,
} from '../types';

interface SymptomRule {
  label: string;
  patterns: RegExp[];
  severityWeight: 'urgent' | 'elevated' | 'routine';
}

const SYMPTOM_RULES: SymptomRule[] = [
  {
    label: 'Wheezing',
    patterns: [/\bwheez(e|ing|y)?\b/i, /\bwhistling breath\b/i],
    severityWeight: 'urgent',
  },
  {
    label: 'Shortness of breath',
    patterns: [
      /\bshort(ness)? of breath\b/i,
      /\bhard to breathe\b/i,
      /\bcan'?t catch (my|their|his|her) breath\b/i,
      /\bbreathless(ness)?\b/i,
      /\blabored breathing\b/i,
    ],
    severityWeight: 'urgent',
  },
  {
    label: 'Chest tightness',
    patterns: [/\bchest tight(ness)?\b/i, /\btight chest\b/i, /\bchest pain\b/i, /\bheavy chest\b/i],
    severityWeight: 'urgent',
  },
  {
    label: 'Asthma flare-up',
    patterns: [/\basthma\b/i, /\binhaler\b/i],
    severityWeight: 'urgent',
  },
  {
    label: 'Coughing',
    patterns: [/\bcough(ing|s|ed)?\b/i, /\bdry cough\b/i, /\bhacking\b/i],
    severityWeight: 'elevated',
  },
  {
    label: 'Sore or scratchy throat',
    patterns: [/\bsore throat\b/i, /\bscratchy throat\b/i, /\bthroat burn(ing)?\b/i, /\birritated throat\b/i],
    severityWeight: 'elevated',
  },
  {
    label: 'Eye irritation',
    patterns: [
      /\bitchy eyes?\b/i,
      /\bburning eyes?\b/i,
      /\bwatery eyes?\b/i,
      /\beye irritation\b/i,
      /\bstinging eyes?\b/i,
      /\bred eyes?\b/i,
    ],
    severityWeight: 'elevated',
  },
  {
    label: 'Headache or dizziness',
    patterns: [/\bheadache(s)?\b/i, /\bdizz(y|iness)\b/i, /\blightheaded\b/i],
    severityWeight: 'elevated',
  },
  {
    label: 'Nasal congestion',
    patterns: [/\brunny nose\b/i, /\bstuffy nose\b/i, /\bcongest(ed|ion)\b/i, /\bsneez(e|ing)\b/i, /\bsinus\b/i],
    severityWeight: 'routine',
  },
  {
    label: 'Fatigue',
    patterns: [/\bfatigue(d)?\b/i, /\bexhausted\b/i, /\btired\b/i],
    severityWeight: 'routine',
  },
];

export function validateSymptomTranscript(transcript: string): string | null {
  const cleaned = transcript.trim();
  if (cleaned.length < 3) {
    return 'Record or type a brief symptom note (at least 3 characters) before logging.';
  }
  return null;
}

export function analyzeSymptomTranscript(
  transcript: string,
  currentAqi: number,
  pm25: number
): SymptomAlertAssessment {
  const cleaned = transcript.trim();
  const matchedRules = SYMPTOM_RULES.filter((rule) =>
    rule.patterns.some((pattern) => pattern.test(cleaned))
  );

  const detectedSymptoms = matchedRules.map((r) => r.label);
  const hasUrgentSymptom = matchedRules.some((r) => r.severityWeight === 'urgent');
  const elevatedCount = matchedRules.filter((r) => r.severityWeight === 'elevated').length;

  let alertLevel: SymptomAlertLevel = 'routine';
  if (hasUrgentSymptom) {
    alertLevel = 'urgent';
  } else if (
    elevatedCount >= 2 ||
    (elevatedCount >= 1 && currentAqi >= 101) ||
    (detectedSymptoms.length >= 1 && currentAqi >= 151)
  ) {
    alertLevel = 'elevated';
  }

  const safeAqi = Math.max(0, Math.round(currentAqi));
  const safePm25 = Math.round(pm25 * 10) / 10;

  if (alertLevel === 'urgent') {
    return {
      detectedSymptoms,
      alertLevel,
      alertTitle: 'Urgent Respiratory Alert',
      immediateAction: `Move indoors immediately into a closed room with HEPA or MERV-13 filtration on high (current outdoor AQI ${safeAqi}, PM2.5 ${safePm25} µg/m³). Follow your prescribed asthma/respiratory action plan and contact a physician or urgent care if wheezing or breathing difficulty persists.`,
      medicalDisclaimer:
        'Automated smog-symptom triage is informational only—seek immediate medical care for severe shortness of breath.',
    };
  }

  if (alertLevel === 'elevated') {
    return {
      detectedSymptoms,
      alertLevel,
      alertTitle: 'Elevated Smog-Symptom Alert',
      immediateAction: `Outdoor air (AQI ${safeAqi}, PM2.5 ${safePm25} µg/m³) is likely aggravating airways. Close exterior windows, switch indoor purifiers to high, pause stove frying or candles, rinse eyes/nose with saline, and avoid outdoor exertion until the afternoon trough.`,
      medicalDisclaimer:
        'Informational clean-air guidance; consult a clinician if coughing or irritation worsens.',
    };
  }

  return {
    detectedSymptoms,
    alertLevel,
    alertTitle: 'Routine Symptom Log',
    immediateAction: `Logged alongside local AQI ${safeAqi} (PM2.5 ${safePm25} µg/m³). Keep bedroom filtration steady overnight, hydrate well, and monitor whether symptoms track morning or evening smog peaks.`,
    medicalDisclaimer:
      'Informational journal record; consult a healthcare professional for persistent symptoms.',
  };
}

export function createHealthJournalEntry(params: {
  transcript: string;
  memberLabel: string;
  inputMethod: 'voice' | 'text';
  city: string;
  usAqi: number;
  pm25: number;
  recordedAt?: string;
}): HealthJournalEntry {
  const assessment = analyzeSymptomTranscript(
    params.transcript,
    params.usAqi,
    params.pm25
  );

  return {
    id: `journal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    recordedAt: params.recordedAt ?? new Date().toISOString(),
    memberLabel: params.memberLabel.trim() || 'Self',
    transcript: params.transcript.trim(),
    inputMethod: params.inputMethod,
    city: params.city,
    usAqi: Math.round(params.usAqi),
    pm25: Math.round(params.pm25 * 10) / 10,
    detectedSymptoms: assessment.detectedSymptoms,
    alertLevel: assessment.alertLevel,
    alertTitle: assessment.alertTitle,
    immediateAction: assessment.immediateAction,
  };
}
