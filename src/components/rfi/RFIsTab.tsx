import { useState, useEffect } from 'react';
import { Plus, MessageSquareMore } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { RFICard } from './RFICard';
import { CreateRFIDialog } from './CreateRFIDialog';
import { RFIDetailDialog } from './RFIDetailDialog';
import { WorkOrderWizard } from '@/components/work-order-wizard';
import { useProjectRFIs } from '@/hooks/useProjectRFIs';
import { useAuth } from '@/hooks/useAuth';
import { useWorkOrderDraft } from '@/hooks/useWorkOrderDraft';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { WorkOrderWizardData } from '@/types/workOrderWizard';
import type { ProjectRFI, RFIStatus } from '@/types/rfi';

interface RFIsTabProps {
  projectId: string;
}

interface TeamOrg {
  org_id: string;
  org_name: string;
}

export function RFIsTab({ projectId }: RFIsTabProps) {
  const { user, userOrgRoles, permissions } = useAuth();
  const { rfis, isLoading, createRFI, answerRFI, closeRFI } = useProjectRFIs(projectId);
  const { saveDraft } = useWorkOrderDraft(projectId);
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<'ALL' | RFIStatus>('ALL');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedRFI, setSelectedRFI] = useState<ProjectRFI | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [teamOrgs, setTeamOrgs] = useState<TeamOrg[]>([]);
  const [woWizardOpen, setWoWizardOpen] = useState(false);
  const [wizardSubmitting, setWizardSubmitting] = useState(false);
  const [projectName, setProjectName] = useState('');

  const currentOrgId = userOrgRoles[0]?.organization?.id;
  const currentOrgType = userOrgRoles[0]?.organization?.type;
  const canCreate = permissions?.canCreateRFIs ?? false;
  const canCreateWorkOrders = permissions?.canCreateWorkOrders ?? false;

  // Fetch project name for wizard
  useEffect(() => {
    if (!projectId) return;
    supabase
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single()
      .then(({ data }) => {
        if (data) setProjectName(data.name);
      });
  }, [projectId]);

  // Fetch team orgs for assign-to dropdown
  useEffect(() => {
    if (!projectId) return;
    supabase
      .from('project_team')
      .select('org_id, organization:organizations!project_team_org_id_fkey(name)')
      .eq('project_id', projectId)
      .then(({ data }) => {
        if (data) {
          const mapped = data.map((d: any) => ({ org_id: d.org_id, org_name: d.organization?.name || 'Unknown' }));
          const unique = Array.from(new Map(mapped.map((d: TeamOrg) => [d.org_id, d])).values());
          setTeamOrgs(unique);
        }
      });
  }, [projectId]);

  const filtered = statusFilter === 'ALL' ? rfis : rfis.filter((r) => r.status === statusFilter);

  const handleCardClick = (rfi: ProjectRFI) => {
    setSelectedRFI(rfi);
    setDetailOpen(true);
  };

  const handleConvertToWO = (rfi: ProjectRFI) => {
    // Close the detail dialog and open the unified wizard
    setDetailOpen(false);
    setWoWizardOpen(true);
  };

  const handleWizardComplete = async (data: UnifiedWizardData & { project_id: string }) => {
    setWizardSubmitting(true);
    try {
      const draftId = await saveDraft({
        title: data.title || data.selectedCatalogItems.map(i => i.item_name).join(', ') || 'Work Order',
        description: data.description || undefined,
        wo_mode: data.wo_mode!,
        wo_request_type: data.wo_request_type || undefined,
        location_tag: data.location_tags.join(', ') || undefined,
        tc_labor_rate: data.labor_mode === 'hourly' ? data.hourly_rate : null,
        use_fc_hours_at_tc_rate: data.use_fc_hours_at_tc_rate,
        materials_markup_pct: data.materials_markup_pct,
        equipment_markup_pct: data.equipment_markup_pct,
        pricing_mode: 'fixed',
      });

      const orgId = userOrgRoles[0]?.organization?.id;
      if (!orgId || !user) throw new Error('Missing org or user');

      for (const item of data.selectedCatalogItems) {
        const unitRate = data.labor_mode === 'hourly' ? (data.hourly_rate || 0) : 0;
        const { error } = await supabase
          .from('work_order_line_items')
          .insert({
            project_id: projectId,
            change_order_id: draftId,
            org_id: orgId,
            created_by_user_id: user.id,
            catalog_item_id: item.id,
            item_name: item.item_name,
            division: item.division || null,
            category_name: item.category_name || null,
            group_label: item.group_label || null,
            unit: item.unit,
            qty: null,
            hours: data.labor_mode === 'hourly' ? data.hours : null,
            unit_rate: unitRate,
            location_tag: data.location_tags.join(', ') || null,
          } as never);
        if (error) throw error;
      }

      for (const mat of data.materials) {
        if (!mat.description) continue;
        const { error } = await supabase
          .from('work_order_materials')
          .insert({
            project_id: projectId,
            change_order_id: draftId,
            org_id: orgId,
            created_by_user_id: user.id,
            description: mat.description,
            supplier: mat.supplier || null,
            quantity: mat.quantity,
            unit: mat.unit,
            unit_cost: mat.unit_cost,
            markup_percent: mat.markup_percent,
            added_by_role: currentOrgType === 'FC' ? 'fc' : 'tc',
          } as never);
        if (error) throw error;
      }

      for (const eq of data.equipment) {
        if (!eq.description) continue;
        const { error } = await supabase
          .from('work_order_equipment')
          .insert({
            project_id: projectId,
            change_order_id: draftId,
            org_id: orgId,
            created_by_user_id: user.id,
            description: eq.description,
            duration_note: eq.duration_note || null,
            cost: eq.cost,
            markup_percent: eq.markup_percent,
            added_by_role: currentOrgType === 'FC' ? 'fc' : 'tc',
          } as never);
        if (error) throw error;
      }

      toast({ title: 'Work order created from RFI' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to create work order', description: err.message });
      throw err;
    } finally {
      setWizardSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="ALL">All ({rfis.length})</TabsTrigger>
            <TabsTrigger value="OPEN">Open ({rfis.filter((r) => r.status === 'OPEN').length})</TabsTrigger>
            <TabsTrigger value="ANSWERED">Answered ({rfis.filter((r) => r.status === 'ANSWERED').length})</TabsTrigger>
            <TabsTrigger value="CLOSED">Closed ({rfis.filter((r) => r.status === 'CLOSED').length})</TabsTrigger>
          </TabsList>
        </Tabs>
        {canCreate && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New RFI
          </Button>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-muted/20">
          <MessageSquareMore className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">
            {rfis.length === 0 ? 'No RFIs yet' : 'No RFIs match the selected filter'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((rfi) => (
            <RFICard key={rfi.id} rfi={rfi} onClick={() => handleCardClick(rfi)} />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      {currentOrgId && user && (
        <CreateRFIDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          projectId={projectId}
          currentOrgId={currentOrgId}
          currentUserId={user.id}
          teamOrgs={teamOrgs}
          onSubmit={async (payload) => { await createRFI.mutateAsync(payload); }}
        />
      )}

      {/* Detail Sheet */}
      <RFIDetailDialog
        rfi={selectedRFI}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        currentOrgId={currentOrgId}
        currentUserId={user?.id}
        onAnswer={async (id, ans, uid) => { await answerRFI.mutateAsync({ id, answer: ans, answeredByUserId: uid }); }}
        onClose={async (id) => { await closeRFI.mutateAsync(id); }}
        onConvertToWorkOrder={handleConvertToWO}
        canCreateWorkOrders={canCreateWorkOrders}
      />

      {/* Unified Work Order Wizard */}
      <UnifiedWOWizard
        open={woWizardOpen}
        onOpenChange={setWoWizardOpen}
        projectId={projectId}
        projectName={projectName}
        onComplete={handleWizardComplete}
        isSubmitting={wizardSubmitting}
      />
    </div>
  );
}
