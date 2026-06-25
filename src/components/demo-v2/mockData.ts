export interface Project {
  id: string;
  name: string;
  phase: string;
  contractValue: number;
  percentComplete: number;
  color: string;
  location: string;
  paid: number;
  pending: number;
  status: 'Active' | 'On Hold' | 'Complete';
}

export interface UrgentOrder {
  id: string;
  type: 'INV' | 'WO' | 'PO' | 'CO';
  title: string;
  subtitle: string;
  amount: number;
  status: string;
  statusColor: string;
  borderColor: string;
  projectId: string;
}

export interface ActivityEntry {
  id: string;
  initials: string;
  name: string;
  description: string;
  chipLabel: string;
  chipColor: string;
  time: string;
}

export interface BudgetLine {
  id: string;
  name: string;
  supplier: string;
  spent: number;
  total: number;
}

export interface FieldTask {
  id: string;
  title: string;
  subtitle: string;
  assignee: string;
  dueDate: string;
  completed: boolean;
}

export const PROJECTS: Project[] = [
  { id: '1', name: 'Cherry Hills Park', phase: 'Construction', contractValue: 420000, percentComplete: 64, color: '#F5A623', location: 'Denver, CO', paid: 180000, pending: 42000, status: 'Active' },
  { id: '2', name: 'Tower 14', phase: 'Pre-Construction', contractValue: 680000, percentComplete: 38, color: '#3B82F6', location: 'Boulder, CO', paid: 120000, pending: 68000, status: 'Active' },
  { id: '3', name: 'Mesa Logistics Hub', phase: 'Closeout', contractValue: 290000, percentComplete: 88, color: '#22C55E', location: 'Grand Junction, CO', paid: 240000, pending: 12000, status: 'Active' },
  { id: '4', name: 'Apex Retail Center', phase: 'Design', contractValue: 520000, percentComplete: 12, color: '#EAB308', location: 'Aurora, CO', paid: 35000, pending: 18000, status: 'Active' },
  { id: '5', name: 'Hyatt Studios DEN', phase: 'Construction', contractValue: 740000, percentComplete: 55, color: '#A855F7', location: 'Denver, CO', paid: 310000, pending: 52000, status: 'Active' },
];

export const KPI_DATA = [
  { label: 'Portfolio', value: 2650000, prefix: '$', suffix: '', accent: '#F5A623', subtitle: '5 active projects' },
  { label: 'Paid', value: 150000, prefix: '$', suffix: '', accent: '#22C55E', subtitle: 'Last 30 days' },
  { label: 'Needs Action', value: 42800, prefix: '$', suffix: '', accent: '#EF4444', subtitle: '4 urgent items' },
  { label: 'Materials', value: 73800, prefix: '$', suffix: '', accent: '#3B82F6', subtitle: '12 open POs' },
];

export const URGENT_ORDERS: UrgentOrder[] = [
  { id: 'INV-1048', type: 'INV', title: 'Invoice #1048 — Cherry Hills', subtitle: 'Lumber supply — Net 30 overdue', amount: 18400, status: 'Overdue', statusColor: '#EF4444', borderColor: '#EF4444', projectId: '1' },
  { id: 'WO-045', type: 'WO', title: 'WO-045 — Tower 14 HVAC', subtitle: 'Mechanical rough-in review needed', amount: 9800, status: 'Review', statusColor: '#F5A623', borderColor: '#F5A623', projectId: '2' },
  { id: 'PO-2213', type: 'PO', title: 'PO-2213 — Mesa Hub Steel', subtitle: 'Structural steel delivery ETA 3/28', amount: 8400, status: 'In Transit', statusColor: '#3B82F6', borderColor: '#3B82F6', projectId: '3' },
  { id: 'CO-008', type: 'CO', title: 'CO-008 — Cherry Hills Elec.', subtitle: 'Panel upgrade approved +$6.2K', amount: 6200, status: 'Approved', statusColor: '#22C55E', borderColor: '#22C55E', projectId: '1' },
  { id: 'WO-044', type: 'WO', title: 'WO-044 — Hyatt Framing', subtitle: 'Phase 2 framing scope finalized', amount: 18200, status: 'Approved', statusColor: '#22C55E', borderColor: '#22C55E', projectId: '5' },
];

