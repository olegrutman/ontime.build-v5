import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { ChevronRight, Plus, Send, AlertTriangle } from 'lucide-react';
import { DT } from '@/lib/design-tokens';
import { AddTeamMemberDialog } from '@/components/project/AddTeamMemberDialog';
import { ContractStatusBadge } from './ContractStatusBadge';
import { ContractReviewActions } from './ContractReviewActions';
import { ContractSOWEditor } from './ContractSOWEditor';
import type { OrgType } from '@/types/organization';

interface TeamMember {
  id: string;
  role: string;
  invited_org_name: string | null;
  org_id: string | null;
  status: string;
}

interface PhaseContractsProps {
  projectId: string;
  onComplete: () => void;
  onStepChange?: (step: string) => void;
}

export function PhaseContracts({ projectId, onComplete, onStepChange }: PhaseContractsProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user, userOrgRoles } = useAuth();
  const currentUserOrgId = userOrgRoles.length > 0 ? userOrgRoles[0].organization_id : null;

  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const { data: project } = useQuery({
    queryKey: ['project_creator', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects').select('created_by, organization_id').eq('id', projectId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: creatorOrg } = useQuery({
    queryKey: ['creator_org_type', project?.organization_id],
    enabled: !!project?.organization_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations').select('type').eq('id', project!.organization_id).single();
      if (error) throw error;
      return data;
    },
  });

  const creatorRole = useMemo(() => {
    if (!creatorOrg) return null;
    if (creatorOrg.type === 'GC') return 'General Contractor';
    if (creatorOrg.type === 'TC') return 'Trade Contractor';
    if (creatorOrg.type === 'SUPPLIER') return 'Supplier';
    if (creatorOrg.type === 'FC') return 'Field Crew';
    return null;
  }, [creatorOrg]);

  const creatorOrgType = (creatorOrg?.type as OrgType) ?? null;

  const { data: team = [] } = useQuery({
    queryKey: ['project_team_contracts', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_team').select('id, role, invited_org_name, org_id, status').eq('project_id', projectId);
      if (error) throw error;
      return (data ?? []) as TeamMember[];
    },
  });

  const { data: existingContracts = [] } = useQuery({
    queryKey: ['project_contracts', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_contracts').select('*').eq('project_id', projectId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filteredTeam = useMemo(() => {
    if (!creatorRole) return [];
    if (creatorRole === 'General Contractor') return team.filter(m => m.role === 'Trade Contractor' || m.role === 'Field Crew');
    if (creatorRole === 'Trade Contractor') return team.filter(m => m.role === 'General Contractor' || m.role === 'Field Crew');
    if (creatorRole === 'Supplier') return team.filter(m => m.role === 'General Contractor' || m.role === 'Trade Contractor');
    if (creatorRole === 'Field Crew') return team.filter(m => m.role === 'Trade Contractor');
    return [];
  }, [team, creatorRole]);

  // Map team member IDs to their contract records
  const contractByTeamMember = useMemo(() => {
    const map: Record<string, typeof existingContracts[0]> = {};
    for (const c of existingContracts) {
      let teamMemberId = c.to_project_team_id;
      if (!teamMemberId) {
        const counterpartyOrgId = c.from_org_id === project?.organization_id ? c.to_org_id : c.from_org_id;
        const match = team.find(m => m.org_id === counterpartyOrgId);
        teamMemberId = match?.id ?? null;
      }
      if (teamMemberId) map[teamMemberId] = c;
    }
    return map;
  }, [existingContracts, team, project]);

  const [contracts, setContracts] = useState<Record<string, string>>({});
  const [retainages, setRetainages] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existingContracts.length === 0 || team.length === 0) return;
    const initC: Record<string, string> = {};
    const initR: Record<string, string> = {};
    for (const c of existingContracts) {
      let teamMemberId = c.to_project_team_id;
      if (!teamMemberId) {
        const counterpartyOrgId = c.from_org_id === project?.organization_id ? c.to_org_id : c.from_org_id;
        const match = team.find(m => m.org_id === counterpartyOrgId);
        teamMemberId = match?.id ?? null;
      }
      if (teamMemberId) {
        if (c.contract_sum != null) initC[teamMemberId] = String(c.contract_sum);
        if (c.retainage_percent != null) initR[teamMemberId] = String(c.retainage_percent);
      }
    }
    if (Object.keys(initC).length > 0) setContracts(initC);
    if (Object.keys(initR).length > 0) setRetainages(initR);
  }, [existingContracts, team, project]);

  useEffect(() => {
    onStepChange?.('upstream');
  }, []);

  const isFromCreatorOrg = project?.organization_id === currentUserOrgId;

  const handleMemberAdded = () => {
    qc.invalidateQueries({ queryKey: ['project_team_contracts', projectId] });
  };

  const refreshContracts = () => {
    qc.invalidateQueries({ queryKey: ['project_contracts', projectId] });
  };

  const handleSendContract = async (memberId: string) => {
    const contract = contractByTeamMember[memberId];
    if (!contract) return;
    try {
      await supabase
        .from('project_contracts')
        .update({ status: 'sent', sent_at: new Date().toISOString() } as any)
        .eq('id', contract.id);
      toast({ title: 'Contract sent for review' });
      refreshContracts();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleSave = async () => {
    if (!projectId || !user || !creatorRole || !project) return;
    setSaving(true);
    try {
      const { data: freshContracts } = await supabase
        .from('project_contracts').select('*').eq('project_id', projectId);
      const currentContracts = freshContracts ?? [];

      for (const member of filteredTeam) {
        const valueStr = contracts[member.id];
        if (!valueStr) continue;
        const contractSum = parseFloat(valueStr);
        if (isNaN(contractSum)) continue;
        const retainagePercent = parseFloat(retainages[member.id] || '0') || 0;

        let fromOrgId: string | null = null;
        let toOrgId: string | null = null;
        let fromRole = '';
        let toRole = '';

        if (creatorRole === 'General Contractor' && member.role === 'Trade Contractor') {
          fromOrgId = member.org_id; toOrgId = project.organization_id;
          fromRole = 'Trade Contractor'; toRole = 'General Contractor';
        } else if (creatorRole === 'Trade Contractor' && member.role === 'General Contractor') {
          fromOrgId = project.organization_id; toOrgId = member.org_id;
          fromRole = 'Trade Contractor'; toRole = 'General Contractor';
        } else if (creatorRole === 'Trade Contractor' && member.role === 'Field Crew') {
          fromOrgId = member.org_id; toOrgId = project.organization_id;
          fromRole = 'Field Crew'; toRole = 'Trade Contractor';
        } else if (creatorRole === 'General Contractor' && member.role === 'Field Crew') {
          fromOrgId = member.org_id; toOrgId = project.organization_id;
          fromRole = 'Field Crew'; toRole = 'General Contractor';
        } else if (creatorRole === 'Supplier') {
          fromOrgId = project.organization_id; toOrgId = member.org_id;
          fromRole = 'Supplier'; toRole = member.role;
        }

        const allMatching = currentContracts.filter(c => {
          if (c.to_project_team_id === member.id) return true;
          const counterpartyOrgId = c.from_org_id === project?.organization_id ? c.to_org_id : c.from_org_id;
          return counterpartyOrgId === member.org_id;
        });

        if (allMatching.length > 0) {
          const primary = allMatching[0];
          await supabase.from('project_contracts')
            .update({ contract_sum: contractSum, retainage_percent: retainagePercent, to_project_team_id: member.id, trade: member.role, status: primary.status || 'draft' })
            .eq('id', primary.id);

          if (allMatching.length > 1) {
            const extraIds = allMatching.slice(1).map(c => c.id);
            await supabase.from('project_contracts').delete().in('id', extraIds);
          }
        } else {
          await supabase.from('project_contracts').insert({
            project_id: projectId,
            to_project_team_id: member.id,
            from_org_id: fromOrgId, to_org_id: toOrgId,
            from_role: fromRole, to_role: toRole,
            trade: member.role,
            contract_sum: contractSum,
            retainage_percent: retainagePercent,
            created_by_user_id: user.id,
            status: 'draft',
          });
        }
      }

      qc.invalidateQueries({ queryKey: ['project_contracts'] });
      qc.invalidateQueries({ queryKey: ['project_financials'] });
      toast({ title: 'Contracts saved' });
      onComplete();
    } catch (err: any) {
      toast({ title: 'Error saving contracts', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const hasAtLeastOneContract = filteredTeam.some(m => {
    const v = contracts[m.id];
    return v && parseFloat(v) > 0;
  });

  const getContractStatus = (memberId: string): string | null => {
    return contractByTeamMember[memberId]?.status ?? null;
  };

  const isCounterparty = (m: TeamMember) => {
    // Current user is the counterparty (not the creator org)
    return !isFromCreatorOrg && m.org_id !== currentUserOrgId;
  };

  const canEditAmount = (m: TeamMember) => {
    const status = getContractStatus(m.id);
    // Can only edit if draft or rejected, and user is from creator org
    if (status === 'sent' || status === 'accepted') return false;
    if (!isFromCreatorOrg && m.role === 'General Contractor') return false;
    return true;
  };

  const canSendContract = (m: TeamMember) => {
    const status = getContractStatus(m.id);
    const hasAmount = contracts[m.id] && parseFloat(contracts[m.id]) > 0;
    return isFromCreatorOrg && hasAmount && (status === 'draft' || status === 'rejected');
  };

  const showReviewActions = (m: TeamMember) => {
    const status = getContractStatus(m.id);
    // Counterparty sees accept/reject when contract is sent
    return status === 'sent' && !isFromCreatorOrg;
  };

  return (
    <div className="space-y-4 px-5 py-5">
      {filteredTeam.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground mb-3">
            No team members found. Add a party to define contract terms.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddDialogOpen(true)}
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Party
          </Button>
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div className="flex items-center gap-4 pb-2 border-b border-border">
            <div className="flex-1 min-w-0">
              <span className={DT.sectionHeader}>Party</span>
            </div>
            <div className="w-40">
              <span className={DT.sectionHeader}>Contract Amount</span>
            </div>
            <div className="w-24">
              <span className={DT.sectionHeader}>Retainage %</span>
            </div>
            <div className="w-28">
              <span className={DT.sectionHeader}>Status</span>
            </div>
          </div>

          {filteredTeam.map(m => {
            const contractStatus = getContractStatus(m.id);
            const contract = contractByTeamMember[m.id];
            const rejectionNote = (contract as any)?.rejection_note;

            return (
              <div key={m.id} className="space-y-0">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-sm font-bold truncate">{m.invited_org_name || 'Unknown'}</p>
                    <p className="text-[11px] text-muted-foreground">{m.role}</p>
                  </div>
                  <div className="w-40">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <Input
                        type="number" placeholder="0.00"
                        value={contracts[m.id] ?? ''}
                        onChange={e => setContracts(p => ({ ...p, [m.id]: e.target.value }))}
                        className="pl-7 h-9"
                        disabled={!canEditAmount(m)}
                      />
                    </div>
                  </div>
                  <div className="w-24">
                    <div className="relative">
                      <Input
                        type="number" placeholder="0" step="0.5" min="0" max="100"
                        value={retainages[m.id] ?? ''}
                        onChange={e => setRetainages(p => ({ ...p, [m.id]: e.target.value }))}
                        className="pr-7 h-9"
                        disabled={!canEditAmount(m)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                    </div>
                  </div>
                  <div className="w-28 flex items-center gap-1.5">
                    {contractStatus ? (
                      <ContractStatusBadge status={contractStatus} />
                    ) : (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                    {canSendContract(m) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSendContract(m.id)}
                        className="h-7 w-7 p-0 text-primary hover:text-primary"
                        title="Send contract for review"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Rejection note */}
                {contractStatus === 'rejected' && rejectionNote && (
                  <div className="flex items-start gap-2 ml-4 mt-1 p-2 rounded-md bg-destructive/5 border border-destructive/20">
                    <AlertTriangle className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
                    <p className="text-[11px] text-destructive">{rejectionNote}</p>
                  </div>
                )}

                {/* Review actions for counterparty */}
                {showReviewActions(m) && contract && (
                  <div className="ml-4 mt-2">
                    <ContractReviewActions
                      contractId={contract.id}
                      onActionComplete={refreshContracts}
                    />
                  </div>
                )}

                {/* SOW Editor — shown for accepted contracts */}
                {contract && (contractStatus === 'accepted' || contractStatus === 'sent') && (
                  <div className="mt-1 ml-4 rounded-md border border-border overflow-hidden">
                    <ContractSOWEditor
                      contractId={contract.id}
                      projectId={projectId}
                      sowStatus={(contract as any)?.sow_status ?? 'none'}
                      isOwner={isFromCreatorOrg}
                      onStatusChange={refreshContracts}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Add another party */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAddDialogOpen(true)}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Party
          </Button>
        </>
      )}

      <div className="flex justify-end pt-4 border-t border-border">
        <Button onClick={handleSave} disabled={saving || !hasAtLeastOneContract} className="min-h-[44px]">
          {saving ? 'Saving…' : 'Save Contracts & Continue'}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <AddTeamMemberDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        projectId={projectId}
        creatorOrgType={creatorOrgType}
        onMemberAdded={handleMemberAdded}
      />
    </div>
  );
}
