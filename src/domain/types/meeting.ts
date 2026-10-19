/** Meetings (with a lead, or internal). */
export type MeetingStatus = 'arranged' | 'completed' | 'no_show' | 'cancelled' | 'rescheduled';

export type MeetingType = 'lead_meeting' | 'internal_meeting';

export interface Meeting {
  id: string;
  type: MeetingType;
  leadId?: string;
  leadName?: string;
  companyName?: string;
  agentId?: string;
  participantIds: string[];
  participantNames: string[];
  title: string;
  date: string;
  time: string;
  duration: number;
  notes: string;                  // the agenda written when the meeting was scheduled
  outcome?: string;               // what happened: REQUIRED when a meeting with a lead is marked Completed
  status: MeetingStatus;
  priority: 'high' | 'normal';
  createdBy: string;
  reminderSentAt?: string | null;  // the 15-minute reminder was already sent (prevents duplicates)
}
