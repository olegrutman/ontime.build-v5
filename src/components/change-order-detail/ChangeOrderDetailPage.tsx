import { useParams, useNavigate } from 'react-router-dom';
import { useChangeOrder, useChangeOrderProject } from '@/hooks/useChangeOrderProject';
import { useAuth } from '@/hooks/useAuth';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, MapPin, Hammer, Calendar, Building2, Pencil, Check, X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useState } from 'react';
import { LocationData, WORK_TYPE_LABELS } from '@/types/changeOrderProject';
import { useDefaultSidebarOpen } from '@/hooks/use-sidebar-default';
import { BottomNav } from '@/components/layout/BottomNav';
import { useChangeOrderRealtime } from '@/hooks/useChangeOrderRealtime';

import { WorkOrderTopBar } from './WorkOrderTopBar';
import { WorkOrderProgressBar } from './WorkOrderProgressBar';
import { FieldCrewHoursPanel } from './FieldCrewHoursPanel';
import { TCPricingPanel } from './TCPricingPanel';
import { TCPricingSummary } from './TCPricingSummary';
import { EquipmentPanel } from './EquipmentPanel';
import { ApprovalPanel } from './ApprovalPanel';
import { TCApprovalPanel } from './TCApprovalPanel';
import { ParticipantActivationPanel } from './ParticipantActivationPanel';
import { GCLaborReviewPanel } from './GCLaborReviewPanel';
import { ContractedPricingCard } from './ContractedPricingCard';
import { MaterialResourceToggle } from './MaterialResourceToggle';
import { WorkOrderMaterialsPanel } from './WorkOrderMaterialsPanel';
import { ChangeOrderChecklist } from './ChangeOrderChecklist';
import { TMTimeCardsPanel } from './TMTimeCardsPanel';

