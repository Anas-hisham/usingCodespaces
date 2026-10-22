/** In-app notifications. */
export interface Notification {
  id: string;
  type: 'meeting' | 'update' | 'task' | 'overdue' | 'email' | 'tip';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  leadId?: string;
  meetingId?: string;
  userId?: string;   // only this user sees the notification (every new notification has one: nobody is notified about what they did themselves)
}
