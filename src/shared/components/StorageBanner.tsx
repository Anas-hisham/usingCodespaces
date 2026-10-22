import { AlertTriangle, Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PERSIST_FAILED_EVENT, PERSIST_OK_EVENT, store } from '@/store';

/**
 * Shown only when the browser refuses to save (storage full or blocked). Without this the user would keep
 * working while nothing is being saved. Offers a JSON backup so the work can still be rescued.
 */
export function StorageBanner() {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const bad = () => setFailed(true);
    const ok = () => setFailed(false);
    window.addEventListener(PERSIST_FAILED_EVENT, bad);
    window.addEventListener(PERSIST_OK_EVENT, ok);
    return () => { window.removeEventListener(PERSIST_FAILED_EVENT, bad); window.removeEventListener(PERSIST_OK_EVENT, ok); };
  }, []);

  if (!failed) return null;

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(store.getState().crm, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crm-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div role="alert" className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[100] w-[min(92vw,34rem)] bg-rose-600 text-white rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3">
      <AlertTriangle className="w-5 h-5 shrink-0" />
      <p className="text-sm flex-1">Your latest changes could not be saved (browser storage is full or blocked). Download a backup so nothing is lost.</p>
      <button onClick={exportBackup} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-sm font-medium">
        <Download className="w-4 h-4" /> Backup
      </button>
    </div>
  );
}
