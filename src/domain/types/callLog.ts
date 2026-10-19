/** What happened on a phone call. */
export type CallType = 'nvm' | 'lvm' | 'discovery';

// Structured outcome reason for a call. Optional: when it is empty the analytics fall back to reading the comment text.
export type CallReason =
  | 'interested' | 'callback' | 'price' | 'timing' | 'not_interested' | 'wrong_contact' | 'no_answer' | 'voicemail' | 'other';

export interface CallLog {
  id: string;
  type: CallType;
  reason?: CallReason;
  description: string;
  timestamp: string;
  editedAt?: string;   // set when the agent edits the log; `timestamp` stays the real time of the call
  touchPointOrder: number;
  // Filled automatically by the store so a log always says who/which step/which round
  agentId?: string;
  agentName?: string;
  touchPointLabel?: string;
  round?: number;
}
