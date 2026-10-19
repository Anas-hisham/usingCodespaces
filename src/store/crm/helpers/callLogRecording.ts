/** Writes a call log + its history row (shared by every action that logs a call). */
import type { CallLog, Lead, TouchPoint } from '@/domain/types';
import { statusFromCalls } from '@/domain/workflow/callClassification';
import { findCurrentUser } from '@/store/crm/helpers/currentUserGuards';
import { createUserHistoryEntry } from '@/store/crm/helpers/leadHistory';
import type { AppState } from '@/store/state/AppState';

/** Writes the call log + history row. Shared by addCallLogWithoutCompletingTouchPoint and logCallAndCompleteTouchPoint so both always record the same things. */
export function recordCallLogOnLead(state: AppState, l: Lead, raw: CallLog): TouchPoint | undefined {
  const tp = l.touchPoints.find(t => t.order === raw.touchPointOrder);
  const actor = findCurrentUser(state);
  const log = { ...raw, agentId: state.currentUserId, agentName: actor?.name || '', touchPointLabel: tp?.label, round: l.round ?? 1 };
  l.callLogs.push(log);
  l.status = statusFromCalls(l);
  l.history.push(createUserHistoryEntry(state, l, 'call_logged', `${log.type.toUpperCase()}: ${log.description}`, tp, { callLogId: log.id, callType: log.type }));
  return tp;
}
