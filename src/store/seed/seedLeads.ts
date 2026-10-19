import type { Lead, User, Workflow } from '@/domain/types';

/**
 * Demo leads: a few already taken by every agent at different workflow stages, plus 40 waiting in the shared pool.
 */
export function createSeedLeads(users: User[], workflows: Workflow[]): Lead[] {
  const today = new Date();
  const day = (offset: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return d.toISOString();
  };

  function makeTouchPoints(wf: Workflow, completed: number) {
    return wf.touchPoints.map(tp => {
      if (tp.order < completed) {
        return { ...tp, status: 'completed' as const, completedAt: day(-5 + tp.order), dueDate: day(-5 + tp.order) };
      }
      const dueOffset = completed === 0 ? 0 : tp.dayOffset - wf.touchPoints[completed - 1].dayOffset;
      const due = day(dueOffset);
      return { ...tp, status: new Date(due) < today ? 'overdue' as const : 'pending' as const, completedAt: null, dueDate: due };
    });
  }

  // ---- demo data (old sample data removed) ----
  const COMPANIES = [
    'Red Sea Shipping', 'Oasis Farms', 'Memphis Textiles', 'Nubian Dairy', 'Delta Steel Works', 'Cairo Print House',
    'Pharaoh Foods', 'Aswan Ceramics', 'Sinai Mining', 'Giza Plastics', 'Nile Pharma', 'Alex Marine Services',
    'Luxor Tours', 'Suez Logistics', 'Tanta Cotton Mills', 'Mansoura Electronics', 'Hurghada Diving Co', 'Fayoum Olive Oil',
    'Siwa Dates', 'Port Said Trading', 'Ismailia Cement', 'Sharm Resorts Supply', 'Zamalek Design Studio', 'Maadi Software House',
    'Heliopolis Dental Group', 'Nasr City Auto Parts', 'October Furniture', 'Obour Packaging', 'Shorouk Real Estate', 'Rehab Catering',
    'Damietta Furniture', 'Minya Sugar', 'Assiut Cables', 'Sohag Textiles', 'Qena Pottery', 'Beni Suef Cement',
    'Kafr El Sheikh Rice', 'Beheira Poultry', 'Sadat Industrial Group', 'Borg El Arab Steel',
  ];
  const CONTACTS = ['Karim Nabil', 'Dina Fathy', 'Adel Samir', 'Salma Reda', 'Hossam Aly', 'Mariam Zaki', 'Tarek Fawzy', 'Heba Lotfy', 'Wael Saad', 'Nada Emad'];
  const mkLead = (i: number): Omit<Lead, 'agentId' | 'touchPoints' | 'currentTouchPoint' | 'callLogs' | 'history' | 'assignedAt'> => ({
    id: `l-${i + 1}`,
    leadCode: `LD${String(i + 1).padStart(3, '0')}`,
    campaignCode: i % 2 === 0 ? 'ACT-001' : 'RET-002',
    companyName: COMPANIES[i % COMPANIES.length],
    contactName: CONTACTS[i % CONTACTS.length],
    phone: `+20 1${(i % 3) } ${String(100 + i).padStart(3, '0')} ${String(1000 + i * 37).slice(-4)}`,
    email: `contact${i + 1}@${COMPANIES[i % COMPANIES.length].toLowerCase().replace(/[^a-z]/g, '')}.com`,
    status: 'new', stopped: false, removedFromQueue: false, removedAt: null,
  });

  // A few leads already taken by every agent, at different stages of the workflow
  const agentIds = users.filter(u => u.role === 'agent').map(u => u);
  const STAGES: { done: number; call?: { type: 'nvm' | 'lvm' | 'discovery'; text: string } }[] = [
    { done: 0 },
    { done: 1, call: { type: 'lvm', text: 'Left a voicemail, asked for a call back.' } },
    { done: 2, call: { type: 'discovery', text: 'Interested, asked for more details.' } },
  ];
  const leads: Lead[] = [];
  let n = 0;
  agentIds.forEach(agent => {
    STAGES.forEach((stage, k) => {
      const base = mkLead(n++);
      const wf = workflows.find(w => w.campaignCode === base.campaignCode)!;
      const assigned = day(-(k + 2));
      const tps = makeTouchPoints(wf, stage.done);
      leads.push({
        ...base, agentId: agent.id, assignedAt: assigned,
        status: stage.call ? stage.call.type : 'new',
        touchPoints: tps,
        currentTouchPoint: tps.find(t => t.status === 'pending' || t.status === 'overdue')?.order ?? -1,
        callLogs: stage.call ? [{
          id: `cl-${n}`, type: stage.call.type, description: stage.call.text, timestamp: day(-(k + 1)),
          touchPointOrder: 0, agentId: agent.id, agentName: agent.name, touchPointLabel: wf.touchPoints[0].label, round: 1,
        }] : [],
        history: [{ id: `h-${n}`, action: 'taken_from_pool', timestamp: assigned, userId: agent.id, userName: agent.name, detail: `Taken from the pool by ${agent.name}`, round: 1, agentId: agent.id }],
        discoveryReached: stage.call?.type === 'discovery',
        lastActivityAt: assigned,
      });
    });
  });

  // The shared pool: created by the Admin, nobody owns them yet
  for (let i = 0; i < 40; i++) {
    const base = mkLead(n++);
    leads.push({
      ...base, agentId: '', assignedAt: day(-1), touchPoints: [], currentTouchPoint: -1, callLogs: [],
      history: [{ id: `h-pool-${i + 1}`, action: 'created', timestamp: day(-1), userId: 'u-admin', userName: 'System Admin', detail: 'Lead created by the Admin (in the pool)' }],
    });
  }
  return leads;
}
