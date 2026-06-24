// Operational seed data for demo mode — schedule, daily logs, notifications,
// financial trends, backcharges. Keyed primarily by demo-proj-1.
// All hooks short-circuit on isDemoMode and return these shapes verbatim.

import type { ScheduleItem } from '@/hooks/useProjectSchedule';
import type { DailyLog, DailyLogManpower, DailyLogDelay, DailyLogPhoto, DailyLogDelivery } from '@/types/dailyLog';
import type { MonthlySpend, MonthlyWorkOrders } from '@/hooks/useFinancialTrends';
import type { Notification } from '@/hooks/useNotifications';
import type { Backcharge } from '@/hooks/useBackcharges';

// ── Date helpers ──
const today = new Date();
const daysAgo = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d.toISOString();
};
const dateOnly = (n: number) => daysAgo(n).slice(0, 10);
const daysAhead = (n: number) => daysAgo(-n);

// ════════════════════════════════════════════════════════
// SCHEDULE — 18 Gantt items across phases (demo-proj-1)
// ════════════════════════════════════════════════════════

export const DEMO_SCHEDULE_BY_PROJECT: Record<string, ScheduleItem[]> = {
  'demo-proj-1': [
    mkTask('sch-1-01', 'Site Prep & Excavation',          -75, -68, 100, 0),
    mkTask('sch-1-02', 'Foundation & Footings',           -68, -58, 100, 1),
    mkTask('sch-1-03', 'Slab Pour',                       -58, -54, 100, 2),
    mkTask('sch-1-04', 'Framing — Level 1',               -54, -42, 100, 3),
    mkTask('sch-1-05', 'Framing — Level 2 & Roof',        -42, -30, 100, 4),
    mkTask('sch-1-06', 'Roofing Dry-In',                  -30, -24,  95, 5),
    mkTask('sch-1-07', 'Window & Door Install',           -28, -18,  80, 6),
    mkTask('sch-1-08', 'Rough Electrical',                -22,  -8,  65, 7),
    mkTask('sch-1-09', 'Rough Plumbing',                  -22,  -6,  60, 8),
    mkTask('sch-1-10', 'HVAC Rough-In',                   -20,  -4,  45, 9),
    mkTask('sch-1-11', 'Insulation',                       -6,   3,  10, 10),
    mkTask('sch-1-12', 'Drywall Hang & Finish',             1,  18,   0, 11),
    mkTask('sch-1-13', 'Interior Trim & Doors',            18,  32,   0, 12),
    mkTask('sch-1-14', 'Cabinets & Countertops',           28,  42,   0, 13),
    mkTask('sch-1-15', 'Interior Paint',                   30,  44,   0, 14),
    mkTask('sch-1-16', 'Flooring',                         44,  58,   0, 15),
    mkTask('sch-1-17', 'Mechanical Trims & Fixtures',      55,  70,   0, 16),
    mkTask('sch-1-18', 'Punch & Final Inspections',        80,  95,   0, 17),
  ],
};

function mkTask(
  id: string,
  title: string,
  startOffset: number,
  endOffset: number,
  progress: number,
  sort: number,
): ScheduleItem {
  return {
    id,
    project_id: 'demo-proj-1',
    title,
    item_type: 'task',
    start_date: dateOnly(-startOffset),
    end_date: dateOnly(-endOffset),
    progress,
    dependency_ids: [],
    work_order_id: null,
    sov_item_id: null,
    color: null,
    sort_order: sort,
    created_by: null,
    created_at: daysAgo(80),
    updated_at: daysAgo(2),
  };
}

// ════════════════════════════════════════════════════════
// DAILY LOGS — last 14 days for demo-proj-1
// ════════════════════════════════════════════════════════

const TRADES_ROTATION = [
  ['Framers', 8], ['Electricians', 4], ['Plumbers', 3], ['HVAC', 3],
  ['Roofers', 5], ['Laborers', 4], ['Carpenters', 6],
] as const;

