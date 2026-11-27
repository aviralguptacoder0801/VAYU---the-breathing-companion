import { CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import type { ActivityGuidanceItem } from '../utils/airQuality';

interface ActivityGuideStripProps {
  items: ActivityGuidanceItem[];
  city: string;
}

function getStatusMeta(status: ActivityGuidanceItem['status']) {
  if (status === 'safe') {
    return {
      icon: CheckCircle2,
      textClass: 'text-emerald-700',
    };
  }
  if (status === 'caution') {
    return {
      icon: AlertTriangle,
      textClass: 'text-amber-800',
    };
  }
  return {
    icon: ShieldAlert,
    textClass: 'text-red-700',
  };
}

export function ActivityGuideStrip({ items, city }: ActivityGuideStripProps) {
  return (
    <section
      aria-label="At-a-glance family activity guide"
      data-testid="activity-guide"
      className="bg-white border border-slate-200 rounded-xl"
    >
      <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">
          What Your Family Should Do Right Now
        </h2>
        <span className="text-xs text-slate-500">
          Plain-language guidance based on {city}&apos;s live air and your household profile
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        {items.map((item) => {
          const meta = getStatusMeta(item.status);
          const StatusIcon = meta.icon;

          return (
            <div key={item.id} className="p-4 sm:p-5">
              <div className="text-xs text-slate-500">{item.activity}</div>
              <div className={`mt-1.5 flex items-center gap-1.5 text-sm font-semibold ${meta.textClass}`}>
                <StatusIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{item.verdict}</span>
              </div>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">{item.detail}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
