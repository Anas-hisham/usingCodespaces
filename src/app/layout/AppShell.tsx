import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
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
  // Phones only: the menu is a drawer that slides over the page
  const [menuOpen, setMenuOpen] = useState(false);

  // Escape closes the drawer
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  // If the phone is rotated / the window is widened past the drawer breakpoint, drop the open state
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = () => { if (mq.matches) setMenuOpen(false); };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const currentUser = state.users.find(u => u.id === state.currentUserId);
  if (!currentUser) return null;

  // a notification with a userId belongs to that person only
  const myNotifications = state.notifications.filter(n => !n.userId || n.userId === currentUser.id);
  const badges = navBadges(state, currentUser);
  const unreadCount = myNotifications.filter(n => !n.read).length;

  const navItems = NAV_ITEMS.filter(item => item.roles.includes(currentUser.role));

  const team = state.teams.find(t => t.id === currentUser.teamId);

  const navigate = (page: PageId) => { onNavigate(page); setMenuOpen(false); };

  return (
    <div className="flex h-app bg-slate-50 text-slate-900">
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden animate-fade-in"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar
        navItems={navItems} currentPage={currentPage} onNavigate={navigate}
        badges={badges} currentUser={currentUser} onLogout={onLogout}
        open={menuOpen} onClose={() => setMenuOpen(false)}
      />

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between gap-2 px-3 sm:px-6 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-controls="app-sidebar"
              className="md:hidden w-10 h-10 -ml-1 shrink-0 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 truncate">
              {navItems.find(n => n.id === currentPage)?.label}
            </h1>
            {team && currentUser.role === 'agent' && (
              <span className="hidden sm:inline-block shrink-0 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">{team.name}</span>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            <NotificationsMenu notifications={myNotifications} unreadCount={unreadCount} onNavigate={onNavigate} />

            <UserMenu currentUser={currentUser} onLogout={onLogout} />
          </div>
        </header>

        {/* PageId content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin overscroll-contain">
          {children}
        </main>
      </div>
    </div>
  );
}