function buildDemoDailyLog(projectId: string, daysBack: number): DailyLog {
  const conditions =
    daysBack % 7 === 0 ? ['rain', 'wind'] :
    daysBack % 5 === 0 ? ['cloudy'] :
    daysBack % 3 === 0 ? ['sunny', 'hot'] : ['sunny'];
  const trades = TRADES_ROTATION.slice((daysBack * 2) % 4, ((daysBack * 2) % 4) + 3);
  const headcount = trades.reduce((s, [, n]) => s + n, 0);
  return {
    id: `dlog-${projectId}-${daysBack}`,
    project_id: projectId,
    log_date: dateOnly(daysBack),
    weather_data: {
      conditions,
      temp_high: 72 + ((daysBack * 3) % 18),
      temp_low: 54 + ((daysBack * 2) % 14),
      auto_fetched: true,
    },
    manpower_total: headcount,
    delay_hours: daysBack % 7 === 0 ? 4 : 0,
    safety_incidents: daysBack === 9 ? [{ type: 'near_miss', notes: 'Slip on wet decking, no injury' }] : [],
    notes:
      daysBack === 0 ? 'Drywall delivery staged. HVAC rough-in continued on Level 2.' :
      daysBack === 1 ? 'Inspector visit — framing passed. Plumbing top-out 70% complete.' :
      daysBack === 3 ? 'Roofing crew completed dry-in. Awaiting shingle delivery (PO-1042).' :
      daysBack === 5 ? 'Rain delay — afternoon shift moved to interior layout work.' :
      'Crew on schedule. No issues to report.',
    status: 'submitted',
    created_by: 'demo-user',
    submitted_at: daysAgo(daysBack),
    created_at: daysAgo(daysBack),
    updated_at: daysAgo(daysBack),
  };
}

export const DEMO_DAILY_LOGS_BY_PROJECT: Record<string, DailyLog[]> = {
  'demo-proj-1': Array.from({ length: 14 }, (_, i) => buildDemoDailyLog('demo-proj-1', i)),
};

export function getDemoDailyLog(projectId: string, date: string): DailyLog | undefined {
  return DEMO_DAILY_LOGS_BY_PROJECT[projectId]?.find(l => l.log_date === date)
    ?? DEMO_DAILY_LOGS_BY_PROJECT[projectId]?.[0];
}

export function getDemoDailyLogManpower(logId: string): DailyLogManpower[] {
  // Derive 3 trade rows from the log id deterministically
  const seed = parseInt(logId.split('-').pop() || '0', 10);
  const trades = TRADES_ROTATION.slice(seed % 4, (seed % 4) + 3);
  return trades.map(([trade, headcount], i) => ({
    id: `${logId}-mp-${i}`,
    log_id: logId,
    org_id: null,
    trade,
    headcount,
    created_at: new Date().toISOString(),
  }));
}

export function getDemoDailyLogPhotos(logId: string): DailyLogPhoto[] {
  const seed = parseInt(logId.split('-').pop() || '0', 10);
  const photoCount = (seed % 3) + 1;
  return Array.from({ length: photoCount }, (_, i) => ({
    id: `${logId}-photo-${i}`,
    log_id: logId,
    storage_path: `https://images.unsplash.com/photo-${1503387762 + seed * 17 + i * 7}?w=800&q=70&auto=format&fit=crop`,
    tag: i === 0 ? 'progress' : i === 1 ? 'safety' : 'quality',
    caption: i === 0 ? 'Morning progress' : i === 1 ? 'Site safety check' : 'Quality inspection',
    created_at: new Date().toISOString(),
  }));
}

export function getDemoDailyLogDelays(logId: string): DailyLogDelay[] {
  const seed = parseInt(logId.split('-').pop() || '0', 10);
  if (seed % 7 !== 0) return [];
  return [{
    id: `${logId}-delay-1`,
    log_id: logId,
    cause: 'Weather',
    hours_lost: 4,
    notes: 'Rain stopped exterior work',
    created_at: new Date().toISOString(),
  }];
}

export function getDemoDailyLogDeliveries(logId: string): DailyLogDelivery[] {
  const seed = parseInt(logId.split('-').pop() || '0', 10);
  if (seed % 4 !== 0) return [];
  return [{
    id: `${logId}-del-1`,
    log_id: logId,
    po_id: null,
    status: 'received',
    notes: 'Lumber order — 24 LVL beams received and stacked.',
    created_at: new Date().toISOString(),
  }];
}

// ════════════════════════════════════════════════════════
// FINANCIAL TRENDS — 6-month spend trend
// ════════════════════════════════════════════════════════

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function getDemoFinancialTrends(): { spendTrend: MonthlySpend[]; woTrend: MonthlyWorkOrders[] } {
  const now = new Date();
  const seedBilled = [142000, 168000, 195000, 221000, 248000, 274000];
  const seedPaid =   [128000, 152000, 178000, 196000, 220000, 235000];
  const seedCreated = [3, 5, 4, 6, 5, 7];
  const seedApproved = [2, 4, 4, 5, 5, 6];

  const spendTrend: MonthlySpend[] = [];
  const woTrend: MonthlyWorkOrders[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const idx = 5 - i;
    spendTrend.push({ month: MONTH_NAMES[d.getMonth()], billed: seedBilled[idx], paid: seedPaid[idx] });
    woTrend.push({ month: MONTH_NAMES[d.getMonth()], created: seedCreated[idx], approved: seedApproved[idx] });
  }
  return { spendTrend, woTrend };
}

// ════════════════════════════════════════════════════════
// NOTIFICATIONS
// ════════════════════════════════════════════════════════

