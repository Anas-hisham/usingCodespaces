/** Types used only by the Sales screen. */
import type { Team, User } from '@/domain/types';

export type SortDirection = 'desc' | 'asc';

export interface TeamGroup { team: Team; leader?: User; agents: User[] }
