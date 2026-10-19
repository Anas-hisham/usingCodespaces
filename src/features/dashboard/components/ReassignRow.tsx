import { useState } from 'react';
import type { Lead, User } from '@/domain/types';

export function ReassignRow({ lead, agents, ownerName, onReassign }: {
  lead: Lead; agents: User[]; ownerName: string; onReassign: (agentId: string) => void;
}) {
  const options = agents.filter(a => a.id !== lead.agentId);
  const [target, setTarget] = useState(options[0]?.id ?? '');
  return (
    <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-rose-100">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-900 truncate">{lead.leadCode} — {lead.companyName}</div>
        <div className="text-xs text-slate-600">
          With {ownerName} • left the queue {lead.expiredAt ? new Date(lead.expiredAt).toLocaleDateString() : ''}
        </div>
      </div>
      <select
        value={target} onChange={e => setTarget(e.target.value)}
        className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
      >
        {options.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <button
        onClick={() => target && onReassign(target)}
        disabled={!target}
        className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40"
      >
        Reassign
      </button>
    </div>
  );
}
