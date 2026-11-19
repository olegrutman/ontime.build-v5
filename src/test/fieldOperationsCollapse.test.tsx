import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FieldOperationsCard } from '@/components/field-reports/FieldOperationsCard';
import { DashboardFieldOperations } from '@/components/dashboard/DashboardFieldOperations';
import {
  buildFieldOperationsModel,
  type FieldOperationsItem,
  type FieldOperationsModel,
  type FieldOperationsReport,
} from '@/lib/fieldOperations';

const today = '2026-11-19';
const companies = [{ id: 'crew', name: 'Framing Company' }, { id: 'sub', name: 'Subcontractor' }];

// The dashboard card reads the signed-in company and the portfolio hook; the
// collapse behaviour is what this file checks, so both are stubbed here.
const portfolio = vi.hoisted(() => ({ rows: [] as any[] }));
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ select: () => ({ in: () => ({ order: () => ({ range: () => Promise.resolve({ data: [], error: null }) }) }) }) }) },
}));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, userOrgRoles: [{ organization_id: 'sub', organization: { id: 'sub' } }] }),
}));
vi.mock('@/hooks/useFieldOperationsPortfolio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useFieldOperationsPortfolio')>();
  return {
    ...actual,
    useFieldOperationsPortfolio: () => ({ rows: portfolio.rows, isLoading: false, isError: false, refetch: vi.fn() }),
  };
});

function modelFor(projectId: string, options: { blocker?: boolean } = {}): FieldOperationsModel {
  const report: FieldOperationsReport = {
    id: `report-${projectId}`, project_id: projectId, crew_org_id: 'crew', reviewer_org_id: 'sub',
    report_date: today, status: 'submitted', created_at: '2026-11-19T08:00:00Z', submitted_at: '2026-11-19T09:00:00Z',
  };
  const items: FieldOperationsItem[] = [
    {
      id: `item-${projectId}`, report_id: report.id, project_id: projectId, crew_org_id: 'crew', reviewer_org_id: 'sub',
      kind: 'progress', description: 'Installed the second-floor trusses.', quantity: null, unit: null,
      status: 'crew_confirmed', created_at: '2026-11-19T09:00:00Z', confirmed_at: '2026-11-19T09:00:00Z',
    },
  ];
  if (options.blocker) {
    items.push({
      id: `blocker-${projectId}`, report_id: report.id, project_id: projectId, crew_org_id: 'crew', reviewer_org_id: 'sub',
      kind: 'blocker', description: 'Wait for the plumber to finish work in the kitchen.', quantity: null, unit: null,
      status: 'crew_confirmed', created_at: '2026-11-19T09:30:00Z', confirmed_at: '2026-11-19T09:30:00Z',
    });
  }
  return buildFieldOperationsModel({
    reports: [report], items, companies,
    orgIds: ['sub'], currentOrgId: 'sub', role: 'TC', canAuthor: true, today,
  });
}

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('Field Operations card collapse', () => {
  it('collapses the overview card to one line, keeps the pulse, and remembers the choice per project', () => {
    const model = modelFor('project-1');
    render(
      <FieldOperationsCard model={model} isLoading={false} isError={false} onRetry={() => {}} onNavigate={() => {}} projectId="project-1" />,
    );

    // Open by default: both the detail body and the latest-update panel are visible.
    expect(screen.getByText('Latest field update')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Collapse Field Operations details' })).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Collapse Field Operations details' }));

    expect(screen.queryByText('Latest field update')).toBeNull();
    expect(screen.queryByRole('button', { name: model.actionLabel })).toBeNull();
    // The collapsed line still carries today's headline and counts, and the pulse stays readable.
    expect(screen.getByText(model.headline)).toBeInTheDocument();
    expect(screen.getByText('updates')).toBeInTheDocument();
    expect(screen.getByLabelText('Five-day Field Report pulse')).toBeInTheDocument();
    expect(localStorage.getItem('ontime_card_field-ops-project-1')).toBe('collapsed');

    cleanup();
    render(
      <FieldOperationsCard model={model} isLoading={false} isError={false} onRetry={() => {}} onNavigate={() => {}} projectId="project-1" />,
    );
    expect(screen.getByRole('button', { name: 'Expand Field Operations details' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Latest field update')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Show Field Operations details' }));
    expect(screen.getByText('Latest field update')).toBeInTheDocument();
    expect(localStorage.getItem('ontime_card_field-ops-project-1')).toBe('open');

    // Another project keeps its own choice.
    cleanup();
    render(
      <FieldOperationsCard model={model} isLoading={false} isError={false} onRetry={() => {}} onNavigate={() => {}} projectId="project-2" />,
    );
    expect(screen.getByText('Latest field update')).toBeInTheDocument();
  });

  it('collapses the dashboard card and remembers the choice for that company', () => {
    const projects = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, name: `Project ${id}`, status: 'active' }));
    const rows = projects.map((project, index) => ({
      projectId: project.id,
      projectName: project.name,
      model: modelFor(project.id, { blocker: index === 0 }),
    }));
    portfolio.rows = rows;

    render(<DashboardFieldOperations projects={projects} role="TC" />);

    expect(screen.getByText('Project a')).toBeInTheDocument();
    // Only the four most urgent projects show before "Show all".
    expect(screen.queryByText('Project e')).toBeNull();
    expect(screen.getByRole('button', { name: 'Show all 5 projects' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Collapse Field Operations project list' }));

    expect(screen.queryByText('Project b')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Show all 5 projects' })).toBeNull();
    // The collapsed line names the most urgent project.
    expect(screen.getByText('Project a')).toBeInTheDocument();
    expect(screen.getByText('1 report awaiting review')).toBeInTheDocument();
    expect(localStorage.getItem('ontime_card_field-ops-dashboard-sub')).toBe('collapsed');

    cleanup();
    render(<DashboardFieldOperations projects={projects} role="TC" />);
    expect(screen.getByRole('button', { name: 'Expand Field Operations project list' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: 'Show Field Operations project list' })).toBeInTheDocument();
    expect(screen.queryByText('Project b')).toBeNull();
  });
});
