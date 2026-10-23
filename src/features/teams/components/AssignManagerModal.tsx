import { useState } from 'react';
import type { Team, User } from '@/domain/types';
import { LeadImportModalShell } from '@/features/lead-pool/components/LeadImportModalShell';
import { TEXT_INPUT_CLASS } from '@/features/lead-pool/formStyles';

/** Admin: give a team to an Operation Manager, or take it away from its manager. */
export function AssignManagerModal({ team, managers, currentLob, onAssign, onClose }: {
  team: Team; managers: User[]; currentLob: string; onAssign: (managerId: string) => void; onClose: () => void;
}) {
  const [managerId, setManagerId] = useState(team.managerId);
  const current = managers.find(m => m.id === team.managerId);
  const next = managers.find(m => m.id === managerId);
  const changesLob = !!next && !!currentLob && next.lob !== currentLob;
  return (
    <LeadImportModalShell title={`Manager of ${team.name}`} subtitle={current ? `Now: ${current.name} (${currentLob || 'no LOB'})` : 'Now: no Operation Manager'} onClose={onClose}
      footer={<>
        <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
        <button onClick={() => onAssign(managerId)} disabled={managerId === team.managerId}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40">Save</button>
      </>}>
      <label className="block">
        <span className="text-xs font-semibold text-slate-600">Operation Manager</span>
        <select value={managerId} onChange={e => setManagerId(e.target.value)} className={`${TEXT_INPUT_CLASS} mt-1`}>
          <option value="">No Operation Manager (remove from the current one)</option>
          {managers.map(m => <option key={m.id} value={m.id}>{m.name} · {m.lob || 'no LOB'}</option>)}
        </select>
      </label>
      <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3">
        Only the manager changes. The team keeps its Team Leader, agents, leads and sales.
      </p>
      {changesLob && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
          {next?.name} is in <b>{next?.lob}</b>, the team is in <b>{currentLob}</b> now. The team moves to {next?.lob}, and any agent whose Quality is
          in {currentLob} loses that Quality (you can give a {next?.lob} Quality afterwards).
        </p>
      )}
    </LeadImportModalShell>
  );
}
