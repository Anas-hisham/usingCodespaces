/** Monthly sales targets. */
import type { Team } from '@/domain/types';

/** Monthly sales target for ONE agent. Team Leader = agents x this. Operation Manager = sum of their teams. */
export const AGENT_SALES_TARGET = 28;

export const teamSalesTarget = (team: Pick<Team, 'agentIds'>) => team.agentIds.length * AGENT_SALES_TARGET;
