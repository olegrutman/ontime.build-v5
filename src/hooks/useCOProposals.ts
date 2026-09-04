import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type ProposalStatus = 'draft' | 'sent' | 'accepted' | 'declined';
export type MilestoneBasis = 'percent' | 'amount';

export interface COProposal {
  id: string;
  project_id: string;
  org_id: string;
  proposal_number: string;
  title: string;
  intro: string | null;
  validity_days: number;
  payment_terms: string | null;
  markup_percent: number;
  tax_percent: number;
  subtotal: number;
  total: number;
  status: ProposalStatus;
  perspective: string;
  created_by_user_id: string;
  sent_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  created_at: string;
  updated_at: string;
  /* Quote fields */
  client_name: string | null;
  client_company: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_address: string | null;
  site_address: string | null;
  scope_notes: string | null;
  exclusions: string | null;
  terms_text: string | null;
  deposit_note: string | null;
}

export interface COProposalItem {
  id: string;
  proposal_id: string;
  change_order_id: string;
  sort_order: number;
  amount_snapshot: number;
}

export interface COProposalMilestone {
  id: string;
  proposal_id: string;
  sort_order: number;
  label: string;
  due_trigger: string | null;
  basis: MilestoneBasis;
  percent: number;
  amount: number;
}

export interface MilestoneInput {
  label: string;
  due_trigger?: string | null;
  basis: MilestoneBasis;
  percent: number;
  amount: number;
}

export interface QuoteFields {
  client_name?: string | null;
  client_company?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  client_address?: string | null;
  site_address?: string | null;
  scope_notes?: string | null;
  exclusions?: string | null;
  terms_text?: string | null;
  deposit_note?: string | null;
  tax_percent?: number;
}

export interface NewProposalInput extends QuoteFields {
  title: string;
  intro?: string | null;
  validity_days: number;
  payment_terms?: string | null;
  markup_percent: number;
  perspective?: 'upstream' | 'downstream';
  items: { change_order_id: string; amount: number }[];
  milestones?: MilestoneInput[];
}

export type ProposalWithDetails = COProposal & {
  items: COProposalItem[];
  milestones: COProposalMilestone[];
};

const SELECT = '*, items:co_proposal_items(*), milestones:co_proposal_milestones(*)';

/** Subtotal → markup → tax roll-up used by the builder, list and PDF. */
export function computeProposalTotals(
  amounts: number[],
  markupPercent: number,
  taxPercent: number,
) {
  const subtotal = amounts.reduce((s, a) => s + Number(a || 0), 0);
  const markupAmount = (subtotal * (Number(markupPercent) || 0)) / 100;
  const taxable = subtotal + markupAmount;
  const taxAmount = (taxable * (Number(taxPercent) || 0)) / 100;
  return { subtotal, markupAmount, taxAmount, total: taxable + taxAmount };
}

export function milestoneAmount(m: MilestoneInput | COProposalMilestone, total: number) {
  return m.basis === 'percent'
    ? (total * (Number(m.percent) || 0)) / 100
    : Number(m.amount) || 0;
}