export const DEMO_NOTIFICATIONS: Notification[] = [
  { id: 'n1', type: 'invoice_submitted',  title: 'New invoice from Apex Plumbing', body: 'INV-2026-0142 — $12,840.00 submitted for review', entity_type: 'invoice', entity_id: 'demo-inv-1', action_url: '/project/demo-proj-1/invoices', is_read: false, created_at: daysAgo(0) },
  { id: 'n2', type: 'rfi_submitted',       title: 'RFI #14: Window header detail', body: 'Architect response requested by end of week', entity_type: 'rfi', entity_id: 'demo-rfi-1', action_url: '/project/demo-proj-1/rfis', is_read: false, created_at: daysAgo(0) },
  { id: 'n3', type: 'co_approved',         title: 'Change Order #7 approved', body: 'Bath 2 layout revision — $4,250 added to contract', entity_type: 'change_order', entity_id: 'demo-wo-1b', action_url: '/project/demo-proj-1/change-orders', is_read: false, created_at: daysAgo(1) },
  { id: 'n4', type: 'po_delivered',        title: 'PO-1042 marked delivered', body: 'Roofing materials — 32 squares architectural shingles', entity_type: 'purchase_order', entity_id: 'demo-po-1', action_url: '/project/demo-proj-1/purchase-orders', is_read: false, created_at: daysAgo(2) },
  { id: 'n5', type: 'payment_received',    title: 'Payment received', body: 'Owner draw #4 — $186,500 deposited', entity_type: 'invoice', entity_id: 'demo-inv-2', action_url: '/project/demo-proj-1/invoices', is_read: false, created_at: daysAgo(3) },
  { id: 'n6', type: 'schedule_at_risk',    title: 'Drywall start may slip', body: 'Insulation 2 days behind — affects 3 downstream tasks', entity_type: 'schedule', entity_id: 'sch-1-11', action_url: '/project/demo-proj-1/schedule', is_read: false, created_at: daysAgo(4) },
  { id: 'n7', type: 'daily_log_submitted', title: 'Daily log submitted', body: '8 trades on site, 0 incidents, 0 delay hours', entity_type: 'daily_log', entity_id: 'dlog-demo-proj-1-1', action_url: '/project/demo-proj-1/daily-log', is_read: false, created_at: daysAgo(5) },
  { id: 'n8', type: 'inspection_passed',   title: 'Framing inspection passed', body: 'City inspector signed off — proceed with insulation', entity_type: 'project', entity_id: 'demo-proj-1', action_url: '/project/demo-proj-1/overview', is_read: false, created_at: daysAgo(6) },
];

// ════════════════════════════════════════════════════════
// BACKCHARGES
// ════════════════════════════════════════════════════════

export const DEMO_BACKCHARGES_BY_PROJECT: Record<string, Backcharge[]> = {
  'demo-proj-1': [
    {
      id: 'bc-1', project_id: 'demo-proj-1', source_co_id: 'demo-wo-1b',
      responsible_org_id: null, responsible_party_name: 'Apex Plumbing LLC',
      amount: 875.00, status: 'pending', gc_approved: false, gc_approved_at: null,
      dispute_note: null, created_by_user_id: 'demo-user',
      created_at: daysAgo(3), updated_at: daysAgo(3),
      source_co: { id: 'demo-wo-1b', title: 'Rough Plumbing rework', co_number: 'CO-008' },
      responsible_org: { id: 'org-apex', name: 'Apex Plumbing LLC', type: 'TC' },
    },
    {
      id: 'bc-2', project_id: 'demo-proj-1', source_co_id: 'demo-wo-1c',
      responsible_org_id: null, responsible_party_name: 'Statewide Electric',
      amount: 1450.00, status: 'accepted', gc_approved: true, gc_approved_at: daysAgo(6),
      dispute_note: null, created_by_user_id: 'demo-user',
      created_at: daysAgo(8), updated_at: daysAgo(6),
      source_co: { id: 'demo-wo-1c', title: 'Drywall patch — missed conduit', co_number: 'CO-005' },
      responsible_org: { id: 'org-state', name: 'Statewide Electric', type: 'TC' },
    },
    {
      id: 'bc-3', project_id: 'demo-proj-1', source_co_id: 'demo-wo-1e',
      responsible_org_id: null, responsible_party_name: 'BuildRight Framers',
      amount: 320.00, status: 'disputed', gc_approved: false, gc_approved_at: null,
      dispute_note: 'Disagree with assignment — issue traced to architectural change.',
      created_by_user_id: 'demo-user',
      created_at: daysAgo(11), updated_at: daysAgo(9),
      source_co: { id: 'demo-wo-1e', title: 'Header re-frame', co_number: 'CO-003' },
      responsible_org: { id: 'org-build', name: 'BuildRight Framers', type: 'TC' },
    },
  ],
};
