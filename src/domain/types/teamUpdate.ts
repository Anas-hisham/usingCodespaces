/** Announcements from managers to teams. */
export type UpdateAudience = 'all' | 'team_leaders' | 'quality' | 'specific_team';

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
  seenBy: string[];      // who already opened the Team Updates page since this update arrived (clears the number next to "Team Updates")
}
