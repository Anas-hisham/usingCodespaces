/** Turns the agent's leads into: campaign -> Today / Next / Stop -> touch point step -> category. */
import type { Lead, TouchPointType, Workflow } from '@/domain/types';
import { queueCategory } from '@/domain/workflow/callClassification';
import type { QueueCategory } from '@/domain/workflow/callClassification';
import { campaignLabel } from '@/domain/workflow/campaignLabel';
import { queueBucket } from '@/domain/workflow/leadQueue';
import { findCurrentTouchPoint } from '@/domain/workflow/touchPoints';
import { QUEUE_CATEGORY_ORDER } from '@/features/work-queue/queueStyles';

export interface TouchPointStepGroup {
  order: number;
  type: TouchPointType;
  label: string;
  byCategory: Record<QueueCategory, Lead[]>;
  total: number;
}

export interface CampaignQueue {
  code: string;
  name: string;            // "Activation" - what the agent sees instead of ACT-001
  today: TouchPointStepGroup[];
  next: TouchPointStepGroup[];
  todayCount: number;
  nextCount: number;
  stopped: Lead[];         // leads whose workflow the agent stopped
  finished: Lead[];        // leads that finished every touch point
  total: number;
}

const createEmptyLeadsByCategory = (): Record<QueueCategory, Lead[]> => ({ new: [], discovery: [], lvm: [], nvm: [] });

/**
 * Campaign -> Today / Next / Stop.
 *   Today = touch point is due today (or overdue)     Next = due tomorrow or later     Stop = stopped by the agent
 * Inside Today / Next the leads are grouped by touch point step (1: CALL, 2: EMAIL ...) and then by category.
 */
export function buildWorkQueue(leads: Lead[], workflows: Workflow[], now: number): CampaignQueue[] {
  const byCampaign = new Map<string, Lead[]>();
  for (const l of leads) {
    if (!byCampaign.has(l.campaignCode)) byCampaign.set(l.campaignCode, []);
    byCampaign.get(l.campaignCode)!.push(l);
  }

  return [...byCampaign.entries()].map(([code, campaignLeads]) => {
    const maps = { today: new Map<number, TouchPointStepGroup>(), next: new Map<number, TouchPointStepGroup>() };
    const stopped: Lead[] = [];
    const finished: Lead[] = [];
    let todayCount = 0, nextCount = 0;

    for (const lead of campaignLeads) {
      const bucket = queueBucket(lead, now);
      if (bucket === 'stop') { stopped.push(lead); continue; }
      if (bucket === 'finished') { finished.push(lead); continue; }
      const tp = findCurrentTouchPoint(lead)!;
      const stepMap = maps[bucket];
      if (!stepMap.has(tp.order)) stepMap.set(tp.order, { order: tp.order, type: tp.type, label: tp.label, byCategory: createEmptyLeadsByCategory(), total: 0 });
      const step = stepMap.get(tp.order)!;
      step.byCategory[queueCategory(lead)].push(lead);
      step.total++;
      if (bucket === 'today') todayCount++; else nextCount++;
    }

    // inside a step: the lead that has waited longest comes first
    const dueOf = (l: Lead) => new Date(findCurrentTouchPoint(l)?.dueDate ?? 0).getTime();
    const finish = (m: Map<number, TouchPointStepGroup>) => [...m.values()]
      .sort((a, b) => a.order - b.order)
      .map(s => { QUEUE_CATEGORY_ORDER.forEach(c => s.byCategory[c].sort((a, b) => dueOf(a) - dueOf(b))); return s; });

    return {
      code, name: campaignLabel(workflows, code),
      today: finish(maps.today), next: finish(maps.next),
      todayCount, nextCount, stopped, finished, total: campaignLeads.length,
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}
