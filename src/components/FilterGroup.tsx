interface FilterOption<T extends string> {
  id: T;
  label: string;
}

interface FilterGroupProps<T extends string> {
  label: string;
  options: Array<FilterOption<T>>;
  value: T;
  onChange: (next: T) => void;
  compact?: boolean;
}

export function FilterGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  compact = false,
}: FilterGroupProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex flex-wrap items-center p-1 bg-slate-100 rounded-lg"
    >
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.id)}
            className={`${
              compact ? 'px-2.5 py-1' : 'px-3 py-1.5'
            } text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              active
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
