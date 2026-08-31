import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type ProposalStatus = 'draft' | 'sent' | 'accepted' | 'declined';

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
}

export interface COProposalItem {
  id: string;
  proposal_id: string;
  change_order_id: string;
  sort_order: number;
  amount_snapshot: number;
}

export interface NewProposalInput {
  title: string;
  intro?: string | null;
  validity_days: number;
  payment_terms?: string | null;
  markup_percent: number;
  perspective?: 'upstream' | 'downstream';
  items: { change_order_id: string; amount: number }[];
}

/** All proposals on a project (participants can read). */
export function useCOProposals(projectId: string | null) {
  return useQuery({
    queryKey: ['co-proposals', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<(COProposal & { items: COProposalItem[] })[]> => {
      const { data, error } = await supabase
        .from('co_proposals')
        .select('*, items:co_proposal_items(*)')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as (COProposal & { items: COProposalItem[] })[];
    },
  });
}

export function useCOProposal(proposalId: string | null) {
  return useQuery({
    queryKey: ['co-proposal', proposalId],
    enabled: !!proposalId,
    queryFn: async (): Promise<(COProposal & { items: COProposalItem[] }) | null> => {
      const { data, error } = await supabase
        .from('co_proposals')
        .select('*, items:co_proposal_items(*)')
        .eq('id', proposalId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as (COProposal & { items: COProposalItem[] }) | null;
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

export function useCreateProposal(projectId: string | null) {
  const queryClient = useQueryClient();
  const { user, userOrgRoles } = useAuth();
  const orgId = userOrgRoles?.[0]?.organization_id ?? null;

  return useMutation({
    mutationFn: async (input: NewProposalInput): Promise<COProposal> => {
      if (!projectId || !orgId || !user) throw new Error('Missing project or organization context');

      const { count } = await supabase
        .from('co_proposals')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId);

      const proposalNumber = `PROP-${String((count ?? 0) + 1).padStart(3, '0')}`;
      const subtotal = input.items.reduce((s, i) => s + Number(i.amount || 0), 0);
      const total = subtotal * (1 + Number(input.markup_percent || 0) / 100);

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
        })
        .select('*')
        .single();
      if (error) throw error;

      if (input.items.length > 0) {
        const { error: itemsError } = await supabase.from('co_proposal_items').insert(
          input.items.map((it, idx) => ({
            proposal_id: proposal.id,
            change_order_id: it.change_order_id,
            sort_order: idx,
            amount_snapshot: Number(it.amount || 0),
          })),
        );
        if (itemsError) throw itemsError;
      }

      return proposal as unknown as COProposal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['co-proposals', projectId] });
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
