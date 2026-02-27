import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DollarSign, Lock, TrendingUp, Users } from 'lucide-react';
import type { 
  ChangeOrderProject, 
  ChangeOrderFCHours, 
  ChangeOrderTCLabor, 
  ChangeOrderMaterial, 
  ChangeOrderEquipment,
  ChangeOrderParticipant 
} from '@/types/changeOrderProject';

type AppRole = 'GC_PM' | 'TC_PM' | 'FC_PM' | 'FS' | 'SUPPLIER' | null;

interface LinkedPO {
  id: string;
  po_number: string;
  status: string;
  subtotal?: number;
  itemCount?: number;
  items?: any[];
}

interface ContractedPricingCardProps {
  changeOrder: ChangeOrderProject;
  fcHours: ChangeOrderFCHours[];
  tcLabor: ChangeOrderTCLabor[];
  materials: ChangeOrderMaterial[];
  equipment: ChangeOrderEquipment[];
  participants: ChangeOrderParticipant[];
  currentRole: AppRole;
  linkedPO?: LinkedPO | null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

function PricingRow({ 
  label, 
  value, 
  isBold = false,
  isProfit = false,
}: { 
  label: string; 
  value: number; 
  isBold?: boolean;
  isProfit?: boolean;
}) {
  return (
    <div className={`flex justify-between items-center ${isBold ? 'font-semibold' : ''}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className={isProfit && value > 0 ? 'text-green-600' : isProfit && value < 0 ? 'text-red-600' : ''}>
        {formatCurrency(value)}
      </span>
    </div>
  );
}

// GC View - Restructured with tiles by cost responsibility
function GCPricingView({ 
  laborTotal, 
  materialTotal, 
  equipmentTotal, 
  finalPrice,
  tcName,
  tcLabor,
  materialCostResponsibility,
  equipmentCostResponsibility,
  requiresMaterials,
  requiresEquipment,
}: {
  laborTotal: number;
  materialTotal: number;
  equipmentTotal: number;
  finalPrice: number;
  tcName?: string;
  tcLabor: ChangeOrderTCLabor[];
  materialCostResponsibility: 'GC' | 'TC' | null;
  equipmentCostResponsibility: 'GC' | 'TC' | null;
  requiresMaterials: boolean;
  requiresEquipment: boolean;
}) {
  const equipmentInTC = equipmentCostResponsibility === 'TC' && requiresEquipment;
  const equipmentInSeparate = equipmentCostResponsibility === 'GC' && requiresEquipment;
  const tcSubtotal = laborTotal + (equipmentInTC ? equipmentTotal : 0);
  const totalCost = laborTotal
    + (requiresMaterials ? materialTotal : 0)
    + (requiresEquipment ? equipmentTotal : 0);

  return (
    <div className="space-y-4">
      {/* Total Work Order Cost */}
      <div className="bg-muted/50 p-3 rounded-md">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Work Order Cost</p>
        <p className="text-xl font-semibold">{formatCurrency(totalCost)}</p>
      </div>

      {/* TC Contract Tile */}
      <div className="border rounded-md p-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">TC Contract</p>
        {tcLabor.length > 0 ? (
          <div className="space-y-1.5 pl-1">
            {tcLabor.map((entry) => (
              <div key={entry.id} className="flex justify-between items-start text-sm">
                <span className="text-muted-foreground">
                  {entry.description || 'Labor'}
                  {entry.pricing_type === 'lump_sum'
                    ? ' — Lump Sum'
                    : ` — ${entry.hours}hrs @ ${formatCurrency(entry.hourly_rate || 0)}/hr`}
                </span>
                <span className="shrink-0 ml-2">{formatCurrency(entry.labor_total)}</span>
              </div>
            ))}
          </div>
        ) : (
          <PricingRow label="Labor" value={laborTotal} />
        )}
        {equipmentInTC && (
          <PricingRow label="Equipment (TC)" value={equipmentTotal} />
        )}
        <Separator className="my-1" />
        <PricingRow label="Subtotal" value={tcSubtotal} isBold />
        {tcName && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
            <Users className="h-3.5 w-3.5" />
            <span>Paid to: {tcName}</span>
          </div>
        )}
      </div>

      {/* Materials Tile */}
      {requiresMaterials && materialTotal > 0 && (
        <div className="border rounded-md p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Materials{materialCostResponsibility ? ` (${materialCostResponsibility} Responsible)` : ''}
          </p>
          <PricingRow label="Total" value={materialTotal} isBold />
        </div>
      )}

      {/* Equipment Tile - only when GC responsible */}
      {equipmentInSeparate && equipmentTotal > 0 && (
        <div className="border rounded-md p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Equipment (GC Responsible)</p>
          <PricingRow label="Total" value={equipmentTotal} isBold />
        </div>
      )}
    </div>
  );
}

// TC View - Revenue, Costs, Profit breakdown
function TCPricingView({
  laborTotal,
  materialTotal,
  equipmentTotal,
  revenue,
  fcCost,
  materialCost,
  materialMarkup,
  profit,
  fcName,
}: {
  laborTotal: number;
  materialTotal: number;
  equipmentTotal: number;
  revenue: number;
  fcCost: number;
  materialCost: number;
  materialMarkup: number;
  profit: number;
  fcName?: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Revenue (from GC)</p>
        <div className="space-y-2 pl-2">
          <PricingRow label="TC Labor" value={laborTotal} />
          <PricingRow label="Materials (to GC)" value={materialTotal} />
          <PricingRow label="Equipment" value={equipmentTotal} />
        </div>
        <div className="mt-2">
          <PricingRow label="Total Revenue" value={revenue} isBold />
        </div>
      </div>
      
      <Separator />
      
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Costs</p>
        <div className="space-y-2 pl-2">
          <PricingRow label={fcName ? `Field Crew (${fcName})` : 'Field Crew'} value={fcCost} />
          <PricingRow label="Materials (Supplier Cost)" value={materialCost} />
        </div>
        <div className="mt-2">
          <PricingRow label="Total Costs" value={fcCost + materialCost} isBold />
        </div>
      </div>
      
      {materialMarkup > 0 && (
        <>
          <Separator />
          <div className="text-sm text-muted-foreground">
            <span>Materials Markup: </span>
            <span className="text-foreground">{formatCurrency(materialMarkup)}</span>
          </div>
        </>
      )}
      
      <Separator />
      
      <div className="flex items-center gap-2">
        <TrendingUp className={`h-4 w-4 ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
        <PricingRow label="PROFIT" value={profit} isBold isProfit />
      </div>
    </div>
  );
}

// FC View - Their earnings only
function FCEarningsView({
  totalEarnings,
  totalHours,
  averageRate,
  isLocked,
  hasLumpSum,
  tcName,
}: {
  totalEarnings: number;
  totalHours: number;
  averageRate: number | null;
  isLocked: boolean;
  hasLumpSum: boolean;
  tcName?: string;
}) {
  return (
    <div className="space-y-3">
      {!hasLumpSum && totalHours > 0 && (
        <>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Hours Logged</span>
            <span>{totalHours} hrs</span>
          </div>
          {averageRate && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Rate</span>
              <span>{formatCurrency(averageRate)}/hr</span>
            </div>
          )}
          <Separator className="my-2" />
        </>
      )}
      <PricingRow label="TOTAL EARNINGS" value={totalEarnings} isBold />
      
      <div className="flex items-center gap-2 text-sm mt-3 pt-3 border-t">
        {isLocked ? (
          <>
            <Lock className="h-4 w-4 text-green-600" />
            <span className="text-green-600">Locked</span>
          </>
        ) : (
          <>
            <Lock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Pending</span>
          </>
        )}
      </div>
      
      {tcName && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>Working for: {tcName}</span>
        </div>
      )}
    </div>
  );
}

