/** Logging and editing calls. */
import type { PayloadAction } from '@reduxjs/toolkit';
import type { CallLog, CallType } from '@/domain/types';
import { statusFromCalls } from '@/domain/workflow/callClassification';
import { isOpenTouchPoint } from '@/domain/workflow/touchPoints';
import { recordCallLogOnLead } from '@/store/crm/helpers/callLogRecording';
import { findLeadById, isLeadWorkable, isOwnedByCurrentUser } from '@/store/crm/helpers/currentUserGuards';
import { createUserHistoryEntry } from '@/store/crm/helpers/leadHistory';
import { pointLeadAtFirstOpenTouchPoint } from '@/store/crm/helpers/touchPointScheduling';
import type { AppState } from '@/store/state/AppState';

export const callLogReducers = {
  addCallLogWithoutCompletingTouchPoint(state: AppState, a: PayloadAction<{ leadId: string; log: CallLog }>) {
    const l = findLeadById(state, a.payload.leadId);
    if (!l || !isOwnedByCurrentUser(state, l) || !isLeadWorkable(l)) return;
    recordCallLogOnLead(state, l, a.payload.log);
  },
  /** Log a call AND complete its touch point in ONE step (so a failure can never leave a log without a completed step). */
  logCallAndCompleteTouchPoint(state: AppState, a: PayloadAction<{ leadId: string; log: CallLog }>) {
    const l = findLeadById(state, a.payload.leadId);
    if (!l || !isOwnedByCurrentUser(state, l) || !isLeadWorkable(l)) return;
    const tp = l.touchPoints.find(t => t.order === a.payload.log.touchPointOrder);
    if (!tp || tp.type !== 'call' || !isOpenTouchPoint(tp)) return;
    recordCallLogOnLead(state, l, a.payload.log);
    tp.status = 'completed';
    tp.completedAt = new Date().toISOString();
    pointLeadAtFirstOpenTouchPoint(l);
    l.history.push(createUserHistoryEntry(state, l, 'mark_complete', `Touch point ${tp.order + 1} completed`, tp));
  },
  editCallLog(state: AppState, a: PayloadAction<{ leadId: string; logId: string; callType: CallType; description: string }>) {
    const l = findLeadById(state, a.payload.leadId); if (!l || !isOwnedByCurrentUser(state, l)) return;
    const cl = l.callLogs.find(c => c.id === a.payload.logId); if (!cl) return;
    const before = `${cl.type.toUpperCase()}: ${cl.description}`;
    cl.type = a.payload.callType;
    cl.description = a.payload.description;
    cl.editedAt = new Date().toISOString();   // the original call time stays untouched (reports use it)
    l.status = statusFromCalls(l);
    l.history.push(createUserHistoryEntry(state, l, 'call_edited', `${before}  →  ${cl.type.toUpperCase()}: ${cl.description}`, undefined, { callLogId: cl.id }));
  },
};
