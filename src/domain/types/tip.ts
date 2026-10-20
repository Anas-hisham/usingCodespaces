/** A piece of advice the Quality team sends to an agent. It is advice, not a task: nothing to complete, the agent only reads it. */
export interface Tip {
  id: string;
  authorId: string;
  authorName: string;
  agentId: string;        // the agent the advice is for
  title: string;
  content: string;
  createdAt: string;
  acknowledgedAt: string | null;   // the agent pressed "Got it"
  seenBy: string[];       // opened the Tips page (clears the number next to "Tips")
}
