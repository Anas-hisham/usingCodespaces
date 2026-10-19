/** Completing, skipping and restoring a single touch point. */
import type { PayloadAction } from '@reduxjs/toolkit';
import { isOpenTouchPoint } from '@/domain/workflow/touchPoints';
import { findLeadById, isLeadWorkable, isOwnedByCurrentUser } from '@/store/crm/helpers/currentUserGuards';
import { createUserHistoryEntry } from '@/store/crm/helpers/leadHistory';
import { pointLeadAtFirstOpenTouchPoint } from '@/store/crm/helpers/touchPointScheduling';
import type { AppState } from '@/store/state/AppState';

export const touchPointReducers = {
  completeTouchPoint(state: AppState, a: PayloadAction<{ leadId: string; order: number }>) {
    const l = findLeadById(state, a.payload.leadId);
    if (!l || !isOwnedByCurrentUser(state, l) || !isLeadWorkable(l)) return;      // a stopped / expired lead cannot move forward
    const tp = l.touchPoints.find(t => t.order === a.payload.order);
    if (!tp || !isOpenTouchPoint(tp)) return;                      // a double click must not complete a step twice
    tp.status = 'completed';
    tp.completedAt = new Date().toISOString();
    pointLeadAtFirstOpenTouchPoint(l);
    l.history.push(createUserHistoryEntry(state, l, 'mark_complete', `Touch point ${a.payload.order + 1} completed`, tp));
  },
  skipTouchPoint(state: AppState, a: PayloadAction<{ leadId: string; order: number }>) {
    const l = findLeadById(state, a.payload.leadId); if (!l || !isOwnedByCurrentUser(state, l) || l.removedFromQueue) return;
    const tp = l.touchPoints.find(t => t.order === a.payload.order);
    if (!tp || !isOpenTouchPoint(tp)) return;
    tp.status = 'skipped';
    tp.skippedAt = new Date().toISOString();
    pointLeadAtFirstOpenTouchPoint(l);
    l.history.push(createUserHistoryEntry(state, l, 'touchpoint_skipped', `Touch point ${tp.order + 1} (${tp.label}) skipped`, tp));
  },
  restoreSkippedTouchPoint(state: AppState, a: PayloadAction<{ leadId: string; order: number }>) {
    const l = findLeadById(state, a.payload.leadId); if (!l || !isOwnedByCurrentUser(state, l) || l.removedFromQueue) return;
    const tp = l.touchPoints.find(t => t.order === a.payload.order);
    if (!tp || tp.status !== 'skipped') return;
    tp.status = 'pending';
    tp.skippedAt = null;
    pointLeadAtFirstOpenTouchPoint(l);
    l.history.push(createUserHistoryEntry(state, l, 'touchpoint_restored', `Touch point ${tp.order + 1} (${tp.label}) restored`, tp));
  },
};
