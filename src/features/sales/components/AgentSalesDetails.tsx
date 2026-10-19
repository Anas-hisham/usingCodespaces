import { saleTypeConfig } from '@/domain/sales/saleTypes';
import type { Lead, Sale } from '@/domain/types';

/** An agent's sales for the month, grouped by lead (one lead can bring more than one sale). */
export function AgentSalesDetails({ sales, leads }: { sales: Sale[]; leads: Lead[] }) {
  if (sales.length === 0) return <p className="text-xs text-slate-500">No sales this month.</p>;

  const byLead = new Map<string, Sale[]>();
  for (const s of [...sales].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))) {
    byLead.set(s.leadId, [...(byLead.get(s.leadId) ?? []), s]);
  }

  return (
    <ul className="space-y-2">
      {[...byLead.entries()].map(([leadId, leadSales]) => {
        const lead = leads.find(l => l.id === leadId);
        return (
          <li key={leadId} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-900 truncate">{lead?.companyName ?? leadSales[0].leadName}</div>
                {lead && <div className="text-xs text-slate-600">{lead.leadCode} · {lead.campaignCode}</div>}
              </div>
              {leadSales.length > 1 && (
                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700 shrink-0">
                  {leadSales.length} sales
                </span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
              {leadSales.map(s => (
                <span key={s.id} className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${saleTypeConfig(s.saleType).chip}`}>{saleTypeConfig(s.saleType).label}</span>
                  {new Date(`${s.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
