import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
  Lead, Meeting, TeamUpdate, Task, EmailLog, Notification, CallType, Sale,
  TouchPoint, LeadHistoryEntry, LeadAssignment,
} from '@/types';
import { createInitialState, type AppState } from './seed';
import {
  isOpenTouchPoint, scheduleNext, statusFromCalls, highestCallType, effectiveCallType, expiryReferenceMs,
  fillTemplate, localDay, meetingStartMs, LEAD_EXPIRY_DAYS, MEETING_REMINDER_MINUTES, AUTO_EMAIL_ENABLED,
} from '@/lib/workflow';

const STORAGE_KEY = 'sales-mgmt-state-v3';

export function loadInitialState(): AppState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.leads && parsed.users) {
        // Older saved data: add the Quality user and the sales list so nothing breaks after an upgrade.
        const fresh = createInitialState();
        if (!parsed.sales) parsed.sales = fresh.sales;
        if (!parsed.users.some((u: { role: string }) => u.role === 'quality')) {
          parsed.users.push(...fresh.users.filter(u => u.role === 'quality'));
        }
        return parsed;
      }
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

/** History row written by the scheduler (no logged-in user is acting). */
function systemEntry(
  lead: Lead, action: string, detail?: string,
  tp?: Pick<TouchPoint, 'order' | 'label' | 'type'>, meta?: Record<string, unknown>,
): LeadHistoryEntry {
  return {
    id: crypto.randomUUID(), action, timestamp: new Date().toISOString(),
    userId: 'system', userName: 'System', detail,
    round: lead.round ?? 1, agentId: lead.agentId,
    ...(tp ? { touchPointOrder: tp.order, touchPointLabel: tp.label, touchPointType: tp.type } : {}),
    ...(meta ? { meta } : {}),
  };
}

/**
 * A lead only stays in the "Meeting" section while it has an arranged meeting that is today or later.
 * When the meeting day is over (or the meeting was completed / cancelled / no-show / rescheduled and there is no
 * other one) the lead goes back to the Discovery queue. Safe to call repeatedly.
 */
function endMeetingStateIfNeeded(state: AppState, lead: Lead, reason: string, byUser: boolean) {
  if (lead.status !== 'arranged_meeting') return;
  const today = localDay();
  const stillActive = state.meetings.some(m => m.leadId === lead.id && m.status === 'arranged' && m.date >= today);
  if (stillActive) return;
  lead.status = lead.discoveryReached ? 'discovery' : (highestCallType(lead) ?? 'new');
  lead.lastActivityAt = new Date().toISOString();   // the 15-day count starts again from here
  const detail = `${reason} - back in the Discovery queue`;
  lead.history.push(byUser ? historyEntry(state, lead, 'meeting_ended', detail) : systemEntry(lead, 'meeting_ended', detail));
}

// ----- scheduler jobs (run every 30 s while the app is open; a real backend would run them as background jobs) -----
function runMeetingDayEnd(state: AppState) {
  for (const l of state.leads) {
    if (l.status === 'arranged_meeting') endMeetingStateIfNeeded(state, l, 'Meeting day ended with no result', false);
  }
}

/** 15-day rule: no progress (same touch point or stopped) for 15 calendar days -> out of the queue, TL reassigns. */
function runExpiry(state: AppState, now: number) {
  const today = localDay(now);
  for (const l of state.leads) {
    if (l.expiredAt || l.removedFromQueue) continue;
    if (!l.stopped && !l.touchPoints.some(isOpenTouchPoint)) continue;                    // finished workflow
    if (state.meetings.some(m => m.leadId === l.id && m.status === 'arranged' && m.date >= today)) continue; // paused by a meeting
    if (now - expiryReferenceMs(l) < LEAD_EXPIRY_DAYS * 86400000) continue;
    l.expiredAt = new Date(now).toISOString();
    const agent = state.users.find(u => u.id === l.agentId);
    l.history.push(systemEntry(l, 'expired_15_days', `No progress for ${LEAD_EXPIRY_DAYS} days - removed from ${agent?.name ?? 'the agent'}'s queue, waiting for the Team Leader to reassign`));
  }
}

