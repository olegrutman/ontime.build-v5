// Archived during dashboard + overview redesign. Kept for reference only. Not used in active UI.
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { DT } from '@/lib/design-tokens';
import { Package, Users, Loader2, Wrench } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { DesignateSupplierDialog } from '@/components/project/DesignateSupplierDialog';

interface TeamMember {
  role: string;
  org_name: string;
}

interface ContractData {
  id: string;
  material_responsibility: string | null;
  from_org_id: string | null;
  to_org_id: string | null;
}

const ROLE_DOTS: Record<string, string> = {
  'General Contractor': 'bg-blue-500',
  'Trade Contractor': 'bg-emerald-500',
  'Field Crew': 'bg-purple-500',
  'Supplier': 'bg-amber-500',
};

const ROLE_SHORT: Record<string, string> = {
  'General Contractor': 'GC',
  'Trade Contractor': 'TC',
  'Field Crew': 'FC',
  'Supplier': 'SUP',
};

interface Props {
  projectId: string;
  isTCMaterialResponsible: boolean;
  isGCMaterialResponsible: boolean;
  onResponsibilityChange?: (value: string | null) => void;
  onTeamChanged?: () => void;
}

export function OverviewTeamCard({ projectId, isTCMaterialResponsible, isGCMaterialResponsible, onResponsibilityChange, onTeamChanged }: Props) {
  const { userOrgRoles } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Material responsibility state
  const [contract, setContract] = useState<ContractData | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [savingResp, setSavingResp] = useState<string | null>(null);
  const [showSelector, setShowSelector] = useState(false);

  // Supplier state
  const [designatedSupplier, setDesignatedSupplier] = useState<{ invited_name: string | null; status: string } | null>(null);
  const [isDesignateOpen, setIsDesignateOpen] = useState(false);

  const currentOrgId = userOrgRoles[0]?.organization?.id;

  // Fetch the project creator's org type to determine permissions (not the viewer's)
  const [projectCreatorOrgType, setProjectCreatorOrgType] = useState<string | null>(null);
  useEffect(() => {
    const fetchCreatorOrg = async () => {
      const { data: proj } = await supabase
        .from('projects').select('organization_id').eq('id', projectId).single();
      if (proj?.organization_id) {
        const { data: org } = await supabase
          .from('organizations').select('type').eq('id', proj.organization_id).single();
        setProjectCreatorOrgType(org?.type ?? null);
      }
    };
    fetchCreatorOrg();
  }, [projectId]);
  const isGcOrTc = projectCreatorOrgType === 'GC' || projectCreatorOrgType === 'TC';

  useEffect(() => {
    const fetchMembers = async () => {
      const { data } = await supabase
        .from('project_team')
        .select('role, org_id, organizations:org_id(name)')
        .eq('project_id', projectId);
      const m = (data || []).map((d: any) => ({
        role: d.role || 'Unknown',
        org_name: d.organizations?.name || 'Unknown',
      }));
      setMembers(m);
      setLoading(false);
    };
    fetchMembers();
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

  const fetchDesignatedSupplier = useCallback(async () => {
    const { data } = await supabase
      .from('project_designated_suppliers')
      .select('invited_name, status')
      .eq('project_id', projectId)
      .neq('status', 'removed')
      .maybeSingle();
    setDesignatedSupplier(data);
  }, [projectId]);

  const fetchLockStatus = useCallback(async () => {
    const { count } = await supabase
      .from('purchase_orders')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .in('status', ['FINALIZED', 'DELIVERED']);
    setIsLocked((count || 0) > 0);
  }, [projectId]);

  useEffect(() => {
    fetchContract();
    fetchDesignatedSupplier();
    fetchLockStatus();
  }, [fetchContract, fetchDesignatedSupplier, fetchLockStatus]);

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
      onTeamChanged?.();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSavingResp(null);
    }
  };

  const materialLabel = isTCMaterialResponsible ? 'TC' : isGCMaterialResponsible ? 'GC' : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5 text-muted-foreground" />
        <p className={DT.sectionHeader}>Team</p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8" />)}
        </div>
      ) : members.length === 0 ? (
        <p className="text-xs text-muted-foreground">No team members yet</p>
      ) : (
        <div className="space-y-1.5">
          {members.map((m, i) => (
            <div
              key={i}
              className="flex items-center gap-2 py-1.5 animate-fade-in"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', ROLE_DOTS[m.role] || 'bg-muted-foreground')} />
              <span className="text-xs text-foreground font-medium truncate flex-1">{m.org_name}</span>
              <span className="text-[10px] text-muted-foreground font-medium">{ROLE_SHORT[m.role] || m.role}</span>
            </div>
          ))}
        </div>
      )}

      {/* Materials line */}
      {materialLabel && (() => {
        const responsibleRole = isTCMaterialResponsible ? 'Trade Contractor' : 'General Contractor';
        const responsibleOrg = members.find(m => m.role === responsibleRole);
        const dotColor = ROLE_DOTS[responsibleRole] || 'bg-muted-foreground';
        return (
          <div className="flex items-center gap-2 pt-1.5 border-t border-border">
            <Package className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Materials:</span>
            <span className={cn('w-2 h-2 rounded-full shrink-0', dotColor)} />
            <span className="text-[10px] font-semibold text-foreground truncate">
              {responsibleOrg?.org_name || materialLabel}
            </span>
            <span className="text-[10px] text-muted-foreground">({isTCMaterialResponsible ? 'Trade Contractor' : 'General Contractor'})</span>
          </div>
        );
      })()}

      {/* Material responsibility selector */}
      {contract && canEditResp && (!materialResp || showSelector) && (
        <div className="pt-2 border-t border-border">
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

      {/* Change material responsibility trigger */}
      {contract && materialResp && !isLocked && canEditResp && !showSelector && (
        <Button
          variant="ghost"
          size="sm"
          className="h-5 px-1.5 text-[10px] text-muted-foreground"
          onClick={() => setShowSelector(true)}
        >
          Change material responsibility
        </Button>
      )}

      {/* Locked indicator */}
      {contract && materialResp && isLocked && (
        <div className="flex items-center gap-1.5 pt-1">
          <Package className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">Material responsibility locked ({materialResp})</span>
        </div>
      )}

      {/* Supplier / Catalog section */}
      {materialResp && (
        <div className="pt-2 border-t border-border space-y-1.5">
          {designatedSupplier ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Wrench className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Supplier:</span>
                <span className="text-[10px] font-semibold text-foreground">
                  {designatedSupplier.invited_name || 'Designated'}
                </span>
              </div>
              {isGcOrTc && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-[10px] text-muted-foreground"
                  onClick={() => setIsDesignateOpen(true)}
                >
                  Change
                </Button>
              )}
            </div>
          ) : isGcOrTc ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={() => setIsDesignateOpen(true)}
              >
                Designate Supplier
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[10px]"
                disabled={savingResp === 'system'}
                onClick={handleUseSystemCatalog}
              >
                {savingResp === 'system' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Wrench className="h-3 w-3 mr-1" />}
                System Catalog
              </Button>
            </div>
          ) : null}
        </div>
      )}

      <DesignateSupplierDialog
        open={isDesignateOpen}
        onOpenChange={setIsDesignateOpen}
        projectId={projectId}
        onDesignated={() => { fetchDesignatedSupplier(); onTeamChanged?.(); }}
      />
    </div>
  );
}
