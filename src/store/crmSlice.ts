import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
  Lead, Meeting, TeamUpdate, Task, EmailLog, Notification, CallType,
  TouchPoint, LeadHistoryEntry, LeadAssignment,
} from '@/types';
import { createInitialState, type AppState } from './seed';
import { isOpenTouchPoint, scheduleNext, statusFromCalls } from '@/lib/workflow';

const STORAGE_KEY = 'sales-mgmt-state-v3';

export function loadInitialState(): AppState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.leads && parsed.users) return parsed;
    }
  } catch { /* ignore */ }
  return createInitialState();
}
export const persistState = (state: AppState) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
};

// Builds one history row: WHO, WHEN, which ROUND and (optionally) which touch point.
function historyEntry(
  state: AppState, lead: Lead, action: string, detail?: string,
  tp?: Pick<TouchPoint, 'order' | 'label' | 'type'>, meta?: Record<string, unknown>,
): LeadHistoryEntry {
  return {
    id: crypto.randomUUID(),
    action,
    timestamp: new Date().toISOString(),
    userId: state.currentUserId,
    userName: state.users.find(u => u.id === state.currentUserId)?.name || '',
    detail,
    round: lead.round ?? 1,
    agentId: lead.agentId,
    ...(tp ? { touchPointOrder: tp.order, touchPointLabel: tp.label, touchPointType: tp.type } : {}),
    ...(meta ? { meta } : {}),
  };
}

const findLead = (state: AppState, id: string) => state.leads.find(l => l.id === id);

/**
 * After any change to touch points: point the lead at the first open touch point.
 * The due date is only re-based when the current step actually changes
 * (so skipping a FUTURE step doesn't reset the due date of the current one).
 */
function reschedule(lead: Lead) {
  const first = lead.touchPoints.find(isOpenTouchPoint);
  if (!first) { lead.currentTouchPoint = -1; return; }
  if (first.order === lead.currentTouchPoint) return;
  const { touchPoints, next } = scheduleNext(lead.touchPoints);
  lead.touchPoints = touchPoints;
  lead.currentTouchPoint = next ? next.order : -1;
}

