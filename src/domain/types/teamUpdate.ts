/** Announcements from managers to teams. */
export type UpdateAudience = 'all' | 'team_leaders' | 'specific_team';

export interface TeamUpdate {
  id: string;
  audience: UpdateAudience;
  teamId: string | null;
  authorId: string;
  authorName: string;
  title: string;
  content: string;
  createdAt: string;
  acknowledgedBy: string[];
}
