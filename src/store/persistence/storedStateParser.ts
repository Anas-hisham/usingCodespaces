/** Reads a saved state defensively and upgrades data saved by older versions. */
import { migrateSale } from '@/domain/sales/saleMigration';
import type { Lead, Sale } from '@/domain/types';
import { createInitialState } from '@/store/seed/createInitialState';
import type { AppState } from '@/store/state/AppState';

const ARRAY_KEYS = [
  'users', 'teams', 'workflows', 'leads', 'meetings', 'updates', 'tasks',
  'emailTemplates', 'emailLogs', 'notifications', 'sales', 'tips',
] as const;

/**
 * Reads a saved state defensively. Returns null when the text is not a usable state (so the caller falls back to
 * a fresh one instead of crashing). Missing lists are filled from the defaults, and old data is upgraded.
 */
export function parseStoredState(raw: string): AppState | null {
  try {
    const parsed = JSON.parse(raw) as Partial<AppState> | null;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.leads) || !Array.isArray(parsed.users)) return null;
    const fresh = createInitialState();
    const state = { ...fresh, ...parsed } as AppState;
    const bag = state as unknown as Record<string, unknown>;
    for (const k of ARRAY_KEYS) if (!Array.isArray(bag[k])) bag[k] = fresh[k];
    if (typeof state.currentUserId !== 'string') state.currentUserId = '';

    // a lead missing one of its lists would crash every screen that reads it
    state.leads = state.leads.map(l => ({
      ...l,
      touchPoints: l.touchPoints ?? [],
      callLogs: l.callLogs ?? [],
      history: l.history ?? [],
    }));
    // Older sales had an optional leadId: link them by company name when possible (leadId is required now)
    state.sales = state.sales.map((x: Sale) =>
      x.leadId ? x : { ...x, leadId: state.leads.find((l: Lead) => l.companyName === x.leadName)?.id ?? '' });
    // Older sales had other sale types and a "what the customer got" text: convert them
    state.sales = state.sales.map(migrateSale);
    // Updates / tasks saved before "seen" existed: count them as seen, so nobody opens the app to a pile of numbers
    const everyone = state.users.map(u => u.id);
    state.updates = state.updates.map(u => ({ ...u, seenBy: u.seenBy ?? everyone, acknowledgedBy: u.acknowledgedBy ?? [] }));
    state.tasks = state.tasks.map(t => ({ ...t, seenBy: t.seenBy ?? everyone, completedBy: t.completedBy ?? [] }));
    // Old broadcast notifications (no owner) reached people who had nothing to do with them: drop them
    state.notifications = state.notifications.filter(n => !!n.userId);
    // Older saved data: add the Quality user so nothing breaks after an upgrade.
    if (!state.users.some(u => u.role === 'quality')) state.users.push(...fresh.users.filter(u => u.role === 'quality'));
    // same for the Admin (the only role that creates leads)
    if (!state.users.some(u => u.role === 'admin')) state.users.unshift(...fresh.users.filter(u => u.role === 'admin'));
    return state;
  } catch {
    return null;
  }
}
