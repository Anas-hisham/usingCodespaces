import { TrendingUp, LogOut } from 'lucide-react';
import type { User } from '@/domain/types';
import { roleLabel } from '@/domain/user/roleLabel';
import type { NavItem, PageId } from '@/app/navigation';

interface SidebarProps {
  navItems: NavItem[];
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  unreadCount: number;
  currentUser: User;
  onLogout: () => void;
}

/** The dark menu on the left: the pages this role may open, and who is signed in. Shrinks to icons on small screens. */
export function Sidebar({ navItems, currentPage, onNavigate, unreadCount, currentUser, onLogout }: SidebarProps) {
  return (
    <aside className="w-[72px] lg:w-60 bg-white flex flex-col shrink-0 border-r border-slate-200">
      <div className="h-16 px-4 lg:px-5 flex items-center justify-center lg:justify-start gap-3 border-b border-slate-200">
        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm shrink-0">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <div className="hidden lg:block leading-tight">
          <div className="text-slate-900 font-bold text-[15px] tracking-tight">SalesFlow</div>
          <div className="text-slate-500 text-xs">Unified Sales</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin" aria-label="Main">
        {navItems.map(item => {
          const active = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={item.label}
              aria-current={active ? 'page' : undefined}
              className={`group relative w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {active && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-blue-600" />}
              <item.icon
                className={`w-[18px] h-[18px] shrink-0 transition-colors ${active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`}
                strokeWidth={active ? 2.25 : 2}
              />
              <span className="hidden lg:inline">{item.label}</span>
              {item.id === 'updates' && unreadCount > 0 && (
                <span className="absolute top-1 right-1.5 lg:static lg:ml-auto bg-rose-500 text-white text-[11px] font-semibold leading-none px-1.5 py-1 rounded-full min-w-[20px] text-center">
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-slate-200">
        <div className="flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-3 py-2 rounded-xl bg-slate-50">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 ring-2 ring-white"
            style={{ backgroundColor: currentUser.color }}
            title={currentUser.name}
          >
            {currentUser.initials}
          </div>
          <div className="hidden lg:block flex-1 min-w-0">
            <div className="text-slate-900 text-sm font-medium truncate">{currentUser.name}</div>
            <div className="text-slate-500 text-xs truncate">{roleLabel(currentUser.role)}</div>
          </div>
          <button
            onClick={onLogout}
            className="hidden lg:flex w-8 h-8 items-center justify-center rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
