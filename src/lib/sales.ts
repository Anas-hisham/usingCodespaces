import type { Sale, SaleType, Team } from '@/types';

/** Monthly sales target for ONE agent. Team Leader = agents x this. Operation Manager = sum of their teams. */
export const AGENT_SALES_TARGET = 28;

export const teamSalesTarget = (team: Pick<Team, 'agentIds'>) => team.agentIds.length * AGENT_SALES_TARGET;

export const SALE_TYPES: { value: SaleType; label: string; chip: string }[] = [
  { value: 'BP', label: 'BP', chip: 'bg-green-100 text-green-700' },
  { value: 'PPI', label: 'PPI', chip: 'bg-purple-100 text-purple-700' },
  { value: 'MUA', label: 'MUA', chip: 'bg-blue-100 text-blue-700' },
  { value: 'ATEP', label: 'ATEP', chip: 'bg-amber-100 text-amber-700' },
  { value: 'Activation', label: 'Activation', chip: 'bg-teal-100 text-teal-700' },
  { value: 'Retention', label: 'Retention', chip: 'bg-rose-100 text-rose-700' },
  { value: 'Transition', label: 'Transition', chip: 'bg-indigo-100 text-indigo-700' },
];
export const saleTypeConfig = (t: SaleType) => SALE_TYPES.find(x => x.value === t) ?? SALE_TYPES[0];

export function countByType(sales: Sale[]): Record<SaleType, number> {
  const out = Object.fromEntries(SALE_TYPES.map(t => [t.value, 0])) as Record<SaleType, number>;
  for (const s of sales) if (s.saleType in out) out[s.saleType]++;
  return out;
}

/** Old saved sales used 'new' / 'upsell' / 'renewal' and had a "product" text: convert them to the current shape. */
export function migrateSale(x: Sale & { product?: string }): Sale {
  const legacy: Record<string, SaleType> = { new: 'Activation', upsell: 'Activation', renewal: 'Retention' };
  const valid = SALE_TYPES.some(t => t.value === x.saleType);
  const { product: _product, ...rest } = x;
  return { ...rest, saleType: valid ? x.saleType : (legacy[x.saleType as string] ?? 'Activation') };
}

const pad = (n: number) => String(n).padStart(2, '0');
/** Local calendar date as YYYY-MM-DD (not UTC, so the sale lands on the day the user sees). */
export const localDateStr = (d: Date = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const currentMonthKey = () => localDateStr().slice(0, 7);

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
