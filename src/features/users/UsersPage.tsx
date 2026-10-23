import { useMemo, useState } from 'react';
import { BadgeCheck, CheckCircle2, Crown, Eye, EyeOff, Headphones, Shield, UserPlus, X } from 'lucide-react';
import { LOB_CODES, lobOf, lobOfTeam } from '@/domain/org/orgRules';
import { DEFAULT_DAILY_CALL_TARGET, qualityChoicesForTeam, validateNewUser, type CreatableRole, type NewUserInput } from '@/domain/user/newUser';
import { roleLabel } from '@/domain/user/roleLabel';
import { TEXT_INPUT_CLASS } from '@/features/lead-pool/formStyles';
import { UserAvatar } from '@/shared/components/UserAvatar';
import { createUser, useStore } from '@/store';

const ROLE_CARDS: { role: CreatableRole; icon: typeof Crown; hint: string; tone: string }[] = [
  { role: 'operation_manager', icon: Crown, hint: 'Runs a line of business', tone: 'text-blue-600 bg-blue-50' },
  { role: 'team_leader', icon: Shield, hint: 'Leads a new team', tone: 'text-violet-600 bg-violet-50' },
  { role: 'agent', icon: Headphones, hint: 'Works in a team', tone: 'text-cyan-600 bg-cyan-50' },
  { role: 'quality', icon: BadgeCheck, hint: 'Follows agents of a LOB', tone: 'text-amber-600 bg-amber-50' },
];

const LABEL = 'text-xs font-semibold text-slate-600';
const HINT = 'text-xs text-slate-500 mt-1';

