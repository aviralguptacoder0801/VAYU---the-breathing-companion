import { Wind, ShieldCheck, Repeat, MessageSquare, SlidersHorizontal, X } from 'lucide-react';
import type { HouseholdProfile, ImpactSummary } from '../types';

export type WorkspaceTab = 'routine' | 'indoor' | 'swaps' | 'assistant';

interface SidebarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  profile: HouseholdProfile;
  impact: ImpactSummary;
  onOpenProfile: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: WorkspaceTab;
  label: string;
  description: string;
  icon: typeof Wind;
}> = [
  {
    id: 'routine',
    label: "Today's Air & Routine",
    description: 'Live smog & daily schedule',
    icon: Wind,
  },
  {
    id: 'indoor',
    label: 'Indoor Air Hacks',
    description: 'Filtration, CADR & sealing',
    icon: ShieldCheck,
  },
  {
    id: 'swaps',
    label: 'Sustainable Swaps',
    description: 'Low-emission alternatives',
    icon: Repeat,
  },
  {
    id: 'assistant',
    label: 'Clean-Air Assistant',
    description: 'AI guidance & action plans',
    icon: MessageSquare,
  },
];

const COMMUTE_LABELS: Record<HouseholdProfile['commuteMode'], string> = {
  petrol_car: 'Petrol car',
  diesel_car: 'Diesel car',
  two_wheeler: 'Two-wheeler',
  public_transit: 'Public transit',
  walking_cycling: 'Walking / cycling',
  remote: 'Work from home',
};

export function Sidebar({
  activeTab,
  onSelectTab,
  profile,
  impact,
  onOpenProfile,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const handleNav = (tab: WorkspaceTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  const navContent = (
    <div className="flex h-full flex-col bg-white border-r border-slate-200">
      <div className="flex items-center justify-between px-6 h-16 border-b border-slate-200">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            handleNav('routine');
          }}
          className="font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          Vayu
        </a>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden p-2 -mr-2 text-slate-500 hover:text-slate-900 rounded-md"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      <nav aria-label="Workspace navigation" className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNav(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                isActive
                  ? 'bg-teal-50/90 text-teal-950'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon
                className={`w-4 h-4 mt-0.5 shrink-0 ${
                  isActive ? 'text-teal-700' : 'text-slate-400'
                }`}
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span
                  className={`block text-sm font-medium leading-snug whitespace-nowrap truncate ${
                    isActive ? 'text-teal-950 font-semibold' : 'text-slate-800'
                  }`}
                >
                  {item.label}
                </span>
                <span className="block text-xs text-slate-500 truncate mt-0.5">
                  {item.description}
                </span>
              </span>
            </button>
          );
        })}

        <div className="pt-6 mt-6 border-t border-slate-200 px-3">
          <p className="text-xs font-medium text-slate-500">Your daily protection</p>
          <div className="mt-2.5 space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-slate-600">Exposure cut</span>
              <span className="font-mono tabular-nums text-sm font-semibold text-teal-800">
                −{impact.dailyExposureReductionPct}%
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-slate-600">PM2.5 avoided</span>
              <span className="font-mono tabular-nums text-sm font-semibold text-slate-900">
                {impact.monthlyPm25EmissionsPreventedGrams} g/mo
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-slate-600">CO₂e prevented</span>
              <span className="font-mono tabular-nums text-sm font-semibold text-slate-900">
                {impact.monthlyCo2SavedKg} kg/mo
              </span>
            </div>
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-slate-200 bg-slate-50/70">
        <div className="text-xs text-slate-500">Household profile</div>
        <div className="mt-1 text-sm font-semibold text-slate-900 truncate">
          {profile.city}
          {profile.country ? `, ${profile.country}` : ''}
        </div>
        <div className="mt-0.5 text-xs text-slate-600 truncate">
          {profile.householdSize} {profile.householdSize === 1 ? 'person' : 'people'} ·{' '}
          {COMMUTE_LABELS[profile.commuteMode]}
        </div>
        <button
          type="button"
          onClick={() => {
            onCloseMobile();
            onOpenProfile();
          }}
          className="mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors whitespace-nowrap shrink-0"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
          Edit Household Profile
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0">{navContent}</aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/35"
            aria-hidden="true"
            onClick={onCloseMobile}
          />
          <aside className="relative z-10 w-72 max-w-[85vw] h-full">{navContent}</aside>
        </div>
      )}
    </>
  );
}
