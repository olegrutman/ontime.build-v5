export type FieldOperationsRole = 'GC' | 'TC' | 'FC';

export interface FieldOperationsReport {
  id: string;
  project_id: string;
  crew_org_id: string;
  reviewer_org_id: string;
  report_date: string;
  status: string;
  created_at: string;
  submitted_at?: string | null;
  updated_at?: string | null;
}

export interface FieldOperationsItem {
  id: string;
  report_id: string;
  project_id: string;
  crew_org_id: string;
  reviewer_org_id: string;
  kind: 'progress' | 'material' | 'extra_work' | 'blocker' | 'hours';
  description: string;
  quantity?: number | string | null;
  unit?: string | null;
  status: string;
  created_at: string;
  updated_at?: string | null;
  confirmed_at?: string | null;
  released_at?: string | null;
}

export type FieldPulseStatus = 'blocker' | 'pending' | 'released' | 'draft' | 'none';

export interface FieldPulseDay {
  date: string;
  status: FieldPulseStatus;
  reportId: string | null;
}

export interface FieldOperationsAttention {
  tone: 'red' | 'yellow';
  title: string;
  sub: string;
  value: string;
  pill: string;
  tab: string;
}

export interface FieldOperationsModel {
  role: FieldOperationsRole;
  canAuthor: boolean;
  reports: FieldOperationsReport[];
  items: FieldOperationsItem[];
  companyNames: Record<string, string>;
  todayReports: FieldOperationsReport[];
  todayItems: FieldOperationsItem[];
  todayBlockers: FieldOperationsItem[];
  todayMaterials: FieldOperationsItem[];
  todayHours: number | null;
  pendingReviewReports: FieldOperationsReport[];
  pendingReviewItemCount: number;
  ownTodayReports: FieldOperationsReport[];
  ownDraft: FieldOperationsReport | null;
  latestUpdate: FieldOperationsItem | null;
  latestUpdateReportId: string | null;
  latestUpdateCompany: string;
  headline: string;
  statusDetail: string;
  actionLabel: string;
  actionTab: string;
  healthLabel: string;
  pulse: FieldPulseDay[];
}

interface BuildFieldOperationsInput {
  reports: FieldOperationsReport[];
  items: FieldOperationsItem[];
  companies?: { id: string; name: string }[];
  orgIds: string[];
  currentOrgId?: string;
  role: FieldOperationsRole;
  canAuthor: boolean;
  today: string;
}

