/** Job: old saved data may still have leads in the removed "Meeting" status - they are simply Discovery leads now. */
import { highestCallType } from '@/domain/workflow/callClassification';
import type { AppState } from '@/store/state/AppState';

export function runLegacyMeetingStatusJob(state: AppState) {
  for (const l of state.leads) {
    if (l.status === 'arranged_meeting') l.status = l.discoveryReached ? 'discovery' : (highestCallType(l) ?? 'new');
  }
}
