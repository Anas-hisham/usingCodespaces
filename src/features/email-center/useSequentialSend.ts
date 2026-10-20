/** Sends a list of emails ONE BY ONE (a short pause between each), with progress and a stop button. */
import { useCallback, useEffect, useRef, useState } from 'react';

export interface SendProgress { done: number; total: number; running: boolean }

export function useSequentialSend() {
  const [progress, setProgress] = useState<SendProgress>({ done: 0, total: 0, running: false });
  const cancelRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; cancelRef.current = true; }; }, []);

  const run = useCallback(async <T,>(items: T[], sendOne: (item: T, index: number) => void, delayMs = 400) => {
    cancelRef.current = false;
    setProgress({ done: 0, total: items.length, running: true });
    for (let i = 0; i < items.length; i++) {
      if (cancelRef.current) break;
      sendOne(items[i], i);
      if (!mountedRef.current) return;
      setProgress({ done: i + 1, total: items.length, running: true });
      if (i < items.length - 1) await new Promise(r => setTimeout(r, delayMs));
    }
    if (mountedRef.current) setProgress(p => ({ ...p, running: false }));
  }, []);

  const stop = useCallback(() => { cancelRef.current = true; }, []);
  return { progress, run, stop };
}
