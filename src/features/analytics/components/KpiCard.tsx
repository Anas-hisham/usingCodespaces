import { CARD_CLASS } from '@/features/analytics/analyticsStyles';

export function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className={CARD_CLASS}>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-600 mt-0.5">{label}</div>
      {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
    </div>
  );
}
