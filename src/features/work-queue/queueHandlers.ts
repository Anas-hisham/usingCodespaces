import type { Lead, TouchPoint } from '@/domain/types';

/** Everything a row of the work queue can ask the page to do (the page owns the modals and the store calls). */
export interface QueueHandlers {
  onMarkComplete: (lead: Lead, tp: TouchPoint) => void;   // opens the call-log or email modal
  onSkip: (lead: Lead, tp: TouchPoint) => void;           // asks for confirmation, then skips the touch point
  onDetails: (lead: Lead) => void;                        // opens the lead drawer
  onResume: (leadId: string) => void;                     // resumes a stopped workflow
  onRequestDelete: (leadId: string) => void;              // opens the "delete permanently" confirmation
}
