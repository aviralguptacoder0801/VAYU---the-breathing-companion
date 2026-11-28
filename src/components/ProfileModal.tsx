import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { CITY_PRESETS } from '../data/presets';
import { validateProfile } from '../utils/airQuality';
import type {
  CommuteMode,
  CookingFuel,
  HeatingSource,
  HomeType,
  HouseholdProfile,
  SensitivityGroup,
} from '../types';

interface ProfileModalProps {
  open: boolean;
  profile: HouseholdProfile;
  onClose: () => void;
  onSave: (updated: HouseholdProfile) => void;
}

const SENSITIVITY_OPTIONS: Array<{ id: SensitivityGroup; label: string }> = [
  { id: 'children_under_12', label: 'Children under 12' },
  { id: 'older_adults_65', label: 'Older adults (65+)' },
  { id: 'asthma_respiratory', label: 'Asthma or respiratory sensitivity' },
  { id: 'outdoor_commuter', label: 'Daily outdoor commuter / worker' },
];

export function ProfileModal({ open, profile, onClose, onSave }: ProfileModalProps) {
  const [draft, setDraft] = useState<HouseholdProfile>(profile);
  const [sizeInput, setSizeInput] = useState<string>(String(profile.householdSize));
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cityInputRef = useRef<HTMLInputElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    setDraft(profile);
    setSizeInput(String(profile.householdSize));
    setError(null);

    const frame = window.requestAnimationFrame(() => {
      cityInputRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open, profile, onClose]);

  if (!open) return null;

  const toggleSensitivity = (id: SensitivityGroup) => {
    setDraft((prev) => ({
      ...prev,
      sensitivities: prev.sensitivities.includes(id)
        ? prev.sensitivities.filter((s) => s !== id)
        : [...prev.sensitivities, id],
    }));
  };

  const handleSelectPresetCity = (cityName: string) => {
    const preset = CITY_PRESETS.find((c) => c.city === cityName);
    if (!preset) return;
    setDraft((prev) => ({
      ...prev,
      city: preset.city,
      country: preset.country,
      latitude: preset.latitude,
      longitude: preset.longitude,
    }));
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedSize = sizeInput.trim() === '' ? Number.NaN : Number(sizeInput);
    const candidate: HouseholdProfile = {
      ...draft,
      householdSize: parsedSize,
    };
    const validationError = validateProfile(candidate);
    if (validationError) {
      setError(validationError);
      return;
    }
    onSave({
      ...candidate,
      city: candidate.city.trim(),
      country: candidate.country.trim(),
      householdSize: Math.round(parsedSize),
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-xl bg-white border border-slate-200 rounded-xl shadow-lg max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 id="profile-modal-title" className="text-lg font-semibold text-slate-900">
              Tailor Your Household Profile
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Routines, indoor air hacks, sustainable swaps, and AI advice adapt directly to your home and city.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close household profile dialog"
            className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div
              id="profile-form-error"
              role="alert"
              className="p-3 text-xs font-medium text-red-800 bg-red-50 border border-red-200 rounded-lg"
            >
              {error}
            </div>
          )}

          <div>
            <label htmlFor="profile-city" className="block text-xs font-medium text-slate-700 mb-1.5">
              City or urban area
            </label>
            <input
              ref={cityInputRef}
              id="profile-city"
              type="text"
              value={draft.city}
              aria-invalid={Boolean(error && error.toLowerCase().includes('city'))}
              aria-describedby={error ? 'profile-form-error' : undefined}
              onChange={(e) => {
                setDraft((prev) => ({ ...prev, city: e.target.value, country: '' }));
                setError(null);
              }}
              placeholder="e.g., New Delhi, Salt Lake City, Krakow, Milan"
              className="w-full px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {CITY_PRESETS.map((preset) => (
                <button
                  key={preset.city}
                  type="button"
                  aria-pressed={draft.city.toLowerCase() === preset.city.toLowerCase()}
                  onClick={() => handleSelectPresetCity(preset.city)}
                  className={`px-2.5 py-1 text-xs rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                    draft.city.toLowerCase() === preset.city.toLowerCase()
                      ? 'bg-teal-50 border-teal-700 text-teal-900 font-medium'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {preset.city}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="profile-size" className="block text-xs font-medium text-slate-700 mb-1.5">
                Household members
              </label>
              <input
                id="profile-size"
                type="number"
                min={1}
                max={20}
                value={sizeInput}
                aria-invalid={Boolean(error && error.toLowerCase().includes('household'))}
                aria-describedby={error ? 'profile-form-error' : undefined}
                onChange={(e) => {
                  setSizeInput(e.target.value);
                  setError(null);
                }}
                className="w-full px-3.5 py-2 text-sm font-mono tabular-nums text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
            </div>

            <div>
              <label htmlFor="profile-home" className="block text-xs font-medium text-slate-700 mb-1.5">
                Home envelope
              </label>
              <select
                id="profile-home"
                value={draft.homeType}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, homeType: e.target.value as HomeType }))
                }
                className="w-full px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              >
                <option value="apartment_sealed">Modern / sealed apartment</option>
                <option value="older_drafty_home">Older / drafty apartment or house</option>
                <option value="independent_house">Independent house with yard</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="profile-commute" className="block text-xs font-medium text-slate-700 mb-1.5">
                Primary commute
              </label>
              <select
                id="profile-commute"
                value={draft.commuteMode}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, commuteMode: e.target.value as CommuteMode }))
                }
                className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              >
                <option value="petrol_car">Petrol car</option>
                <option value="diesel_car">Diesel car</option>
                <option value="two_wheeler">Two-wheeler / scooter</option>
                <option value="public_transit">Metro / bus / rail</option>
                <option value="walking_cycling">Walking / cycling</option>
                <option value="remote">Work from home</option>
              </select>
            </div>

            <div>
              <label htmlFor="profile-heating" className="block text-xs font-medium text-slate-700 mb-1.5">
                Winter heating
              </label>
              <select
                id="profile-heating"
                value={draft.heatingSource}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    heatingSource: e.target.value as HeatingSource,
                  }))
                }
                className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              >
                <option value="wood_biomass">Wood stove / biomass</option>
                <option value="gas_furnace">Gas furnace / boiler</option>
                <option value="electric_space_heater">Electric space heater</option>
                <option value="heat_pump">Heat pump / district heat</option>
                <option value="minimal_heating">Minimal heating</option>
              </select>
            </div>

            <div>
              <label htmlFor="profile-cooking" className="block text-xs font-medium text-slate-700 mb-1.5">
                Cooking setup
              </label>
              <select
                id="profile-cooking"
                value={draft.cookingFuel}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, cookingFuel: e.target.value as CookingFuel }))
                }
                className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              >
                <option value="gas_stove">Gas / LPG stove</option>
                <option value="biomass_chulha">Biomass / solid fuel</option>
                <option value="induction_electric">Induction / electric</option>
                <option value="mixed">Mixed gas &amp; electric</option>
              </select>
            </div>
          </div>

          <fieldset>
            <legend className="text-xs font-medium text-slate-700 mb-2">
              Household air-sensitivity priorities
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SENSITIVITY_OPTIONS.map((opt) => {
                const checked = draft.sensitivities.includes(opt.id);
                return (
                  <label
                    key={opt.id}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      checked
                        ? 'bg-teal-50/70 border-teal-700 text-teal-950 font-medium'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSensitivity(opt.id)}
                      className="rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                    />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 whitespace-nowrap shrink-0"
            >
              Save Household Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
