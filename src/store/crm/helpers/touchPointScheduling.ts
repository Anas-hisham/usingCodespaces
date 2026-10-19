/** After any touch point change: move the lead to its next open touch point. */
import type { Lead } from '@/domain/types';
import { isOpenTouchPoint, scheduleNextTouchPoint } from '@/domain/workflow/touchPoints';

/**
 * After any change to touch points: point the lead at the first open touch point.
 * The due date is only re-based when the current step actually changes
 * (so skipping a FUTURE step doesn't resetToSeedData the due date of the current one).
 */
export function pointLeadAtFirstOpenTouchPoint(lead: Lead) {
  const first = lead.touchPoints.find(isOpenTouchPoint);
  if (!first) { lead.currentTouchPoint = -1; return; }
  if (first.order === lead.currentTouchPoint) return;
  const { touchPoints, next } = scheduleNextTouchPoint(lead.touchPoints);
  lead.touchPoints = touchPoints;
  lead.currentTouchPoint = next ? next.order : -1;
}
