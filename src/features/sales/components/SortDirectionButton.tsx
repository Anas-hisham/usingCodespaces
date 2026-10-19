import { ArrowDownWideNarrow, ArrowUpNarrowWide } from 'lucide-react';
import type { SortDirection } from '@/features/sales/salesTypes';

export function SortDirectionButton({ dir, onToggle, label }: { dir: SortDirection; onToggle: () => void; label: string }) {
  const Icon = dir === 'desc' ? ArrowDownWideNarrow : ArrowUpNarrowWide;
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
      title="Switch between descending and ascending"
    >
      <Icon className="w-3.5 h-3.5" />
      {label}: {dir === 'desc' ? 'Descending' : 'Ascending'}
    </button>
  );
}
