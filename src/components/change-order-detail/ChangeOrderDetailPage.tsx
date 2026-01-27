import { useParams, useNavigate } from 'react-router-dom';
import { useChangeOrder, useChangeOrderProject } from '@/hooks/useChangeOrderProject';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { ChangeOrderHeader } from './ChangeOrderHeader';
import { ChangeOrderScopePanel } from './ChangeOrderScopePanel';
import { ChangeOrderChecklist } from './ChangeOrderChecklist';
import { FieldCrewHoursPanel } from './FieldCrewHoursPanel';
import { TCPricingPanel } from './TCPricingPanel';
import { MaterialsPanel } from './MaterialsPanel';
import { EquipmentPanel } from './EquipmentPanel';
import { ApprovalPanel } from './ApprovalPanel';
import { ParticipantActivationPanel } from './ParticipantActivationPanel';

export function ChangeOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentRole } = useAuth();

  const {
    changeOrder,
    participants,
    fcHours,
    tcLabor,
    materials,
    equipment,
    checklist,
    isLoading,
    availableFieldCrews,
    availableSuppliers,
    isLoadingTeamMembers,
    addFCHours,
    lockFCHours,
    addTCLabor,
    addMaterial,
    updateMaterial,
    lockSupplierPricing,
    lockTCPricing,
    addEquipment,
    activateFC,
    activateSupplier,
    deactivateParticipant,
    isActivatingParticipant,
    isLockingFCHours,
    updateChangeOrder,
    isUpdatingChangeOrder,
  } = useChangeOrder(id || null);

  // Get updateStatus from useChangeOrderProject
  const { updateStatus, isUpdating } = useChangeOrderProject(changeOrder?.project_id);

  const isGC = currentRole === 'GC_PM';
  const isTC = currentRole === 'TC_PM';
  // Field Crew users may be either FC_PM (org-level) or FS (field supervisor)
  const isFC = currentRole === 'FC_PM' || currentRole === 'FS';
  const isSupplier = currentRole === 'SUPPLIER';

  const hasFCParticipant = participants.some((p) => p.role === 'FC' && p.is_active);
  // FC can edit during draft and fc_input; TC can edit during draft and tc_pricing
  const isFCEditable = changeOrder?.status === 'draft' || changeOrder?.status === 'fc_input';
  const isTCEditable = changeOrder?.status === 'draft' || changeOrder?.status === 'tc_pricing';
  const isEditable = isTCEditable; // General editability for TC/GC

  if (isLoading) {
    return (
      <AppLayout title="Change Order">
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!changeOrder) {
    return (
      <AppLayout title="Change Order">
        <div className="p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Change order not found</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={changeOrder.title}>
      <div className="p-4 sm:p-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <ChangeOrderHeader changeOrder={changeOrder} />
            </Card>

            <ChangeOrderScopePanel 
              changeOrder={changeOrder} 
              isEditable={isEditable && (isTC || isGC)}
              onUpdateDescription={updateChangeOrder}
              isUpdating={isUpdatingChangeOrder}
            />

            {/* FC Hours - visible to TC and FC (when they're a participant) */}
            {((isTC && hasFCParticipant) || (isFC && hasFCParticipant)) && (
              <FieldCrewHoursPanel
                fcHours={fcHours}
                isEditable={isFC && isFCEditable}
                canViewRates={isTC || isFC}
                onAddHours={addFCHours}
                onLockHours={lockFCHours}
                isLocking={isLockingFCHours}
              />
            )}

            {/* TC Labor */}
            {isTC && (
              <TCPricingPanel
                tcLabor={tcLabor}
                isEditable={isEditable}
                canViewRates={true}
                onAddLabor={addTCLabor}
              />
            )}

            {/* Materials */}
            {changeOrder.requires_materials && (isTC || isSupplier || isGC) && (
              <MaterialsPanel
                materials={materials}
                isEditable={isEditable}
                canViewCosts={isTC || isGC}
                isTC={isTC}
                isSupplier={isSupplier}
                onAddMaterial={addMaterial}
                onUpdateMaterial={updateMaterial}
                onLockSupplierPricing={lockSupplierPricing}
                onLockTCPricing={lockTCPricing}
              />
            )}

            {/* Equipment */}
            {changeOrder.requires_equipment && (isTC || isGC) && (
              <EquipmentPanel
                equipment={equipment}
                isEditable={isEditable && isTC}
                canViewCosts={isTC || isGC}
                onAddEquipment={addEquipment}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Participant Activation - TC only */}
            {isTC && (
              <ParticipantActivationPanel
                changeOrderId={changeOrder.id}
                participants={participants}
                availableFieldCrews={availableFieldCrews}
                availableSuppliers={availableSuppliers}
                isTC={isTC}
                onActivateFC={activateFC}
                onActivateSupplier={activateSupplier}
                onDeactivate={deactivateParticipant}
                isActivating={isActivatingParticipant}
              />
            )}

            <ChangeOrderChecklist
              checklist={checklist}
              requiresMaterials={changeOrder.requires_materials}
              requiresEquipment={changeOrder.requires_equipment}
              hasFCParticipant={hasFCParticipant}
            />

            {isGC && (
              <ApprovalPanel
                changeOrder={changeOrder}
                checklist={checklist}
                isGC={isGC}
                hasFCParticipant={hasFCParticipant}
                onUpdateStatus={updateStatus}
                isUpdating={isUpdating}
              />
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
