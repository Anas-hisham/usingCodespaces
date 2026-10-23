/** A team: one leader, several agents, one operation manager. */
export interface Team {
  id: string;
  name: string;
  leaderId: string;
  agentIds: string[];
  managerId: string;   // '' = the Admin took the team away from its manager and it has none for now
}
