/** Display name of a campaign. */
import type { Workflow } from '@/domain/types';

// ---------------------------------------------------------------------------
// Display names  ("Activation" instead of ACT-001, "1: CALL" instead of 1-call-ACT-001)
// ---------------------------------------------------------------------------
/** "Activation Campaign" -> "Activation". Falls back to the code when there is no workflow. */
export function campaignLabel(workflows: Workflow[], code: string): string {
  const wf = workflows.find(w => w.campaignCode === code);
  return (wf?.name ?? code).replace(/\s+campaign$/i, '').trim();
}
