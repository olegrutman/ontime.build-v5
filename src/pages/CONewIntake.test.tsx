/**
 * End-to-end tests for the pricing_type prompt on the CO intake flow.
 *
 * Verifies:
 *  - After scope lines are extracted, the "Pricing model" card is shown
 *    for a Change Order.
 *  - The default value is `fixed` and persists into the draft CO insert.
 *  - Selecting "Time & Materials" persists as `pricing_type: 'tm'`.
 *  - Selecting "Not To Exceed" persists as `pricing_type: 'nte'`.
 *  - Switching to a Work Order hides the pricing card and forces
 *    `pricing_type: 'tm'` in the insert payload.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Hoisted mocks ────────────────────────────────────────────────────────────
const {
  navigateMock,
  toastMock,
  useAuthMock,
  useOrgTypeMock,
  startMutateAsyncMock,
  useAiIntakeDataRef,
  generateCONumberMock,
  changeOrderInsertMock,
  lineItemInsertMock,
  intakeUpdateMock,
  projectContractModeRef,
} = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  toastMock: vi.fn(),
  useAuthMock: vi.fn(),
  useOrgTypeMock: vi.fn(),
  startMutateAsyncMock: vi.fn(),
  useAiIntakeDataRef: { current: null as any },
  generateCONumberMock: vi.fn(),
  changeOrderInsertMock: vi.fn(),
  lineItemInsertMock: vi.fn(),
  intakeUpdateMock: vi.fn(),
  projectContractModeRef: { current: 'fixed' as 'fixed' | 'tm' },
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
  useParams: () => ({ id: 'proj-1' }),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
  Navigate: () => null,
}));

vi.mock('@/hooks/use-toast', () => ({ toast: toastMock }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => useAuthMock() }));
vi.mock('@/hooks/useOrgType', () => ({ useOrgType: () => useOrgTypeMock() }));

vi.mock('@/hooks/useAiIntake', () => ({
  useStartAiIntake: () => ({ mutateAsync: startMutateAsyncMock, isPending: false }),
  useAiIntake: () => ({ data: useAiIntakeDataRef.current }),
  linesFromIntake: (row: any) =>
    (row?.output_json?.lines ?? []).map((l: any, i: number) => ({
      order: i + 1,
      title: l.title ?? '',
      problem: l.problem ?? '',
      catalog_slug: null,
      catalog_name: null,
      scenario_id: null,
      location_hint: null,
      qty: l.qty ?? null,
      unit: l.unit ?? null,
      group_key: null,
      confidence: l.confidence ?? 0.9,
    })),
}));

vi.mock('@/lib/generateCONumber', () => ({
  generateCONumber: (...args: any[]) => generateCONumberMock(...args),
}));

vi.mock('@/components/VoiceInputButton', () => ({
  VoiceInputButton: () => null,
}));

// Supabase mock: chainable table queries.
vi.mock('@/integrations/supabase/client', () => {
  const projectsChain = () => {
    const chain: any = {};
    ['select', 'eq'].forEach((k) => (chain[k] = () => chain));
    chain.maybeSingle = async () => ({
      data: { name: 'Test Project', contract_mode: projectContractModeRef.current },
      error: null,
    });
    return chain;
  };
  const contractsChain = () => {
    const chain: any = {};
    ['select', 'eq', 'not', 'limit'].forEach((k) => (chain[k] = () => chain));
    chain.maybeSingle = async () => ({
      data: { material_responsibility: 'TC' },
      error: null,
    });
    return chain;
  };
  const changeOrdersChain = () => {
    const chain: any = {};
    chain.insert = (payload: any) => {
      changeOrderInsertMock(payload);
      return {
        select: () => ({
          single: async () => ({ data: { id: 'co-new-1' }, error: null }),
        }),
      };
    };
    // for existingCO query (won't run since no coId param)
    ['select', 'eq'].forEach((k) => (chain[k] = () => chain));
    chain.maybeSingle = async () => ({ data: null, error: null });
    return chain;
  };
  const lineItemsChain = () => ({
    insert: (rows: any) => {
      lineItemInsertMock(rows);
      return Promise.resolve({ data: null, error: null });
    },
  });
  const intakesChain = () => ({
    update: (patch: any) => ({
      eq: (..._args: any[]) => {
        intakeUpdateMock(patch);
        return Promise.resolve({ data: null, error: null });
      },
    }),
  });

  return {
    supabase: {
      from: (table: string) => {
        switch (table) {
          case 'projects':
            return projectsChain();
          case 'project_contracts':
            return contractsChain();
          case 'change_orders':
            return changeOrdersChain();
          case 'co_line_items':
            return lineItemsChain();
          case 'co_ai_intakes':
            return intakesChain();
          default:
            return projectsChain();
        }
      },
    },
  };
});

// ── Import after mocks ───────────────────────────────────────────────────────
import CONewIntakePage from './CONewIntake';

// ── Helpers ──────────────────────────────────────────────────────────────────
function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <CONewIntakePage />
    </QueryClientProvider>,
  );
}

async function extractScope() {
  const textarea = screen.getByPlaceholderText(/Describe what changed/i);
  fireEvent.change(textarea, { target: { value: 'Move the kitchen wall two feet east' } });
  const extract = screen.getByRole('button', { name: /Extract scope/i });
  await act(async () => {
    fireEvent.click(extract);
  });
  await waitFor(() =>
    expect(screen.getByText(/scope items? extracted/i)).toBeInTheDocument(),
  );
}

async function clickCreateDraft() {
  const btn = await screen.findByRole('button', { name: /Create draft/i });
  await act(async () => {
    fireEvent.click(btn);
  });
  await waitFor(() => expect(changeOrderInsertMock).toHaveBeenCalled());
}

beforeEach(() => {
  navigateMock.mockReset();
  toastMock.mockReset();
  startMutateAsyncMock.mockReset();
  generateCONumberMock.mockReset();
  changeOrderInsertMock.mockReset();
  lineItemInsertMock.mockReset();
  intakeUpdateMock.mockReset();

  useAuthMock.mockReturnValue({
    user: { id: 'user-1' },
    userOrgRoles: [{ organization_id: 'org-1' }],
  });
  useOrgTypeMock.mockReturnValue({
    orgType: 'TC',
    isGC: false,
    isTC: true,
    isFC: false,
    isSupplier: false,
    isDownstream: true,
  });

  projectContractModeRef.current = 'fixed';
  useAiIntakeDataRef.current = {
    id: 'int-1',
    status: 'succeeded',
    output_json: {
      lines: [{ title: 'Move kitchen wall 2ft east', problem: 'Owner request', qty: 1, unit: 'EA', confidence: 0.9 }],
    },
  };
  startMutateAsyncMock.mockResolvedValue({ intake_id: 'int-1', status: 'pending' });
  generateCONumberMock.mockResolvedValue('CO-001');
});

// ── Tests ────────────────────────────────────────────────────────────────────
describe('CO intake — pricing_type prompt & persistence', () => {
  it('shows the Pricing model card once scope lines are extracted (CO)', async () => {
    renderPage();
    await extractScope();

    expect(screen.getByText(/Pricing model/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fixed Price/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Time & Materials/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Not To Exceed/i })).toBeInTheDocument();
  });

  it('defaults to pricing_type = "fixed" when the user does not change it', async () => {
    renderPage();
    await extractScope();
    await clickCreateDraft();

    expect(changeOrderInsertMock).toHaveBeenCalledTimes(1);
    const payload = changeOrderInsertMock.mock.calls[0][0];
    expect(payload.pricing_type).toBe('fixed');
    expect(payload.document_type).toBe('CO');
  });

  it('persists pricing_type = "tm" when Time & Materials is selected', async () => {
    renderPage();
    await extractScope();

    fireEvent.click(screen.getByRole('button', { name: /Time & Materials/i }));
    await clickCreateDraft();

    const payload = changeOrderInsertMock.mock.calls[0][0];
    expect(payload.pricing_type).toBe('tm');
  });

  it('persists pricing_type = "nte" when Not To Exceed is selected', async () => {
    renderPage();
    await extractScope();

    fireEvent.click(screen.getByRole('button', { name: /Not To Exceed/i }));
    await clickCreateDraft();

    const payload = changeOrderInsertMock.mock.calls[0][0];
    expect(payload.pricing_type).toBe('nte');
  });

  it('hides the Pricing model card and forces pricing_type = "tm" when doc type is WO', async () => {
    renderPage();
    await extractScope();

    // Flip to Work Order in the review section
    const woButtons = screen.getAllByRole('button', { name: /Work Order/i });
    fireEvent.click(woButtons[woButtons.length - 1]);

    await waitFor(() =>
      expect(screen.queryByText(/Pricing model/i)).not.toBeInTheDocument(),
    );

    await clickCreateDraft();
    const payload = changeOrderInsertMock.mock.calls[0][0];
    expect(payload.document_type).toBe('WO');
    expect(payload.pricing_type).toBe('tm');
  });
});