function runMeetingReminders(state: AppState, now: number) {
  const nowIso = new Date(now).toISOString();
  for (const m of state.meetings) {
    if (m.status !== 'arranged' || m.reminderSentAt) continue;
    const start = meetingStartMs(m);
    if (isNaN(start) || now < start - MEETING_REMINDER_MINUTES * 60000) continue;
    m.reminderSentAt = nowIso;                              // marked first, so it can never be sent twice
    if (now >= start + m.duration * 60000) continue;        // the meeting is already over - no point notifying
    const mins = Math.ceil((start - now) / 60000);
    for (const userId of new Set([...m.participantIds, m.createdBy])) {
      state.notifications.unshift({
        id: crypto.randomUUID(), type: 'meeting',
        title: mins > 0 ? `Meeting in ${mins} minute${mins === 1 ? '' : 's'}` : 'Meeting starting now',
        message: `${m.title} at ${m.time}`,
        timestamp: nowIso, read: false, leadId: m.leadId, meetingId: m.id, userId,
      });
    }
  }
}

/**
 * Email touch point came due -> the system sends it. Discovery template if the lead reached Discovery, otherwise
 * the No Response template. A call step is never skipped: if the lead is waiting on a call, nothing is sent.
 * No email address -> nothing is sent and the step stays open. (Sending is simulated: it is logged, not delivered.)
 */
