/** Label + colours of every lead status (used by the work queue and My Leads). */

export const LEAD_STATUS_STYLE = {
  new: { label: 'New', color: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' },
  discovery: { label: 'Discovery', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  lvm: { label: 'LVM', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  nvm: { label: 'NVM', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  no_response: { label: 'No Response', color: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
  arranged_meeting: { label: 'Meeting', color: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500' },
};
