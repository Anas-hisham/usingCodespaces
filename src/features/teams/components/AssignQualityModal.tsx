import { useState } from 'react';
import type { User } from '@/domain/types';
import { LeadImportModalShell } from '@/features/lead-pool/components/LeadImportModalShell';
import { TEXT_INPUT_CLASS } from '@/features/lead-pool/formStyles';

/** Admin: the Quality who follows an agent. Only Quality members of the agent's own line of business are offered. */
export function AssignQualityModal({ agent, choices, lob, users, onAssign, onClose }: {
  agent: User; choices: User[]; lob: string; users: User[]; onAssign: (qualityId: string) => void; onClose: () => void;
}) {
  const [qualityId, setQualityId] = useState(agent.qualityId ?? '');
  const current = users.find(u => u.id === agent.qualityId);
  const countOf = (q: User) => users.filter(u => u.role === 'agent' && u.qualityId === q.id).length;
  return (
    <LeadImportModalShell title={`Quality for ${agent.name}`} subtitle={`${lob ? `Line of business ${lob}` : 'No line of business'} · now: ${current?.name ?? 'none'}`} onClose={onClose}
      footer={<>
        <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
        <button onClick={() => onAssign(qualityId)} disabled={qualityId === (agent.qualityId ?? '') || (!lob)}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40">Save</button>
      </>}>
      {!lob ? (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">This agent’s team has no Operation Manager, so it has no line of business yet. Give the team a manager first.</p>
      ) : (
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Quality ({lob} only)</span>
          <select value={qualityId} onChange={e => setQualityId(e.target.value)} className={`${TEXT_INPUT_CLASS} mt-1`}>
            <option value="">No Quality</option>
            {choices.map(q => <option key={q.id} value={q.id}>{q.name} · follows {countOf(q)} agents</option>)}
          </select>
        </label>
      )}
    </LeadImportModalShell>
  );
}
