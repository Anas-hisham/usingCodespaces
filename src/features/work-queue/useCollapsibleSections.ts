import { useState } from 'react';

/**
 * Open/closed state of every collapsible block of the work queue (campaign, Today/Next/Stop, step, category).
 * Only the blocks the agent FLIPPED away from their default are remembered: campaign + Today open, Next + Stop closed.
 */
export function useCollapsibleSections() {
  const [flipped, setFlipped] = useState<Set<string>>(new Set());

  const isOpen = (key: string, defaultOpen: boolean) => (flipped.has(key) ? !defaultOpen : defaultOpen);
  const toggle = (key: string) =>
    setFlipped(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  return { isOpen, toggle };
}

export type CollapsibleSections = ReturnType<typeof useCollapsibleSections>;
