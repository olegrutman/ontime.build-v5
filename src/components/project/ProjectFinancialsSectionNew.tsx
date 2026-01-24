import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Receipt, Percent, BarChart3, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

interface Contract {
  id: string;
  from_role: string;
  to_role: string;
  contract_sum: number;
  retainage_percent: number;
  trade: string | null;
}

interface ProjectFinancialsSectionNewProps {
  projectId: string;
  viewerRole?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function ProjectFinancialsSectionNew({ projectId, viewerRole = 'Trade Contractor' }: ProjectFinancialsSectionNewProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [billedToDate, setBilledToDate] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Fetch contracts
      const { data: contractData } = await supabase
        .from('project_contracts')
        .select('id, from_role, to_role, contract_sum, retainage_percent, trade')
        .eq('project_id', projectId);
      
      setContracts((contractData || []) as Contract[]);

      // Fetch billed amounts from invoices
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('total_amount, status')
        .eq('project_id', projectId)
        .in('status', ['SUBMITTED', 'APPROVED', 'PAID']);
      
      const totalBilled = (invoiceData || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      setBilledToDate(totalBilled);
      
      setLoading(false);
    };

    if (projectId) {
      fetchData();
    }
  }, [projectId]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  // Find relevant contracts based on viewer role
  // Trade Contractor sees: upstream (GC contract) and downstream (FC contract)
  // General Contractor sees: contract with Trade Contractor
  // Field Crew sees: contract with Trade Contractor

  // Upstream contract: GC ↔ TC (where TC receives from GC)
  const upstreamContract = contracts.find(c => 
    (c.from_role === 'General Contractor' && c.to_role === 'Trade Contractor') ||
    (c.to_role === 'General Contractor' && c.from_role === 'Trade Contractor')
  );
  
  // Downstream contract: TC ↔ FC (where TC pays FC)
  const downstreamContract = contracts.find(c => 
    (c.from_role === 'Trade Contractor' && c.to_role === 'Field Crew') ||
    (c.to_role === 'Trade Contractor' && c.from_role === 'Field Crew')
  );

  // For Trade Contractor view
  const isTCView = viewerRole === 'Trade Contractor';
  const isGCView = viewerRole === 'General Contractor';
  const isFCView = viewerRole === 'Field Crew';

  // Calculate profit (only for Trade Contractor)
  // Profit = Revenue from GC - Cost to FC
  const gcContractValue = upstreamContract?.contract_sum || 0;
  const fcContractValue = downstreamContract?.contract_sum || 0;
  const hasUpstream = isTCView && upstreamContract && gcContractValue > 0;
  const hasDownstream = isTCView && downstreamContract && fcContractValue > 0;
  const hasBothContracts = hasUpstream && hasDownstream;
  
  const profit = hasBothContracts ? gcContractValue - fcContractValue : 0;
  const profitPercent = hasBothContracts && gcContractValue > 0
    ? (profit / gcContractValue) * 100
    : 0;

  // Primary contract for billing calculations (TC bills against upstream)
  const primaryContract = isTCView 
    ? upstreamContract 
    : isGCView 
      ? upstreamContract 
      : downstreamContract;
  
  const contractValue = primaryContract?.contract_sum || 0;
  const retainagePercent = primaryContract?.retainage_percent || 0;
  const retainageAmount = billedToDate * (retainagePercent / 100);
  const outstanding = contractValue - billedToDate;
  const billingProgress = contractValue > 0 ? (billedToDate / contractValue) * 100 : 0;

  if (contracts.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-4 text-muted-foreground">
          <AlertCircle className="h-5 w-5" />
          <span>No contracts found. Add contracts in Project Setup to see financials.</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Contract Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Trade Contractor: Show both contracts and profit */}
        {isTCView && (
          <>
            {/* Contract with GC (Revenue) */}
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Contract with General Contractor</p>
                    {hasUpstream ? (
                      <>
                        <p className="text-2xl font-bold">{formatCurrency(gcContractValue)}</p>
                        <p className="text-xs text-muted-foreground">
                          {upstreamContract.retainage_percent}% retainage • Revenue
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Not configured</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contract with FC (Cost) */}
            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/20">
                    <DollarSign className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Contract with Field Crew</p>
                    {hasDownstream ? (
                      <>
                        <p className="text-2xl font-bold">{formatCurrency(fcContractValue)}</p>
                        <p className="text-xs text-muted-foreground">
                          {downstreamContract.retainage_percent}% retainage • Cost
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Not configured</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Estimated Profit */}
            <Card className={`border-l-4 ${hasBothContracts && profit > 0 ? 'border-l-green-500' : profit < 0 ? 'border-l-red-500' : 'border-l-muted'}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    hasBothContracts 
                      ? profit > 0 
                        ? 'bg-green-100 dark:bg-green-900/20' 
                        : 'bg-red-100 dark:bg-red-900/20'
                      : 'bg-muted'
                  }`}>
                    <TrendingUp className={`h-5 w-5 ${
                      hasBothContracts 
                        ? profit > 0 ? 'text-green-600' : 'text-red-600'
                        : 'text-muted-foreground'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Estimated Profit</p>
                    {hasBothContracts ? (
                      <>
                        <p className={`text-2xl font-bold ${profit < 0 ? 'text-red-600' : ''}`}>
                          {formatCurrency(profit)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {profitPercent.toFixed(1)}% margin
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        {!hasUpstream && !hasDownstream 
                          ? 'Add contracts to calculate'
                          : !hasUpstream 
                            ? 'Add GC contract'
                            : 'Add Field Crew contract'}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* GC/FC: Show their single contract */}
        {(isGCView || isFCView) && primaryContract && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Contract with Trade Contractor
                  </p>
                  <p className="text-2xl font-bold">{formatCurrency(primaryContract.contract_sum)}</p>
                  <p className="text-xs text-muted-foreground">
                    {primaryContract.retainage_percent}% retainage
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Billed to Date */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20">
                <Receipt className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Billed to Date</p>
                <p className="text-2xl font-bold">{formatCurrency(billedToDate)}</p>
                <p className="text-xs text-muted-foreground">
                  Outstanding: {formatCurrency(outstanding)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Retainage */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/20">
                <Percent className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Retainage Held</p>
                <p className="text-2xl font-bold">{formatCurrency(retainageAmount)}</p>
                <p className="text-xs text-muted-foreground">{retainagePercent}% of billed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Billing Progress Bar */}
      {contractValue > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/20">
                <BarChart3 className="h-4 w-4 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Billing Progress</p>
                  <p className="text-sm text-muted-foreground">{billingProgress.toFixed(1)}%</p>
                </div>
              </div>
            </div>
            <Progress value={billingProgress} className="h-2" />
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>Billed: {formatCurrency(billedToDate)}</span>
              <span>Remaining: {formatCurrency(outstanding)}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