/** Admin only: create an Operation Manager, a Team Leader (with his new team) or an agent, each with their own name, email and password. */
export function UsersPage() {
  const { state, dispatch } = useStore();
  const { users, teams } = state;

  const [role, setRole] = useState<CreatableRole>('agent');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [lob, setLob] = useState('');
  const [teamName, setTeamName] = useState('');
  const [managerId, setManagerId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [qualityId, setQualityId] = useState('');
  const [target, setTarget] = useState(String(DEFAULT_DAILY_CALL_TARGET));
  const [showError, setShowError] = useState(false);
  const [created, setCreated] = useState<{ name: string; email: string; role: CreatableRole } | null>(null);

  const managers = users.filter(u => u.role === 'operation_manager');
  const nameOf = (id: string) => users.find(u => u.id === id)?.name ?? '—';
  const qualityOptions = useMemo(() => qualityChoicesForTeam(users, teams, teamId), [users, teams, teamId]);
  const team = teams.find(t => t.id === teamId);
  const teamLob = lobOfTeam(users, team);
  const chosenManager = users.find(u => u.id === managerId);

  const input: NewUserInput =
    role === 'operation_manager' || role === 'quality' ? { role, name, email, password, lob }
    : role === 'team_leader' ? { role, name, email, password, teamName, managerId }
    : { role, name, email, password, teamId, qualityId, dailyCallTarget: Number(target) };
  const error = validateNewUser(users, teams, input);

  const submit = () => {
    setShowError(true);
    if (error) return;
    dispatch(createUser(input));
    setCreated({ name: name.trim(), email: email.trim(), role });
    setName(''); setEmail(''); setPassword(''); setShowPassword(false);
    setLob(''); setTeamName(''); setManagerId(''); setTeamId(''); setQualityId(''); setTarget(String(DEFAULT_DAILY_CALL_TARGET));
    setShowError(false);
  };

  const pickRole = (r: CreatableRole) => { setRole(r); setShowError(false); };
  const recent = users.filter(u => u.password !== undefined).reverse().slice(0, 8);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-900 mb-1">Create User</h2>
        <p className="text-sm text-slate-600">Only the Admin creates accounts. Each person signs in with the name, email and password you set here.</p>
      </div>

      {created && (
        <div role="status" className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 text-sm text-emerald-900">
            <b>{created.name}</b> was created as {roleLabel(created.role)}. Email: <span className="break-all">{created.email}</span>
          </div>
          <button onClick={() => setCreated(null)} className="w-7 h-7 -mr-1 flex items-center justify-center rounded-lg text-emerald-700 hover:bg-emerald-100" aria-label="Dismiss"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-sm text-slate-900">New account</h3>
          </div>

          <div className="px-4 sm:px-6 py-5 space-y-5">
            {/* 1. who */}
            <div>
              <div className={`${LABEL} mb-1.5`}>Role</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Role">
                {ROLE_CARDS.map(c => {
                  const selected = role === c.role;
                  return (
                    <button
                      key={c.role} type="button" role="radio" aria-checked={selected} onClick={() => pickRole(c.role)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl border text-left transition-all ${selected ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'}`}
                    >
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${c.tone}`}><c.icon className="w-4 h-4" /></span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-900">{roleLabel(c.role)}</span>
                        <span className="block text-xs text-slate-600">{c.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. the account */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block sm:col-span-2">
                <span className={LABEL}>Full name</span>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sara Mahmoud" autoComplete="off" className={`mt-1 ${TEXT_INPUT_CLASS}`} />
              </label>
              <label className="block">
                <span className={LABEL}>Email</span>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" autoComplete="off" className={`mt-1 ${TEXT_INPUT_CLASS}`} />
              </label>
              <label className="block">
                <span className={LABEL}>Password</span>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="At least 6 characters" autoComplete="new-password" className={`${TEXT_INPUT_CLASS} pr-11`}
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </label>
            </div>

            {/* 3. where he sits: depends on the role */}
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-4">
              {(role === 'operation_manager' || role === 'quality') && (
                <label className="block">
                  <span className={LABEL}>Line of business (LOB)</span>
                  <select value={lob} onChange={e => setLob(e.target.value)} className={`mt-1 ${TEXT_INPUT_CLASS}`}>
                    <option value="">Select a LOB</option>
                    {LOB_CODES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <p className={HINT}>{role === 'quality' ? 'He can be given to agents of this LOB only.' : 'The teams, Team Leaders and agents he manages take this LOB.'}</p>
                </label>
              )}

              {role === 'team_leader' && (
                <>
                  <label className="block">
                    <span className={LABEL}>New team name</span>
                    <input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="e.g. Team Eta" className={`mt-1 ${TEXT_INPUT_CLASS}`} />
                    <p className={HINT}>A Team Leader always leads a team. This one is created now and starts with no agents.</p>
                  </label>
                  <label className="block">
                    <span className={LABEL}>Operation Manager</span>
                    <select value={managerId} onChange={e => setManagerId(e.target.value)} className={`mt-1 ${TEXT_INPUT_CLASS}`}>
                      <option value="">No manager for now</option>
                      {managers.map(m => <option key={m.id} value={m.id}>{m.name} · {m.lob ?? 'No LOB'}</option>)}
                    </select>
                    <p className={HINT}>{chosenManager ? `The team will be in the ${chosenManager.lob ?? '—'} line of business.` : 'Without a manager the team has no LOB. You can give it one later from Teams.'}</p>
                  </label>
                </>
              )}

              {role === 'agent' && (
                <>
                  <label className="block">
                    <span className={LABEL}>Team</span>
                    <select value={teamId} onChange={e => { setTeamId(e.target.value); setQualityId(''); }} className={`mt-1 ${TEXT_INPUT_CLASS}`}>
                      <option value="">Select a team</option>
                      {teams.map(t => {
                        const l = lobOfTeam(users, t);
                        return <option key={t.id} value={t.id}>{t.name} · TL {nameOf(t.leaderId)} · {l ? `${nameOf(t.managerId)} (${l})` : 'no manager'}</option>;
                      })}
                    </select>
                  </label>
                  <label className="block">
                    <span className={LABEL}>Quality</span>
                    <select value={qualityId} onChange={e => setQualityId(e.target.value)} disabled={!team} className={`mt-1 ${TEXT_INPUT_CLASS}`}>
                      <option value="">No Quality for now</option>
                      {qualityOptions.map(q => <option key={q.id} value={q.id}>{q.name} · {q.lob}</option>)}
                    </select>
                    <p className={HINT}>
                      {!team ? 'Choose a team first.'
                        : teamLob ? `Only Quality of the ${teamLob} line of business are listed.`
                        : 'This team has no manager, so it has no LOB. Give the agent a Quality later from Teams.'}
                    </p>
                  </label>
                  <label className="block">
                    <span className={LABEL}>Daily call target</span>
                    <input type="number" min={1} max={500} value={target} onChange={e => setTarget(e.target.value)} className={`mt-1 sm:max-w-[10rem] ${TEXT_INPUT_CLASS}`} />
                  </label>
                  {team && (
                    <p className="text-xs text-slate-600 bg-white rounded-lg border border-slate-200 p-3">
                      Will report to <b>{nameOf(team.leaderId)}</b> (Team Leader){teamLob && <> under <b>{nameOf(team.managerId)}</b></>} · LOB: <b>{teamLob || 'none'}</b>.
                    </p>
                  )}
                </>
              )}
            </div>

            {showError && error && <p role="alert" className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{error}</p>}
          </div>

          <div className="px-4 sm:px-6 py-4 border-t border-slate-100 flex justify-end">
            <button onClick={submit} className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5">
              <UserPlus className="w-4 h-4" />Create {roleLabel(role)}
            </button>
          </div>
        </div>

        {/* what the Admin created lately */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100 font-semibold text-sm text-slate-900">Recently created</div>
          {recent.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">No accounts created yet</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map(u => {
                const l = lobOf(users, teams, u);
                const t = teams.find(x => x.id === u.teamId);
                return (
                  <li key={u.id} className="flex items-center gap-3 px-4 py-3">
                    <UserAvatar user={u} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">{u.name}</div>
                      <div className="text-xs text-slate-600 truncate">{u.email}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">{roleLabel(u.role)}</span>
                        {t && <span className="text-[11px] font-medium text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full">{t.name}</span>}
                        {l && <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">{l}</span>}
                        {u.qualityId && <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1"><BadgeCheck className="w-3 h-3" />{nameOf(u.qualityId).split(' ')[0]}</span>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
