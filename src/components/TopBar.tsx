import { Menu, Sparkles, SlidersHorizontal } from 'lucide-react';
import type { WorkspaceTab } from './Sidebar';

interface TopBarProps {
  activeTab: WorkspaceTab;
  city: string;
  onOpenMobileMenu: () => void;
  onOpenProfile: () => void;
  onTriggerAiPlan: () => void;
}

const TAB_TITLES: Record<WorkspaceTab, string> = {
  routine: "Today's Air & Routine",
  indoor: 'Indoor Air Hacks',
  swaps: 'Sustainable Swaps',
  assistant: 'Clean-Air Assistant',
};

const MOBILE_TAB_TITLES: Record<WorkspaceTab, string> = {
  routine: 'Air & Routine',
  indoor: 'Indoor Hacks',
  swaps: 'Swaps',
  assistant: 'Assistant',
};

export function TopBar({
  activeTab,
  city,
  onOpenMobileMenu,
  onOpenProfile,
  onTriggerAiPlan,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md shrink-0"
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="lg:hidden font-display font-bold text-slate-900 whitespace-nowrap shrink-0">
            Vayu
          </span>
          <span className="lg:hidden text-slate-300" aria-hidden="true">
            /
          </span>
          <span className="hidden sm:inline text-slate-500 whitespace-nowrap shrink-0 truncate max-w-[160px]">
            {city}
          </span>
          <span className="hidden sm:inline text-slate-300" aria-hidden="true">
            /
          </span>
          <span className="sm:hidden font-medium text-slate-900 truncate whitespace-nowrap">
            {MOBILE_TAB_TITLES[activeTab]}
          </span>
          <span className="hidden sm:inline font-medium text-slate-900 truncate whitespace-nowrap">
            {TAB_TITLES[activeTab]}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={onOpenProfile}
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors whitespace-nowrap shrink-0"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
          Tailor Profile
        </button>
        <button
          type="button"
          onClick={onTriggerAiPlan}
          className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 text-xs font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="sm:hidden">AI Plan</span>
          <span className="hidden sm:inline">Generate AI Plan</span>
        </button>
      </div>
    </header>
  );
}
