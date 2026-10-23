import { Trash2 } from 'lucide-react';
import type { Lead } from '@/domain/types';

export function DeleteLeadModal({ lead, hasSales, onCancel, onConfirm }: { lead: Lead; hasSales: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 animate-slide-up max-h-[92dvh] overflow-y-auto scrollbar-thin p-6">
        <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center mb-3">
          <Trash2 className="w-5 h-5 text-rose-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Delete this lead?</h2>
        <p className="text-sm text-slate-600 mb-5">
          <span className="font-medium text-slate-700">{lead.leadCode} — {lead.companyName}</span> will be deleted permanently
          with its call history and activity log. Its arranged meetings will be cancelled. This can’t be undone.
        </p>
        {hasSales && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
            This lead has a recorded sale, so it can’t be deleted. Use “Remove from queue” instead — the sale and its history stay intact.
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
          <button onClick={onConfirm} disabled={hasSales} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed">Delete permanently</button>
        </div>
      </div>
    </div>
  );
}
