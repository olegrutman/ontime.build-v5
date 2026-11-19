import { describe, expect, it } from 'vitest';
import { buildFieldOperationsModel, fieldOperationsAttention, type FieldOperationsItem, type FieldOperationsReport } from '@/lib/fieldOperations';

const today = '2026-11-19';
const report: FieldOperationsReport = {
  id: 'report-1', project_id: 'project-1', crew_org_id: 'crew', reviewer_org_id: 'sub',
  report_date: today, status: 'submitted', created_at: '2026-11-19T08:00:00Z', submitted_at: '2026-11-19T09:00:00Z',
};
const progress: FieldOperationsItem = {
  id: 'item-1', report_id: report.id, project_id: report.project_id, crew_org_id: 'crew', reviewer_org_id: 'sub',
  kind: 'progress', description: 'Installed the second-floor trusses.', status: 'crew_confirmed', created_at: '2026-11-19T09:00:00Z', confirmed_at: '2026-11-19T09:00:00Z',
};

function build(role: 'GC' | 'TC' | 'FC', items = [progress], reports = [report]) {
  return buildFieldOperationsModel({
    reports, items, companies: [{ id: 'crew', name: 'Framing Company' }, { id: 'sub', name: 'Subcontractor' }],
    orgIds: role === 'GC' ? ['gc'] : role === 'TC' ? ['sub'] : ['crew'],
    currentOrgId: role === 'GC' ? 'gc' : role === 'TC' ? 'sub' : 'crew', role,
    canAuthor: role !== 'GC', today,
  });
}

describe('unified Field Operations overview', () => {
  it('keeps unreleased wording private from non-party companies', () => {
    const model = build('GC');
    expect(model.items).toEqual([]);
    expect(model.reports).toEqual([]);
    expect(model.latestUpdate).toBeNull();
    expect(model.pendingReviewReports).toHaveLength(0);
    expect(model.headline).toBe('No field reports today');
  });

  it('routes the assigned reviewer to the exact report and counts undecided items', () => {
    const model = build('TC');
    expect(model.pendingReviewReports.map((row) => row.id)).toEqual(['report-1']);
    expect(model.pendingReviewItemCount).toBe(1);
    expect(model.actionTab).toBe('daily-reports?report=report-1');
    expect(fieldOperationsAttention(model)[0]).toMatchObject({ title: '1 Field Report awaiting your review', value: '1 report' });
  });

  it('gives an authoring Subcontractor a direct start action when no report exists', () => {
    const model = buildFieldOperationsModel({
      reports: [], items: [], orgIds: ['sub'], currentOrgId: 'sub', role: 'TC', canAuthor: true, today,
    });
    expect(model.headline).toBe('No report filed today');
    expect(model.actionLabel).toBe('File today’s report');
    expect(model.actionTab).toBe('daily-reports');
  });

  it('does not let the General Contractor author or mistake missing hours for zero', () => {
    const model = build('GC', [{ ...progress, status: 'released', released_at: '2026-11-19T10:00:00Z' }]);
    expect(model.canAuthor).toBe(false);
    expect(model.actionLabel).toBe('View Field Reports');
    expect(model.todayHours).toBeNull();
    expect(model.latestUpdate?.description).toBe('Installed the second-floor trusses.');
  });

  it('shows reported hours without treating them as payroll or prices', () => {
    const hours = { ...progress, id: 'hours-1', kind: 'hours' as const, description: 'Framing crew', quantity: 12.5, status: 'released', released_at: '2026-11-19T10:00:00Z' };
    const model = build('GC', [hours]);
    expect(model.todayHours).toBe(12.5);
    expect(model.latestUpdate?.kind).toBe('hours');
  });

  it('prioritizes a submitted blocker in the five-day pulse and attention area', () => {
    const blocker = { ...progress, id: 'blocker-1', kind: 'blocker' as const, description: 'Plumbing rough-in is holding the framing crew.' };
    const model = build('TC', [progress, blocker]);
    expect(model.pulse[4]).toMatchObject({ date: today, status: 'blocker', reportId: 'report-1' });
    expect(model.todayBlockers).toHaveLength(1);
    expect(fieldOperationsAttention(model)[0]).toMatchObject({ tone: 'red', title: '1 Field blocker reported today' });
  });

  it('does not raise an upstream blocker alert from an unfinished draft', () => {
    const draftReport = { ...report, status: 'draft', crew_org_id: 'sub', reviewer_org_id: 'gc' };
    const draftBlocker = { ...progress, kind: 'blocker' as const, status: 'draft' };
    const model = build('TC', [draftBlocker], [draftReport]);
    expect(model.todayBlockers).toHaveLength(0);
    expect(fieldOperationsAttention(model)).toEqual([]);
    expect(model.actionLabel).toBe('Continue today’s report');
  });
});

import { rankPortfolioRows } from '@/hooks/useFieldOperationsPortfolio';
describe('dashboard Field Operations ranking', () => {
  it('lists blocker projects before review and quiet projects', () => {
    const blocker = { ...progress, id: 'b', kind: 'blocker' as const };
    const quiet = { projectId: 'q', projectName: 'A quiet', model: build('TC', [], []) };
    const review = { projectId: 'r', projectName: 'B review', model: build('TC') };
    const blocked = { projectId: 'x', projectName: 'C blocked', model: build('TC', [blocker]) };
    expect(rankPortfolioRows([quiet, review, blocked]).map((r) => r.projectId)).toEqual(['x', 'r', 'q']);
  });
});
