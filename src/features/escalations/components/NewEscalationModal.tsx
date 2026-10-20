import { useMemo, useState } from 'react';
import { escalationRecipients, escalationSubjects, reportingLine } from '@/domain/escalation/escalationRules';
import type { Team, User } from '@/domain/types';
import { roleLabel } from '@/domain/user/roleLabel';
import { LeadImportModalShell } from '@/features/lead-pool/components/LeadImportModalShell';
import { TEXT_INPUT_CLASS } from '@/features/lead-pool/formStyles';
import { PersonPicker } from '@/shared/components/PersonPicker';
import type { PickerPerson } from '@/shared/components/PersonPicker';

const ROLE_ORDER = ['agent', 'quality', 'team_leader', 'operation_manager', 'admin'];

/**
 * Raise an escalation about ANYBODY in the account (any team, any role). Both pickers are searchable and show where each person sits
 * (team, Team Leader, Operation Manager, Quality); who can receive it depends on position, see escalationRules.
 */
export function NewEscalationModal({ me, users, teams, onSend, onClose }: {
  me: User; users: User[]; teams: Team[];
  onSend: (d: { aboutId: string; recipientId: string; title: string; details: string }) => void;
  onClose: () => void;
}) {
  const [aboutId, setAboutId] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');

  /** "Team Alpha · TL Sara Ali · OM Ahmed · Quality Mona" - who this person belongs to. */
  const describe = (u: User): string => {
    const l = reportingLine(users, teams, u);
    const parts: string[] = [];
    if (l.team) parts.push(u.role === 'team_leader' ? `Leads ${l.team.name}` : l.team.name);
    if (l.teamLeader) parts.push(`TL ${l.teamLeader.name}`);
    if (l.manager && u.role !== 'operation_manager') parts.push(`OM ${l.manager.name}`);
    if (l.quality) parts.push(`Quality ${l.quality.name}`);
    if (u.lob) parts.push(`LOB ${u.lob}`);
    return parts.join(' · ');
  };

  const subjects = useMemo<PickerPerson[]>(() =>
    escalationSubjects(users, me)
      .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || a.name.localeCompare(b.name))
      .map(user => ({ user, detail: describe(user), group: `${roleLabel(user.role)}s` })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [users, teams, me]);

  const subject = users.find(u => u.id === aboutId);
  const recipients = useMemo(() => (subject ? escalationRecipients(users, teams, me, subject) : []), [users, teams, me, subject]);
  const recipientPeople = useMemo<PickerPerson[]>(() =>
    recipients.map(r => ({ user: r.user, detail: describe(r.user), group: r.reason ? 'Suggested' : 'Other people who can receive it', badge: r.reason || undefined })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recipients, users, teams]);
  const toId = recipients.some(r => r.user.id === recipientId) ? recipientId : recipients[0]?.user.id ?? '';
  const line = subject ? reportingLine(users, teams, subject) : null;
  const canSend = !!subject && !!toId && !!title.trim() && !!details.trim();
  const label = 'block text-sm font-medium text-slate-700 mb-1.5';

  return (
    <LeadImportModalShell title="New Escalation" subtitle="Send a problem to the right person" onClose={onClose}
      footer={<>
        <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
        <button onClick={() => canSend && onSend({ aboutId, recipientId: toId, title, details })} disabled={!canSend}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40">Escalate</button>
      </>}>
      {subjects.length === 0 ? (
        <p className="text-sm text-slate-600">There is nobody you can escalate right now.</p>
      ) : (
        <>
          <div>
            <label className={label}>Who is it about?</label>
            <PersonPicker people={subjects} value={aboutId} onChange={id => { setAboutId(id); setRecipientId(''); }} roleChips
              placeholder="Search any agent, Team Leader, Quality or manager..." />
            {line && subject && (
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs bg-slate-50 rounded-lg px-3 py-2">
                {line.team && <><dt className="text-slate-500">Team</dt><dd className="text-slate-800">{line.team.name}</dd></>}
                {line.teamLeader && <><dt className="text-slate-500">Team Leader</dt><dd className="text-slate-800">{line.teamLeader.name}</dd></>}
                {line.manager && <><dt className="text-slate-500">Operation Manager</dt><dd className="text-slate-800">{line.manager.name}</dd></>}
                {line.quality && <><dt className="text-slate-500">Quality</dt><dd className="text-slate-800">{line.quality.name}</dd></>}
                {subject.lob && <><dt className="text-slate-500">LOB</dt><dd className="text-slate-800">{subject.lob}</dd></>}
                {!line.team && !line.manager && !line.quality && !subject.lob && <dd className="col-span-2 text-slate-500">{roleLabel(subject.role)}</dd>}
              </dl>
            )}
          </div>

          {subject && (
            <div>
              <label className={label}>Send it to</label>
              <PersonPicker people={recipientPeople} value={toId} onChange={setRecipientId} roleChips placeholder="Search who should receive it..." />
              <p className="text-xs text-slate-500 mt-1">Only a Team Leader, Operation Manager or Admin above both of you can receive it. Suggested people are the closest to the case.</p>
            </div>
          )}

          <div><label className={label}>Title</label><input className={TEXT_INPUT_CLASS} value={title} onChange={e => setTitle(e.target.value)} placeholder="What is the problem in a few words?" /></div>
          <div><label className={label}>Details</label><textarea className={`${TEXT_INPUT_CLASS} resize-none`} rows={4} value={details} onChange={e => setDetails(e.target.value)} placeholder="What happened, when, and what you need." /></div>
        </>
      )}
    </LeadImportModalShell>
  );
}
