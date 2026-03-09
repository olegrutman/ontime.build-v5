import { useEffect, useState, useCallback } from 'react';
import { Users, Plus, UserPlus, Package, Loader2, RotateCw, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { AddTeamMemberDialog } from '@/components/project/AddTeamMemberDialog';
import { DesignateSupplierDialog } from '@/components/project/DesignateSupplierDialog';
import { cn } from '@/lib/utils';

interface TeamMembersCardProps {
  projectId: string;
  onResponsibilityChange?: (value: string | null) => void;
  onTeamChanged?: () => void;
}

interface TeamMember {
  id: string;
  role: string;
  invited_org_name: string | null;
  invited_org_id: string | null;
  status: string;
}

interface ContractData {
  id: string;
  material_responsibility: string | null;
  from_org_id: string | null;
  to_org_id: string | null;
}

const roleDotColors: Record<string, string> = {
  'General Contractor': 'bg-blue-500',
  'Trade Contractor': 'bg-emerald-500',
  'Field Crew': 'bg-purple-500',
  'Supplier': 'bg-amber-500',
};

const roleAbbrev: Record<string, string> = {
  'General Contractor': 'GC',
  'Trade Contractor': 'TC',
  'Field Crew': 'FC',
  'Supplier': 'SUP',
};

const statusVariant: Record<string, 'outline' | 'secondary' | 'destructive'> = {
  Accepted: 'secondary',
  Invited: 'outline',
  Declined: 'destructive',
};

export function TeamMembersCard({ projectId, onResponsibilityChange, onTeamChanged }: TeamMembersCardProps) {
  const { userOrgRoles } = useAuth();
  const { toast } = useToast();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isDesignateOpen, setIsDesignateOpen] = useState(false);
  const [designatedSupplier, setDesignatedSupplier] = useState<{ invited_name: string | null; invited_email: string | null; po_email: string | null; status: string } | null>(null);

  // Remove confirmation state
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [removing, setRemoving] = useState(false);
  const [resending, setResending] = useState<string | null>(null);

  // Material responsibility state
  const [contract, setContract] = useState<ContractData | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [savingResp, setSavingResp] = useState<string | null>(null);
  const [showSelector, setShowSelector] = useState(false);

  const currentOrgId = userOrgRoles[0]?.organization?.id;
  const creatorOrgType = userOrgRoles[0]?.organization?.type ?? null;
  const isGcOrTc = creatorOrgType === 'GC' || creatorOrgType === 'TC';

  const fetchTeam = useCallback(async () => {
    const { data } = await supabase.from('project_team').select('id, role, invited_org_name, status').eq('project_id', projectId);
    setTeam(data || []);
    setLoading(false);
  }, [projectId]);

  const fetchDesignatedSupplier = useCallback(async () => {
    const { data } = await supabase.from('project_designated_suppliers').select('invited_name, invited_email, po_email, status').eq('project_id', projectId).neq('status', 'removed').maybeSingle();
    setDesignatedSupplier(data);
  }, [projectId]);

  const fetchContract = useCallback(async () => {
    const { data } = await supabase
      .from('project_contracts')
      .select('id, material_responsibility, from_org_id, to_org_id')
      .eq('project_id', projectId)
      .eq('from_role', 'Trade Contractor')
      .or('trade.is.null,trade.neq.Work Order')
      .limit(1);

    if (data && data.length > 0) {
      const c = data[0] as ContractData;
      setContract(c);
      onResponsibilityChange?.(c.material_responsibility);
    }
  }, [projectId, onResponsibilityChange]);

  const fetchLockStatus = useCallback(async () => {
    const { count } = await supabase
      .from('purchase_orders')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .in('status', ['FINALIZED', 'DELIVERED']);
    setIsLocked((count || 0) > 0);
  }, [projectId]);

  useEffect(() => {
    fetchTeam();
    fetchDesignatedSupplier();
    fetchContract();
    fetchLockStatus();
  }, [fetchTeam, fetchDesignatedSupplier, fetchContract, fetchLockStatus]);

  const materialResp = contract?.material_responsibility;

  const canEditResp = (() => {
    if (!contract || !currentOrgId || !isGcOrTc || isLocked) return false;
    if (!materialResp) return true;
    const respOrgId = materialResp === 'TC' ? contract.from_org_id : contract.to_org_id;
    return currentOrgId === respOrgId;
  })();

  const handleSetResp = async (value: string) => {
    if (!contract || savingResp) return;
    if (materialResp === value) return;
    setSavingResp(value);
    try {
      const { error } = await supabase
        .from('project_contracts')
        .update({ material_responsibility: value })
        .eq('id', contract.id);
      if (error) throw error;
      setContract({ ...contract, material_responsibility: value });
      onResponsibilityChange?.(value);
      setShowSelector(false);
      toast({ title: `Material responsibility set to ${value === 'GC' ? 'General Contractor' : 'Trade Contractor'}` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSavingResp(null);
    }
  };

  const handleUseSystemCatalog = async () => {
    if (!userOrgRoles[0]) return;
    setSavingResp('system');
    try {
      const { error } = await supabase
        .from('project_designated_suppliers')
        .upsert({
          project_id: projectId,
          user_id: null,
          invited_email: null,
          invited_name: 'System Catalog',
          po_email: null,
          status: 'active',
          designated_by: userOrgRoles[0].user_id,
        }, { onConflict: 'project_id' });
      if (error) throw error;
      toast({ title: 'System catalog enabled for this project' });
      fetchDesignatedSupplier();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSavingResp(null);
    }
  };

  // Remove a team member with cascading deletes
  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    setRemoving(true);
    try {
      // 1. Delete related invites
      await supabase.from('project_invites').delete().eq('project_team_id', memberToRemove.id);
      // 2. Delete the team member row (contracts/participants handled by cascade or separately)
      const { error } = await supabase.from('project_team').delete().eq('id', memberToRemove.id);
      if (error) throw error;
      toast({ title: `${memberToRemove.invited_org_name || 'Member'} removed from project` });
      setMemberToRemove(null);
      fetchTeam();
    } catch (err: any) {
      toast({ title: 'Error removing member', description: err.message, variant: 'destructive' });
    } finally {
      setRemoving(false);
    }
  };

  // Resend invite by touching updated_at on the invite record
  const handleResendInvite = async (member: TeamMember) => {
    setResending(member.id);
    try {
      const { error } = await supabase
        .from('project_invites')
        .update({ created_at: new Date().toISOString() })
        .eq('project_team_id', member.id);
      if (error) throw error;
      toast({ title: `Invite resent to ${member.invited_org_name || 'member'}` });
    } catch (err: any) {
      toast({ title: 'Error resending invite', description: err.message, variant: 'destructive' });
    } finally {
      setResending(null);
    }
  };

  return (
    <div data-sasha-card="Team" className="bg-white dark:bg-card rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Users className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Team</p>
          {!loading && <span className="text-[10px] text-muted-foreground">({team.filter(m => m.status === 'Accepted').length})</span>}
        </div>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => setIsAddMemberOpen(true)}>
          <Plus className="h-3 w-3 mr-1" />Add
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-12" />
      ) : team.length === 0 ? (
        <p className="text-sm text-muted-foreground">No team members</p>
      ) : (
        <div className="space-y-1">
          {team.slice(0, 8).map((member) => {
            const abbrev = roleAbbrev[member.role];
            const hasMaterialIcon = materialResp && abbrev === materialResp;

            return (
              <div key={member.id} className="flex items-center gap-2 py-1 group">
                <span className={cn("h-2 w-2 rounded-full shrink-0", roleDotColors[member.role])} />
                <span className="text-[10px] font-medium text-muted-foreground uppercase w-7">{abbrev}</span>
                <span className="text-sm truncate flex-1">{member.invited_org_name || 'Unknown'}</span>

                {member.status !== 'Accepted' && (
                  <Badge variant={statusVariant[member.status] || 'outline'} className="text-[9px] px-1 py-0 shrink-0">
                    {member.status}
                  </Badge>
                )}

                {hasMaterialIcon && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Package className="h-3.5 w-3.5 text-primary shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent><p className="text-xs">Handles materials</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Hover actions */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {member.status === 'Invited' && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            disabled={resending === member.id}
                            onClick={() => handleResendInvite(member)}
                          >
                            {resending === member.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <RotateCw className="h-3 w-3" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">Resend invite</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setMemberToRemove(member)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">Remove</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            );
          })}

          {/* Material responsibility selector */}
          {contract && canEditResp && (!materialResp || showSelector) && (
            <div className="pt-2 border-t mt-2">
              <p className="text-[10px] text-muted-foreground mb-1.5">
                {materialResp ? 'Switch material responsibility' : 'Who handles materials?'}
              </p>
              <div className="flex items-center gap-2">
                {['GC', 'TC'].map(val => (
                  <button
                    key={val}
                    disabled={!!savingResp}
                    onClick={() => handleSetResp(val)}
                    className={cn(
                      "flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md border transition-colors disabled:opacity-50",
                      materialResp === val
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted hover:bg-accent"
                    )}
                  >
                    {savingResp === val ? <Loader2 className="h-3 w-3 animate-spin" /> : <Package className="h-3 w-3" />}
                    {val}
                  </button>
                ))}
                {showSelector && (
                  <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" onClick={() => setShowSelector(false)}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Material resp change trigger on row with material icon */}
          {contract && materialResp && !isLocked && canEditResp && !showSelector && (
            <div className="pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-[10px] text-muted-foreground"
                onClick={() => setShowSelector(true)}
              >
                Change material responsibility
              </Button>
            </div>
          )}

          {/* Locked indicator */}
          {contract && materialResp && isLocked && (
            <div className="pt-2 border-t mt-2 flex items-center gap-1.5">
              <Package className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Material responsibility locked ({materialResp})</span>
            </div>
          )}

          {designatedSupplier ? (
            <div className="flex items-center justify-between pt-1.5 border-t mt-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-2 w-2 rounded-full shrink-0 bg-amber-500" />
                <span className="text-[10px] font-medium text-muted-foreground uppercase w-7">SUP</span>
                <div className="min-w-0">
                  <span className="text-sm truncate block">{designatedSupplier.invited_name || designatedSupplier.invited_email || 'System Catalog'}</span>
                  {designatedSupplier.po_email && (
                    <span className="text-[10px] text-muted-foreground truncate block">PO → {designatedSupplier.po_email}</span>
                  )}
                </div>
                <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">{designatedSupplier.status}</Badge>
              </div>
              {isGcOrTc && (
                <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] shrink-0" onClick={() => setIsDesignateOpen(true)}>Change</Button>
              )}
            </div>
          ) : isGcOrTc && !team.some(m => m.role === 'Supplier') ? (
            <div className="pt-1.5 border-t mt-1.5 space-y-1">
              <Button variant="ghost" size="sm" className="h-7 w-full text-[11px] text-muted-foreground" onClick={() => setIsDesignateOpen(true)}>
                <UserPlus className="h-3 w-3 mr-1" />Designate Supplier
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-full text-[11px] text-muted-foreground" onClick={handleUseSystemCatalog}>
                <Package className="h-3 w-3 mr-1" />Use System Catalog
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {/* Remove confirmation dialog */}
      <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove team member</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>{memberToRemove?.invited_org_name || 'this member'}</strong> from the project? This will also delete any related invites.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember} disabled={removing} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {removing ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddTeamMemberDialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen} projectId={projectId} creatorOrgType={creatorOrgType} onMemberAdded={fetchTeam} />
      <DesignateSupplierDialog open={isDesignateOpen} onOpenChange={setIsDesignateOpen} projectId={projectId} onDesignated={fetchDesignatedSupplier} />
    </div>
  );
}
