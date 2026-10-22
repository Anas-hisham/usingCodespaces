import { useState } from 'react';
import { ChevronDown, LogOut } from 'lucide-react';
import type { User } from '@/domain/types';
import { roleLabel } from '@/domain/user/roleLabel';

interface UserMenuProps {
  currentUser: User;
  onLogout: () => void;
}

/** The name + avatar in the top bar and the small menu (profile + sign out) that opens under it. */
export function UserMenu({ currentUser, onLogout }: UserMenuProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setUserMenuOpen(!userMenuOpen)}
        aria-expanded={userMenuOpen}
        aria-label="Account menu"
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold"
          style={{ backgroundColor: currentUser.color }}
        >
          {currentUser.initials}
        </div>
        <span className="text-sm text-slate-700 font-medium hidden sm:block">{currentUser.name.split(' ')[0]}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
      </button>

      {userMenuOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setUserMenuOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-56 max-w-[calc(100vw-1rem)] bg-white rounded-xl shadow-lg border border-slate-200 z-40 animate-slide-up">
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="font-medium text-sm text-slate-900 truncate">{currentUser.name}</div>
              <div className="text-xs text-slate-600 truncate">{currentUser.email}</div>
              <div className="mt-1.5">
                <span className="inline-block text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">
                  {roleLabel(currentUser.role)}
                </span>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors rounded-b-xl"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
