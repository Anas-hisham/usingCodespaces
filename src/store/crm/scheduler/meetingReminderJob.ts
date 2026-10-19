/** Job: 15-minute meeting reminders. */
import { meetingStartMs } from '@/domain/meeting/meetingTime';
import { MEETING_REMINDER_MINUTES } from '@/domain/workflow/workflowRules';
import type { AppState } from '@/store/state/AppState';

export function runMeetingReminderJob(state: AppState, now: number) {
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
