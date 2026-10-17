export type UserRole = 'operation_manager' | 'team_leader' | 'agent' | 'quality';

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  teamId?: string;
  initials: string;
  color: string;
  dailyCallTarget: number;
}

export interface Team {
  id: string;
  name: string;
  leaderId: string;
  agentIds: string[];
  managerId: string;
}

export type TouchPointType = 'call' | 'email';
export type LeadStatus = 'new' | 'discovery' | 'lvm' | 'nvm' | 'no_response' | 'arranged_meeting';
export type CallType = 'nvm' | 'lvm' | 'discovery';
export type TouchPointStatus = 'pending' | 'overdue' | 'completed' | 'skipped';

export interface TouchPointTemplate {
  order: number;
  type: TouchPointType;
  label: string;
  dayOffset: number;
}

export interface Workflow {
  id: string;
  campaignCode: string;
  name: string;
  touchPoints: TouchPointTemplate[];
}

// Structured outcome reason for a call. Optional: when it is empty the analytics fall back to reading the comment text.
export type CallReason =
  | 'interested' | 'callback' | 'price' | 'timing' | 'not_interested' | 'wrong_contact' | 'no_answer' | 'voicemail' | 'other';

export interface CallLog {
  id: string;
  type: CallType;
  reason?: CallReason;
  description: string;
  timestamp: string;
  editedAt?: string;   // set when the agent edits the log; `timestamp` stays the real time of the call
  touchPointOrder: number;
  // Filled automatically by the store so a log always says who/which step/which round
  agentId?: string;
  agentName?: string;
  touchPointLabel?: string;
  round?: number;
}

export interface TouchPoint {
  order: number;
  type: TouchPointType;
  label: string;
  dayOffset: number;
  status: TouchPointStatus;
  completedAt: string | null;
  dueDate: string | null;
  skippedAt?: string | null;
}

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
  agentId: string;
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
  notes: string;
  status: MeetingStatus;
  priority: 'high' | 'normal';
  createdBy: string;
  reminderSentAt?: string | null;  // the 15-minute reminder was already sent (prevents duplicates)
}

export type UpdateAudience = 'all' | 'team_leaders' | 'specific_team';

export interface TeamUpdate {
  id: string;
  audience: UpdateAudience;
  teamId: string | null;
  authorId: string;
  authorName: string;
  title: string;
  content: string;
  createdAt: string;
  acknowledgedBy: string[];
}

export interface Task {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  description: string;
  createdAt: string;
  deadline: string;
  assignedTo: string[];
  completedBy: string[];
}

export interface EmailTemplate {
  id: string;
  name: string;
  type: 'discovery' | 'no_response';
  subject: string;
  body: string;
}

export interface EmailLog {
  id: string;
  leadId: string;
  leadName: string;
  to: string;
  subject: string;
  body: string;
  templateType: 'discovery' | 'no_response' | 'custom';
  sentAt: string;
  sentBy: string;
  sentByName: string;
  auto?: boolean;            // sent by the system when the email touch point came due
  idempotencyKey?: string;   // the same touch point can never produce two automatic emails
}

export interface Notification {
  id: string;
  type: 'meeting' | 'update' | 'task' | 'overdue' | 'email';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  leadId?: string;
  meetingId?: string;
  userId?: string;   // when set, only this user sees the notification
}

// ---------------------------------------------------------------------------
// Sales (recorded by the Quality role)
// ---------------------------------------------------------------------------
export type SaleType = 'BP' | 'PPI' | 'MUA' | 'ATEP' | 'Activation' | 'Retention' | 'Transition';

export interface Sale {
  id: string;
  agentId: string;
  leadId: string;         // REQUIRED: the lead is the identity of a sale (company names can repeat). Campaign is derived from it.
  leadName: string;       // snapshot of the company name at the time of the sale (display only)
  saleType: SaleType;
  date: string;           // YYYY-MM-DD, the day the sale happened
  createdBy: string;      // the quality user who recorded it
  createdAt: string;
}
