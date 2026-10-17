import { useState } from 'react';
import {
  LayoutDashboard, Inbox, Calendar, Users, Mail,
  Bell, ChevronDown, LogOut, TrendingUp, CheckCircle2,
  AlertTriangle, Trophy,
} from 'lucide-react';
import { useStore, readAllNotifications, readNotification } from '@/store';
import type { User } from '@/types';

export type Page = 'dashboard' | 'workqueue' | 'calendar' | 'leads' | 'updates' | 'tasks' | 'emails' | 'sales';

interface NavItem {
  id: Page;
  label: string;
  icon: typeof LayoutDashboard;
  roles: User['role'][];
  badge?: number;
}

const ALL_ROLES: User['role'][] = ['operation_manager', 'team_leader', 'agent'];

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ALL_ROLES },
  { id: 'workqueue', label: 'Work Queue', icon: Inbox, roles: ['agent'] },
  { id: 'calendar', label: 'Calendar', icon: Calendar, roles: ALL_ROLES },
  { id: 'leads', label: 'Leads', icon: Users, roles: ['agent'] },
  { id: 'sales', label: 'Sales', icon: Trophy, roles: [...ALL_ROLES, 'quality'] },
  { id: 'updates', label: 'Team Updates', icon: Bell, roles: ALL_ROLES },
  { id: 'tasks', label: 'Tasks', icon: CheckCircle2, roles: ALL_ROLES },
  { id: 'emails', label: 'Email Center', icon: Mail, roles: ALL_ROLES },
];

/** The page a person lands on, and the fallback when the current page is not allowed for their role. */
export const homePageFor = (role: User['role']): Page => (role === 'quality' ? 'sales' : 'dashboard');
export const canOpenPage = (page: Page, role: User['role']) =>
  NAV_ITEMS.some(i => i.id === page && i.roles.includes(role));

export function Layout({
  children,
  currentPage,
  onNavigate,
  onLogout,
}: {
  children: React.ReactNode;
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}) {
  const { state, dispatch } = useStore();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const currentUser = state.users.find(u => u.id === state.currentUserId);
  if (!currentUser) return null;

  // a notification with a userId belongs to that person only
  const myNotifications = state.notifications.filter(n => !n.userId || n.userId === currentUser.id);
  const unreadCount = myNotifications.filter(n => !n.read).length;

  const navItems = NAV_ITEMS.filter(item => item.roles.includes(currentUser.role));

  const roleLabel = (role: string) => {
    switch (role) {
      case 'operation_manager': return 'Operation Manager';
      case 'team_leader': return 'Team Leader';
      case 'agent': return 'Agent';
      case 'quality': return 'Quality';
      default: return role;
    }
  };

  const team = state.teams.find(t => t.id === currentUser.teamId);

  const notifIcon = (type: string) => {
    switch (type) {
      case 'meeting': return Calendar;
      case 'email': return Mail;
      case 'overdue': return AlertTriangle;
      case 'update': return Bell;
      case 'task': return CheckCircle2;
      default: return Bell;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 flex flex-col shrink-0">
        <div className="px-5 py-5 flex items-center gap-2.5 border-b border-slate-800">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-white font-semibold text-sm">SalesFlow</div>
            <div className="text-slate-400 text-xs">Unified Sales</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
          {navItems.map(item => {
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <item.icon className="w-4.5 h-4.5 shrink-0" strokeWidth={active ? 2.5 : 2} />
                <span>{item.label}</span>
                {item.id === 'updates' && unreadCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-3 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/50">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
              style={{ backgroundColor: currentUser.color }}
            >
              {currentUser.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{currentUser.name}</div>
              <div className="text-slate-400 text-xs truncate">{roleLabel(currentUser.role)}</div>
            </div>
            <button
              onClick={onLogout}
              className="text-slate-400 hover:text-red-400 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-slate-900">
              {navItems.find(n => n.id === currentPage)?.label}
            </h1>
            {team && currentUser.role === 'agent' && (
              <span className="text-xs text-slate-400 ml-2">{team.name}</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <Bell className="w-4.5 h-4.5 text-slate-600" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse-ring" />
                )}
              </button>

              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 z-40 animate-slide-up">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                      <span className="font-semibold text-sm text-slate-900">Notifications</span>
                      <button
                        onClick={() => dispatch(readAllNotifications())}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Mark all read
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto scrollbar-thin">
                      {myNotifications.length === 0 && (
                        <div className="px-4 py-8 text-center text-sm text-slate-400">No notifications</div>
                      )}
                      {myNotifications.map(n => {
                        const Icon = notifIcon(n.type);
                        return (
                          <button
                            key={n.id}
                            onClick={() => {
                              dispatch(readNotification(n.id));
                              if (n.meetingId) onNavigate('calendar');
                              else if (n.leadId) onNavigate('workqueue');
                              setNotifOpen(false);
                            }}
                            className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 ${
                              !n.read ? 'bg-blue-50/40' : ''
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              n.type === 'overdue' ? 'bg-red-100' : n.type === 'meeting' ? 'bg-blue-100' : 'bg-slate-100'
                            }`}>
                              <Icon className={`w-4 h-4 ${
                                n.type === 'overdue' ? 'text-red-600' : n.type === 'meeting' ? 'text-blue-600' : 'text-slate-600'
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-slate-900">{n.title}</div>
                              <div className="text-xs text-slate-500 mt-0.5">{n.message}</div>
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

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                  style={{ backgroundColor: currentUser.color }}
                >
                  {currentUser.initials}
                </div>
                <span className="text-sm text-slate-700 font-medium hidden sm:block">{currentUser.name.split(' ')[0]}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 z-40 animate-slide-up">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <div className="font-medium text-sm text-slate-900">{currentUser.name}</div>
                      <div className="text-xs text-slate-500">{currentUser.email}</div>
                      <div className="mt-1.5">
                        <span className="inline-block text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">
                          {roleLabel(currentUser.role)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={onLogout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors rounded-b-xl"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
}