const released = (status: string) => status === 'released' || status === 'converted';
const submitted = (status: string) => ['crew_confirmed', 'reviewed', 'released', 'converted'].includes(status);
const timestamp = (item: FieldOperationsItem) =>
  item.released_at || item.confirmed_at || item.updated_at || item.created_at;

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function plural(count: number, singular: string, pluralForm = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/**
 * Applies the same release boundary as the Field Report register: report parties
 * can see their own workflow, while every other company receives released items
 * only. No price or labor-rate field is read by this model.
 */
export function buildFieldOperationsModel({
  reports: sourceReports,
  items: sourceItems,
  companies = [],
  orgIds,
  currentOrgId,
  role,
  canAuthor,
  today,
}: BuildFieldOperationsInput): FieldOperationsModel {
  const sourceReportById = new Map(sourceReports.map((report) => [report.id, report]));
  const isParty = (report: FieldOperationsReport) =>
    orgIds.includes(report.crew_org_id) || orgIds.includes(report.reviewer_org_id);

  const items = sourceItems.filter((item) => {
    const report = sourceReportById.get(item.report_id);
    return (report && isParty(report)) || released(item.status);
  });

  const reports = sourceReports.filter((report) =>
    isParty(report) || items.some((item) => item.report_id === report.id && released(item.status)),
  );

  // Some upstream companies can read released items but not the original report
  // header. A minimal released header keeps the pulse and navigation complete.
  for (const item of items) {
    if (!released(item.status) || reports.some((report) => report.id === item.report_id)) continue;
    reports.push({
      id: item.report_id,
      project_id: item.project_id,
      crew_org_id: item.crew_org_id,
      reviewer_org_id: item.reviewer_org_id,
      report_date: (item.released_at || item.created_at).slice(0, 10),
      status: 'released',
      created_at: item.created_at,
      updated_at: item.updated_at,
    });
  }

  reports.sort((a, b) =>
    b.report_date.localeCompare(a.report_date) || b.created_at.localeCompare(a.created_at),
  );
  const reportById = new Map(reports.map((report) => [report.id, report]));
  const companyNames = Object.fromEntries(companies.map((company) => [company.id, company.name]));
  const todayReports = reports.filter((report) => report.report_date === today);
  const todayIds = new Set(todayReports.map((report) => report.id));
  const todayItems = items.filter((item) => todayIds.has(item.report_id));
  const todayBlockers = todayItems.filter((item) =>
    item.kind === 'blocker' && submitted(item.status) && item.status !== 'held',
  );
  const todayMaterials = todayItems.filter((item) => item.kind === 'material' && item.status !== 'draft');
  const hourItems = todayItems.filter((item) => item.kind === 'hours' && item.status !== 'draft');
  const todayHours = hourItems.length
    ? hourItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
    : null;

  const pendingReviewReports = reports.filter((report) =>
    orgIds.includes(report.reviewer_org_id) &&
    items.some((item) => item.report_id === report.id && item.status === 'crew_confirmed'),
  );
  const pendingIds = new Set(pendingReviewReports.map((report) => report.id));
  const pendingReviewItemCount = items.filter((item) =>
    pendingIds.has(item.report_id) && item.status === 'crew_confirmed',
  ).length;

  const ownTodayReports = currentOrgId
    ? todayReports.filter((report) => report.crew_org_id === currentOrgId)
    : [];
  const ownDraft = ownTodayReports.find((report) => report.status === 'draft') || null;

  const updateCandidates = items
    .filter((item) => item.status !== 'draft' && item.description?.trim())
    .sort((a, b) => timestamp(b).localeCompare(timestamp(a)));
  const latestUpdate = updateCandidates.find((item) => item.kind === 'progress') || updateCandidates[0] || null;
  const latestReport = latestUpdate ? reportById.get(latestUpdate.report_id) : null;
  const latestUpdateCompany = latestUpdate
    ? companyNames[(latestReport || latestUpdate).crew_org_id] || 'Reporting company'
    : '';

  const pulse: FieldPulseDay[] = Array.from({ length: 5 }, (_, index) => {
    const date = shiftDate(today, index - 4);
    const dayReports = reports.filter((report) => report.report_date === date);
    const ids = new Set(dayReports.map((report) => report.id));
    const dayItems = items.filter((item) => ids.has(item.report_id));
    const hasBlocker = dayItems.some((item) => item.kind === 'blocker' && submitted(item.status));
    const hasPending = dayItems.some((item) => item.status === 'crew_confirmed') ||
      dayReports.some((report) => ['submitted', 'crew_confirmed'].includes(report.status));
    const hasReleased = dayItems.some((item) => released(item.status)) ||
      dayReports.some((report) => ['reviewed', 'released'].includes(report.status));
    const hasDraft = dayReports.some((report) => report.status === 'draft') || dayItems.some((item) => item.status === 'draft');
    const status: FieldPulseStatus = hasBlocker
      ? 'blocker'
      : hasPending
        ? 'pending'
        : hasReleased
          ? 'released'
          : hasDraft
            ? 'draft'
            : dayReports.length
              ? 'pending'
              : 'none';
    const target = dayReports.find((report) =>
      orgIds.includes(report.reviewer_org_id) && dayItems.some((item) => item.report_id === report.id && item.status === 'crew_confirmed'),
    ) || dayReports.find((report) => report.status === 'draft' && orgIds.includes(report.crew_org_id)) || dayReports[0];
    return { date, status, reportId: target?.id || null };
  });

  let headline = 'No field reports today';
  let statusDetail = 'Released field updates will appear here.';
  let actionLabel = 'View Field Reports';
  let actionTab = 'daily-reports';

  if (pendingReviewReports.length > 0) {
    headline = plural(pendingReviewReports.length, 'report') + ' awaiting review';
    statusDetail = `${plural(pendingReviewItemCount, 'item')} to release or hold.`;
    actionLabel = `Review ${pendingReviewReports.length === 1 ? 'report' : 'reports'}`;
    actionTab = `daily-reports?report=${pendingReviewReports[0].id}`;
  } else if (role !== 'GC' && ownDraft) {
    headline = 'Today’s report is in progress';
    statusDetail = 'Finish and submit it for review when the field update is complete.';
    actionLabel = 'Continue today’s report';
    actionTab = `daily-reports?report=${ownDraft.id}`;
  } else if (role !== 'GC' && ownTodayReports.length > 0) {
    const reviewed = ownTodayReports.every((report) => ['reviewed', 'released'].includes(report.status));
    headline = reviewed ? 'Today’s report reviewed' : 'Submitted · Awaiting review';
    statusDetail = reviewed ? 'The latest decisions and released updates are available.' : 'Your reporting company and reviewer can see the submitted items.';
    actionLabel = 'Open today’s report';
    actionTab = `daily-reports?report=${ownTodayReports[0].id}`;
  } else if (role !== 'GC' && canAuthor) {
    headline = 'No report filed today';
    statusDetail = 'Record progress, hours, materials and blockers for today’s work.';
    actionLabel = 'File today’s report';
  } else if (todayReports.length > 0) {
    headline = `${plural(todayReports.length, 'report')} filed today`;
    statusDetail = `${plural(todayItems.length, 'field update')} visible to your company.`;
  }

  const healthLabel = todayBlockers.length
    ? plural(todayBlockers.length, 'blocker') + ' reported today'
    : pendingReviewReports.length
      ? plural(pendingReviewReports.length, 'report') + ' awaiting review'
      : todayReports.length
        ? plural(todayReports.length, 'report') + ' filed today'
        : 'No field reports filed today';

  return {
    role,
    canAuthor,
    reports,
    items,
    companyNames,
    todayReports,
    todayItems,
    todayBlockers,
    todayMaterials,
    todayHours,
    pendingReviewReports,
    pendingReviewItemCount,
    ownTodayReports,
    ownDraft,
    latestUpdate,
    latestUpdateReportId: latestUpdate?.report_id || null,
    latestUpdateCompany,
    headline,
    statusDetail,
    actionLabel,
    actionTab,
    healthLabel,
    pulse,
  };
}

export function fieldOperationsAttention(model: FieldOperationsModel): FieldOperationsAttention[] {
  const attention: FieldOperationsAttention[] = [];
  if (model.role !== 'FC' && model.todayBlockers.length > 0) {
    const blocker = model.todayBlockers[0];
    attention.push({
      tone: 'red',
      title: `${plural(model.todayBlockers.length, 'Field blocker')} reported today`,
      sub: blocker.description,
      value: plural(model.todayBlockers.length, 'blocker'),
      pill: 'Action Needed',
      tab: `daily-reports?report=${blocker.report_id}`,
    });
  }
  if (model.pendingReviewReports.length > 0) {
    attention.push({
      tone: 'yellow',
      title: `${plural(model.pendingReviewReports.length, 'Field Report')} awaiting your review`,
      sub: `${plural(model.pendingReviewItemCount, 'item')} to release or hold`,
      value: plural(model.pendingReviewReports.length, 'report'),
      pill: 'Review',
      tab: `daily-reports?report=${model.pendingReviewReports[0].id}`,
    });
  }
  return attention;
}