function formatLocation(location: LocationData): string {
  const parts: string[] = [];
  if (location.inside_outside) {
    parts.push(location.inside_outside === 'inside' ? 'Interior' : 'Exterior');
  }
  if (location.level) parts.push(location.level);
  if (location.unit) parts.push(`Unit ${location.unit}`);
  if (location.room_area) parts.push(location.room_area);
  if (location.exterior_feature) {
    const formatted = location.exterior_feature
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    parts.push(formatted);
  }
  return parts.length > 0 ? parts.join(' • ') : 'No location specified';
}

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
    linkedPO,
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
    toggleMaterials,
    toggleEquipment,
    linkPO,
    updateMarkup,
    isLinkingPO,
    lockMaterialsPricing,
    isLockingMaterialsPricing,
  } = useChangeOrder(id || null);

  const { updateStatus, isUpdating } = useChangeOrderProject(changeOrder?.project_id);

  // Real-time subscriptions for all work order sub-tables
  useChangeOrderRealtime(id);

  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [description, setDescription] = useState('');

  const isGC = currentRole === 'GC_PM';
  const isTC = currentRole === 'TC_PM';
  const isFC = currentRole === 'FC_PM' || currentRole === 'FS';
  const isSupplier = currentRole === 'SUPPLIER';

  const hasFCParticipant = participants.some((p) => p.role === 'FC' && p.is_active);
  const hasTCParticipant = participants.some((p) => p.role === 'TC' && p.is_active);
  const isFCEditable = changeOrder?.status === 'draft' || changeOrder?.status === 'fc_input';
  const isTCEditable = changeOrder?.status === 'draft' || changeOrder?.status === 'tc_pricing';
  const isEditable = isTCEditable;

  const defaultOpen = useDefaultSidebarOpen();

  // Loading state
  if (isLoading) {
    return (
      <SidebarProvider defaultOpen={defaultOpen}>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <SidebarInset className="flex flex-col flex-1">
            <div className="sticky top-0 z-40 border-b bg-card backdrop-blur px-4 py-3">
              <Skeleton className="h-8 w-64" />
            </div>
            <main className="flex-1 overflow-auto p-6 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-48 w-full" />
            </main>
          </SidebarInset>
          <BottomNav />
        </div>
      </SidebarProvider>
    );
  }

  // Not found
  if (!changeOrder) {
    return (
      <SidebarProvider defaultOpen={defaultOpen}>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <SidebarInset className="flex flex-col flex-1">
            <div className="flex items-center justify-center min-h-[50vh]">
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">Work order not found</p>
                  <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
                    Go Back
                  </Button>
                </CardContent>
              </Card>
            </div>
          </SidebarInset>
          <BottomNav />
        </div>
      </SidebarProvider>
    );
  }

  const handleStartEditDescription = () => {
    setDescription(changeOrder.description || '');
    setIsEditingDescription(true);
  };

  const handleSaveDescription = () => {
    updateChangeOrder({ id: changeOrder.id, description: description.trim() });
    setIsEditingDescription(false);
  };

  const handleCancelEdit = () => {
    setDescription(changeOrder.description || '');
    setIsEditingDescription(false);
  };

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
         <SidebarInset className="flex flex-col flex-1 bg-background">
          {/* Sticky Top Bar */}
          <WorkOrderTopBar
            projectName={changeOrder.project?.name || 'Project'}
            projectId={changeOrder.project_id}
            workOrderTitle={changeOrder.title}
            status={changeOrder.status}
          />

          {/* Scrollable content */}
          <main className="flex-1 overflow-auto">
            {/* Progress Bar */}
            <WorkOrderProgressBar
              status={changeOrder.status}
              hasFCParticipant={hasFCParticipant}
            />

            <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 pb-20">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] lg:grid-cols-[1fr_380px] gap-6 min-w-0">
                {/* ===== Zone A: Main Content ===== */}
                <div className="space-y-6 min-w-0">
                  {/* Combined Header + Scope Card */}
                  <Card className="p-6">
                    <div className="space-y-4">
                      {/* Meta info row */}
                      <div className="flex flex-wrap gap-4 text-sm">
                        {changeOrder.project && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Building2 className="w-4 h-4" />
                            <span>{changeOrder.project.name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>{formatLocation(changeOrder.location_data)}</span>
                        </div>
                        {changeOrder.work_type && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Hammer className="w-4 h-4" />
                            <span>{WORK_TYPE_LABELS[changeOrder.work_type]}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>{format(new Date(changeOrder.created_at), 'MMM d, yyyy')}</span>
                        </div>
                      </div>

                      {/* Scope / Description */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">Description</span>
                          {isEditable && (isTC || isGC) && !isEditingDescription && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleStartEditDescription}
                              className="h-7 px-2"
                            >
                              <Pencil className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                          )}
                        </div>

                        {isEditingDescription ? (
                          <div className="space-y-2">
                            <Textarea
                              value={description}
                              onChange={(e) => setDescription(e.target.value)}
                              placeholder="Describe the scope of work..."
                              rows={3}
                              className="resize-none"
                            />
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCancelEdit}
                                disabled={isUpdatingChangeOrder}
                              >
                                <X className="w-3 h-3 mr-1" />
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleSaveDescription}
                                disabled={isUpdatingChangeOrder || !description.trim()}
                              >
                                <Check className="w-3 h-3 mr-1" />
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-muted/30 rounded-lg min-h-[60px]">
                            {changeOrder.description ? (
                              <p className="text-sm">{changeOrder.description}</p>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">
                                No description provided. {isEditable && (isTC || isGC) && 'Click Edit to add one.'}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Resource indicators */}
                      <div className="flex flex-wrap gap-3">
                        {changeOrder.requires_materials && (
                          <Badge variant="secondary" className="gap-1.5">
                            Materials: {changeOrder.material_cost_responsibility || 'TBD'}
                          </Badge>
                        )}
                        {changeOrder.requires_equipment && (
                          <Badge variant="secondary" className="gap-1.5">
                            Equipment: {changeOrder.equipment_cost_responsibility || 'TBD'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>

                  {/* Rejection Alert */}
                  {changeOrder.status === 'rejected' && changeOrder.rejection_notes && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <span className="font-medium">Rejected:</span> {changeOrder.rejection_notes}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* T&M Time Cards Panel */}
                  {(changeOrder as any).pricing_mode === 'tm' && (
                    <TMTimeCardsPanel
                      changeOrderId={changeOrder.id}
                      isGC={isGC}
                      isTC={isTC}
                      isFC={isFC}
                      hasTC={hasTCParticipant}
                    />
                  )}

                  {/* FC Hours (fixed price only) */}
                  {(changeOrder as any).pricing_mode !== 'tm' && ((isTC && hasFCParticipant) || (isFC && hasFCParticipant)) && (
                    <FieldCrewHoursPanel
                      fcHours={fcHours}
                      isEditable={isFC && isFCEditable}
                      canViewRates={isTC || isFC}
                      onAddHours={addFCHours}
                      onLockHours={lockFCHours}
                      isLocking={isLockingFCHours}
                    />
                  )}

                  {/* TC Labor (fixed price only) */}
                  {(changeOrder as any).pricing_mode !== 'tm' && isTC && (
                    <TCPricingPanel
                      tcLabor={tcLabor}
                      isEditable={isEditable}
                      canViewRates={true}
                      onAddLabor={addTCLabor}
                    />
                  )}

                  {/* GC Labor Review (fixed price only) */}
                  {(changeOrder as any).pricing_mode !== 'tm' && isGC && tcLabor.length > 0 && (
                    <GCLaborReviewPanel tcLabor={tcLabor} />
                  )}

                  {/* Materials from linked PO */}
                  {changeOrder.requires_materials && linkedPO && linkedPO.items && linkedPO.items.length > 0 && (isTC || isGC || isFC) && (
                    <WorkOrderMaterialsPanel
                      linkedPO={linkedPO}
                      materialMarkupType={changeOrder.material_markup_type as 'percent' | 'lump_sum' | null}
                      materialMarkupPercent={changeOrder.material_markup_percent ?? 0}
                      materialMarkupAmount={changeOrder.material_markup_amount ?? 0}
                      onUpdateMarkup={updateMarkup}
                      onLockPricing={lockMaterialsPricing}
                      isLocked={changeOrder.materials_pricing_locked}
                      canViewPricing={isTC || (isGC && changeOrder.material_cost_responsibility === 'GC')}
                      canViewMarkedUpTotal={isGC}
                      isEditable={isTCEditable && isTC}
                      isLocking={isLockingMaterialsPricing}
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

                {/* ===== Zone B: Sidebar ===== */}
                <div className="space-y-6 min-w-0">
                  {/* 1. Pricing Card (top of sidebar) */}
                  <ContractedPricingCard
                    changeOrder={changeOrder}
                    fcHours={fcHours}
                    tcLabor={tcLabor}
                    materials={materials}
                    equipment={equipment}
                    participants={participants}
                    currentRole={currentRole}
                    linkedPO={linkedPO}
                  />

                  {/* 2. GC Approval Panel */}
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

                  {/* 3. TC Pricing Summary */}
                  {isTC && (
                    <TCPricingSummary
                      tcLabor={tcLabor}
                      materials={materials}
                      equipment={equipment}
                      requiresMaterials={changeOrder.requires_materials}
                      requiresEquipment={changeOrder.requires_equipment}
                      linkedPO={linkedPO}
                      materialMarkupType={changeOrder.material_markup_type as 'percent' | 'lump_sum' | null}
                      materialMarkupPercent={changeOrder.material_markup_percent ?? 0}
                      materialMarkupAmount={changeOrder.material_markup_amount ?? 0}
                      onSubmitPricing={() => updateStatus({
                        id: changeOrder.id,
                        status: 'ready_for_approval'
                      })}
                      isSubmitting={isUpdating}
                      isEditable={isTCEditable}
                    />
                  )}

                  {/* 4. TC Approval Panel (for FC-submitted) */}
                  {isTC && changeOrder.created_by_role === 'FC_PM' && (
                    <TCApprovalPanel
                      changeOrder={changeOrder}
                      fcHours={fcHours}
                      onUpdateStatus={updateStatus}
                      isUpdating={isUpdating}
                    />
                  )}

                  {/* 5. Checklist */}
                  <ChangeOrderChecklist
                    checklist={checklist}
                    requiresMaterials={changeOrder.requires_materials}
                    requiresEquipment={changeOrder.requires_equipment}
                    hasFCParticipant={hasFCParticipant}
                    materialsPricingLocked={changeOrder.materials_pricing_locked}
                  />

                  {/* 6. Participants */}
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

                  {/* 7. Resource Toggles */}
                  {(isTC || isFC) && isTCEditable && (
                    <MaterialResourceToggle
                      changeOrder={changeOrder}
                      projectId={changeOrder.project_id}
                      projectName={changeOrder.project?.name}
                      projectAddress={changeOrder.project?.address || ''}
                      isTC={isTC}
                      isFC={isFC}
                      onUpdateMaterialsNeeded={toggleMaterials}
                      onUpdateEquipmentNeeded={toggleEquipment}
                      onPOCreated={linkPO}
                      onUpdateMarkup={(type, percent, amount) => updateMarkup({ markupType: type, markupPercent: percent, markupAmount: amount })}
                      linkedPO={linkedPO}
                      isEditable={isTCEditable}
                      isCreatingPO={isLinkingPO}
                      canViewPricing={isTC || (isGC && changeOrder.material_cost_responsibility === 'GC')}
                    />
                  )}
                </div>
              </div>
            </div>
          </main>
        </SidebarInset>
        <BottomNav />
      </div>
    </SidebarProvider>
  );
}
