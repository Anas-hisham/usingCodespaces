/** The list of sale types and how to count them. */
import type { Sale, SaleType } from '@/domain/types';

export const SALE_TYPES: { value: SaleType; label: string; chip: string }[] = [
  { value: 'BP', label: 'BP', chip: 'bg-emerald-100 text-emerald-700' },
  { value: 'PPI', label: 'PPI', chip: 'bg-violet-100 text-violet-700' },
  { value: 'MUA', label: 'MUA', chip: 'bg-blue-100 text-blue-700' },
  { value: 'ATEP', label: 'ATEP', chip: 'bg-amber-100 text-amber-700' },
  { value: 'Activation', label: 'Activation', chip: 'bg-cyan-100 text-cyan-700' },
  { value: 'Retention', label: 'Retention', chip: 'bg-rose-100 text-rose-700' },
  { value: 'Transition', label: 'Transition', chip: 'bg-slate-100 text-slate-700' },
];

export const saleTypeConfig = (t: SaleType) => SALE_TYPES.find(x => x.value === t) ?? SALE_TYPES[0];

export function countByType(sales: Sale[]): Record<SaleType, number> {
  const out = Object.fromEntries(SALE_TYPES.map(t => [t.value, 0])) as Record<SaleType, number>;
  for (const s of sales) if (s.saleType in out) out[s.saleType]++;
  return out;
}
