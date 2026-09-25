import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCoV4Flag } from '@/hooks/useCoV4Flag';
import type { ChangeOrder, COCollaboratorStatus, COStatus } from '@/types/changeOrder';

export interface ChangeOrderWithMembers extends ChangeOrder {
  collaboratorStatus?: COCollaboratorStatus;
  collaboratorOrgId?: string;
  display_total?: number;
  /** What this CO costs the viewer's company */
  my_cost?: number;
  billing_state?: 'not_billed' | 'draft' | 'invoiced' | 'partly_paid' | 'paid';
  billed_amount?: number;
}

export type BoardColumnKey = 'wip' | 'pending_pricing' | 'gc_review' | 'approved' | 'invoiced';

export const BOARD_COLUMNS: { key: BoardColumnKey; label: string; color: string }[] = [
  { key: 'wip', label: 'Work in progress', color: '#2563EB' },
  { key: 'pending_pricing', label: 'Pending pricing', color: '#F5A623' },
  { key: 'gc_review', label: 'In review', color: '#F5A623' },
  { key: 'approved', label: 'Approved — billable', color: '#059669' },
  { key: 'invoiced', label: 'Invoiced / Paid', color: '#6B7280' },
];

const STATUS_TO_COLUMN: Record<string, BoardColumnKey> = {
  draft: 'wip',
  shared: 'wip',
  work_in_progress: 'wip',
  rejected: 'wip',
  closed_for_pricing: 'pending_pricing',
  submitted: 'gc_review',
  approved: 'approved',
  contracted: 'invoiced',
};

export interface GroupedChangeOrders {
  mine: {
    draft: ChangeOrderWithMembers[];
    shared: ChangeOrderWithMembers[];
    work_in_progress: ChangeOrderWithMembers[];
    closed_for_pricing: ChangeOrderWithMembers[];
    submitted: ChangeOrderWithMembers[];
    approved: ChangeOrderWithMembers[];
    rejected: ChangeOrderWithMembers[];
    contracted: ChangeOrderWithMembers[];
  };
  sharedWithMe: ChangeOrderWithMembers[];
}

export type BoardColumns = Record<BoardColumnKey, ChangeOrderWithMembers[]>;