// Placeholder for draft/no pricing
function NoPricingPlaceholder() {
  return (
    <div className="text-center py-4">
      <DollarSign className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">
        Pricing will appear here once the Trade Contractor submits their quote.
      </p>
    </div>
  );
}

export function ContractedPricingCard({
  changeOrder,
  fcHours,
  tcLabor,
  materials,
  equipment,
  participants,
  currentRole,
  linkedPO,
}: ContractedPricingCardProps) {
  const isGC = currentRole === 'GC_PM';
  const isTC = currentRole === 'TC_PM';
  const isFC = currentRole === 'FC_PM' || currentRole === 'FS';

  // Find participant company names
  const tcParticipant = participants.find(p => p.role === 'TC' && p.is_active);
  const fcParticipant = participants.find(p => p.role === 'FC' && p.is_active);
  
  // Calculate totals
  const laborTotal = changeOrder.labor_total || 0;
  const equipmentTotal = changeOrder.equipment_total || 0;

  // Material total: recalculate from PO data if available (handles stale DB values)
  // This matches the logic in TCPricingSummary for consistency
  const baseMatTotal = linkedPO?.subtotal || 0;
  const markupAmount = changeOrder.material_markup_type === 'percent'
    ? baseMatTotal * ((changeOrder.material_markup_percent || 0) / 100)
    : changeOrder.material_markup_type === 'lump_sum'
      ? (changeOrder.material_markup_amount || 0)
      : 0;
  const materialTotal = baseMatTotal > 0 
    ? baseMatTotal + markupAmount 
    : (changeOrder.material_total || 0); // Fallback to DB value if no linked PO
  
  const finalPrice = changeOrder.final_price || 0;
  
  // FC costs (what TC pays FC)
  const fcCost = fcHours.reduce((sum, h) => sum + (h.labor_total || 0), 0);
  
  // Material base cost (from linked PO if using PO workflow, otherwise from materials array)
  const materialCost = linkedPO?.subtotal 
    ?? materials.reduce((sum, m) => sum + ((m.unit_cost || 0) * m.quantity), 0);
  
  // Material markup (difference between what GC pays and supplier cost)
  const materialMarkup = materialTotal - materialCost;
  
  // TC profit
  const revenue = finalPrice;
  const profit = revenue - fcCost - materialCost;

  // Check if we have any pricing data
  const hasPricingData = finalPrice > 0 || laborTotal > 0 || materialTotal > 0 || equipmentTotal > 0 || fcCost > 0;
  const isDraft = changeOrder.status === 'draft';

  // FC earnings calculations
  const fcTotalEarnings = fcCost;
  const fcTotalHours = fcHours
    .filter(h => h.pricing_type !== 'lump_sum')
    .reduce((sum, h) => sum + h.hours, 0);
  const fcHasLumpSum = fcHours.some(h => h.pricing_type === 'lump_sum');
  const fcAverageRate = fcTotalHours > 0 
    ? fcHours.filter(h => h.pricing_type !== 'lump_sum').reduce((sum, h) => sum + (h.hourly_rate || 0), 0) / fcHours.filter(h => h.pricing_type !== 'lump_sum').length
    : null;
  const fcAllLocked = fcHours.length > 0 && fcHours.every(h => h.is_locked);

  const renderContent = () => {
    // Show placeholder if draft and no pricing data
    if (isDraft && !hasPricingData && !isTC) {
      return <NoPricingPlaceholder />;
    }

    // GC View
    if (isGC) {
      return (
        <GCPricingView
          laborTotal={laborTotal}
          materialTotal={materialTotal}
          equipmentTotal={equipmentTotal}
          finalPrice={finalPrice}
          tcName={tcParticipant?.organization?.name}
          tcLabor={tcLabor}
          materialCostResponsibility={changeOrder.material_cost_responsibility as 'GC' | 'TC' | null}
          equipmentCostResponsibility={changeOrder.equipment_cost_responsibility as 'GC' | 'TC' | null}
          requiresMaterials={changeOrder.requires_materials}
          requiresEquipment={changeOrder.requires_equipment}
        />
      );
    }

    // TC View
    if (isTC) {
      return (
        <TCPricingView
          laborTotal={laborTotal}
          materialTotal={materialTotal}
          equipmentTotal={equipmentTotal}
          revenue={revenue}
          fcCost={fcCost}
          materialCost={materialCost}
          materialMarkup={materialMarkup}
          profit={profit}
          fcName={fcParticipant?.organization?.name}
        />
      );
    }

    // FC View
    if (isFC) {
      if (fcHours.length === 0) {
        return (
          <div className="text-center py-4">
            <DollarSign className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No hours logged yet. Add your hours to see your earnings.
            </p>
          </div>
        );
      }
      
      return (
        <FCEarningsView
          totalEarnings={fcTotalEarnings}
          totalHours={fcTotalHours}
          averageRate={fcAverageRate}
          isLocked={fcAllLocked}
          hasLumpSum={fcHasLumpSum}
          tcName={tcParticipant?.organization?.name}
        />
      );
    }

    // Default - shouldn't reach here
    return <NoPricingPlaceholder />;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          {isFC ? 'My Earnings' : 'Work Order Pricing'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
}
