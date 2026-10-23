/** Campaigns (workflows): the Admin creates them and decides their touch points. */
import type { PayloadAction } from '@reduxjs/toolkit';
import { cleanCampaignCode, validateWorkflowDraft, workflowFromDraft } from '@/domain/workflow/workflowDraft';
import type { WorkflowDraft } from '@/domain/workflow/workflowDraft';
import { findCurrentUser } from '@/store/crm/helpers/currentUserGuards';
import type { AppState } from '@/store/state/AppState';

export const workflowReducers = {
  /**
   * Create a campaign, or change an existing one (matched by its code - the code itself never changes).
   * Leads already in progress keep the touch points they were given; the change applies to every lead taken or
   * transferred AFTER it.
   */
  saveWorkflow(state: AppState, a: PayloadAction<WorkflowDraft>) {
    if (findCurrentUser(state)?.role !== 'admin') return;
    const code = cleanCampaignCode(a.payload.campaignCode);
    const existing = state.workflows.find(w => w.campaignCode === code);
    const others = state.workflows.filter(w => w !== existing).map(w => w.campaignCode);
    if (validateWorkflowDraft({ ...a.payload, campaignCode: code }, others)) return;
    const wf = workflowFromDraft(a.payload, existing?.id ?? crypto.randomUUID(), new Date().toISOString());
    if (existing) Object.assign(existing, wf); else state.workflows.push(wf);
  },
  /** Only a campaign that no lead uses can be deleted (the leads would lose their steps). */
  deleteWorkflow(state: AppState, a: PayloadAction<string>) {
    if (findCurrentUser(state)?.role !== 'admin') return;
    if (state.leads.some(l => l.campaignCode === a.payload)) return;
    state.workflows = state.workflows.filter(w => w.campaignCode !== a.payload);
  },
};
