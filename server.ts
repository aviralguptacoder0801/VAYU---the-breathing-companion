import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { CITY_PRESETS } from './src/data/presets.ts';
import type { AirQualityData, HouseholdProfile } from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '1mb' }));

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please check your API key in the Settings > Secrets panel.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function deriveInversionRisk(
  usAqi: number,
  windSpeedKmh: number,
  temperatureC: number
): 'Low' | 'Moderate' | 'High' | 'Severe' {
  if (usAqi >= 200 || (usAqi >= 150 && windSpeedKmh <= 6)) return 'Severe';
  if (usAqi >= 120 || (windSpeedKmh <= 8 && temperatureC <= 10)) return 'High';
  if (usAqi >= 75) return 'Moderate';
  return 'Low';
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 4500): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Upstream HTTP ${res.status}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

app.get('/api/air-quality', async (req: Request, res: Response) => {
  const cityQuery = String(req.query.city ?? 'New Delhi').trim();
  if (!cityQuery || cityQuery.length > 80) {
    res.status(400).json({ error: 'Please provide a valid city name (1–80 characters).' });
    return;
  }

  const matchedPreset = CITY_PRESETS.find(
    (p) => p.city.toLowerCase() === cityQuery.toLowerCase()
  );

  try {
    let latitude = matchedPreset?.latitude;
    let longitude = matchedPreset?.longitude;
    let resolvedCity = matchedPreset?.city ?? cityQuery;
    let resolvedCountry = matchedPreset?.country ?? '';

    if (latitude === undefined || longitude === undefined) {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        cityQuery
      )}&count=1&language=en&format=json`;
      const geoData = (await fetchJsonWithTimeout(geoUrl)) as {
        results?: Array<{
          name: string;
          country?: string;
          latitude: number;
          longitude: number;
        }>;
      };
      const first = geoData.results?.[0];
      if (!first) {
        res.status(404).json({
          error: `Could not locate "${cityQuery}". Try a major city name such as New Delhi, Lahore, Salt Lake City, Krakow, or Milan.`,
        });
        return;
      }
      latitude = first.latitude;
      longitude = first.longitude;
      resolvedCity = first.name;
      resolvedCountry = first.country ?? '';
    }

    const aqUrl =
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}` +
      `&current=us_aqi,pm2_5,pm10,nitrogen_dioxide&hourly=pm2_5,us_aqi&forecast_days=1&timezone=auto`;
    const weatherUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=auto`;

    const [aqRaw, weatherRaw] = await Promise.all([
      fetchJsonWithTimeout(aqUrl),
      fetchJsonWithTimeout(weatherUrl),
    ]);

    const aq = aqRaw as {
      current?: {
        us_aqi?: number;
        pm2_5?: number;
        pm10?: number;
        nitrogen_dioxide?: number;
      };
      hourly?: {
        time?: string[];
        pm2_5?: number[];
        us_aqi?: number[];
      };
    };

    const weather = weatherRaw as {
      current?: {
        temperature_2m?: number;
        relative_humidity_2m?: number;
        wind_speed_10m?: number;
      };
    };

    const usAqi = Math.round(aq.current?.us_aqi ?? 85);
    const pm25 = Math.round((aq.current?.pm2_5 ?? 28) * 10) / 10;
    const pm10 = Math.round((aq.current?.pm10 ?? 45) * 10) / 10;
    const no2 = Math.round((aq.current?.nitrogen_dioxide ?? 22) * 10) / 10;
    const temperatureC = Math.round(weather.current?.temperature_2m ?? 8);
    const windSpeedKmh = Math.round(weather.current?.wind_speed_10m ?? 9);
    const humidityPct = Math.round(weather.current?.relative_humidity_2m ?? 65);

    const times = aq.hourly?.time ?? [];
    const hourlyPm25 = aq.hourly?.pm2_5 ?? [];
    const hourlyAqi = aq.hourly?.us_aqi ?? [];

    const hourly = times.slice(0, 24).map((iso, idx) => {
      const hourPart = iso.split('T')[1]?.slice(0, 5) ?? `${String(idx).padStart(2, '0')}:00`;
      return {
        hourLabel: hourPart,
        hourIndex: idx,
        pm25: Math.round((hourlyPm25[idx] ?? pm25) * 10) / 10,
        usAqi: Math.round(hourlyAqi[idx] ?? usAqi),
      };
    });

    const payload: AirQualityData = {
      city: resolvedCity,
      country: resolvedCountry,
      latitude,
      longitude,
      usAqi,
      pm25,
      pm10,
      no2,
      temperatureC,
      windSpeedKmh,
      humidityPct,
      inversionRisk: deriveInversionRisk(usAqi, windSpeedKmh, temperatureC),
      updatedAt: new Date().toISOString(),
      source: 'live',
      hourly,
    };

    res.json(payload);
  } catch {
    if (matchedPreset) {
      res.json({
        ...matchedPreset.fallbackAir,
        updatedAt: new Date().toISOString(),
      });
      return;
    }
    res.status(503).json({
      error: `Live air-quality telemetry for "${cityQuery}" is temporarily unavailable. Select a featured winter-smog city or retry shortly.`,
    });
  }
});

function formatGeminiError(err: unknown): { status: number; message: string } {
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
  // Extract nested JSON message if SDK wrapped an API JSON error string
  try {
    const start = raw.indexOf('{');
    if (start !== -1) {
      const parsed = JSON.parse(raw.slice(start)) as { error?: { message?: string } };
      if (parsed?.error?.message) {
        return { status: 502, message: parsed.error.message };
      }
    }
  } catch {
    // ignore parse failure
  }
  return { status: 502, message: raw };
}

async function generateWithRetry(
  ai: GoogleGenAI,
  params: {
    contents: string;
    systemInstruction: string;
    responseMimeType?: string;
    responseSchema?: unknown;
  }
) {
  const models: Array<{ name: string; useThinking: boolean }> = [
    { name: 'gemini-4-hydrogen', useThinking: true },
    { name: 'gemini-4-hydrogen', useThinking: true },
    { name: 'gemini-3.1-flash-lite', useThinking: false },
  ];

  let lastError: unknown;
  for (let i = 0; i < models.length; i++) {
    const attempt = models[i];
    try {
      const config: Record<string, unknown> = {
        systemInstruction: params.systemInstruction,
      };
      if (attempt.useThinking) {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
      }
      if (params.responseMimeType) {
        config.responseMimeType = params.responseMimeType;
      }
      if (params.responseSchema) {
        config.responseSchema = params.responseSchema;
      }

      return await ai.models.generateContent({
        model: attempt.name,
        contents: params.contents,
        config,
      });
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : '';
      const isTransient =
        msg.includes('503') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('high demand') ||
        msg.includes('429');
      if (!isTransient || i === models.length - 1) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 900 * (i + 1)));
    }
  }
  throw lastError;
}

app.post('/api/assistant/chat', async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
      profile?: HouseholdProfile;
      airQuality?: AirQualityData;
    };

    const messages = body.messages ?? [];
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content?.trim();

    if (!lastUserMessage) {
      res.status(400).json({ error: 'Please enter a question for the Clean-Air Assistant.' });
      return;
    }

    const ai = getGeminiClient();
    const profile = body.profile;
    const aq = body.airQuality;

    const systemInstruction = `You are Vayu, a calm, scientifically accurate, empathetic civic clean-air assistant helping families and communities navigate severe winter smog and urban air pollution.

Current household & local context:
- City: ${aq?.city ?? profile?.city ?? 'Unknown'} (${aq?.country ?? profile?.country ?? ''})
- Current Air Quality: US AQI ${aq?.usAqi ?? 'N/A'}, PM2.5 ${aq?.pm25 ?? 'N/A'} µg/m³, PM10 ${aq?.pm10 ?? 'N/A'} µg/m³, NO₂ ${aq?.no2 ?? 'N/A'} µg/m³, Wind ${aq?.windSpeedKmh ?? 'N/A'} km/h, Temp ${aq?.temperatureC ?? 'N/A'}°C, Inversion Risk: ${aq?.inversionRisk ?? 'Unknown'}
- Household size: ${profile?.householdSize ?? 3}
- Sensitivities: ${profile?.sensitivities?.join(', ') || 'None specified'}
- Primary commute: ${profile?.commuteMode ?? 'Not specified'}
- Home heating: ${profile?.heatingSource ?? 'Not specified'}
- Cooking fuel: ${profile?.cookingFuel ?? 'Not specified'}
- Home type: ${profile?.homeType ?? 'Not specified'}

Guidelines:
1. Give practical, low-emission daily routines, affordable indoor air quality hacks, and realistic sustainable alternatives tailored specifically to their city and household setup.
2. Always include a brief "Direct Impact" explanation quantifying or clearly explaining how each recommendation reduces personal PM2.5 inhalation or neighborhood emissions.
3. Keep responses well-structured, concise (140–240 words), warm, and actionable—use short headings or bullet points, never fear-monger, and never give clinical diagnoses (remind users with severe asthma flare-ups to consult a physician).`;

    const historyText = messages
      .slice(-6)
      .map((m) => `${m.role === 'user' ? 'Family' : 'Vayu'}: ${m.content}`)
      .join('\n\n');

    const response = await generateWithRetry(ai, {
      contents: historyText,
      systemInstruction,
    });

    const reply = response.text?.trim();
    if (!reply) {
      res.status(502).json({ error: 'The assistant returned an empty response. Please try again.' });
      return;
    }

    res.json({ reply });
  } catch (err) {
    const formatted = formatGeminiError(err);
    res.status(formatted.status).json({ error: formatted.message });
  }
});

app.post('/api/assistant/plan', async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      profile?: HouseholdProfile;
      airQuality?: AirQualityData;
      focusNote?: string;
    };

    if (!body.profile || !body.airQuality) {
      res.status(400).json({ error: 'Household profile and air quality data are required.' });
      return;
    }

    const ai = getGeminiClient();
    const { profile, airQuality, focusNote } = body;

    const prompt = `Generate a deeply personalized winter smog & clean-air action plan for this household:
- Location: ${airQuality.city}, ${airQuality.country}
- Live Air Telemetry: US AQI ${airQuality.usAqi}, PM2.5 ${airQuality.pm25} µg/m³, NO₂ ${airQuality.no2} µg/m³, Wind ${airQuality.windSpeedKmh} km/h, Temp ${airQuality.temperatureC}°C, Inversion Risk: ${airQuality.inversionRisk}
- Household size: ${profile.householdSize}
- Vulnerable / Sensitive groups: ${profile.sensitivities.join(', ') || 'General family'}
- Primary commute: ${profile.commuteMode}
- Heating source: ${profile.heatingSource}
- Cooking fuel: ${profile.cookingFuel}
- Home type: ${profile.homeType}
${focusNote ? `- Special household note: ${focusNote}` : ''}

Produce:
1. A 2-sentence executive summary and clear smog risk explanation specific to ${airQuality.city}.
2. Exactly 4 low-emission daily routine actions covering morning, midday, evening, and night, each with a crystal-clear directImpact explanation and realistic exposureReductionPct (5-35) and dailyCo2SavedKg (0.1-4.5).
3. Exactly 3 priority indoor air quality hacks suited to their home type and cooking fuel.
4. Exactly 3 sustainable lifestyle swaps suited to their commute/heating/cooking setup with clear before->after framing and directImpact.
5. One realistic community/neighborhood action they can initiate this week with collectiveImpact.`;

    const response = await generateWithRetry(ai, {
      contents: prompt,
      systemInstruction:
        'You are Vayu, an expert environmental health and low-emission urban living advisor. Return strictly valid JSON matching the requested schema. Ground all numbers in realistic environmental engineering estimates.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          smogRiskExplanation: { type: Type.STRING },
          routines: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                period: { type: Type.STRING },
                timeWindow: { type: Type.STRING },
                title: { type: Type.STRING },
                action: { type: Type.STRING },
                category: { type: Type.STRING },
                directImpact: { type: Type.STRING },
                exposureReductionPct: { type: Type.NUMBER },
                dailyCo2SavedKg: { type: Type.NUMBER },
              },
              required: [
                'period',
                'timeWindow',
                'title',
                'action',
                'category',
                'directImpact',
                'exposureReductionPct',
                'dailyCo2SavedKg',
              ],
            },
          },
          indoorPriorityHacks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                room: { type: Type.STRING },
                whyItMatters: { type: Type.STRING },
              },
              required: ['title', 'room', 'whyItMatters'],
            },
          },
          sustainableSwaps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                insteadOf: { type: Type.STRING },
                switchTo: { type: Type.STRING },
                directImpact: { type: Type.STRING },
              },
              required: ['title', 'insteadOf', 'switchTo', 'directImpact'],
            },
          },
          communityAction: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              action: { type: Type.STRING },
              collectiveImpact: { type: Type.STRING },
            },
            required: ['title', 'action', 'collectiveImpact'],
          },
        },
        required: [
          'summary',
          'smogRiskExplanation',
          'routines',
          'indoorPriorityHacks',
          'sustainableSwaps',
          'communityAction',
        ],
      },
    });

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      res.status(502).json({ error: 'Received an empty plan response from Gemini.' });
      return;
    }

    const parsed = JSON.parse(rawText);
    res.json({ plan: parsed });
  } catch (err) {
    const formatted = formatGeminiError(err);
    res.status(formatted.status).json({ error: formatted.message });
  }
});

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Vayu server listening on http://localhost:${PORT}`);
  });
}

startServer();