export const ACTIVITY_FEED: ActivityEntry[] = [
  { id: '1', initials: 'MR', name: 'Mike Rivera', description: 'approved Invoice #1047', chipLabel: 'Invoice', chipColor: '#22C55E', time: '2m ago' },
  { id: '2', initials: 'SL', name: 'Sara Lin', description: 'submitted WO-045 for review', chipLabel: 'Work Order', chipColor: '#F5A623', time: '18m ago' },
  { id: '3', initials: 'JT', name: 'Jake Torres', description: 'uploaded field photos to Mesa Hub', chipLabel: 'Field', chipColor: '#3B82F6', time: '42m ago' },
  { id: '4', initials: 'KP', name: 'Kim Park', description: 'created PO-2214 for Tower 14', chipLabel: 'PO', chipColor: '#A855F7', time: '1h ago' },
  { id: '5', initials: 'DR', name: 'Dan Reed', description: 'marked framing task complete', chipLabel: 'Field', chipColor: '#3B82F6', time: '2h ago' },
  { id: '6', initials: 'AL', name: 'Amy Lopez', description: 'added CO-009 draft for Apex', chipLabel: 'Change Order', chipColor: '#EAB308', time: '3h ago' },
];

export const BUDGET_LINES: BudgetLine[] = [
  { id: '1', name: 'Lumber & Framing', supplier: 'Summit Supply Co.', spent: 84200, total: 120000 },
  { id: '2', name: 'Hardware & Fasteners', supplier: 'Rocky Mtn Hardware', spent: 12400, total: 18000 },
  { id: '3', name: 'Labor — Framing Crew', supplier: 'In-House', spent: 62000, total: 95000 },
  { id: '4', name: 'Sheathing & Wrap', supplier: 'BuildPro Dist.', spent: 8900, total: 22000 },
  { id: '5', name: 'Returns & Credits', supplier: 'Various', spent: -3200, total: 0 },
];

export const FIELD_TASKS: FieldTask[] = [
  { id: '1', title: 'Install east wall sheathing', subtitle: 'Section B — 2nd floor', assignee: 'Jake T.', dueDate: 'Today', completed: false },
  { id: '2', title: 'Rough-in electrical panel', subtitle: 'Main floor mechanical room', assignee: 'Dan R.', dueDate: 'Today', completed: false },
  { id: '3', title: 'Frame interior walls — Unit 4', subtitle: 'Per revised layout v3', assignee: 'Mike R.', dueDate: 'Tomorrow', completed: false },
  { id: '4', title: 'Inspect foundation anchors', subtitle: 'South elevation', assignee: 'Sara L.', dueDate: 'Yesterday', completed: true },
  { id: '5', title: 'Pour footings — Phase 2', subtitle: 'Weather permitting', assignee: 'Kim P.', dueDate: 'Mar 28', completed: true },
];

export const ORDER_ITEMS = [
  { id: 'PO-2213', type: 'PO', description: 'Structural steel package', amount: 8400, status: 'In Transit', borderColor: '#3B82F6' },
  { id: 'WO-045', type: 'WO', description: 'HVAC mechanical rough-in', amount: 9800, status: 'Review', borderColor: '#F5A623' },
  { id: 'INV-1048', type: 'INV', description: 'Lumber supply — Summit Co.', amount: 18400, status: 'Overdue', borderColor: '#EF4444' },
  { id: 'CO-008', type: 'CO', description: 'Electrical panel upgrade', amount: 6200, status: 'Approved', borderColor: '#22C55E' },
  { id: 'WO-044', type: 'WO', description: 'Phase 2 framing scope', amount: 18200, status: 'Approved', borderColor: '#22C55E' },
  { id: 'INV-1047', type: 'INV', description: 'Hardware & fasteners', amount: 4200, status: 'Paid', borderColor: '#6B7280' },
];

export const RING_CHART_DATA = [
  { label: 'Paid', value: 180000, color: '#22C55E' },
  { label: 'Materials', value: 73800, color: '#3B82F6' },
  { label: 'Pending', value: 42000, color: '#F5A623' },
  { label: 'Remaining', value: 124200, color: '#1E293B' },
];
