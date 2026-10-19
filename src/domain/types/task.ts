/** Tasks assigned by managers. */
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
}
