/** The ONE object that holds all the data of the app (this is what is saved in localStorage). */
import type { EmailLog, EmailTemplate, Escalation, Lead, Meeting, Notification, Sale, Task, Team, TeamUpdate, Tip, User, Workflow } from '@/domain/types';

export interface AppState {
  currentUserId: string;
  users: User[];
  teams: Team[];
  workflows: Workflow[];
  leads: Lead[];
  meetings: Meeting[];
  updates: TeamUpdate[];
  tasks: Task[];
  emailTemplates: EmailTemplate[];
  emailLogs: EmailLog[];
  notifications: Notification[];
  sales: Sale[];
  tips: Tip[];
  escalations: Escalation[];
}
