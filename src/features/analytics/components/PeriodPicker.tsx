import type { DateRange, PeriodPreset } from '@/domain/analytics/dateRange';

const PRESETS: [PeriodPreset, string][] = [['today', 'Today'], ['week', 'This week'], ['month', 'This month'], ['custom', 'Custom']];

/** Today / This week / This month / Custom from-to. */
export function PeriodPicker({ preset, custom, onPreset, onCustom }: {
  preset: PeriodPreset; custom: DateRange; onPreset: (p: PeriodPreset) => void; onCustom: (r: DateRange) => void;
}) {
  const dateInput = 'px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5" role="group" aria-label="Period">
        {PRESETS.map(([id, label]) => (
          <button
            key={id} onClick={() => onPreset(id)} aria-pressed={preset === id}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${preset === id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {preset === 'custom' && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <input type="date" value={custom.from} max={custom.to || undefined} onChange={e => onCustom({ ...custom, from: e.target.value })} className={dateInput} aria-label="From" />
          <span>to</span>
          <input type="date" value={custom.to} min={custom.from || undefined} onChange={e => onCustom({ ...custom, to: e.target.value })} className={dateInput} aria-label="To" />
        </div>
      )}
    </div>
  );
}
