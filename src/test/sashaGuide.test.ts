import { beforeEach, describe, expect, it } from 'vitest';
import { guidesForRole, resolveGuideSteps, SASHA_GUIDES } from '@/data/sashaGuides';
import { markGuideCompleted, pathMatches, readCompletedGuides, sashaGuideCompletionKey } from '@/lib/sashaGuideProgress';

const roles = ['GC', 'TC', 'FC', 'SUPPLIER'] as const;

describe('Sasha live guides', () => {
  beforeEach(() => window.localStorage.clear());

  it('offers every company type its own starter tour', () => {
    for (const role of roles) {
      expect(guidesForRole(role).some((guide) => guide.id === {
        GC: 'contractor-project-control',
        TC: 'subcontractor-command-center',
        FC: 'crew-first-day',
        SUPPLIER: 'supplier-fulfillment',
      }[role])).toBe(true);
    }
  });

  it('keeps Crew review limited to Subcontractors and catalog management limited to Suppliers', () => {
    expect(guidesForRole('TC').some((guide) => guide.id === 'review-crew-input')).toBe(true);
    expect(guidesForRole('FC').some((guide) => guide.id === 'review-crew-input')).toBe(false);
    expect(guidesForRole('GC').some((guide) => guide.id === 'review-crew-input')).toBe(false);
    expect(guidesForRole('SUPPLIER').some((guide) => guide.id === 'supplier-catalog')).toBe(true);
    expect(guidesForRole('TC').some((guide) => guide.id === 'supplier-catalog')).toBe(false);
  });

  it('requires a real project selection before project workflow steps', () => {
    const guide = SASHA_GUIDES.find((candidate) => candidate.id === 'create-work-item')!;
    const withoutProject = resolveGuideSteps(guide, null);
    expect(withoutProject[0].id).toBe('select-project');
    expect(withoutProject[0].advanceOn).toBe('route');
    expect(withoutProject).toHaveLength(guide.steps.length + 1);
    expect(resolveGuideSteps(guide, 'project-123')).toHaveLength(guide.steps.length);
  });

  it('advances project selection only for a project route', () => {
    const guide = SASHA_GUIDES.find((candidate) => candidate.id === 'create-work-item')!;
    const selection = resolveGuideSteps(guide, null)[0];
    expect(pathMatches(selection.matchPath, '/dashboard')).toBe(false);
    expect(pathMatches(selection.matchPath, '/project/project-123')).toBe(true);
    expect(pathMatches(selection.matchPath, '/project/project-123/change-orders')).toBe(true);
    expect(pathMatches(selection.matchPath, '/supplier/inventory')).toBe(false);
  });

  it('remembers completion per user without completing another user’s guide', () => {
    markGuideCompleted('user-a', 'crew-first-day');
    expect(readCompletedGuides('user-a')).toEqual(['crew-first-day']);
    expect(readCompletedGuides('user-b')).toEqual([]);
    expect(window.localStorage.getItem(sashaGuideCompletionKey('user-a', 'crew-first-day'))).toBe('true');
  });

  it('marks a guide complete once even when finish is repeated', () => {
    markGuideCompleted('user-a', 'create-work-item');
    markGuideCompleted('user-a', 'create-work-item');
    expect(readCompletedGuides('user-a')).toEqual(['create-work-item']);
    expect(Object.keys(window.localStorage).filter((key) => key.includes('create-work-item'))).toHaveLength(1);
  });
});

describe('complete Field Report tour', () => {
  it('continues after New Field Report through the full draft and review handoff', () => {
    const guide = SASHA_GUIDES.find((candidate) => candidate.id === 'submit-field-report')!;
    const steps = resolveGuideSteps(guide, 'project-123');
    expect(steps.map(step => step.id)).toEqual([
      'open-field-reports',
      'new-field-report',
      'field-report-update',
      'field-report-manual-entry',
      'field-report-materials',
      'field-report-photos',
      'field-report-check-items',
      'field-report-send',
    ]);
    expect(steps[1].advanceOn).toBe('click');
    expect(steps.at(-1)?.targetSelector).toBe('[data-sasha-target="field-report-submit"]');
    expect(steps.at(-1)?.advanceOn).toBe('manual');
  });

  it('keeps the complete Field Report workflow available to Crew, Subcontractor and General Contractor', () => {
    for (const role of ['FC', 'TC', 'GC'] as const) {
      const guide = guidesForRole(role).find(candidate => candidate.id === 'submit-field-report')!;
      expect(guide.steps.length).toBeGreaterThan(2);
      expect(guide.steps.some(step => step.id === 'field-report-send')).toBe(true);
    }
  });
});

describe('additional Sasha tours', () => {
  it('offers item pricing only to Subcontractor and Crew', () => {
    expect(guidesForRole('TC').some((g) => g.id === 'price-order-items')).toBe(true);
    expect(guidesForRole('FC').some((g) => g.id === 'price-order-items')).toBe(true);
    expect(guidesForRole('GC').some((g) => g.id === 'price-order-items')).toBe(false);
  });
  it('keeps outside approval tour away from Crew and Supplier', () => {
    expect(guidesForRole('FC').some((g) => g.id === 'order-documents-approval')).toBe(false);
    expect(guidesForRole('SUPPLIER').some((g) => g.id === 'order-documents-approval')).toBe(false);
  });
});
