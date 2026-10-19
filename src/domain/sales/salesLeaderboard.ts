/** Monthly ranking of agents by sales (ties: more Discovery calls, then more LVM calls). */
import type { Lead, Sale, User } from '@/domain/types';
import { localDateStr } from '@/shared/lib/dates';

export interface AgentRank {
  agent: User;
  sales: number;
  discovery: number;   // used only to break ties
  lvm: number;         // used only to break ties
}

/** Discovery / LVM calls an agent logged during the month (local calendar month, YYYY-MM). */
export function monthlyCallCounts(leads: Lead[], agentId: string, month: string) {
  let discovery = 0;
  let lvm = 0;
  for (const lead of leads) {
    for (const cl of lead.callLogs) {
      if ((cl.agentId ?? lead.agentId) !== agentId) continue;
      if (localDateStr(new Date(cl.timestamp)).slice(0, 7) !== month) continue;
      if (cl.type === 'discovery') discovery++;
      else if (cl.type === 'lvm') lvm++;
    }
  }
  return { discovery, lvm };
}

/** Top agents of the month. Agents with no sales are left out. */
export function topAgentsOfMonth(agents: User[], sales: Sale[], leads: Lead[], month: string, limit = 5): AgentRank[] {
  const monthSales = sales.filter(s => s.date.startsWith(month));
  return agents
    .map(agent => ({
      agent,
      sales: monthSales.filter(s => s.agentId === agent.id).length,
      ...monthlyCallCounts(leads, agent.id, month),
    }))
    .filter(r => r.sales > 0)
    .sort((a, b) =>
      b.sales - a.sales
      || b.discovery - a.discovery
      || b.lvm - a.lvm
      || a.agent.name.localeCompare(b.agent.name))
    .slice(0, limit);
}
