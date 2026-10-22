import { AlertTriangle, Bell, Calendar, CheckCircle2, Lightbulb, Mail } from 'lucide-react';

/** The icon shown next to a notification of each type. */
export function notificationIcon(type: string) {
  switch (type) {
    case 'meeting': return Calendar;
    case 'email': return Mail;
    case 'overdue': return AlertTriangle;
    case 'update': return Bell;
    case 'task': return CheckCircle2;
    case 'tip': return Lightbulb;
    default: return Bell;
  }
}
