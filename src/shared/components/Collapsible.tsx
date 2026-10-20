import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

/**
 * The expand / collapse arrow used everywhere something owns a list of people or items
 * (a manager's teams, a team's agents, who acknowledged an update...). Click the header to show or hide the content.
 */
export function Collapsible({ header, children, defaultOpen = true, className = '', headerClassName = '' }: {
  header: React.ReactNode;           // always visible, next to the arrow
  children: React.ReactNode;         // shown only while open
  defaultOpen?: boolean;
  className?: string;
  headerClassName?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className={`w-full flex items-center gap-2 text-left ${headerClassName}`}
      >
        {open ? <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />}
        <div className="flex-1 min-w-0">{header}</div>
      </button>
      {open && children}
    </div>
  );
}
