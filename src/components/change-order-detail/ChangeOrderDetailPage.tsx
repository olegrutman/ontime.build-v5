import { useParams, useNavigate } from 'react-router-dom';
import { useChangeOrder } from '@/hooks/useChangeOrderProject';
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
    addFCHours,
    lockFCHours,
    addTCLabor,
    addMaterial,
    updateMaterial,
    lockSupplierPricing,
    addEquipment,
    isLockingFCHours,
  } = useChangeOrder(id || null);

  const isGC = currentRole === 'GC_PM';
  const isTC = currentRole === 'TC_PM';
  const isFC = currentRole === 'FS';
  const isSupplier = currentRole === 'SUPPLIER';

  const hasFCParticipant = participants.some((p) => p.role === 'FC' && p.is_active);
  const isEditable = changeOrder?.status === 'draft' || changeOrder?.status === 'tc_pricing';
  const isReadyForApproval = changeOrder?.status === 'ready_for_approval';

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

            <ChangeOrderScopePanel changeOrder={changeOrder} />

            {/* FC Hours - visible to TC and FC only */}
            {(isTC || isFC) && hasFCParticipant && (
              <FieldCrewHoursPanel
                fcHours={fcHours}
                isEditable={isFC && isEditable}
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
            <ChangeOrderChecklist
              checklist={checklist}
              requiresMaterials={changeOrder.requires_materials}
              requiresEquipment={changeOrder.requires_equipment}
              hasFCParticipant={hasFCParticipant}
            />

            {isGC && (
              <ApprovalPanel
                changeOrder={changeOrder}
                isGC={isGC}
                isReadyForApproval={isReadyForApproval}
                onUpdateStatus={({ id, status, rejection_notes }) => {
                  // This would call the updateStatus from hook
                }}
              />
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
