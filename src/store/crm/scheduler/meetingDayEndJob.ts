/** Job: a meeting day ended with no result -> lead goes back to its queue. */
import { returnLeadToQueueWhenMeetingEnds } from '@/store/crm/helpers/meetingState';
import type { AppState } from '@/store/state/AppState';

// ----- scheduler jobs (run every 30 s while the app is open; a real backend would run them as background jobs) -----
export function runMeetingDayEndJob(state: AppState) {
  for (const l of state.leads) {
    if (l.status === 'arranged_meeting') returnLeadToQueueWhenMeetingEnds(state, l, 'Meeting day ended with no result', false);
  }
}
