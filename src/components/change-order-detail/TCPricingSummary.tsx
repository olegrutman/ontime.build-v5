import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, DollarSign, Send } from 'lucide-react';
import { ChangeOrderTCLabor, ChangeOrderMaterial, ChangeOrderEquipment } from '@/types/changeOrderProject';

interface TCPricingSummaryProps {
  tcLabor: ChangeOrderTCLabor[];
  materials: ChangeOrderMaterial[];
  equipment: ChangeOrderEquipment[];
  requiresMaterials: boolean;
  requiresEquipment: boolean;
  onSubmitPricing: () => void;
  isSubmitting?: boolean;
  isEditable: boolean;
}

export function TCPricingSummary({
  tcLabor,
  materials,
  equipment,
  requiresMaterials,
  requiresEquipment,
  onSubmitPricing,
  isSubmitting,
  isEditable,
}: TCPricingSummaryProps) {
  // Calculate totals
  const laborTotal = tcLabor.reduce((sum, l) => sum + (l.labor_total || 0), 0);
  const materialsTotal = materials.reduce((sum, m) => sum + (m.final_price || m.line_total || 0), 0);
  const equipmentTotal = equipment.reduce((sum, e) => sum + (e.total_cost || 0), 0);
  const grandTotal = laborTotal + materialsTotal + equipmentTotal;

  // Check completion status
  const hasLaborPricing = tcLabor.length > 0;
  const allMaterialsPriced = !requiresMaterials || materials.length === 0 || materials.every(m => m.unit_cost && m.unit_cost > 0);
  const allEquipmentPriced = !requiresEquipment || equipment.length === 0 || equipment.every(e => e.total_cost && e.total_cost > 0);
  
  const isComplete = hasLaborPricing && allMaterialsPriced && allEquipmentPriced;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          TC Pricing Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Line items */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2">
              Labor
              {hasLaborPricing && <CheckCircle className="w-3 h-3 text-green-500" />}
            </span>
            <span className="font-medium">${laborTotal.toFixed(2)}</span>
          </div>
          
          {requiresMaterials && (
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2">
                Materials
                {allMaterialsPriced && materials.length > 0 && (
                  <CheckCircle className="w-3 h-3 text-green-500" />
                )}
              </span>
              <span className="font-medium">${materialsTotal.toFixed(2)}</span>
            </div>
          )}
          
          {requiresEquipment && (
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2">
                Equipment
                {allEquipmentPriced && equipment.length > 0 && (
                  <CheckCircle className="w-3 h-3 text-green-500" />
                )}
              </span>
              <span className="font-medium">${equipmentTotal.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Grand Total */}
        <div className="flex justify-between items-center pt-3 border-t">
          <span className="font-semibold">Total to GC</span>
          <span className="text-xl font-bold">${grandTotal.toFixed(2)}</span>
        </div>

        {/* Completion checklist */}
        {!isComplete && isEditable && (
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            <p className="font-medium mb-1">To submit pricing:</p>
            <ul className="space-y-0.5">
              {!hasLaborPricing && <li>• Add labor pricing</li>}
              {requiresMaterials && !allMaterialsPriced && (
                <li>• Price all materials</li>
              )}
              {requiresEquipment && !allEquipmentPriced && (
                <li>• Add equipment costs</li>
              )}
            </ul>
          </div>
        )}

        {/* Submit button */}
        {isEditable && (
          <Button
            className="w-full"
            onClick={onSubmitPricing}
            disabled={!isComplete || isSubmitting}
          >
            <Send className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Submitting...' : 'Submit Pricing to GC'}
          </Button>
        )}

        {!isEditable && isComplete && (
          <div className="flex items-center justify-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
            <CheckCircle className="w-4 h-4" />
            Pricing submitted
          </div>
        )}
      </CardContent>
    </Card>
  );
}
