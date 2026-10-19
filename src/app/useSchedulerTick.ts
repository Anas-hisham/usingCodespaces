import { useEffect } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { runScheduledJobs } from '@/store';

const SCHEDULER_INTERVAL_MS = 30000;

/**
 * Runs the timed rules (meeting reminders, meeting-day end, 15-day rule, automatic emails) while somebody is signed in.
 * A real backend would run these as background jobs instead.
 */
export function useSchedulerTick(isSignedIn: boolean) {
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (!isSignedIn) return;
    dispatch(runScheduledJobs());
    const t = setInterval(() => dispatch(runScheduledJobs()), SCHEDULER_INTERVAL_MS);
    return () => clearInterval(t);
  }, [isSignedIn, dispatch]);
}