const sortDetails = (rows: ProposalWithDetails[]) =>
  rows.map(p => ({
    ...p,
    items: [...(p.items ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    milestones: [...(p.milestones ?? [])].sort((a, b) => a.sort_order - b.sort_order),
  }));

/** All proposals on a project (participants can read). */
export function useCOProposals(projectId: string | null) {
  return useQuery({
    queryKey: ['co-proposals', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<ProposalWithDetails[]> => {
      const { data, error } = await supabase
        .from('co_proposals')
        .select(SELECT)
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return sortDetails((data ?? []) as unknown as ProposalWithDetails[]);
    },
  });
}

export function useCOProposal(proposalId: string | null) {
  return useQuery({
    queryKey: ['co-proposal', proposalId],
    enabled: !!proposalId,
    queryFn: async (): Promise<ProposalWithDetails | null> => {
      const { data, error } = await supabase
        .from('co_proposals')
        .select(SELECT)
        .eq('id', proposalId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return sortDetails([data as unknown as ProposalWithDetails])[0];
    },
  });
}

/** Which change orders are already inside a non-declined proposal. */
export function useCOsInProposals(projectId: string | null) {
  const { data: proposals = [] } = useCOProposals(projectId);
  const map = new Map<string, COProposal>();
  for (const p of proposals) {
    if (p.status === 'declined') continue;
    for (const it of p.items ?? []) map.set(it.change_order_id, p);
  }
  return map;
}

function quotePayload(input: QuoteFields) {
  const t = (v?: string | null) => (v && v.trim() ? v.trim() : null);
  return {
    client_name: t(input.client_name),
    client_company: t(input.client_company),
    client_email: t(input.client_email),
    client_phone: t(input.client_phone),
    client_address: t(input.client_address),
    site_address: t(input.site_address),
    scope_notes: t(input.scope_notes),
    exclusions: t(input.exclusions),
    terms_text: t(input.terms_text),
    deposit_note: t(input.deposit_note),
    tax_percent: Number(input.tax_percent || 0),
  };
}

async function writeChildren(
  proposalId: string,
  items: NewProposalInput['items'],
  milestones: MilestoneInput[],
  total: number,
  replace: boolean,
) {
  if (replace) {
    await supabase.from('co_proposal_items').delete().eq('proposal_id', proposalId);
    await supabase.from('co_proposal_milestones').delete().eq('proposal_id', proposalId);
  }
  if (items.length > 0) {
    const { error } = await supabase.from('co_proposal_items').insert(
      items.map((it, idx) => ({
        proposal_id: proposalId,
        change_order_id: it.change_order_id,
        sort_order: idx,
        amount_snapshot: Number(it.amount || 0),
      })),
    );
    if (error) throw error;
  }
  if (milestones.length > 0) {
    const { error } = await supabase.from('co_proposal_milestones').insert(
      milestones.map((m, idx) => ({
        proposal_id: proposalId,
        sort_order: idx,
        label: m.label.trim() || `Payment ${idx + 1}`,
        due_trigger: m.due_trigger?.trim() || null,
        basis: m.basis,
        percent: m.basis === 'percent' ? Number(m.percent || 0) : 0,
        amount: milestoneAmount(m, total),
      })),
    );
    if (error) throw error;
  }
}

export function useCreateProposal(projectId: string | null) {
  const queryClient = useQueryClient();
  const { user, userOrgRoles } = useAuth();
  const orgId = userOrgRoles?.[0]?.organization_id ?? null;

  return useMutation({
    mutationFn: async (input: NewProposalInput): Promise<COProposal> => {
      if (!projectId || !orgId || !user) throw new Error('Missing project or organization context');

      // Derive the next number from the highest existing one, not the row count:
      // counting breaks as soon as a proposal is deleted (duplicate number).
      const { data: existingNumbers } = await supabase
        .from('co_proposals')
        .select('proposal_number')
        .eq('project_id', projectId);
      const maxSeq = (existingNumbers ?? []).reduce((max: number, r: any) => {
        const n = parseInt(String(r.proposal_number ?? '').replace(/\D/g, ''), 10);
        return Number.isFinite(n) && n > max ? n : max;
      }, 0);
      const proposalNumber = `PROP-${String(maxSeq + 1).padStart(3, '0')}`;
      const { subtotal, total } = computeProposalTotals(
        input.items.map(i => i.amount),
        input.markup_percent,
        input.tax_percent ?? 0,
      );

      const { data: proposal, error } = await supabase
        .from('co_proposals')
        .insert({
          project_id: projectId,
          org_id: orgId,
          proposal_number: proposalNumber,
          title: input.title,
          intro: input.intro ?? null,
          validity_days: input.validity_days,
          payment_terms: input.payment_terms ?? null,
          markup_percent: input.markup_percent,
          subtotal,
          total,
          perspective: input.perspective ?? 'upstream',
          created_by_user_id: user.id,
          ...quotePayload(input),
        })
        .select('*')
        .single();
      if (error) throw error;

      await writeChildren(proposal.id, input.items, input.milestones ?? [], total, false);
      return proposal as unknown as COProposal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['co-proposals', projectId] });
    },
  });
}

/** Edits a saved quote: cover, client, terms, bundled work orders and payment schedule. */
export function useUpdateProposal(projectId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: NewProposalInput }) => {
      const { subtotal, total } = computeProposalTotals(
        input.items.map(i => i.amount),
        input.markup_percent,
        input.tax_percent ?? 0,
      );
      const { error } = await supabase
        .from('co_proposals')
        .update({
          title: input.title,
          intro: input.intro ?? null,
          validity_days: input.validity_days,
          payment_terms: input.payment_terms ?? null,
          markup_percent: input.markup_percent,
          subtotal,
          total,
          ...quotePayload(input),
        })
        .eq('id', id);
      if (error) throw error;

      await writeChildren(id, input.items, input.milestones ?? [], total, true);
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['co-proposals', projectId] });
      queryClient.invalidateQueries({ queryKey: ['co-proposal', vars.id] });
    },
  });
}

export function useUpdateProposalStatus(projectId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ProposalStatus }) => {
      const stamps: Record<string, string | null> = {};
      if (status === 'sent') stamps.sent_at = new Date().toISOString();
      if (status === 'accepted') stamps.accepted_at = new Date().toISOString();
      if (status === 'declined') stamps.declined_at = new Date().toISOString();
      const { error } = await supabase.from('co_proposals').update({ status, ...stamps }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['co-proposals', projectId] });
      queryClient.invalidateQueries({ queryKey: ['co-proposal', vars.id] });
    },
  });
}

export function useDeleteProposal(projectId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('co_proposals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['co-proposals', projectId] }),
  });
}

/** Downloads the bundled proposal PDF. */
export async function downloadProposalPdf(proposalId: string, fileLabel: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-proposal-pdf`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ proposal_id: proposalId }),
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to generate proposal' }));
    throw new Error(err.error ?? 'Failed to generate proposal');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileLabel}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
