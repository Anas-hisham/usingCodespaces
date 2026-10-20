import { ChevronLeft, ChevronRight } from 'lucide-react';

/** "1-5 of 23   < 1 2 3 >" - renders nothing when everything fits on one page. */
export function Pagination({ page, pageCount, total, pageSize, onPage }: {
  page: number; pageCount: number; total: number; pageSize: number; onPage: (page: number) => void;
}) {
  if (pageCount <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  // show at most 5 page buttons around the current page
  const start = Math.max(1, Math.min(page - 2, pageCount - 4));
  const pages = Array.from({ length: Math.min(5, pageCount) }, (_, i) => start + i);
  const btn = 'min-w-8 h-8 px-2 rounded-lg text-xs font-medium flex items-center justify-center transition-colors';
  return (
    <div className="flex items-center justify-between gap-3 pt-3 text-xs text-slate-600">
      <span>{from}-{to} of {total}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page === 1} aria-label="Previous page" className={`${btn} hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent`}>
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        {pages.map(p => (
          <button key={p} onClick={() => onPage(p)} aria-current={p === page ? 'page' : undefined}
            className={`${btn} ${p === page ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-700'}`}>{p}</button>
        ))}
        <button onClick={() => onPage(page + 1)} disabled={page === pageCount} aria-label="Next page" className={`${btn} hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent`}>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
