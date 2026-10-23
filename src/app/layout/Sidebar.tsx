import { useEffect } from 'react';
import { TrendingUp, LogOut, X } from 'lucide-react';
import type { User } from '@/domain/types';
import { roleLabel } from '@/domain/user/roleLabel';
import type { NavItem, PageId } from '@/app/navigation';

interface SidebarProps {
  navItems: NavItem[];
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  badges: Partial<Record<PageId, number>>;
  currentUser: User;
  onLogout: () => void;
  /** Small screens: the menu is a drawer that slides in over the page. */
  open: boolean;
  onClose: () => void;
}

/** The menu on the left: the pages this role may open, and who is signed in. Under `lg` it is a drawer opened from the top bar. */
export function Sidebar({ navItems, currentPage, onNavigate, badges, currentUser, onLogout, open, onClose }: SidebarProps) {
  // Escape closes the drawer
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] lg:static lg:z-auto lg:w-60 lg:max-w-none lg:translate-x-0 bg-white flex flex-col shrink-0 border-r border-slate-200 shadow-xl lg:shadow-none transition-transform duration-200 ease-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
      aria-label="Sidebar"
    >
      <div className="h-16 px-4 lg:px-5 flex items-center gap-3 border-b border-slate-200">
        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm shrink-0">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <div className="leading-tight flex-1 min-w-0">
          <div className="text-slate-900 font-bold text-[15px] tracking-tight">SalesFlow</div>
          <div className="text-slate-500 text-xs">Unified Sales</div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden w-9 h-9 -mr-2 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 min-h-0 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin" aria-label="Main">
        {navItems.map(item => {
          const active = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={item.label}
              aria-current={active ? 'page' : undefined}
              className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
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
              <span className="truncate">{item.label}</span>
              {(badges[item.id] ?? 0) > 0 && (
                <span className="ml-auto bg-rose-500 text-white text-[11px] font-semibold leading-none px-1.5 py-1 rounded-full min-w-[20px] text-center">
                  {badges[item.id]}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-slate-200">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 ring-2 ring-white"
            style={{ backgroundColor: currentUser.color }}
            title={currentUser.name}
          >
            {currentUser.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-slate-900 text-sm font-medium truncate">{currentUser.name}</div>
            <div className="text-slate-500 text-xs truncate">{roleLabel(currentUser.role)}</div>
          </div>
          <button
            onClick={onLogout}
            className="flex w-8 h-8 items-center justify-center rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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
