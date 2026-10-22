import { AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  /** red for deleting, amber for everything else that changes the workflow */
  tone?: 'danger' | 'warning';
}

export function ConfirmDialog({
  title, message, confirmLabel = 'Confirm', tone = 'warning', onConfirm, onCancel,
}: ConfirmOptions & { onConfirm: () => void; onCancel: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const danger = tone === 'danger';
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 animate-slide-up p-5 sm:p-6 max-h-modal overflow-y-auto">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${danger ? 'bg-rose-100' : 'bg-amber-100'}`}>
          <AlertTriangle className={`w-5 h-5 ${danger ? 'text-rose-600' : 'text-amber-600'}`} />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">{title}</h2>
        <div className="text-sm text-slate-600 mb-5">{message}</div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} autoFocus className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * const { ask, dialog } = useConfirm();
 * ask({ title, message, confirmLabel }, () => dispatch(...));   // runs only after the user presses Confirm
 * and render {dialog} once in the component.
 */
export function useConfirm() {
  const [req, setReq] = useState<(ConfirmOptions & { action: () => void }) | null>(null);
  const ask = (opts: ConfirmOptions, action: () => void) => setReq({ ...opts, action });
  const dialog = req ? (
    <ConfirmDialog
      {...req}
      onCancel={() => setReq(null)}
      onConfirm={() => { const run = req.action; setReq(null); run(); }}
    />
  ) : null;
  return { ask, dialog };
}
