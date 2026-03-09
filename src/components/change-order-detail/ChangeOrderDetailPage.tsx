import { useParams, useNavigate } from 'react-router-dom';
import { useChangeOrder, useChangeOrderProject } from '@/hooks/useChangeOrderProject';
import { useAuth } from '@/hooks/useAuth';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, MapPin, Hammer, Calendar, Building2, Pencil, Check, X, ChevronDown, Package, Truck } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useState } from 'react';
import { LocationData, WORK_TYPE_LABELS } from '@/types/changeOrderProject';
import { useDefaultSidebarOpen } from '@/hooks/use-sidebar-default';
import { BottomNav } from '@/components/layout/BottomNav';
import { useChangeOrderRealtime } from '@/hooks/useChangeOrderRealtime';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

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
import { TCInternalCostEditor } from './TCInternalCostEditor';

/** Collapsible scope description: shows first 3 lines collapsed */
function CollapsibleScope({ description }: { description: string | null }) {
  const [expanded, setExpanded] = useState(false);
  if (!description) {
    return (
      <div className="p-3 bg-muted/30 rounded-lg min-h-[60px]">
        <p className="text-sm text-muted-foreground italic">No description provided.</p>
      </div>
    );
  }
  const lines = description.split('\n');
  const needsCollapse = lines.length > 3;
  const preview = lines.slice(0, 3).join('\n');

  return (
    <div className="p-3 bg-muted/30 rounded-lg min-h-[60px]">
      <p className="text-sm whitespace-pre-wrap">{expanded || !needsCollapse ? description : preview + '…'}</p>
      {needsCollapse && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary mt-1 hover:underline"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}

/** Collapsible wrapper for GC materials view */
function CollapsibleMaterialsWrapper({ children, materialTotal, supplierName }: { children: React.ReactNode; materialTotal: number; supplierName?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger className="w-full text-left">
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Materials
              </div>
              <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
            </CardTitle>
            {!isOpen && (
              <div className="mt-2 text-sm space-y-1">
                {supplierName && (
                  <div className="text-muted-foreground">Supplier: {supplierName}</div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Materials Total</span>
                  <span className="font-semibold">${materialTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}
            {isOpen && supplierName && (
              <div className="mt-1 text-sm text-muted-foreground">Supplier: {supplierName}</div>
            )}
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

/** Collapsible wrapper for GC equipment view */
function CollapsibleEquipmentWrapper({ children, equipmentTotal, responsibility }: { children: React.ReactNode; equipmentTotal: number; responsibility: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger className="w-full text-left">
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Equipment
              </div>
              <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
            </CardTitle>
            {!isOpen && (
              <div className="flex items-center justify-between mt-2 text-sm">
                <span className="text-muted-foreground">Responsible: {responsibility}</span>
                <span className="font-semibold">${equipmentTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

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
  const PRICED_PO_STATUSES = ['PRICED', 'ORDERED', 'DELIVERED'];
  const linkedPOIsPriced = !!(linkedPO && PRICED_PO_STATUSES.includes(linkedPO.status));
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

                      {/* Scope / Description - collapsible for GC */}
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
                        ) : isGC && !isEditingDescription ? (
                          <CollapsibleScope description={changeOrder.description} />
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

                  {/* GC Labor Review (fixed price only) - collapsible */}
                  {(changeOrder as any).pricing_mode !== 'tm' && isGC && (tcLabor.length > 0 || (changeOrder.labor_total ?? 0) > 0) && (
                    <GCLaborReviewPanel
                      tcLabor={tcLabor}
                      tcCompanyName={participants.find(p => (p.role === 'TC' || p.organization?.type === 'TC') && p.is_active)?.organization?.name}
                      laborTotal={changeOrder.labor_total ?? 0}
                    />
                  )}

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
                      hasFCParticipant={hasFCParticipant}
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

                  {/* TC Internal Cost (self-performing, no FC) */}
                  {isTC && !hasFCParticipant && (
                    <TCInternalCostEditor
                      currentCost={(changeOrder as any).tc_internal_cost ?? 0}
                      isEditable={isTCEditable}
                      onSave={(cost) => updateChangeOrder({ id: changeOrder.id, tc_internal_cost: cost } as any)}
                      isSaving={isUpdatingChangeOrder}
                      changeOrderId={changeOrder.id}
                      revenue={(changeOrder.labor_total ?? 0) + (changeOrder.material_total ?? 0) + (changeOrder.equipment_total ?? 0)}
                    />
                  )}

                  {/* Materials from linked PO - collapsible for GC */}
                  {changeOrder.requires_materials && linkedPO && linkedPO.items && linkedPO.items.length > 0 && (isTC || isFC) && (
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
                  {changeOrder.requires_materials && linkedPO && linkedPO.items && linkedPO.items.length > 0 && isGC && (
                    <CollapsibleMaterialsWrapper supplierName={participants.find(p => p.role === 'SUPPLIER' && p.is_active)?.organization?.name} materialTotal={(() => {
                      const baseMatTotal = linkedPO?.subtotal || 0;
                      const markupAmt = changeOrder.material_markup_type === 'percent'
                        ? baseMatTotal * ((changeOrder.material_markup_percent || 0) / 100)
                        : changeOrder.material_markup_type === 'lump_sum'
                          ? (changeOrder.material_markup_amount || 0)
                          : 0;
                      return baseMatTotal > 0 ? baseMatTotal + markupAmt : (changeOrder.material_total ?? 0);
                    })()}>
                      <WorkOrderMaterialsPanel
                        linkedPO={linkedPO}
                        materialMarkupType={changeOrder.material_markup_type as 'percent' | 'lump_sum' | null}
                        materialMarkupPercent={changeOrder.material_markup_percent ?? 0}
                        materialMarkupAmount={changeOrder.material_markup_amount ?? 0}
                        onUpdateMarkup={updateMarkup}
                        onLockPricing={lockMaterialsPricing}
                        isLocked={changeOrder.materials_pricing_locked}
                        canViewPricing={changeOrder.material_cost_responsibility === 'GC'}
                        canViewMarkedUpTotal={true}
                        isEditable={false}
                        isLocking={isLockingMaterialsPricing}
                      />
                    </CollapsibleMaterialsWrapper>
                  )}

                  {/* Equipment - collapsible for GC */}
                  {changeOrder.requires_equipment && isTC && (
                    <EquipmentPanel
                      equipment={equipment}
                      isEditable={isEditable && isTC}
                      canViewCosts={true}
                      onAddEquipment={addEquipment}
                    />
                  )}
                  {changeOrder.requires_equipment && isGC && (
                    <CollapsibleEquipmentWrapper
                      equipmentTotal={changeOrder.equipment_total ?? 0}
                      responsibility={changeOrder.equipment_cost_responsibility || 'TBD'}
                    >
                      <EquipmentPanel
                        equipment={equipment}
                        isEditable={false}
                        canViewCosts={true}
                        onAddEquipment={addEquipment}
                      />
                    </CollapsibleEquipmentWrapper>
                  )}
                </div>

                {/* ===== Zone B: Sidebar ===== */}
                <div className="space-y-6 min-w-0">
                  {/* GC sidebar: Checklist first, then Pricing, then Approval */}
                  {isGC && (
                    <>
                      <ChangeOrderChecklist
                        checklist={checklist}
                        requiresMaterials={changeOrder.requires_materials}
                        requiresEquipment={changeOrder.requires_equipment}
                        hasFCParticipant={hasFCParticipant}
                        materialsPricingLocked={changeOrder.materials_pricing_locked}
                        linkedPOIsPriced={linkedPOIsPriced}
                      />
                      <ApprovalPanel
                        changeOrder={changeOrder}
                        checklist={checklist}
                        isGC={isGC}
                        hasFCParticipant={hasFCParticipant}
                        onUpdateStatus={updateStatus}
                        isUpdating={isUpdating}
                        linkedPOIsPriced={linkedPOIsPriced}
                        computedMaterialTotal={(() => {
                          const baseMatTotal = linkedPO?.subtotal || 0;
                          const markupAmt = changeOrder.material_markup_type === 'percent'
                            ? baseMatTotal * ((changeOrder.material_markup_percent || 0) / 100)
                            : changeOrder.material_markup_type === 'lump_sum'
                              ? (changeOrder.material_markup_amount || 0)
                              : 0;
                          return baseMatTotal > 0 ? baseMatTotal + markupAmt : undefined;
                        })()}
                      />
                    </>
                  )}

                  {/* Non-GC sidebar: original order */}
                  {!isGC && (
                    <>
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

                      {isTC && (changeOrder as any).pricing_mode !== 'tm' && (
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

                      {isTC && changeOrder.created_by_role === 'FC_PM' && (
                        <TCApprovalPanel
                          changeOrder={changeOrder}
                          fcHours={fcHours}
                          onUpdateStatus={updateStatus}
                          isUpdating={isUpdating}
                        />
                      )}

                      <ChangeOrderChecklist
                        checklist={checklist}
                        requiresMaterials={changeOrder.requires_materials}
                        requiresEquipment={changeOrder.requires_equipment}
                        hasFCParticipant={hasFCParticipant}
                        materialsPricingLocked={changeOrder.materials_pricing_locked}
                        linkedPOIsPriced={linkedPOIsPriced}
                      />
                    </>
                  )}

                  {/* Participants - TC only */}
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

                  {/* Resource Toggles */}
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