const slice = createSlice({
  name: 'crm',
  initialState: loadInitialState,
  reducers: {
    setUser(state, a: PayloadAction<string>) { state.currentUserId = a.payload; },

    // ---------- touch points ----------
    markTouchpoint(state, a: PayloadAction<{ leadId: string; order: number }>) {
      const l = findLead(state, a.payload.leadId); if (!l) return;
      const tp = l.touchPoints.find(t => t.order === a.payload.order); if (!tp) return;
      tp.status = 'completed';
      tp.completedAt = new Date().toISOString();
      reschedule(l);
      l.history.push(historyEntry(state, l, 'mark_complete', `Touch point ${a.payload.order + 1} completed`, tp));
    },

    skipTouchpoint(state, a: PayloadAction<{ leadId: string; order: number }>) {
      const l = findLead(state, a.payload.leadId); if (!l) return;
      const tp = l.touchPoints.find(t => t.order === a.payload.order);
      if (!tp || !isOpenTouchPoint(tp)) return;
      tp.status = 'skipped';
      tp.skippedAt = new Date().toISOString();
      reschedule(l);
      l.history.push(historyEntry(state, l, 'touchpoint_skipped', `Touch point ${tp.order + 1} (${tp.label}) skipped`, tp));
    },

    restoreTouchpoint(state, a: PayloadAction<{ leadId: string; order: number }>) {
      const l = findLead(state, a.payload.leadId); if (!l) return;
      const tp = l.touchPoints.find(t => t.order === a.payload.order);
      if (!tp || tp.status !== 'skipped') return;
      tp.status = 'pending';
      tp.skippedAt = null;
      reschedule(l);
      l.history.push(historyEntry(state, l, 'touchpoint_restored', `Touch point ${tp.order + 1} (${tp.label}) restored`, tp));
    },

    // ---------- workflow stop / resume / delete ----------
    stopLead(state, a: PayloadAction<string>) {
      const l = findLead(state, a.payload); if (!l) return;
      l.stopped = true;
      l.history.push(historyEntry(state, l, 'workflow_stopped'));
    },
    resumeLead(state, a: PayloadAction<string>) {
      const l = findLead(state, a.payload); if (!l) return;
      l.stopped = false;
      reschedule(l);
      l.history.push(historyEntry(state, l, 'workflow_resumed'));
    },
    removeLead(state, a: PayloadAction<string>) {
      const l = findLead(state, a.payload); if (!l) return;
      l.removedFromQueue = true;
      l.removedAt = new Date().toISOString();
    },
    /** Permanently deletes the lead. Its arranged meetings are cancelled so the calendar has no dangling links. */
    deleteLead(state, a: PayloadAction<string>) {
      state.leads = state.leads.filter(l => l.id !== a.payload);
      state.meetings.forEach(m => {
        if (m.leadId === a.payload && m.status === 'arranged') m.status = 'cancelled';
      });
    },

    // ---------- leads ----------
    addLead(state, a: PayloadAction<Lead>) { state.leads.push(a.payload); },
    addBulkLeads(state, a: PayloadAction<Lead[]>) { state.leads.unshift(...a.payload); },

    addCallLog(state, a: PayloadAction<{ leadId: string; log: Lead['callLogs'][0] }>) {
      const l = findLead(state, a.payload.leadId); if (!l) return;
      const { log: raw } = a.payload;
      const tp = l.touchPoints.find(t => t.order === raw.touchPointOrder);
      const actor = state.users.find(u => u.id === state.currentUserId);
      const log = { ...raw, agentId: state.currentUserId, agentName: actor?.name || '', touchPointLabel: tp?.label, round: l.round ?? 1 };
      l.callLogs.push(log);
      l.status = statusFromCalls(l);
      l.history.push(historyEntry(state, l, 'call_logged', `${log.type.toUpperCase()}: ${log.description}`, tp, { callLogId: log.id, callType: log.type }));
    },

    editCallLog(state, a: PayloadAction<{ leadId: string; logId: string; callType: CallType; description: string }>) {
      const l = findLead(state, a.payload.leadId); if (!l) return;
      const cl = l.callLogs.find(c => c.id === a.payload.logId); if (!cl) return;
      cl.type = a.payload.callType;
      cl.description = a.payload.description;
      cl.timestamp = new Date().toISOString();
      l.status = statusFromCalls(l);
    },

    transferLead(state, a: PayloadAction<{ leadId: string; newAgentId: string }>) {
      const l = findLead(state, a.payload.leadId);
      if (!l || l.agentId === a.payload.newAgentId) return;
      const wf = state.workflows.find(w => w.campaignCode === l.campaignCode);
      const oldAgent = state.users.find(u => u.id === l.agentId);
      const newAgent = state.users.find(u => u.id === a.payload.newAgentId);
      const actor = state.users.find(u => u.id === state.currentUserId);
      const now = new Date().toISOString();
      const round = l.round ?? 1;

      // 1) Freeze the old agent's touch points - they are NEVER deleted.
      const archived: LeadAssignment = {
        round, agentId: l.agentId, agentName: oldAgent?.name || '',
        assignedAt: l.assignedAt, endedAt: now,
        endedBy: state.currentUserId, endedByName: actor?.name || '',
        touchPoints: JSON.parse(JSON.stringify(l.touchPoints)),
      };

      // 2) The new agent starts a fresh copy of the workflow.
      const template = wf ? wf.touchPoints : l.touchPoints;
      const doneCount = l.touchPoints.filter(tp => tp.status === 'completed').length;
      const total = l.touchPoints.length;
      const fromAgentId = l.agentId;
      l.touchPoints = template.map(tp => ({
        order: tp.order, type: tp.type, label: tp.label, dayOffset: tp.dayOffset,
        status: 'pending' as const, completedAt: null,
        dueDate: tp.order === 0 ? now : new Date(Date.now() + tp.dayOffset * 86400000).toISOString(),
      }));
      l.agentId = a.payload.newAgentId;
      l.assignedAt = now;
      l.currentTouchPoint = 0;
      l.status = 'new';
      l.stopped = false;
      l.removedFromQueue = false;
      l.removedAt = null;
      l.round = round + 1;
      l.previousAssignments = [...(l.previousAssignments ?? []), archived];
      l.history.push(historyEntry(
        state, l, 'transfer',
        `Transferred from ${oldAgent?.name} to ${newAgent?.name} (round ${round}: ${doneCount}/${total} touch points were completed)`,
        undefined,
        { fromAgentId, toAgentId: a.payload.newAgentId, fromRound: round, toRound: round + 1, completedTouchPoints: doneCount, totalTouchPoints: total },
      ));
    },

    // ---------- meetings ----------
    addMeeting(state, a: PayloadAction<Meeting>) {
      state.meetings.push(a.payload);
      const l = a.payload.leadId ? findLead(state, a.payload.leadId) : undefined;
      if (l) {
        l.status = 'arranged_meeting';
        l.history.push(historyEntry(state, l, 'meeting_arranged', `${a.payload.date} at ${a.payload.time}`, undefined, { meetingId: a.payload.id }));
      }
    },
    updateMeeting(state, a: PayloadAction<{ meetingId: string; updates: Partial<Meeting> }>) {
      const m = state.meetings.find(x => x.id === a.payload.meetingId);
      if (m) Object.assign(m, a.payload.updates);
    },

    // ---------- updates / tasks ----------
    addUpdate(state, a: PayloadAction<TeamUpdate>) { state.updates.unshift(a.payload); },
    ackUpdate(state, a: PayloadAction<{ updateId: string; userId: string }>) {
      const u = state.updates.find(x => x.id === a.payload.updateId);
      if (u && !u.acknowledgedBy.includes(a.payload.userId)) u.acknowledgedBy.push(a.payload.userId);
    },
    addTask(state, a: PayloadAction<Task>) { state.tasks.unshift(a.payload); },
    toggleTask(state, a: PayloadAction<{ taskId: string; userId: string }>) {
      const t = state.tasks.find(x => x.id === a.payload.taskId); if (!t) return;
      t.completedBy = t.completedBy.includes(a.payload.userId)
        ? t.completedBy.filter(id => id !== a.payload.userId)
        : [...t.completedBy, a.payload.userId];
    },

    // ---------- emails ----------
    sendEmail(state, a: PayloadAction<{ email: EmailLog; leadId: string; touchPointOrder: number }>) {
      state.emailLogs.unshift(a.payload.email);
      const l = findLead(state, a.payload.leadId); if (!l) return;
      const tp = l.touchPoints.find(t => t.order === a.payload.touchPointOrder);
      // Only an open EMAIL touch point is completed; a free email (order -1) leaves the workflow alone.
      if (tp && tp.type === 'email' && isOpenTouchPoint(tp)) {
        tp.status = 'completed';
        tp.completedAt = new Date().toISOString();
        reschedule(l);
      }
      l.history.push(historyEntry(state, l, 'email_sent', `Email sent to ${a.payload.email.to}`, tp, { emailLogId: a.payload.email.id, subject: a.payload.email.subject }));
    },

    bulkEmail(state, a: PayloadAction<{ leadIds: string[]; subject: string; body: string; senderId: string; senderName: string }>) {
      const now = new Date();
      for (const id of a.payload.leadIds) {
        const l = findLead(state, id); if (!l) continue;
        l.touchPoints.forEach(tp => {
          if (tp.type === 'email' && isOpenTouchPoint(tp) && tp.dueDate && new Date(tp.dueDate) <= now) {
            tp.status = 'completed';
            tp.completedAt = now.toISOString();
          }
        });
        const next = l.touchPoints.find(isOpenTouchPoint);
        l.currentTouchPoint = next ? next.order : -1;
        l.history.push({
          id: crypto.randomUUID(), action: 'bulk_email_sent', timestamp: now.toISOString(),
          userId: state.currentUserId,
          userName: state.users.find(u => u.id === state.currentUserId)?.name || '',
        });
        state.emailLogs.unshift({
          id: crypto.randomUUID(), leadId: id, leadName: l.companyName,
          to: l.email || 'no-email@example.com',
          subject: a.payload.subject, body: a.payload.body,
          templateType: l.status === 'discovery' ? 'discovery' : 'no_response',
          sentAt: now.toISOString(), sentBy: a.payload.senderId, sentByName: a.payload.senderName,
        });
      }
    },

    sendCustomEmail(state, a: PayloadAction<{ to: string; subject: string; body: string; senderId: string; senderName: string }>) {
      state.emailLogs.unshift({
        id: crypto.randomUUID(), leadId: '', leadName: '', to: a.payload.to,
        subject: a.payload.subject, body: a.payload.body, templateType: 'custom',
        sentAt: new Date().toISOString(), sentBy: a.payload.senderId, sentByName: a.payload.senderName,
      });
    },

    // ---------- notifications ----------
    readNotification(state, a: PayloadAction<string>) {
      const n = state.notifications.find(x => x.id === a.payload);
      if (n) n.read = true;
    },
    readAllNotifications(state) { state.notifications.forEach(n => { n.read = true; }); },
    addNotification(state, a: PayloadAction<Notification>) { state.notifications.unshift(a.payload); },

    reset() { return createInitialState(); },
  },
});

export const crmActions = slice.actions;
export const {
  setUser, markTouchpoint, skipTouchpoint, restoreTouchpoint,
  stopLead, resumeLead, removeLead, deleteLead,
  addLead, addBulkLeads, addCallLog, editCallLog, transferLead,
  addMeeting, updateMeeting, addUpdate, ackUpdate, addTask, toggleTask,
  sendEmail, bulkEmail, sendCustomEmail,
  readNotification, readAllNotifications, addNotification, reset,
} = slice.actions;
export default slice.reducer;
