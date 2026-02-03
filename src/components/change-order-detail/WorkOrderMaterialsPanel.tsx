import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Package, Lock, Check, Clock } from 'lucide-react';
import { MaterialMarkupEditor } from './MaterialMarkupEditor';

interface POLineItem {
  id: string;
  line_number: number;
  description: string;
  quantity: number;
  uom: string;
  length_ft?: number | null;
  unit_price?: number | null;
  line_total?: number | null;
}

interface LinkedPOData {
  id: string;
  po_number: string;
  status: string;
  subtotal?: number;
  itemCount?: number;
  items?: POLineItem[];
}

interface WorkOrderMaterialsPanelProps {
  linkedPO: LinkedPOData;
  materialMarkupType: 'percent' | 'lump_sum' | null;
  materialMarkupPercent: number;
  materialMarkupAmount: number;
  onUpdateMarkup: (params: { markupType: 'percent' | 'lump_sum' | null; markupPercent: number; markupAmount: number }) => void;
  onLockPricing: () => void;
  isLocked?: boolean;
  canViewPricing: boolean;
  canViewMarkedUpTotal?: boolean;
  isEditable: boolean;
  isLocking?: boolean;
}

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  ACTIVE: { label: 'Draft', variant: 'outline' },
  SUBMITTED: { label: 'Awaiting Supplier Pricing', variant: 'secondary' },
  PRICED: { label: 'Priced by Supplier', variant: 'default' },
  FINALIZED: { label: 'Finalized', variant: 'default' },
  READY_FOR_DELIVERY: { label: 'Ready for Delivery', variant: 'default' },
  DELIVERED: { label: 'Delivered', variant: 'default' },
};

export function WorkOrderMaterialsPanel({
  linkedPO,
  materialMarkupType,
  materialMarkupPercent,
  materialMarkupAmount,
  onUpdateMarkup,
  onLockPricing,
  isLocked = false,
  canViewPricing,
  canViewMarkedUpTotal = false,
  isEditable,
  isLocking,
}: WorkOrderMaterialsPanelProps) {
  const items = linkedPO.items || [];
  const subtotal = linkedPO.subtotal || 0;
  const isPriced = linkedPO.status === 'PRICED' || linkedPO.status === 'FINALIZED' || linkedPO.status === 'READY_FOR_DELIVERY' || linkedPO.status === 'DELIVERED';
  
  // Calculate markup amount based on type
  const calculatedMarkup = materialMarkupType === 'percent'
    ? subtotal * (materialMarkupPercent / 100)
    : materialMarkupAmount;
  
  const materialsTotal = subtotal + calculatedMarkup;
  
  const statusInfo = STATUS_LABELS[linkedPO.status] || { label: linkedPO.status, variant: 'outline' as const };

  const handleMarkupUpdate = (type: 'percent' | 'lump_sum' | null, percent: number, amount: number) => {
    onUpdateMarkup({ markupType: type, markupPercent: percent, markupAmount: amount });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-4 h-4" />
            Materials
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={statusInfo.variant} className="gap-1">
              {linkedPO.status === 'SUBMITTED' && <Clock className="w-3 h-3" />}
              {isPriced && <Check className="w-3 h-3" />}
              {statusInfo.label}
            </Badge>
            <Badge variant="outline">{linkedPO.po_number}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Line Items Table */}
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Description</th>
                <th className="text-right px-3 py-2 font-medium w-20">Qty</th>
                <th className="text-left px-3 py-2 font-medium w-16">UOM</th>
                {canViewPricing && isPriced && (
                  <th className="text-right px-3 py-2 font-medium w-24">Total</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <span className="font-medium">{item.description}</span>
                    {item.length_ft && (
                      <span className="text-muted-foreground ml-1">({item.length_ft}')</span>
                    )}
                  </td>
                  <td className="text-right px-3 py-2">{item.quantity}</td>
                  <td className="px-3 py-2 text-muted-foreground">{item.uom}</td>
                  {canViewPricing && isPriced && (
                    <td className="text-right px-3 py-2 font-medium">
                      ${(item.line_total || 0).toFixed(2)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pricing Summary - Only show when priced and user can view */}
        {canViewPricing && isPriced && (
          <>
            <Separator />
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              
              {/* Markup Editor */}
              {isEditable && !isLocked && (
                <MaterialMarkupEditor
                  markupType={materialMarkupType}
                  markupPercent={materialMarkupPercent}
                  markupAmount={materialMarkupAmount}
                  baseAmount={subtotal}
                  onUpdate={handleMarkupUpdate}
                  isEditable={isEditable}
                />
              )}
              
              {/* Show markup if locked or set */}
              {(isLocked || calculatedMarkup > 0) && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Markup {materialMarkupType === 'percent' ? `(${materialMarkupPercent}%)` : '(Lump Sum)'}
                  </span>
                  <span className="font-medium">+${calculatedMarkup.toFixed(2)}</span>
                </div>
              )}
              
              <Separator />
              
              <div className="flex justify-between font-medium">
                <span>Materials Total</span>
                <span>${materialsTotal.toFixed(2)}</span>
              </div>
            </div>
            
            {/* Lock Button */}
            {isEditable && !isLocked && (
              <Button
                onClick={onLockPricing}
                disabled={isLocking}
                className="w-full gap-2"
              >
                <Lock className="w-4 h-4" />
                Lock Materials Pricing
              </Button>
            )}
            
            {/* Locked indicator */}
            {isLocked && (
              <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground bg-muted/50 rounded-lg">
                <Lock className="w-4 h-4" />
                Materials pricing locked
              </div>
            )}
          </>
        )}

        {/* GC View - marked-up total only (when materials are locked) */}
        {!canViewPricing && canViewMarkedUpTotal && isPriced && isLocked && (
          <>
            <Separator />
            <div className="flex justify-between font-medium">
              <span>Materials Total</span>
              <span>${materialsTotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground bg-muted/50 rounded-lg">
              <Lock className="w-4 h-4" />
              Materials pricing locked
            </div>
          </>
        )}

        {/* Awaiting pricing message */}
        {linkedPO.status === 'SUBMITTED' && (
          <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            Waiting for supplier to add pricing
          </div>
        )}

        {/* FC message - can see items but not pricing */}
        {!canViewPricing && !canViewMarkedUpTotal && items.length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            {items.length} item(s) on order
          </p>
        )}
      </CardContent>
    </Card>
  );
}
