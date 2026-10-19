/** In-app notifications. */
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
