import type { Workflow } from '@/domain/types';

/** One workflow per campaign: the ordered touch point TEMPLATE every new lead of that campaign gets. */
export function createSeedWorkflows(): Workflow[] {
  return [
    {
      id: 'w-1', campaignCode: 'ACT-001', name: 'Activation Campaign',
      touchPoints: [
        { order: 0, type: 'call', label: 'Initial Call', dayOffset: 0 },
        { order: 1, type: 'email', label: 'Follow-up Email', dayOffset: 1 },
        { order: 2, type: 'call', label: 'Second Call', dayOffset: 2 },
        { order: 3, type: 'email', label: 'Second Email', dayOffset: 4 },
        { order: 4, type: 'call', label: 'Final Call', dayOffset: 5 },
        { order: 5, type: 'email', label: 'Final Email', dayOffset: 7 },
      ],
    },
    {
      id: 'w-2', campaignCode: 'RET-002', name: 'Retention Campaign',
      touchPoints: [
        { order: 0, type: 'call', label: 'Outreach Call', dayOffset: 0 },
        { order: 1, type: 'email', label: 'Welcome Email', dayOffset: 1 },
        { order: 2, type: 'call', label: 'Check-in Call', dayOffset: 3 },
        { order: 3, type: 'email', label: 'Offer Email', dayOffset: 5 },
      ],
    },
  ];
}
