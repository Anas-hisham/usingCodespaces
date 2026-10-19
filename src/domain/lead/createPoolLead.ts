/** A brand new lead in the pool: no agent, no workflow yet. */
import type { Lead } from '@/domain/types';

/** A brand new lead in the pool: no agent, no workflow yet (it starts when an agent takes it). */
export function createPoolLead(
  adminId: string, adminName: string,
  f: { leadCode: string; campaignCode: string; companyName: string; contactName: string; phone: string; email: string },
): Lead {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(), ...f,
    status: 'new', agentId: '', assignedAt: now, touchPoints: [], currentTouchPoint: -1, callLogs: [],
    history: [{ id: crypto.randomUUID(), action: 'created', timestamp: now, userId: adminId, userName: adminName, detail: 'Lead created by the Admin (in the pool)' }],
    stopped: false, removedFromQueue: false, removedAt: null,
  };
}
