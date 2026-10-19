/** The lead: the central record of the whole system. */
import type { CallLog } from '@/domain/types/callLog';
import type { TouchPoint, TouchPointType } from '@/domain/types/workflow';

export type LeadStatus = 'new' | 'discovery' | 'lvm' | 'nvm' | 'no_response' | 'arranged_meeting';

export interface LeadHistoryEntry {
  id: string;
  action: string;
  timestamp: string;
  userId: string;
  userName: string;
  detail?: string;
  // Extra context so the history can be filtered/reported on later
  round?: number;                 // which assignment round (1 = first agent, 2 = after 1st transfer ...)
  agentId?: string;               // the agent who owned the lead when this happened
  touchPointOrder?: number;
  touchPointLabel?: string;
  touchPointType?: TouchPointType;
  meta?: Record<string, unknown>; // free-form data for future features
}

// A closed assignment: everything the previous agent had on this lead
export interface LeadAssignment {
  round: number;
  agentId: string;
  agentName: string;
  assignedAt: string;
  endedAt: string;
  endedBy: string;
  endedByName: string;
  touchPoints: TouchPoint[];      // frozen snapshot of that agent's touch points
}

export interface Lead {
  id: string;
  leadCode: string;
  campaignCode: string;
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  status: LeadStatus;
  agentId: string;                         // '' while the lead sits in the shared pool (created by the Admin, nobody owns it yet)
  assignedAt: string;
  touchPoints: TouchPoint[];
  currentTouchPoint: number;
  callLogs: CallLog[];
  history: LeadHistoryEntry[];
  stopped: boolean;
  removedFromQueue: boolean;
  removedAt: string | null;
  round?: number;                          // current round, defaults to 1
  previousAssignments?: LeadAssignment[];  // archived rounds (old agents' touch points)
  expiredAt?: string | null;               // set by the 15-day rule: out of the agent's queue, waiting for the TL to reassign
  lastActivityAt?: string;                 // last time the lead was assigned / stopped / resumed / came back from a meeting
  discoveryReached?: boolean;              // a meeting was arranged, so the person was reached (counts as Discovery)
}
