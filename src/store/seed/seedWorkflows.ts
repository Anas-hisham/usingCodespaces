import type { TouchPointType, Workflow } from '@/domain/types';
import { buildTouchPointTemplates } from '@/domain/workflow/workflowDraft';

/** The touch point sequence agreed for the Activation and the Retention campaigns: [type, label, days to wait after the previous step]. */
const STANDARD_SEQUENCE: { type: TouchPointType; label: string; gapDays: number }[] = [
  { type: 'email', label: 'Intro Email',     gapDays: 0 },   // 1: right away
  { type: 'call',  label: 'First Call',      gapDays: 1 },   // 2: 1 day after
  { type: 'email', label: 'Follow-up Email', gapDays: 1 },   // 3: 1 day after
  { type: 'call',  label: 'Second Call',     gapDays: 2 },   // 4: 2 days after
  { type: 'email', label: 'Second Email',    gapDays: 2 },   // 5: 2 days after
  { type: 'call',  label: 'Final Call',      gapDays: 2 },   // 6: 2 days after
  { type: 'email', label: 'Final Email',     gapDays: 0 },   // 7: right away after the final call
];

/** One workflow per campaign: the ordered touch point TEMPLATE every new lead of that campaign gets. */
export function createSeedWorkflows(): Workflow[] {
  return [
    { id: 'w-1', campaignCode: 'ACT-001', name: 'Activation Campaign', touchPoints: buildTouchPointTemplates(STANDARD_SEQUENCE) },
    { id: 'w-2', campaignCode: 'RET-002', name: 'Retention Campaign', touchPoints: buildTouchPointTemplates(STANDARD_SEQUENCE) },
  ];
}
