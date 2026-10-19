import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import type { Team, User } from '@/domain/types';
import { UserAvatar } from '@/shared/components/UserAvatar';

interface AgentOption {
  agent: User;
  teamName: string;
}

/**
 * Agent selector with BOTH ways to choose:
 *  - open it and pick from the full list (grouped by team), or
 *  - type a name / username / team and pick from the filtered list (mouse or ↑ ↓ Enter).
 */
export function AgentPicker({
  agents, teams, value, onChange, placeholder = 'Search an agent or choose from the list...',
}: {
  agents: User[];
  teams: Team[];
  value: string;
  onChange: (agentId: string) => void;
  placeholder?: string;
}) {
  const selected = agents.find(a => a.id === value);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // every agent that belongs to a team, in team order (the same grouping the old drop-down had)
  const options = useMemo<AgentOption[]>(() => {
    const q = query.trim().toLowerCase();
    const all = teams.flatMap(t =>
      agents.filter(a => t.agentIds.includes(a.id)).map(agent => ({ agent, teamName: t.name })));
    return q
      ? all.filter(o => o.agent.name.toLowerCase().includes(q) || o.agent.username.toLowerCase().includes(q) || o.teamName.toLowerCase().includes(q))
      : all;
  }, [agents, teams, query]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => { setActive(0); }, [query]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(a => Math.min(a + 1, options.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && open) { e.preventDefault(); const o = options[active]; if (o) choose(o.agent.id); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div ref={rootRef} className="relative">
      {selected && !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm bg-white text-left hover:border-slate-300"
        >
          <UserAvatar user={selected} size="w-6 h-6" />
          <span className="truncate text-slate-900">{selected.name}</span>
          <span
            role="button"
            aria-label="Clear agent"
            onClick={e => { e.stopPropagation(); onChange(''); }}
            className="ml-auto w-5 h-5 rounded hover:bg-slate-100 flex items-center justify-center shrink-0"
          >
            <X className="w-3.5 h-3.5 text-slate-500" />
          </span>
        </button>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={query}
            autoFocus={open}
            onFocus={() => setOpen(true)}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className="w-full pl-9 pr-9 py-2.5 rounded-lg border border-slate-300 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
          />
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        </div>
      )}

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
          <div ref={listRef} className="max-h-60 overflow-y-auto scrollbar-thin py-1">
            {options.length === 0 && (
              <div className="px-4 py-3 text-sm text-slate-500">No agents match “{query}”</div>
            )}
            {options.map((o, i) => (
              <div key={o.agent.id}>
                {(i === 0 || options[i - 1].teamName !== o.teamName) && (
                  <div className="px-4 pt-2 pb-1 text-[11px] font-semibold text-slate-500">{o.teamName}</div>
                )}
                <button
                  type="button"
                  data-idx={i}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(o.agent.id)}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-left text-sm ${i === active ? 'bg-blue-50' : ''} ${o.agent.id === value ? 'font-semibold' : ''}`}
                >
                  <UserAvatar user={o.agent} size="w-6 h-6" />
                  <span className="truncate text-slate-900">{o.agent.name}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
