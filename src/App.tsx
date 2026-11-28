import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Sidebar, type WorkspaceTab } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { RoutineView } from './components/RoutineView';
import { IndoorHacksView } from './components/IndoorHacksView';
import { SwapsView } from './components/SwapsView';
import { AssistantView } from './components/AssistantView';
import { ProfileModal } from './components/ProfileModal';
import {
  CITY_PRESETS,
  DEFAULT_PROFILE,
  INDOOR_HACKS,
  SUSTAINABLE_SWAPS,
} from './data/presets';
import { useLocalStorage } from './hooks/useLocalStorage';
import { buildTailoredRoutine, calculateImpactSummary } from './utils/airQuality';
import {
  sanitizePositiveInteger,
  sanitizeStoredProfile,
  sanitizeStoredRoutines,
  sanitizeStringArray,
} from './utils/storage';
import type {
  AiGeneratedPlan,
  AirQualityData,
  HouseholdProfile,
  RoutineItem,
} from './types';

const STORAGE_KEYS = {
  profile: 'vayu_profile_v1',
  completedRoutines: 'vayu_completed_routines_v1',
  appliedHacks: 'vayu_applied_hacks_v1',
  adoptedSwaps: 'vayu_adopted_swaps_v1',
  customRoutines: 'vayu_custom_routines_v1',
  communityHouseholds: 'vayu_community_households_v1',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('routine');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const [profile, setProfile] = useLocalStorage<HouseholdProfile>(
    STORAGE_KEYS.profile,
    DEFAULT_PROFILE,
    (parsed) => sanitizeStoredProfile(parsed)
  );
  const [completedRoutineIds, setCompletedRoutineIds] = useLocalStorage<string[]>(
    STORAGE_KEYS.completedRoutines,
    ['r-night-sanctuary'],
    sanitizeStringArray
  );
  const [appliedHackIds, setAppliedHackIds] = useLocalStorage<string[]>(
    STORAGE_KEYS.appliedHacks,
    ['hack-back-burner'],
    sanitizeStringArray
  );
  const [adoptedSwapIds, setAdoptedSwapIds] = useLocalStorage<string[]>(
    STORAGE_KEYS.adoptedSwaps,
    ['swap-school-carpool'],
    sanitizeStringArray
  );
  const [customRoutines, setCustomRoutines] = useLocalStorage<RoutineItem[]>(
    STORAGE_KEYS.customRoutines,
    [],
    (parsed) => sanitizeStoredRoutines(parsed)
  );
  const [communityHouseholds, setCommunityHouseholds] = useLocalStorage<number>(
    STORAGE_KEYS.communityHouseholds,
    25,
    (parsed, fallback) => sanitizePositiveInteger(parsed, fallback, 1, 300)
  );

  const [airQuality, setAirQuality] = useState<AirQualityData>(() => {
    const match = CITY_PRESETS.find(
      (p) => p.city.toLowerCase() === profile.city.toLowerCase()
    );
    return match ? match.fallbackAir : CITY_PRESETS[0].fallbackAir;
  });
  const [loadingAir, setLoadingAir] = useState(false);
  const [airError, setAirError] = useState<string | null>(null);
  const [aiRoutineOverrides, setAiRoutineOverrides] = useState<RoutineItem[] | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<AiGeneratedPlan | null>(null);
  const [autoGenerateSignal, setAutoGenerateSignal] = useState(0);

  const abortRef = useRef<AbortController | null>(null);

  const fetchCityAirQuality = useCallback(
    async (cityName: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoadingAir(true);
      setAirError(null);
      try {
        const res = await fetch(
          `/api/air-quality?city=${encodeURIComponent(cityName)}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `Could not fetch air quality for ${cityName}.`);
        }
        if (controller.signal.aborted) return;

        setAirQuality(data as AirQualityData);
        setProfile((prev) => ({
          ...prev,
          city: data.city,
          country: data.country || prev.country,
          latitude: data.latitude,
          longitude: data.longitude,
        }));
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        const preset = CITY_PRESETS.find(
          (p) => p.city.toLowerCase() === cityName.toLowerCase()
        );
        if (preset) {
          setAirQuality(preset.fallbackAir);
          setProfile((prev) => ({
            ...prev,
            city: preset.city,
            country: preset.country,
          }));
        } else {
          setAirError(
            err instanceof Error
              ? err.message
              : `Could not fetch air quality for ${cityName}.`
          );
        }
      } finally {
        if (abortRef.current === controller) {
          setLoadingAir(false);
        }
      }
    },
    [setProfile]
  );

  useEffect(() => {
    fetchCityAirQuality(profile.city);
    return () => {
      abortRef.current?.abort();
    };
    // Run once on initial mount for the persisted city
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const routines = useMemo(() => {
    const base = aiRoutineOverrides ?? buildTailoredRoutine(profile, airQuality);
    return [...base, ...customRoutines];
  }, [aiRoutineOverrides, profile, airQuality, customRoutines]);

  const impact = useMemo(() => {
    const completedRoutines = routines.filter((r) => completedRoutineIds.includes(r.id));
    const appliedHacks = INDOOR_HACKS.filter((h) => appliedHackIds.includes(h.id));
    const adoptedSwaps = SUSTAINABLE_SWAPS.filter((s) => adoptedSwapIds.includes(s.id));
    return calculateImpactSummary(
      completedRoutines,
      adoptedSwaps,
      appliedHacks,
      communityHouseholds
    );
  }, [routines, completedRoutineIds, appliedHackIds, adoptedSwapIds, communityHouseholds]);

  const handleToggleRoutine = useCallback(
    (id: string) => {
      setCompletedRoutineIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    },
    [setCompletedRoutineIds]
  );

  const handleDeleteCustomRoutine = useCallback(
    (id: string) => {
      setCustomRoutines((prev) => prev.filter((item) => item.id !== id));
      setCompletedRoutineIds((prev) => prev.filter((x) => x !== id));
    },
    [setCustomRoutines, setCompletedRoutineIds]
  );

  const handleToggleHack = useCallback(
    (id: string) => {
      setAppliedHackIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    },
    [setAppliedHackIds]
  );

  const handleToggleSwap = useCallback(
    (id: string) => {
      setAdoptedSwapIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    },
    [setAdoptedSwapIds]
  );

  const handleSaveProfile = (updated: HouseholdProfile) => {
    const cityChanged = updated.city.toLowerCase() !== profile.city.toLowerCase();
    setProfile(updated);
    setAiRoutineOverrides(null);
    if (cityChanged) {
      setGeneratedPlan(null);
      fetchCityAirQuality(updated.city);
    }
  };

  const handleSelectCity = (cityName: string) => {
    setAiRoutineOverrides(null);
    setGeneratedPlan(null);
    fetchCityAirQuality(cityName);
  };

  const handleTriggerAiPlan = () => {
    setActiveTab('assistant');
    setAutoGenerateSignal((s) => s + 1);
  };

  const handleApplyAiRoutines = (items: RoutineItem[]) => {
    setAiRoutineOverrides(items);
    setActiveTab('routine');
  };

  return (
    <div id="top" className="min-h-screen flex bg-slate-50 text-slate-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:text-xs focus:font-semibold focus:text-white focus:bg-teal-800 focus:rounded-lg focus:shadow-md"
      >
        Skip to main content
      </a>

      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        profile={profile}
        impact={impact}
        onOpenProfile={() => setProfileModalOpen(true)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          activeTab={activeTab}
          city={airQuality.city}
          mobileMenuOpen={mobileMenuOpen}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenProfile={() => setProfileModalOpen(true)}
          onTriggerAiPlan={handleTriggerAiPlan}
        />

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-7 focus:outline-none"
        >
          {activeTab === 'routine' && (
            <RoutineView
              profile={profile}
              airQuality={airQuality}
              loadingAir={loadingAir}
              airError={airError}
              routines={routines}
              completedIds={completedRoutineIds}
              hasAiOverrides={aiRoutineOverrides !== null}
              impact={impact}
              onToggleRoutine={handleToggleRoutine}
              onAddCustomRoutine={(item) => setCustomRoutines((prev) => [...prev, item])}
              onDeleteCustomRoutine={handleDeleteCustomRoutine}
              onResetAiRoutines={() => setAiRoutineOverrides(null)}
              onSelectCity={handleSelectCity}
              onRefreshAir={() => fetchCityAirQuality(airQuality.city)}
              onGoToAssistantPlan={handleTriggerAiPlan}
            />
          )}

          {activeTab === 'indoor' && (
            <IndoorHacksView
              airQuality={airQuality}
              appliedHackIds={appliedHackIds}
              onToggleHack={handleToggleHack}
            />
          )}

          {activeTab === 'swaps' && (
            <SwapsView
              profile={profile}
              adoptedSwapIds={adoptedSwapIds}
              communityHouseholds={communityHouseholds}
              impact={impact}
              onToggleSwap={handleToggleSwap}
              onChangeCommunityHouseholds={setCommunityHouseholds}
            />
          )}

          {activeTab === 'assistant' && (
            <AssistantView
              profile={profile}
              airQuality={airQuality}
              generatedPlan={generatedPlan}
              onPlanGenerated={setGeneratedPlan}
              onApplyPlanToRoutine={handleApplyAiRoutines}
              autoGenerateSignal={autoGenerateSignal}
            />
          )}
        </main>

        <footer className="border-t border-slate-200 bg-white px-4 sm:px-6 lg:px-8 py-4 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
          <span>Vayu · Family &amp; Community Winter Clean-Air Assistant</span>
          <span>
            Guidance is informational; consult a healthcare professional for acute respiratory symptoms.
          </span>
        </footer>
      </div>

      <ProfileModal
        open={profileModalOpen}
        profile={profile}
        onClose={() => setProfileModalOpen(false)}
        onSave={handleSaveProfile}
      />
    </div>
  );
}
