import { ChevronDown, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Lead } from '@/domain/types';

const MAX_RESULTS = 50;

/**
 * Searchable lead selector (replaces a plain <select> so it stays usable with hundreds of leads).
 * Type company / contact name, lead code, email or phone, then pick with the mouse or ↑ ↓ Enter.
 */
export function LeadPicker({
  leads, value, onChange, placeholder = 'Search by lead name, code or email...',
}: {
  leads: Lead[];
  value: string;
  onChange: (leadId: string) => void;
  placeholder?: string;
}) {
  const selected = leads.find(l => l.id === value);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = q
      ? leads.filter(l =>
          l.companyName.toLowerCase().includes(q) ||
          l.contactName.toLowerCase().includes(q) ||
          l.leadCode.toLowerCase().includes(q) ||
          (l.email || '').toLowerCase().includes(q) ||
          (l.phone || '').replace(/\s/g, '').includes(q.replace(/\s/g, '')))
      : leads;
    return { shown: all.slice(0, MAX_RESULTS), total: all.length };
  }, [leads, query]);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => { setActive(0); }, [query]);

  // keep the highlighted row visible while using the keyboard
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(a => Math.min(a + 1, matches.shown.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && open) { e.preventDefault(); const l = matches.shown[active]; if (l) choose(l.id); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  const inputClass = 'w-full pl-9 pr-9 py-2.5 rounded-lg border border-slate-300 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white';

  return (
    <div ref={rootRef} className="relative">
      {selected && !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white text-left hover:border-slate-300"
        >
          <span className="font-mono text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded shrink-0">{selected.leadCode}</span>
          <span className="truncate text-slate-900">{selected.companyName}</span>
          <span className="truncate text-slate-500 text-xs">{selected.contactName}</span>
          <span
            role="button"
            aria-label="Clear linked lead"
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
            className={inputClass}
          />
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        </div>
      )}

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
          <div ref={listRef} className="max-h-60 overflow-y-auto scrollbar-thin py-1">
            {matches.shown.length === 0 && (
              <div className="px-4 py-3 text-sm text-slate-500">No leads match “{query}”</div>
            )}
            {matches.shown.map((l, i) => (
              <button
                type="button"
                key={l.id}
                data-idx={i}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(l.id)}
                className={`w-full flex items-center gap-2 px-4 py-2 text-left text-sm ${i === active ? 'bg-blue-50' : ''} ${l.id === value ? 'font-semibold' : ''}`}
              >
                <span className="font-mono text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded shrink-0">{l.leadCode}</span>
                <span className="truncate text-slate-900">{l.companyName}</span>
                <span className="truncate text-slate-500 text-xs ml-auto">{l.contactName}</span>
              </button>
            ))}
          </div>
          {matches.total > MAX_RESULTS && (
            <div className="px-4 py-2 text-xs text-slate-500 border-t border-slate-100 bg-slate-50">
              Showing {MAX_RESULTS} of {matches.total} — keep typing to narrow it down
            </div>
          )}
        </div>
      )}
    </div>
  );
}
