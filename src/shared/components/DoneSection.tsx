import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

/** The "already done" block under a list. Closed by default: clicking the header shows the old items, clicking again hides them all. */
export function DoneSection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  if (count === 0) return null;
  return (
    <div className="mt-6">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
      >
        {open ? <ChevronDown className="w-4 h-4 text-slate-600" /> : <ChevronRight className="w-4 h-4 text-slate-600" />}
        <span className="text-sm font-semibold text-slate-700">{title}</span>
        <span className="ml-auto text-xs text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full">{count}</span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}
