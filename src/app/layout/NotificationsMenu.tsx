import { useState } from 'react';
import { Bell } from 'lucide-react';
import type { Notification } from '@/domain/types';
import { markAllNotificationsRead, markNotificationRead, useAppDispatch } from '@/store';
import { notificationIcon } from '@/app/layout/notificationIcon';
import type { PageId } from '@/app/navigation';

interface NotificationsMenuProps {
  notifications: Notification[];
  unreadCount: number;
  onNavigate: (page: PageId) => void;
}

/** The bell in the top bar and the list of notifications that opens under it. */
export function NotificationsMenu({ notifications, unreadCount, onNavigate }: NotificationsMenuProps) {
  const dispatch = useAppDispatch();
  const [notifOpen, setNotifOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setNotifOpen(!notifOpen)}
        aria-label="Notifications"
        aria-expanded={notifOpen}
        className="relative w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
      >
        <Bell className="w-[18px] h-[18px] text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse-ring" />
        )}
      </button>

      {notifOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 z-40 animate-slide-up">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="font-semibold text-sm text-slate-900">Notifications</span>
              <button
                onClick={() => dispatch(markAllNotificationsRead())}
                className="text-xs text-blue-600 hover:underline"
              >
                Mark all read
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto scrollbar-thin">
              {notifications.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-slate-500">No notifications</div>
              )}
              {notifications.map(n => {
                const Icon = notificationIcon(n.type);
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      dispatch(markNotificationRead(n.id));
                      if (n.meetingId) onNavigate('calendar');
                      else if (n.leadId) onNavigate('workqueue');
                      setNotifOpen(false);
                    }}
                    className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-100 ${
                      !n.read ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      n.type === 'overdue' ? 'bg-rose-100' : n.type === 'meeting' ? 'bg-violet-100' : 'bg-slate-100'
                    }`}>
                      <Icon className={`w-4 h-4 ${
                        n.type === 'overdue' ? 'text-rose-600' : n.type === 'meeting' ? 'text-violet-600' : 'text-slate-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900">{n.title}</div>
                      <div className="text-xs text-slate-600 mt-0.5">{n.message}</div>
                    </div>
                    {!n.read && <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
