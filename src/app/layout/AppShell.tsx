import { Sidebar } from '@/app/layout/Sidebar';
import { NotificationsMenu } from '@/app/layout/NotificationsMenu';
import { UserMenu } from '@/app/layout/UserMenu';
import { navBadges } from '@/app/navBadges';
import { NAV_ITEMS } from '@/app/navigation';
import type { PageId } from '@/app/navigation';
import { useStore } from '@/store';

export function AppShell({
  children,
  currentPage,
  onNavigate,
  onLogout,
}: {
  children: React.ReactNode;
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  onLogout: () => void;
}) {
  const { state } = useStore();

  const currentUser = state.users.find(u => u.id === state.currentUserId);
  if (!currentUser) return null;

  // a notification with a userId belongs to that person only
  const myNotifications = state.notifications.filter(n => !n.userId || n.userId === currentUser.id);
  const badges = navBadges(state, currentUser);
  const unreadCount = myNotifications.filter(n => !n.read).length;

  const navItems = NAV_ITEMS.filter(item => item.roles.includes(currentUser.role));

  const team = state.teams.find(t => t.id === currentUser.teamId);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900">
      <Sidebar
        navItems={navItems} currentPage={currentPage} onNavigate={onNavigate}
        badges={badges} currentUser={currentUser} onLogout={onLogout}
      />

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              {navItems.find(n => n.id === currentPage)?.label}
            </h1>
            {team && currentUser.role === 'agent' && (
              <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">{team.name}</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <NotificationsMenu notifications={myNotifications} unreadCount={unreadCount} onNavigate={onNavigate} />

            <UserMenu currentUser={currentUser} onLogout={onLogout} />
          </div>
        </header>

        {/* PageId content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
}
