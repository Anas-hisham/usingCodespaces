import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import type { User } from '@/domain/types';
import { roleLabel } from '@/domain/user/roleLabel';
import { UserAvatar } from '@/shared/components/UserAvatar';

export interface PickerPerson {
  user: User;
  detail?: string;   // second line: team, Team Leader, manager ... (also searched)
  group?: string;    // header the person is listed under (people with the same group must be next to each other)
  badge?: string;    // small tag, e.g. "Suggested"
}

/** How many rows are drawn at once. With hundreds of people the list stays fast: the rest is reached by typing. */
const MAX_ROWS = 40;

/**
 * Searchable picker for people of ANY role. Type a name, username, role, team or manager and the list narrows;
 * role chips filter by position; ↑ ↓ Enter work too. Built to stay usable with many agents (only the first rows are drawn).
 */
export function PersonPicker({ people, value, onChange, placeholder = 'Search by name, role, team or manager...', roleChips = false, emptyText = 'Nobody matches' }: {
  people: PickerPerson[];
  value: string;
  onChange: (userId: string) => void;
  placeholder?: string;
  roleChips?: boolean;
  emptyText?: string;
}) {
  const selected = people.find(p => p.user.id === value);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const roles = useMemo(() => [...new Set(people.map(p => p.user.role))], [people]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter(p => {
      if (role && p.user.role !== role) return false;
      if (!q) return true;
      return `${p.user.name} ${p.user.username} ${roleLabel(p.user.role)} ${p.detail ?? ''}`.toLowerCase().includes(q);
    });
  }, [people, query, role]);
  const shown = matches.slice(0, MAX_ROWS);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);
  useEffect(() => { setActive(0); }, [query, role]);
  useEffect(() => { listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' }); }, [active]);

  const choose = (id: string) => { onChange(id); setOpen(false); setQuery(''); };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(a => Math.min(a + 1, shown.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && open) { e.preventDefault(); const p = shown[active]; if (p) choose(p.user.id); }
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      {selected && !open ? (
        <button type="button" onClick={() => setOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white text-left hover:border-slate-300">
          <UserAvatar user={selected.user} size="w-7 h-7" />
          <span className="min-w-0">
            <span className="block truncate text-slate-900 font-medium">{selected.user.name} <span className="text-xs font-normal text-slate-500">· {roleLabel(selected.user.role)}</span></span>
            {selected.detail && <span className="block truncate text-xs text-slate-500">{selected.detail}</span>}
          </span>
          <span role="button" aria-label="Clear" onClick={e => { e.stopPropagation(); onChange(''); }}
            className="ml-auto w-5 h-5 rounded hover:bg-slate-100 flex items-center justify-center shrink-0"><X className="w-3.5 h-3.5 text-slate-500" /></span>
        </button>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input type="text" value={query} autoFocus={open} onFocus={() => setOpen(true)} onKeyDown={onKeyDown}
            onChange={e => { setQuery(e.target.value); setOpen(true); }} placeholder={placeholder}
            className="w-full pl-9 pr-9 py-2.5 rounded-lg border border-slate-300 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white" />
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        </div>
      )}

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
          {roleChips && roles.length > 1 && (
            <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b border-slate-100">
              {['', ...roles].map(r => (
                <button key={r || 'all'} type="button" onMouseDown={e => e.preventDefault()} onClick={() => setRole(r)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${role === r ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {r ? roleLabel(r) : 'All'}
                </button>
              ))}
            </div>
          )}
          <div ref={listRef} className="max-h-60 overflow-y-auto scrollbar-thin py-1">
            {shown.length === 0 && <div className="px-4 py-3 text-sm text-slate-500">{emptyText}{query && <> for “{query}”</>}</div>}
            {shown.map((p, i) => (
              <div key={p.user.id}>
                {p.group && (i === 0 || shown[i - 1].group !== p.group) && <div className="px-4 pt-2 pb-1 text-[11px] font-semibold text-slate-500">{p.group}</div>}
                <button type="button" data-idx={i} onMouseEnter={() => setActive(i)} onClick={() => choose(p.user.id)}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-left text-sm ${i === active ? 'bg-blue-50' : ''} ${p.user.id === value ? 'font-semibold' : ''}`}>
                  <UserAvatar user={p.user} size="w-7 h-7" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-slate-900">{p.user.name} <span className="text-xs font-normal text-slate-500">· {roleLabel(p.user.role)}</span></span>
                    {p.detail && <span className="block truncate text-xs text-slate-500">{p.detail}</span>}
                  </span>
                  {p.badge && <span className="shrink-0 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">{p.badge}</span>}
                </button>
              </div>
            ))}
            {matches.length > MAX_ROWS && (
              <div className="px-4 py-2 text-xs text-slate-500 border-t border-slate-100">Showing {MAX_ROWS} of {matches.length} - type to narrow the list</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
