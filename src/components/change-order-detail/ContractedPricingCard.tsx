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

interface ContractedPricingCardProps {
  changeOrder: ChangeOrderProject;
  fcHours: ChangeOrderFCHours[];
  tcLabor: ChangeOrderTCLabor[];
  materials: ChangeOrderMaterial[];
  equipment: ChangeOrderEquipment[];
  participants: ChangeOrderParticipant[];
  currentRole: AppRole;
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

// GC View - Total cost breakdown
function GCPricingView({ 
  laborTotal, 
  materialTotal, 
  equipmentTotal, 
  finalPrice,
  tcName,
}: {
  laborTotal: number;
  materialTotal: number;
  equipmentTotal: number;
  finalPrice: number;
  tcName?: string;
}) {
  return (
    <div className="space-y-3">
      <PricingRow label="Trade Contractor Labor" value={laborTotal} />
      <PricingRow label="Materials" value={materialTotal} />
      <PricingRow label="Equipment" value={equipmentTotal} />
      <Separator className="my-2" />
      <PricingRow label="TOTAL CONTRACTED PRICE" value={finalPrice} isBold />
      {tcName && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3 pt-3 border-t">
          <Users className="h-4 w-4" />
          <span>Paid to: {tcName}</span>
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
  profit,
  fcName,
}: {
  laborTotal: number;
  materialTotal: number;
  equipmentTotal: number;
  revenue: number;
  fcCost: number;
  materialCost: number;
  profit: number;
  fcName?: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Revenue (from GC)</p>
        <div className="space-y-2 pl-2">
          <PricingRow label="TC Labor" value={laborTotal} />
          <PricingRow label="Materials Markup" value={materialTotal} />
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
          <PricingRow label="Materials (Base Cost)" value={materialCost} />
        </div>
        <div className="mt-2">
          <PricingRow label="Total Costs" value={fcCost + materialCost} isBold />
        </div>
      </div>
      
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
}: ContractedPricingCardProps) {
  const isGC = currentRole === 'GC_PM';
  const isTC = currentRole === 'TC_PM';
  const isFC = currentRole === 'FC_PM' || currentRole === 'FS';

  // Find participant company names
  const tcParticipant = participants.find(p => p.role === 'TC' && p.is_active);
  const fcParticipant = participants.find(p => p.role === 'FC' && p.is_active);
  
  // Calculate totals
  const laborTotal = changeOrder.labor_total || 0;
  const materialTotal = changeOrder.material_total || 0;
  const equipmentTotal = changeOrder.equipment_total || 0;
  const finalPrice = changeOrder.final_price || 0;
  
  // FC costs (what TC pays FC)
  const fcCost = fcHours.reduce((sum, h) => sum + (h.labor_total || 0), 0);
  
  // Material base cost (before markup)
  const materialCost = materials.reduce((sum, m) => sum + ((m.unit_cost || 0) * m.quantity), 0);
  
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
