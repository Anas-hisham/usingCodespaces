
// ---------------------------------------------------------------------------
// small building blocks
// ---------------------------------------------------------------------------
export function TargetProgressBar({ count, target }: { count: number; target: number }) {
  const pct = target > 0 ? Math.min((count / target) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
          style={{ width: `${Math.max(pct, count > 0 ? 2 : 0)}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-slate-700 shrink-0 w-24 text-right">
        {count}/{target} ({Math.round(pct)}%)
      </span>
    </div>
  );
}
