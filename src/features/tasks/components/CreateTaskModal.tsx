import { Send, X } from 'lucide-react';
import { useState } from 'react';
import type { Task, User } from '@/domain/types';
import { roleLabel } from '@/domain/user/roleLabel';

export function CreateTaskModal({
  currentUser, assignees, onClose, onCreate,
}: {
  currentUser: User;
  assignees: User[];
  onClose: () => void;
  onCreate: (task: Task) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [assignAll, setAssignAll] = useState(true);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

  const assigneeLabel = currentUser.role === 'operation_manager' ? 'Team Leaders & Quality' : 'Agents';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-slide-up">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">New Task</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
            <input
              type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Task title..."
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Task details..." rows={3}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Deadline</label>
            <input
              type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Assign To</label>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => { setAssignAll(true); setSelectedAssignees([]); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${assignAll ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                All {assigneeLabel}
              </button>
              <button
                onClick={() => setAssignAll(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${!assignAll ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                Select Specific
              </button>
            </div>
            {!assignAll && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin">
                {assignees.map(a => (
                  <label key={a.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedAssignees.includes(a.id)}
                      onChange={e => {
                        if (e.target.checked) setSelectedAssignees([...selectedAssignees, a.id]);
                        else setSelectedAssignees(selectedAssignees.filter(id => id !== a.id));
                      }}
                      className="rounded"
                    />
                    <span className="text-sm text-slate-700">{a.name}</span>
                    {currentUser.role === 'operation_manager' && <span className="ml-auto text-[11px] text-slate-500">{roleLabel(a.role)}</span>}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
          <button
            onClick={() => {
              if (!title.trim()) return;
              const assignedTo = assignAll ? assignees.map(a => a.id) : selectedAssignees;
              const task: Task = {
                id: crypto.randomUUID(),
                authorId: currentUser.id, authorName: currentUser.name,
                title, description,
                createdAt: new Date().toISOString(),
                deadline: deadline || new Date(Date.now() + 7 * 86400000).toISOString(),
                assignedTo, completedBy: [], seenBy: [currentUser.id],
              };
              onCreate(task);
              setTitle(''); setDescription(''); setDeadline('');
            }}
            disabled={!title.trim() || (!assignAll && selectedAssignees.length === 0)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition-all flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            Create Task
          </button>
        </div>
      </div>
    </div>
  );
}
