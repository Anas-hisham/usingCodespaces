import type { Sale, SaleType, Team } from '@/types';

/** Monthly sales target for ONE agent. Team Leader = agents x this. Operation Manager = sum of their teams. */
export const AGENT_SALES_TARGET = 28;

export const teamSalesTarget = (team: Pick<Team, 'agentIds'>) => team.agentIds.length * AGENT_SALES_TARGET;

export const SALE_TYPES: { value: SaleType; label: string; chip: string }[] = [
  { value: 'new', label: 'New customer', chip: 'bg-green-100 text-green-700' },
  { value: 'upsell', label: 'Upsell', chip: 'bg-purple-100 text-purple-700' },
  { value: 'renewal', label: 'Renewal', chip: 'bg-blue-100 text-blue-700' },
];
export const saleTypeConfig = (t: SaleType) => SALE_TYPES.find(x => x.value === t) ?? SALE_TYPES[0];

export function countByType(sales: Sale[]): Record<SaleType, number> {
  const out: Record<SaleType, number> = { new: 0, upsell: 0, renewal: 0 };
  for (const s of sales) out[s.saleType]++;
  return out;
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
