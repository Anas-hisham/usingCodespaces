import type {
  User, Team, Workflow, Lead, Meeting, TeamUpdate, Task,
  EmailTemplate, EmailLog, Notification, Sale,
} from '@/types';

export interface AppState {
  currentUserId: string;
  users: User[];
  teams: Team[];
  workflows: Workflow[];
  leads: Lead[];
  meetings: Meeting[];
  updates: TeamUpdate[];
  tasks: Task[];
  emailTemplates: EmailTemplate[];
  emailLogs: EmailLog[];
  notifications: Notification[];
  sales: Sale[];
}

export function createInitialState(): AppState {
  const users: User[] = [
    { id: 'u-om', username: 'ahmed.om', name: 'Ahmed Hassan', email: 'om@company.com', role: 'operation_manager', initials: 'AH', color: '#1e40af', dailyCallTarget: 0 },
    { id: 'u-tl1', username: 'sara.tl', name: 'Sara Mahmoud', email: 'sara@company.com', role: 'team_leader', teamId: 't-1', initials: 'SM', color: '#0d9488', dailyCallTarget: 0 },
    { id: 'u-tl2', username: 'omar.tl', name: 'Omar Khaled', email: 'omar@company.com', role: 'team_leader', teamId: 't-2', initials: 'OK', color: '#0891b2', dailyCallTarget: 0 },
    { id: 'u-a1', username: 'mona.agent', name: 'Mona Ali', email: 'mona@company.com', role: 'agent', teamId: 't-1', initials: 'MA', color: '#e11d48', dailyCallTarget: 90 },
    { id: 'u-a2', username: 'khaled.agent', name: 'Khaled Mostafa', email: 'khaled@company.com', role: 'agent', teamId: 't-1', initials: 'KM', color: '#ea580c', dailyCallTarget: 90 },
    { id: 'u-a3', username: 'nour.agent', name: 'Nour Ibrahim', email: 'nour@company.com', role: 'agent', teamId: 't-2', initials: 'NI', color: '#0284c7', dailyCallTarget: 90 },
    { id: 'u-a4', username: 'yousef.agent', name: 'Yousef Adel', email: 'yousef@company.com', role: 'agent', teamId: 't-2', initials: 'YA', color: '#16a34a', dailyCallTarget: 90 },
    { id: 'u-q1', username: 'hana.quality', name: 'Hana Samy', email: 'hana@company.com', role: 'quality', initials: 'HS', color: '#7c3aed', dailyCallTarget: 0 },
  ];

  const teams: Team[] = [
    { id: 't-1', name: 'Team Alpha', leaderId: 'u-tl1', agentIds: ['u-a1', 'u-a2'], managerId: 'u-om' },
    { id: 't-2', name: 'Team Beta', leaderId: 'u-tl2', agentIds: ['u-a3', 'u-a4'], managerId: 'u-om' },
  ];

  const workflows: Workflow[] = [
    {
      id: 'w-1', campaignCode: 'ACT-001', name: 'Activation Campaign',
      touchPoints: [
        { order: 0, type: 'call', label: 'Initial Call', dayOffset: 0 },
        { order: 1, type: 'email', label: 'Follow-up Email', dayOffset: 1 },
        { order: 2, type: 'call', label: 'Second Call', dayOffset: 2 },
        { order: 3, type: 'email', label: 'Second Email', dayOffset: 4 },
        { order: 4, type: 'call', label: 'Final Call', dayOffset: 5 },
        { order: 5, type: 'email', label: 'Final Email', dayOffset: 7 },
      ],
    },
    {
      id: 'w-2', campaignCode: 'RET-002', name: 'Retention Campaign',
      touchPoints: [
        { order: 0, type: 'call', label: 'Outreach Call', dayOffset: 0 },
        { order: 1, type: 'email', label: 'Welcome Email', dayOffset: 1 },
        { order: 2, type: 'call', label: 'Check-in Call', dayOffset: 3 },
        { order: 3, type: 'email', label: 'Offer Email', dayOffset: 5 },
      ],
    },
  ];

  const today = new Date();
  const day = (offset: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return d.toISOString();
  };

  // Same as day() but at a given hour, so call-time analysis has realistic variety
  const at = (offset: number, hour: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    d.setHours(hour, 0, 0, 0);
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

  const leads: Lead[] = [
    {
      id: 'l-1', leadCode: 'LD-001', campaignCode: 'ACT-001', companyName: 'TechSphere Solutions', contactName: 'John Carter', phone: '+20 100 123 4567', email: 'john@techsphere.com',
      status: 'discovery', agentId: 'u-a1', assignedAt: day(-6),
      touchPoints: makeTouchPoints(workflows[0], 3),
      currentTouchPoint: 3, callLogs: [
        { id: 'cl-1', type: 'discovery', description: 'Client interested in activation plan, requested more details.', timestamp: day(-4), touchPointOrder: 0 },
        { id: 'cl-2', type: 'lvm', description: 'Left voicemail regarding follow-up.', timestamp: day(-3), touchPointOrder: 2 },
      ],
      history: [
        { id: 'h-1', action: 'assigned', timestamp: day(-6), userId: 'u-tl1', userName: 'Sara Mahmoud', detail: 'Assigned to Mona Ali' },
        { id: 'h-2', action: 'mark_complete', timestamp: day(-5), userId: 'u-a1', userName: 'Mona Ali', detail: 'Touch point 0 completed' },
      ],
      stopped: false, removedFromQueue: false, removedAt: null,
    },
    {
      id: 'l-2', leadCode: 'LD-002', campaignCode: 'ACT-001', companyName: 'GreenLeaf Trading', contactName: 'Sarah Williams', phone: '+20 101 456 7890', email: 'sarah@greenleaf.com',
      status: 'new', agentId: 'u-a1', assignedAt: day(-1),
      touchPoints: makeTouchPoints(workflows[0], 0),
      currentTouchPoint: 0, callLogs: [],
      history: [
        { id: 'h-3', action: 'assigned', timestamp: day(-1), userId: 'u-a1', userName: 'Mona Ali', detail: 'Lead created' },
      ],
      stopped: false, removedFromQueue: false, removedAt: null,
    },
    {
      id: 'l-3', leadCode: 'LD-003', campaignCode: 'RET-002', companyName: 'Nile Valley Imports', contactName: 'Michael Brown', phone: '+20 102 789 0123', email: 'mike@nilevalley.com',
      status: 'lvm', agentId: 'u-a2', assignedAt: day(-3),
      touchPoints: makeTouchPoints(workflows[1], 1),
      currentTouchPoint: 1, callLogs: [
        { id: 'cl-3', type: 'lvm', description: 'Left voicemail, asked for callback.', timestamp: day(-2), touchPointOrder: 0 },
      ],
      history: [
        { id: 'h-4', action: 'assigned', timestamp: day(-3), userId: 'u-tl1', userName: 'Sara Mahmoud', detail: 'Assigned to Khaled Mostafa' },
      ],
      stopped: false, removedFromQueue: false, removedAt: null,
    },
    {
      id: 'l-4', leadCode: 'LD-004', campaignCode: 'ACT-001', companyName: 'Pyramid Construction', contactName: 'David Smith', phone: '+20 103 234 5678', email: 'david@pyramid.com',
      status: 'new', agentId: 'u-a2', assignedAt: day(-10),
      touchPoints: makeTouchPoints(workflows[0], 0),
      currentTouchPoint: 0, callLogs: [],
      history: [
        { id: 'h-5', action: 'assigned', timestamp: day(-10), userId: 'u-tl1', userName: 'Sara Mahmoud', detail: 'Assigned to Khaled Mostafa' },
      ],
      stopped: false, removedFromQueue: false, removedAt: null,
    },
    {
      id: 'l-5', leadCode: 'LD-005', campaignCode: 'RET-002', companyName: 'Delta Food Industries', contactName: 'Emma Johnson', phone: '+20 104 345 6789', email: 'emma@deltafood.com',
      status: 'discovery', agentId: 'u-a3', assignedAt: day(-4),
      touchPoints: makeTouchPoints(workflows[1], 2),
      currentTouchPoint: 2, callLogs: [
        { id: 'cl-4', type: 'discovery', description: 'Great interest, discussed pricing and timeline.', timestamp: day(-2), touchPointOrder: 0 },
        { id: 'cl-5', type: 'nvm', description: 'No answer on follow-up call.', timestamp: day(-1), touchPointOrder: 0 },
      ],
      history: [
        { id: 'h-6', action: 'assigned', timestamp: day(-4), userId: 'u-tl2', userName: 'Omar Khaled', detail: 'Assigned to Nour Ibrahim' },
      ],
      stopped: false, removedFromQueue: false, removedAt: null,
    },
    {
      id: 'l-6', leadCode: 'LD-006', campaignCode: 'ACT-001', companyName: 'Cairo Digital Media', contactName: 'Lisa Anderson', phone: '+20 105 456 7890', email: 'lisa@cairodigital.com',
      status: 'nvm', agentId: 'u-a3', assignedAt: day(-8),
      touchPoints: makeTouchPoints(workflows[0], 2),
      currentTouchPoint: 2, callLogs: [
        { id: 'cl-6', type: 'nvm', description: 'No answer, tried twice.', timestamp: day(-6), touchPointOrder: 0 },
        { id: 'cl-7', type: 'nvm', description: 'Still no answer.', timestamp: day(-4), touchPointOrder: 2 },
      ],
      history: [
        { id: 'h-7', action: 'assigned', timestamp: day(-8), userId: 'u-tl2', userName: 'Omar Khaled', detail: 'Assigned to Nour Ibrahim' },
      ],
      stopped: false, removedFromQueue: false, removedAt: null,
    },
    {
      id: 'l-7', leadCode: 'LD-007', campaignCode: 'RET-002', companyName: 'Sphinx Travel Group', contactName: 'Robert Taylor', phone: '', email: 'rob@sphinxtravel.com',
      status: 'new', agentId: 'u-a4', assignedAt: day(-2),
      touchPoints: makeTouchPoints(workflows[1], 0),
      currentTouchPoint: 0, callLogs: [],
      history: [
        { id: 'h-8', action: 'assigned', timestamp: day(-2), userId: 'u-tl2', userName: 'Omar Khaled', detail: 'Assigned to Yousef Adel' },
      ],
      stopped: false, removedFromQueue: false, removedAt: null,
    },
    {
      id: 'l-8', leadCode: 'LD-008', campaignCode: 'ACT-001', companyName: 'Alexandria Pharma', contactName: 'Jennifer Davis', phone: '+20 106 567 8901', email: 'jen@alexpharma.com',
      status: 'discovery', agentId: 'u-a4', assignedAt: day(-5),
      touchPoints: makeTouchPoints(workflows[0], 4),
      currentTouchPoint: 4, callLogs: [
        { id: 'cl-8', type: 'discovery', description: 'Very interested, wants meeting next week.', timestamp: day(-3), touchPointOrder: 0 },
        { id: 'cl-9', type: 'discovery', description: 'Confirmed meeting details.', timestamp: day(-2), touchPointOrder: 4 },
      ],
      history: [
        { id: 'h-9', action: 'assigned', timestamp: day(-5), userId: 'u-tl2', userName: 'Omar Khaled', detail: 'Assigned to Yousef Adel' },
      ],
      stopped: false, removedFromQueue: false, removedAt: null,
    },
    {
      id: 'l-9', leadCode: 'LD-009', campaignCode: 'ACT-001', companyName: 'Horus Logistics', contactName: 'Hany Salem', phone: '+20 107 678 9012', email: 'hany@horus.com',
      status: 'discovery', agentId: 'u-a1', assignedAt: day(-9),
      touchPoints: makeTouchPoints(workflows[0], 3),
      currentTouchPoint: 3, callLogs: [
        { id: 'cl-10', type: 'nvm', reason: 'no_answer', description: 'No answer.', timestamp: at(-9, 9), touchPointOrder: 0 },
        { id: 'cl-11', type: 'discovery', reason: 'interested', description: 'Interested in the Silver plan, agreed to proceed.', timestamp: at(-7, 11), touchPointOrder: 2 },
      ],
      history: [
        { id: 'h-10', action: 'assigned', timestamp: day(-9), userId: 'u-tl1', userName: 'Sara Mahmoud', detail: 'Assigned to Mona Ali' },
      ],
      stopped: false, removedFromQueue: false, removedAt: null,
    },
    {
      id: 'l-10', leadCode: 'LD-010', campaignCode: 'RET-002', companyName: 'Giza Steel', contactName: 'Tamer Fouad', phone: '+20 108 789 0123', email: 'tamer@gizasteel.com',
      status: 'discovery', agentId: 'u-a3', assignedAt: day(-12),
      touchPoints: makeTouchPoints(workflows[1], 2),
      currentTouchPoint: 2, callLogs: [
        { id: 'cl-12', type: 'lvm', reason: 'voicemail', description: 'Spoke to the assistant, asked to call back after 2 pm.', timestamp: at(-11, 10), touchPointOrder: 0 },
        { id: 'cl-13', type: 'discovery', reason: 'interested', description: 'Wants the annual renewal.', timestamp: at(-10, 14), touchPointOrder: 2 },
      ],
      history: [
        { id: 'h-11', action: 'assigned', timestamp: day(-12), userId: 'u-tl2', userName: 'Omar Khaled', detail: 'Assigned to Nour Ibrahim' },
      ],
      stopped: false, removedFromQueue: false, removedAt: null,
    },
    {
      id: 'l-11', leadCode: 'LD-011', campaignCode: 'ACT-001', companyName: 'Luxor Hotels', contactName: 'Rania Gamal', phone: '+20 109 890 1234', email: 'rania@luxorhotels.com',
      status: 'discovery', agentId: 'u-a3', assignedAt: day(-8),
      touchPoints: makeTouchPoints(workflows[0], 3),
      currentTouchPoint: 3, callLogs: [
        { id: 'cl-14', type: 'nvm', reason: 'no_answer', description: 'Nobody answered.', timestamp: at(-8, 15), touchPointOrder: 0 },
        { id: 'cl-15', type: 'discovery', reason: 'price', description: 'Asked about the price, comparing offers.', timestamp: at(-6, 11), touchPointOrder: 2 },
      ],
      history: [
        { id: 'h-12', action: 'assigned', timestamp: day(-8), userId: 'u-tl2', userName: 'Omar Khaled', detail: 'Assigned to Nour Ibrahim' },
      ],
      stopped: false, removedFromQueue: false, removedAt: null,
    },
  ];

  const todayStr = today.toISOString().split('T')[0];

  const meetings: Meeting[] = [
    {
      id: 'm-1', type: 'lead_meeting', leadId: 'l-8', leadName: 'Jennifer Davis', companyName: 'Alexandria Pharma',
      agentId: 'u-a4', participantIds: ['u-a4'], participantNames: ['Yousef Adel'],
      title: 'Meeting with Alexandria Pharma', date: todayStr, time: '15:00', duration: 30,
      notes: 'Discuss activation plan details', status: 'arranged', priority: 'high', createdBy: 'u-a4',
    },
    {
      id: 'm-2', type: 'lead_meeting', leadId: 'l-5', leadName: 'Emma Johnson', companyName: 'Delta Food Industries',
      agentId: 'u-a3', participantIds: ['u-a3'], participantNames: ['Nour Ibrahim'],
      title: 'Meeting with Delta Food Industries', date: todayStr, time: '11:00', duration: 45,
      notes: 'Pricing and timeline discussion', status: 'arranged', priority: 'high', createdBy: 'u-a3',
    },
  ];

  const updates: TeamUpdate[] = [
    { id: 'upd-1', audience: 'specific_team', teamId: 't-1', authorId: 'u-tl1', authorName: 'Sara Mahmoud', title: 'New Campaign Starting', content: 'ACT-003 campaign starts next week. Please review the workflow and prepare your leads.', createdAt: day(-1), acknowledgedBy: ['u-a1'] },
    { id: 'upd-2', audience: 'all', teamId: null, authorId: 'u-om', authorName: 'Ahmed Hassan', title: 'Q3 Targets Updated', content: 'All teams should aim for 30% discovery rate this quarter. Focus on quality calls.', createdAt: day(-3), acknowledgedBy: ['u-tl1', 'u-tl2'] },
  ];

  const tasks: Task[] = [
    { id: 'task-1', authorId: 'u-om', authorName: 'Ahmed Hassan', title: 'Ensure all agents complete overdue calls', description: 'Please ensure your team completes all overdue touch points by end of day.', createdAt: day(-2), deadline: day(1), assignedTo: ['u-tl1', 'u-tl2'], completedBy: ['u-tl1'] },
    { id: 'task-2', authorId: 'u-tl1', authorName: 'Sara Mahmoud', title: 'Update call descriptions', description: 'Make sure all call logs have proper descriptions for AI analysis.', createdAt: day(-1), deadline: day(2), assignedTo: ['u-a1', 'u-a2'], completedBy: [] },
  ];

  const emailTemplates: EmailTemplate[] = [
    { id: 'et-1', name: 'Discovery Follow-up', type: 'discovery', subject: 'Following up on our conversation', body: 'Dear [Name],\n\nThank you for your interest in our services. Following up on our recent conversation, I have attached additional details about our activation plan.\n\nBest regards,\n[Agent Name]' },
    { id: 'et-2', name: 'No Response Follow-up', type: 'no_response', subject: 'Reaching out - [Company Name]', body: 'Dear [Name],\n\nI hope this email finds you well. I tried reaching you recently regarding our services. I would love to connect at your convenience.\n\nBest regards,\n[Agent Name]' },
  ];

  const emailLogs: EmailLog[] = [
    { id: 'el-1', leadId: 'l-1', leadName: 'TechSphere Solutions', to: 'john@techsphere.com', subject: 'Following up on our conversation', body: 'Email body...', templateType: 'discovery', sentAt: day(-3), sentBy: 'u-a1', sentByName: 'Mona Ali' },
  ];

  const notifications: Notification[] = [
    { id: 'n-2', type: 'update', title: 'New team update', message: 'Sara Mahmoud posted: New Campaign Starting', timestamp: day(-1), read: false },
    { id: 'n-3', type: 'overdue', title: 'Overdue touch point', message: 'Pyramid Construction has an overdue call', timestamp: day(0), read: false, leadId: 'l-4' },
  ];

  // Sample sales, all inside the current month so the targets/progress show something right away
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const monthDay = (d: number) => `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(Math.min(d, today.getDate()))}`;
  const mkSale = (n: number, agentId: string, leadId: string, leadName: string, saleType: Sale['saleType'], product: string, d: number): Sale => ({
    id: `s-${n}`, agentId, leadId, leadName, saleType, product, date: monthDay(d), createdBy: 'u-q1', createdAt: new Date().toISOString(),
  });
  const sales: Sale[] = [
    mkSale(1, 'u-a1', 'l-1', 'TechSphere Solutions', 'new', 'Activation Plan - Gold', 2),
    mkSale(2, 'u-a1', 'l-2', 'GreenLeaf Trading', 'upsell', 'Extra Seats Pack', 4),
    mkSale(3, 'u-a1', 'l-9', 'Horus Logistics', 'new', 'Activation Plan - Silver', 5),
    mkSale(4, 'u-a2', 'l-3', 'Nile Valley Imports', 'renewal', 'Annual Renewal', 3),
    mkSale(5, 'u-a2', 'l-4', 'Pyramid Construction', 'new', 'Activation Plan - Gold', 6),
    mkSale(6, 'u-a3', 'l-5', 'Delta Food Industries', 'new', 'Retention Bundle', 2),
    mkSale(7, 'u-a3', 'l-6', 'Cairo Digital Media', 'upsell', 'Premium Support', 3),
    mkSale(8, 'u-a3', 'l-10', 'Giza Steel', 'renewal', 'Annual Renewal', 7),
    mkSale(9, 'u-a3', 'l-11', 'Luxor Hotels', 'new', 'Activation Plan - Gold', 8),
    mkSale(10, 'u-a4', 'l-8', 'Alexandria Pharma', 'new', 'Activation Plan - Silver', 5),
  ];

  return {
    currentUserId: '',
    users, teams, workflows, leads, meetings, updates, tasks,
    emailTemplates, emailLogs, notifications, sales,
  };
}