export function useChangeOrders(projectId: string | null) {
  const { userOrgRoles, user } = useAuth();
  const orgId = userOrgRoles?.[0]?.organization_id ?? null;
  const queryClient = useQueryClient();
  const coV4 = useCoV4Flag();

  // Phase 1 visibility wall: read from role-scoped views when co_v4 is on.
  const t = {
    co: (coV4 ? 'change_orders_role_view' : 'change_orders') as 'change_orders',
    labor: (coV4 ? 'co_labor_entries_role_view' : 'co_labor_entries') as 'co_labor_entries',
    mats: (coV4 ? 'co_material_items_role_view' : 'co_material_items') as 'co_material_items',
    eq: (coV4 ? 'co_equipment_items_role_view' : 'co_equipment_items') as 'co_equipment_items',
  };

  const invalidateChangeOrders = () => {
    queryClient.invalidateQueries({ queryKey: ['change-orders', projectId] });
  };

  const { data: queryResult, isLoading } = useQuery({
    queryKey: ['change-orders', projectId, orgId, coV4],
    enabled: !!projectId && !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(t.co)
        .select('*')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const allCOs = data as ChangeOrder[];

      const collaboratorMap = new Map<string, { status: COCollaboratorStatus; organization_id: string }>();
      if (allCOs.length > 0) {
        const { data: collaborators, error: collaboratorError } = await supabase
          .from('change_order_collaborators')
          .select('co_id, status, organization_id')
          .eq('organization_id', orgId!)
          .in('co_id', allCOs.map(co => co.id));

        if (collaboratorError) throw collaboratorError;

        for (const collaborator of collaborators ?? []) {
          collaboratorMap.set(collaborator.co_id, {
            status: collaborator.status as COCollaboratorStatus,
            organization_id: collaborator.organization_id,
          });
        }
      }

      // Fetch downstream org IDs, participant role, and per-CO totals data in parallel
      const coIds = allCOs.map(c => c.id);
      const [
        { data: downstreamContracts },
        { data: myParticipant },
        { data: laborRows },
        { data: matRows },
        { data: eqRows },
        { data: projInvoices },
      ] = await Promise.all([
        supabase
          .from('project_contracts')
          .select('from_org_id')
          .eq('project_id', projectId!)
          .eq('to_org_id', orgId!),
        supabase
          .from('project_participants')
          .select('role')
          .eq('project_id', projectId!)
          .eq('organization_id', orgId!)
          .eq('invite_status', 'ACCEPTED')
          .maybeSingle(),
        coIds.length
          ? supabase.from(t.labor)
              .select('co_id, entered_by_role, line_total, is_actual_cost')
              .in('co_id', coIds)
          : Promise.resolve({ data: [] as any[] }) as any,
        coIds.length
          ? supabase.from(t.mats)
              .select('co_id, billed_amount, added_by_role')
              .in('co_id', coIds)
          : Promise.resolve({ data: [] as any[] }) as any,
        coIds.length
          ? supabase.from(t.eq)
              .select('co_id, billed_amount, added_by_role')
              .in('co_id', coIds)
          : Promise.resolve({ data: [] as any[] }) as any,
        supabase.from('invoices')
          .select('id, status, total_amount, co_ids, from_org_id')
          .eq('project_id', projectId!) as any,
      ]);

      const downstreamOrgIds = new Set(
        (downstreamContracts ?? []).map(c => c.from_org_id).filter(Boolean) as string[]
      );
      const isGCOnProject = myParticipant?.role === 'GC';

      // Per-CO aggregates mirroring useChangeOrderDetail formulas
      const actualByCo = new Map<string, number>();
      for (const r of (laborRows ?? []) as any[]) {
        if (r.is_actual_cost) actualByCo.set(r.co_id, (actualByCo.get(r.co_id) ?? 0) + Number(r.line_total ?? 0));
      }
      const tcLaborByCo = new Map<string, number>();
      const fcLaborByCo = new Map<string, number>();
      for (const r of (laborRows ?? []) as any[]) {
        if (r.is_actual_cost) continue;
        if (r.entered_by_role === 'TC') {
          tcLaborByCo.set(r.co_id, (tcLaborByCo.get(r.co_id) ?? 0) + Number(r.line_total ?? 0));
        } else if (r.entered_by_role === 'FC') {
          fcLaborByCo.set(r.co_id, (fcLaborByCo.get(r.co_id) ?? 0) + Number(r.line_total ?? 0));
        }
      }
      // Materials / equipment procured by the GC are billed to the GC directly by the
      // supplier — they are NOT part of what the TC bills the GC for.
      const matByCo = new Map<string, number>();
      for (const r of (matRows ?? []) as any[]) {
        if (r.added_by_role === 'GC') continue;
        matByCo.set(r.co_id, (matByCo.get(r.co_id) ?? 0) + Number(r.billed_amount ?? 0));
      }
      const eqByCo = new Map<string, number>();
      for (const r of (eqRows ?? []) as any[]) {
        if (r.added_by_role === 'GC') continue;
        eqByCo.set(r.co_id, (eqByCo.get(r.co_id) ?? 0) + Number(r.billed_amount ?? 0));
      }
      const myRole = myParticipant?.role ?? null;
      const computeDisplayTotal = (c: ChangeOrder) => {
        const tcLabor = tcLaborByCo.get(c.id) ?? 0;
        const fcLabor = fcLaborByCo.get(c.id) ?? 0;
        const tcSubmitted = Number((c as any).tc_submitted_price ?? 0);
        const tcBillableToGC = (c as any).use_fc_pricing_base && tcSubmitted > 0
          ? tcSubmitted
          : tcLabor;
        const shared = (matByCo.get(c.id) ?? 0) + (eqByCo.get(c.id) ?? 0);
        // A crew (FC) viewer never sees the upstream billable price — their amount is
        // what they bill for their own labor on this item.
        if (myRole === 'FC') return fcLabor + shared;
        return tcBillableToGC + shared;
      };



      const computeMyCost = (c: ChangeOrder) => {
        const actual = actualByCo.get(c.id) ?? 0;
        if (myRole === 'GC') return computeDisplayTotal(c);
        if (myRole === 'FC') return actual;
        return (fcLaborByCo.get(c.id) ?? 0) + actual;
      };

      // Billing state per CO from invoices the viewer's company sent
      const invIds = ((projInvoices ?? []) as any[]).map(i => i.id);
      const { data: invLines } = invIds.length
        ? await supabase.from('invoice_line_items').select('invoice_id, source_co_id, current_billed').in('invoice_id', invIds)
        : { data: [] as any[] };
      const perCo = new Map<string, { status: string; amount: number }[]>();
      for (const inv of (projInvoices ?? []) as any[]) {
        const lines = ((invLines ?? []) as any[]).filter(l => l.invoice_id === inv.id && l.source_co_id);
        const coList: string[] = lines.length ? Array.from(new Set(lines.map(l => l.source_co_id))) : (inv.co_ids ?? []);
        for (const coId of coList) {
          const amt = lines.length
            ? lines.filter(l => l.source_co_id === coId).reduce((s, l) => s + Number(l.current_billed || 0), 0)
            : Number(inv.total_amount || 0) / Math.max(1, coList.length);
          const arr = perCo.get(coId) ?? [];
          arr.push({ status: inv.status, amount: amt });
          perCo.set(coId, arr);
        }
      }
      const billingFor = (c: ChangeOrder) => {
        const invs = perCo.get(c.id) ?? [];
        const live = invs.filter(i => i.status !== 'VOIDED' && i.status !== 'REJECTED');
        const sent = live.filter(i => i.status !== 'DRAFT');
        const billed = sent.reduce((s, i) => s + i.amount, 0);
        const paid = live.filter(i => i.status === 'PAID').reduce((s, i) => s + i.amount, 0);
        const approved = computeDisplayTotal(c);
        let state: ChangeOrderWithMembers['billing_state'] = 'not_billed';
        if (paid > 0 && paid + 0.01 >= Math.max(approved, billed)) state = 'paid';
        else if (paid > 0) state = 'partly_paid';
        else if (sent.length) state = 'invoiced';
        else if (live.length) state = 'draft';
        return { state, billed };
      };

      return {
        items: allCOs.map(c => ({
          ...c,
          collaboratorStatus: collaboratorMap.get(c.id)?.status,
          collaboratorOrgId: collaboratorMap.get(c.id)?.organization_id,
          display_total: computeDisplayTotal(c),
          my_cost: computeMyCost(c),
          billing_state: billingFor(c).state,
          billed_amount: billingFor(c).billed,
          fc_cost_total: fcLaborByCo.get(c.id) ?? 0,
          _isDownstreamOrg: downstreamOrgIds.has(c.org_id),
        })) as (ChangeOrderWithMembers & { _isDownstreamOrg?: boolean })[],
        isGCOnProject,
      };
    },
  });

  const changeOrders = queryResult?.items ?? [];
  const isGCOnProject = queryResult?.isGCOnProject ?? false;

  const grouped: GroupedChangeOrders = {
    mine: {
      draft: [],
      shared: [],
      work_in_progress: [],
      closed_for_pricing: [],
      submitted: [],
      approved: [],
      rejected: [],
      contracted: [],
    },
    sharedWithMe: [],
  };

  for (const co of changeOrders) {
    const isMine = co.org_id === orgId;
    const isCollaborator = co.collaboratorOrgId === orgId && (co.collaboratorStatus === 'active' || co.collaboratorStatus === 'completed');
    const isDownstream = (co as any)._isDownstreamOrg === true;

    if (isMine) {
      const bucket = co.status as COStatus;
      if (bucket in grouped.mine) {
        grouped.mine[bucket as keyof typeof grouped.mine].push(co);
      }
    } else if ((co.assigned_to_org_id === orgId && co.org_id !== orgId) || isCollaborator || isDownstream || (isGCOnProject && !isMine)) {
      grouped.sharedWithMe.push(co);
    }
  }

  // Board-oriented grouping
  const boardColumns: BoardColumns = {
    wip: [],
    pending_pricing: [],
    gc_review: [],
    approved: [],
    invoiced: [],
  };

  for (const co of changeOrders) {
    const isMine = co.org_id === orgId;
    const isAssigned = co.assigned_to_org_id === orgId;
    const isCollaborator = co.collaboratorOrgId === orgId;
    const isDownstream = (co as any)._isDownstreamOrg === true;
    if (isMine || isAssigned || isCollaborator || isDownstream || isGCOnProject) {
      const column = STATUS_TO_COLUMN[co.status] ?? 'wip';
      boardColumns[column].push(co);
    }
  }

  const createCO = useMutation({
    mutationFn: async (input: Omit<ChangeOrder,
      'id' | 'created_at' | 'updated_at' | 'co_number' |
      'shared_at' | 'submitted_at' |
      'approved_at' | 'rejected_at' | 'contracted_at' |
      'nte_increase_requested' | 'nte_increase_approved'
    >) => {
      const { data, error } = await supabase
        .from('change_orders')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as ChangeOrder;
    },
    onSuccess: invalidateChangeOrders,
  });

  const updateCO = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ChangeOrder> }) => {
      const { data, error } = await supabase
        .from('change_orders')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("You don't have permission to update this change order.");
      return data as ChangeOrder;
    },
    onSuccess: invalidateChangeOrders,
  });

  const shareCO = useMutation({
    mutationFn: async (coId: string) => {
      const { data, error } = await supabase
        .from('change_orders')
        .update({
          status: 'shared',
          shared_at: new Date().toISOString(),
          draft_shared_with_next: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', coId)
        .select()
        .single();
      if (error) throw error;
      return data as ChangeOrder;
    },
    onSuccess: invalidateChangeOrders,
  });

  return {
    changeOrders,
    grouped,
    boardColumns,
    isLoading,
    createCO,
    updateCO,
    shareCO,
  };
}
