import type { User, UserRole } from '@/domain/types';

const initialsOf = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

/** id, full name, role, team, avatar colour */
type Row = [string, string, UserRole, string | undefined, string];

const ROWS: Row[] = [
  ['u-admin', 'System Admin', 'admin', undefined, '#475569'],
  // operation managers
  ['u-om', 'Ahmed Hassan', 'operation_manager', undefined, '#1e40af'],
  ['u-om2', 'Layla Farouk', 'operation_manager', undefined, '#9333ea'],
  // team leaders
  ['u-tl1', 'Sara Mahmoud', 'team_leader', 't-1', '#0d9488'],
  ['u-tl2', 'Omar Khaled', 'team_leader', 't-2', '#0891b2'],
  ['u-tl3', 'Dina Wael', 'team_leader', 't-3', '#be185d'],
  ['u-tl4', 'Tamer Zaki', 'team_leader', 't-4', '#4d7c0f'],
  ['u-tl5', 'Mostafa Gaber', 'team_leader', 't-5', '#b45309'],
  ['u-tl6', 'Nadine Rashad', 'team_leader', 't-6', '#6d28d9'],
  // Team Alpha
  ['u-a1', 'Mona Ali', 'agent', 't-1', '#e11d48'],
  ['u-a2', 'Khaled Mostafa', 'agent', 't-1', '#ea580c'],
  ['u-a5', 'Rana Hegazy', 'agent', 't-1', '#db2777'],
  ['u-a6', 'Mahmoud Fathy', 'agent', 't-1', '#0f766e'],
  // Team Beta
  ['u-a3', 'Nour Ibrahim', 'agent', 't-2', '#0284c7'],
  ['u-a4', 'Yousef Adel', 'agent', 't-2', '#16a34a'],
  ['u-a7', 'Salma Gamal', 'agent', 't-2', '#c026d3'],
  ['u-a8', 'Ali Tarek', 'agent', 't-2', '#ca8a04'],
  // Team Gamma
  ['u-a9', 'Hossam Nabil', 'agent', 't-3', '#2563eb'],
  ['u-a10', 'Mariam Essam', 'agent', 't-3', '#dc2626'],
  ['u-a11', 'Karim Sherif', 'agent', 't-3', '#059669'],
  // Team Delta
  ['u-a12', 'Reem Ashraf', 'agent', 't-4', '#7c3aed'],
  ['u-a13', 'Ziad Hany', 'agent', 't-4', '#0369a1'],
  ['u-a14', 'Farida Magdy', 'agent', 't-4', '#e11d48'],
  ['u-a15', 'Amr Salah', 'agent', 't-4', '#65a30d'],
  // Team Epsilon
  ['u-a16', 'Heba Sayed', 'agent', 't-5', '#d97706'],
  ['u-a17', 'Walid Anwar', 'agent', 't-5', '#0e7490'],
  ['u-a18', 'Jana Mamdouh', 'agent', 't-5', '#a21caf'],
  // Team Zeta
  ['u-a19', 'Fady Samir', 'agent', 't-6', '#15803d'],
  ['u-a20', 'Aya Mohsen', 'agent', 't-6', '#c2410c'],
  ['u-a21', 'Bassem Lotfy', 'agent', 't-6', '#4338ca'],
  // quality
  ['u-q1', 'Hana Samy', 'quality', undefined, '#7c3aed'],
  ['u-q2', 'Ibrahim Naguib', 'quality', undefined, '#0f766e'],
  ['u-q3', 'Mai Fouad', 'quality', undefined, '#b45309'],
  ['u-q4', 'Tarek Lotfy', 'quality', undefined, '#0369a1'],
];

/** Each Operation Manager runs one line of business; teams, Team Leaders and agents belong to the LOB of their manager (see seedTeams). */
const OM_LOB: Record<string, string> = { 'u-om': 'REG', 'u-om2': 'DJ' };
const QUALITY_LOB: Record<string, string> = { 'u-q1': 'REG', 'u-q3': 'REG', 'u-q2': 'DJ', 'u-q4': 'DJ' };
/** Teams t-1..t-4 are managed by Ahmed (REG), t-5..t-6 by Layla (DJ). Agents are shared out between the Quality members of their LOB. */
const TEAM_LOB: Record<string, string> = { 't-1': 'REG', 't-2': 'REG', 't-3': 'REG', 't-4': 'REG', 't-5': 'DJ', 't-6': 'DJ' };

const SUFFIX: Record<UserRole, string> = { admin: '', operation_manager: 'om', team_leader: 'tl', agent: 'agent', quality: 'quality' };

/** The demo people: 1 admin, 2 operation managers (REG and DJ), 6 team leaders (each with a team of 3-4 agents) and 4 Quality members (2 per LOB). */
export function createSeedUsers(): User[] {
  const qualityIdsOf = (lob: string) => Object.keys(QUALITY_LOB).filter(id => QUALITY_LOB[id] === lob);
  const agentCount: Record<string, number> = {};
  return ROWS.map(([id, name, role, teamId, color]) => {
    const lob = role === 'operation_manager' ? OM_LOB[id] : role === 'quality' ? QUALITY_LOB[id] : undefined;
    let qualityId: string | undefined;
    if (role === 'agent' && teamId) {
      const agentLob = TEAM_LOB[teamId];
      const options = qualityIdsOf(agentLob);
      qualityId = options[(agentCount[agentLob] = (agentCount[agentLob] ?? -1) + 1) % options.length];
    }
    const first = name.split(' ')[0].toLowerCase();
    return {
      id, name, role, color, initials: initialsOf(name),
      username: role === 'admin' ? 'admin' : `${first}.${SUFFIX[role]}`,
      email: role === 'admin' ? 'admin@company.com' : `${first}@company.com`,
      ...(teamId ? { teamId } : {}),
      ...(lob ? { lob } : {}),
      ...(qualityId ? { qualityId } : {}),
      dailyCallTarget: role === 'agent' ? 90 : 0,
    };
  });
}
