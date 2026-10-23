/**
 * Creating / editing a campaign (Admin). Pure rules, shared by the editor screen and the store.
 *
 * A touch point is described to people as "wait N days after the previous step" (0 = right away).
 * The stored workflow keeps the running total (dayOffset: 0, 1, 2, 4 ...), which is what the scheduler already uses.
 */
import type { TouchPointTemplate, TouchPointType, Workflow } from '@/domain/types';

export const MAX_TOUCH_POINTS = 20;
export const MAX_GAP_DAYS = 90;

export interface DraftStep { type: TouchPointType; label: string; gapDays: number }

export interface WorkflowDraft {
  /** Campaign code, e.g. ACT-001. Cannot change once the campaign exists (leads point at it). */
  campaignCode: string;
  name: string;
  steps: DraftStep[];
}

/** "act 001" -> "ACT-001": upper case, letters / digits / dashes only. */
export const cleanCampaignCode = (code: string) =>
  code.trim().toUpperCase().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '').replace(/-{2,}/g, '-').replace(/^-|-$/g, '');

/** Steps with a gap in days -> the stored template with running totals. The first step is always "right away". */
export function buildTouchPointTemplates(steps: DraftStep[]): TouchPointTemplate[] {
  let total = 0;
  return steps.map((s, order) => {
    total += order === 0 ? 0 : Math.max(0, Math.floor(s.gapDays));
    return { order, type: s.type, label: s.label.trim(), dayOffset: total };
  });
}

/** The stored template -> steps with the gap from the previous step (for the editor). */
export function draftStepsFromTemplates(tps: TouchPointTemplate[]): DraftStep[] {
  const sorted = [...tps].sort((a, b) => a.order - b.order);
  return sorted.map((t, i) => ({ type: t.type, label: t.label, gapDays: i === 0 ? 0 : Math.max(0, t.dayOffset - sorted[i - 1].dayOffset) }));
}

/** Plain-words timing of one step, e.g. "Right away", "1 day after the previous step". */
export function describeGap(index: number, gapDays: number): string {
  if (index === 0) return 'When the agent takes the lead';
  if (gapDays === 0) return 'Right after the previous step';
  return `${gapDays} day${gapDays === 1 ? '' : 's'} after the previous step`;
}

/** Returns a problem text, or '' when the draft can be saved. `otherCodes` = codes of the OTHER campaigns. */
export function validateWorkflowDraft(d: WorkflowDraft, otherCodes: string[]): string {
  const code = cleanCampaignCode(d.campaignCode);
  if (!code) return 'Campaign code is required';
  if (otherCodes.some(c => c.toUpperCase() === code)) return 'This campaign code already exists';
  if (!d.name.trim()) return 'Campaign name is required';
  if (d.steps.length === 0) return 'Add at least one touch point';
  if (d.steps.length > MAX_TOUCH_POINTS) return `A campaign can have at most ${MAX_TOUCH_POINTS} touch points`;
  for (let i = 0; i < d.steps.length; i++) {
    const s = d.steps[i];
    if (s.type !== 'call' && s.type !== 'email') return `Touch point ${i + 1}: choose call or email`;
    if (!s.label.trim()) return `Touch point ${i + 1}: write a name for it`;
    if (!Number.isInteger(s.gapDays) || s.gapDays < 0 || s.gapDays > MAX_GAP_DAYS) return `Touch point ${i + 1}: days must be a whole number from 0 to ${MAX_GAP_DAYS}`;
  }
  return '';
}

/** The workflow to store (new campaign: pass id; existing: keep its id). */
export function workflowFromDraft(d: WorkflowDraft, id: string, now: string): Workflow {
  return { id, campaignCode: cleanCampaignCode(d.campaignCode), name: d.name.trim(), touchPoints: buildTouchPointTemplates(d.steps), updatedAt: now };
}