function runAutoEmails(state: AppState, now: number) {
  const nowIso = new Date(now).toISOString();
  for (const l of state.leads) {
    if (l.stopped || l.removedFromQueue || l.expiredAt || !l.email) continue;
    const tp = l.touchPoints.find(t => t.order === l.currentTouchPoint);
    if (!tp || tp.type !== 'email' || !isOpenTouchPoint(tp)) continue;
    if (!tp.dueDate || new Date(tp.dueDate).getTime() > now) continue;

    const key = `auto|${l.id}|${l.round ?? 1}|${tp.order}`;
    if (state.emailLogs.some(e => e.idempotencyKey === key)) continue;

    const type = effectiveCallType(l) === 'discovery' ? 'discovery' : 'no_response';
    const tpl = state.emailTemplates.find(t => t.type === type);
    if (!tpl) continue;
    const agent = state.users.find(u => u.id === l.agentId);
    const agentName = agent?.name ?? '';
    const emailId = crypto.randomUUID();

    state.emailLogs.unshift({
      id: emailId, leadId: l.id, leadName: l.companyName, to: l.email,
      subject: fillTemplate(tpl.subject, l, agentName), body: fillTemplate(tpl.body, l, agentName),
      templateType: type, sentAt: nowIso, sentBy: l.agentId, sentByName: agentName,
      auto: true, idempotencyKey: key,
    });
    tp.status = 'completed';
    tp.completedAt = nowIso;
    reschedule(l);
    l.history.push(systemEntry(l, 'auto_email_sent', `${tpl.name} sent to ${l.email}`, tp, { emailLogId: emailId, templateType: type }));
    state.notifications.unshift({
      id: crypto.randomUUID(), type: 'email', title: 'Email sent automatically',
      message: `${l.companyName}: ${tp.label}`, timestamp: nowIso, read: false, leadId: l.id, userId: l.agentId,
    });
  }
}

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
      l.lastActivityAt = new Date().toISOString();
      l.history.push(historyEntry(state, l, 'workflow_stopped'));
    },
    resumeLead(state, a: PayloadAction<string>) {
      const l = findLead(state, a.payload); if (!l) return;
      l.stopped = false;
      l.lastActivityAt = new Date().toISOString();
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
      l.expiredAt = null;
      l.discoveryReached = false;
      l.lastActivityAt = now;
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
        l.discoveryReached = true;   // arranging a meeting means the person was reached
        l.history.push(historyEntry(state, l, 'meeting_arranged', `${a.payload.date} at ${a.payload.time}`, undefined, { meetingId: a.payload.id }));
      }
    },
    updateMeeting(state, a: PayloadAction<{ meetingId: string; updates: Partial<Meeting> }>) {
      const m = state.meetings.find(x => x.id === a.payload.meetingId);
      if (!m) return;
      // Only the person who created the meeting can change it. Invited people can see it but not update it.
      if (m.createdBy !== state.currentUserId) return;
      Object.assign(m, a.payload.updates);

      const status = a.payload.updates.status;
      const l = m.leadId ? findLead(state, m.leadId) : undefined;
      if (l && status && status !== 'arranged') {
        l.history.push(historyEntry(state, l, `meeting_${status}`, `${m.date} at ${m.time}`, undefined, { meetingId: m.id }));
        endMeetingStateIfNeeded(state, l, `Meeting ${status.replace('_', ' ')}`, true);
      }
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

    /**
     * Optional shortcut for agents: send one email to many leads and mark their current EMAIL step complete.
     * Only the lead's CURRENT step is completed (and only if it is an open email step), never later ones.
     * [Name], [Company Name] and [Agent Name] in the subject/body are filled in per lead.
     */
    bulkEmail(state, a: PayloadAction<{ leadIds: string[]; subject: string; body: string; senderId: string; senderName: string }>) {
      const now = new Date().toISOString();
      const fill = (text: string, l: Lead) => text
        .replace(/\[Name\]/g, l.contactName)
        .replace(/\[Company Name\]/g, l.companyName)
        .replace(/\[Agent Name\]/g, a.payload.senderName);

      for (const id of a.payload.leadIds) {
        const l = findLead(state, id); if (!l || l.stopped) continue;
        const tp = l.touchPoints.find(t => t.order === l.currentTouchPoint);
        const subject = fill(a.payload.subject, l);
        const emailId = crypto.randomUUID();

        state.emailLogs.unshift({
          id: emailId, leadId: id, leadName: l.companyName,
          to: l.email || 'no-email@example.com',
          subject, body: fill(a.payload.body, l),
          templateType: 'custom',
          sentAt: now, sentBy: a.payload.senderId, sentByName: a.payload.senderName,
        });

        let completed: TouchPoint | undefined;
        if (tp && tp.type === 'email' && isOpenTouchPoint(tp)) {
          tp.status = 'completed';
          tp.completedAt = now;
          completed = tp;
          reschedule(l);
        }
        l.history.push(historyEntry(
          state, l, 'bulk_email_sent', `Email sent to ${l.email}`, completed ?? undefined,
          { emailLogId: emailId, subject },
        ));
      }
    },

    sendCustomEmail(state, a: PayloadAction<{ to: string; subject: string; body: string; senderId: string; senderName: string }>) {
      state.emailLogs.unshift({
        id: crypto.randomUUID(), leadId: '', leadName: '', to: a.payload.to,
        subject: a.payload.subject, body: a.payload.body, templateType: 'custom',
        sentAt: new Date().toISOString(), sentBy: a.payload.senderId, sentByName: a.payload.senderName,
      });
    },

    // ---------- sales (Quality only) ----------
    addSale(state, a: PayloadAction<Sale>) {
      if (state.users.find(u => u.id === state.currentUserId)?.role !== 'quality') return;
      state.sales.unshift(a.payload);
    },
    deleteSale(state, a: PayloadAction<string>) {
      if (state.users.find(u => u.id === state.currentUserId)?.role !== 'quality') return;
      state.sales = state.sales.filter(x => x.id !== a.payload);
    },

    // ---------- scheduler ----------
    tickScheduler(state) {
      const now = Date.now();
      runMeetingDayEnd(state);
      runExpiry(state, now);
      runMeetingReminders(state, now);
      if (AUTO_EMAIL_ENABLED) runAutoEmails(state, now);
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
  sendEmail, bulkEmail, sendCustomEmail, addSale, deleteSale, tickScheduler,
  readNotification, readAllNotifications, addNotification, reset,
} = slice.actions;
export default slice.reducer;
