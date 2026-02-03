import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Package, Wrench, Plus } from 'lucide-react';
import { ChangeOrderProject } from '@/types/changeOrderProject';
import { POWizardV2 } from '@/components/po-wizard-v2/POWizardV2';
import { LinkedPOCard } from './LinkedPOCard';
import { MaterialMarkupEditor } from './MaterialMarkupEditor';
import { POWizardV2Data } from '@/types/poWizardV2';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface MaterialResourceToggleProps {
  changeOrder: ChangeOrderProject;
  projectId: string;
  projectName?: string;
  projectAddress?: string;
  isTC: boolean;
  isFC: boolean;
  onUpdateMaterialsNeeded: (requiresMaterials: boolean) => void;
  onUpdateEquipmentNeeded: (requiresEquipment: boolean) => void;
  onPOCreated: (poId: string) => Promise<void>;
  onUpdateMarkup: (markupType: 'percent' | 'lump_sum' | null, markupPercent: number, markupAmount: number) => void;
  linkedPO?: {
    id: string;
    po_number: string;
    status: string;
    subtotal?: number;
    itemCount?: number;
  } | null;
  isEditable: boolean;
  isCreatingPO?: boolean;
  canViewPricing: boolean;
}

export function MaterialResourceToggle({
  changeOrder,
  projectId,
  projectName = 'Project',
  projectAddress = '',
  isTC,
  isFC,
  onUpdateMaterialsNeeded,
  onUpdateEquipmentNeeded,
  onPOCreated,
  onUpdateMarkup,
  linkedPO,
  isEditable,
  isCreatingPO,
  canViewPricing,
}: MaterialResourceToggleProps) {
  const { userOrgRoles, user } = useAuth();
  const [poWizardOpen, setPOWizardOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const currentOrgId = userOrgRoles[0]?.organization_id;

  const handleMaterialsToggle = (checked: boolean) => {
    onUpdateMaterialsNeeded(checked);
  };

  const handleEquipmentToggle = (checked: boolean) => {
    onUpdateEquipmentNeeded(checked);
  };

  // Create PO with auto-submit for work order context
  const handlePOComplete = async (data: POWizardV2Data) => {
    if (!currentOrgId || !user) {
      toast.error('Not authenticated');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Determine pricing owner based on material_responsibility from project contracts
      let pricingOwnerOrgId: string | null = null;
      
      const { data: contracts } = await supabase
        .from('project_contracts')
        .select('material_responsibility, from_org_id, to_org_id')
        .eq('project_id', data.project_id)
        .not('material_responsibility', 'is', null);
      
      if (contracts && contracts.length > 0) {
        const contractWithMR = contracts.find(c => c.material_responsibility);
        if (contractWithMR) {
          pricingOwnerOrgId = contractWithMR.material_responsibility === 'GC' 
            ? contractWithMR.to_org_id 
            : contractWithMR.from_org_id;
        }
      }
      
      if (!pricingOwnerOrgId) {
        pricingOwnerOrgId = currentOrgId;
      }
      
      const { data: poNumber } = await supabase.rpc('generate_po_number', {
        org_id: currentOrgId,
      });

      // Create PO with SUBMITTED status (auto-submit for work order context)
      const { data: newPO, error: poError } = await supabase
        .from('purchase_orders')
        .insert({
          organization_id: currentOrgId,
          po_number: poNumber,
          po_name: `Materials for ${changeOrder.title}`,
          supplier_id: data.supplier_id,
          project_id: data.project_id,
          work_order_id: changeOrder.id,
          notes: data.notes || null,
          status: 'SUBMITTED', // Auto-submit to supplier
          submitted_at: new Date().toISOString(),
          submitted_by: user.id,
          created_by_org_id: currentOrgId,
          pricing_owner_org_id: pricingOwnerOrgId,
        })
        .select()
        .single();

      if (poError) throw poError;

      // Insert line items
      if (data.line_items.length > 0) {
        const lineItems = data.line_items.map((item, idx) => ({
          po_id: newPO.id,
          line_number: idx + 1,
          supplier_sku: item.supplier_sku,
          description: item.name,
          quantity: item.quantity,
          uom: item.uom,
          pieces: item.unit_mode === 'BUNDLE' ? item.bundle_count : null,
          length_ft: item.length_ft || null,
          computed_lf: item.computed_lf || null,
          notes: item.item_notes || null,
        }));

        const { error: lineError } = await supabase.from('po_line_items').insert(lineItems);
        if (lineError) throw lineError;
      }

      // Link PO to work order
      await onPOCreated(newPO.id);
      
      toast.success(`PO ${poNumber} created and sent to supplier for pricing`);
      setPOWizardOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error creating PO:', error);
      toast.error('Failed to create PO: ' + message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isTCCostResponsible = changeOrder.material_cost_responsibility === 'TC';

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-4 h-4" />
            Resource Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Materials Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-4 w-4 text-primary" />
              </div>
              <div>
                <Label htmlFor="materials-toggle" className="font-medium cursor-pointer">
                  Materials Needed
                </Label>
                <p className="text-xs text-muted-foreground">
                  {changeOrder.material_cost_responsibility === 'GC' 
                    ? 'GC pays for materials' 
                    : changeOrder.material_cost_responsibility === 'TC'
                    ? 'TC pays for materials'
                    : 'Cost responsibility not set'}
                </p>
              </div>
            </div>
            {isEditable && isTC ? (
              <Switch
                id="materials-toggle"
                checked={changeOrder.requires_materials}
                onCheckedChange={handleMaterialsToggle}
              />
            ) : (
              <span className="text-sm text-muted-foreground">
                {changeOrder.requires_materials ? 'Yes' : 'No'}
              </span>
            )}
          </div>

          {/* Add Materials Button - Only show when materials is enabled */}
          {changeOrder.requires_materials && !linkedPO && isEditable && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setPOWizardOpen(true)}
              disabled={isCreatingPO || isSubmitting}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Materials via Product Picker
            </Button>
          )}

          {/* Linked PO Card */}
          {linkedPO && (
            <LinkedPOCard
              poId={linkedPO.id}
              poNumber={linkedPO.po_number}
              status={linkedPO.status}
              subtotal={linkedPO.subtotal}
              itemCount={linkedPO.itemCount}
              canViewPricing={canViewPricing}
              projectId={projectId}
            />
          )}

          {/* Markup Editor - Only TC when they're cost responsible */}
          {linkedPO && isTCCostResponsible && isTC && canViewPricing && (
            <MaterialMarkupEditor
              markupType={(changeOrder.material_markup_type as 'percent' | 'lump_sum' | null) || null}
              markupPercent={changeOrder.material_markup_percent ?? 0}
              markupAmount={changeOrder.material_markup_amount ?? 0}
              baseAmount={linkedPO.subtotal || 0}
              onUpdate={onUpdateMarkup}
              isEditable={isEditable}
            />
          )}

          {/* Equipment Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wrench className="h-4 w-4 text-primary" />
              </div>
              <div>
                <Label htmlFor="equipment-toggle" className="font-medium cursor-pointer">
                  Equipment Needed
                </Label>
                <p className="text-xs text-muted-foreground">
                  {changeOrder.equipment_cost_responsibility === 'GC' 
                    ? 'GC pays for equipment' 
                    : changeOrder.equipment_cost_responsibility === 'TC'
                    ? 'TC pays for equipment'
                    : 'Cost responsibility not set'}
                </p>
              </div>
            </div>
            {isEditable && isTC ? (
              <Switch
                id="equipment-toggle"
                checked={changeOrder.requires_equipment}
                onCheckedChange={handleEquipmentToggle}
              />
            ) : (
              <span className="text-sm text-muted-foreground">
                {changeOrder.requires_equipment ? 'Yes' : 'No'}
              </span>
            )}
          </div>

          {/* FC info message */}
          {isFC && !isTC && (
            <p className="text-xs text-muted-foreground text-center">
              You can add materials but cannot see pricing
            </p>
          )}
        </CardContent>
      </Card>

      {/* PO Wizard Dialog */}
      <POWizardV2
        open={poWizardOpen}
        onOpenChange={setPOWizardOpen}
        projectId={projectId}
        projectName={projectName}
        projectAddress={projectAddress}
        workOrderId={changeOrder.id}
        workOrderTitle={changeOrder.title}
        onComplete={handlePOComplete}
        isSubmitting={isSubmitting}
      />
    </>
  );
}
