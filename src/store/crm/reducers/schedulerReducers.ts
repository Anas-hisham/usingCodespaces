/** The scheduler tick (runs every 30 seconds while the app is open). */
import { AUTO_EMAIL_ENABLED } from '@/domain/workflow/workflowRules';
import { runAutoEmailJob } from '@/store/crm/scheduler/autoEmailJob';
import { runLeadExpiryJob } from '@/store/crm/scheduler/leadExpiryJob';
import { runMeetingDayEndJob } from '@/store/crm/scheduler/meetingDayEndJob';
import { runMeetingReminderJob } from '@/store/crm/scheduler/meetingReminderJob';
import type { AppState } from '@/store/state/AppState';

export const schedulerReducers = {
  runScheduledJobs(state: AppState) {
    const now = Date.now();
    runMeetingDayEndJob(state);
    runLeadExpiryJob(state, now);
    runMeetingReminderJob(state, now);
    if (AUTO_EMAIL_ENABLED) runAutoEmailJob(state, now);
  },
};
