/** Tasks assigned by managers (OM -> team leaders / quality, team leader -> agents). */
export interface Task {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  description: string;
  createdAt: string;
  deadline: string;
  assignedTo: string[];
  completedBy: string[];
  seenBy: string[];      // who already opened the Tasks page since this task arrived (this is what clears the number next to "Tasks")
}
