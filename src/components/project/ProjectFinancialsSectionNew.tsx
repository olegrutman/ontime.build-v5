import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, TrendingUp, Receipt, Percent, BarChart3, AlertCircle, Plus, Pencil, Check, X, ClipboardList, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Contract {
  id: string;
  from_role: string;
  to_role: string;
  contract_sum: number;
  retainage_percent: number;
  trade: string | null;
  from_org_id: string | null;
  to_org_id: string | null;
  from_org_name?: string | null;
  to_org_name?: string | null;
}

interface ProjectFinancialsSectionNewProps {
  projectId: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function ProjectFinancialsSectionNew({ projectId }: ProjectFinancialsSectionNewProps) {
  const { toast } = useToast();
  const { user, userOrgRoles } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [billedToDate, setBilledToDate] = useState(0);
  const [viewerRole, setViewerRole] = useState<string>('Trade Contractor');
  const [workOrderTotal, setWorkOrderTotal] = useState(0);
  const [userOrgIds, setUserOrgIds] = useState<string[]>([]);
  const [fcParticipants, setFcParticipants] = useState<{ org_id: string; org_name: string }[]>([]);
  
  // Inline editing state
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [editRetainage, setEditRetainage] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  
  // Create new contract state
  const [creatingContract, setCreatingContract] = useState(false);
  const [newContractValue, setNewContractValue] = useState<number>(0);
  const [newContractRetainage, setNewContractRetainage] = useState<number>(0);
  const [selectedFcOrgId, setSelectedFcOrgId] = useState<string>('');
  
  // Material costs state (TC view)
  const [materialCosts, setMaterialCosts] = useState<{
    supplierCost: number;
    markupAmount: number;
    revenueTotal: number;
    avgMarkupPercent: number;
    workOrderCount: number;
  }>({ supplierCost: 0, markupAmount: 0, revenueTotal: 0, avgMarkupPercent: 0, workOrderCount: 0 });

  const fetchData = async () => {
    setLoading(true);
    
    // Determine viewer role based on current user's organization
    if (user) {
      // Get user's org memberships
      const { data: memberships } = await supabase
        .from('user_org_roles')
        .select('organization_id')
        .eq('user_id', user.id);
      
      const userOrgIds = (memberships || []).map(m => m.organization_id);
      
      // Check project team to find user's role
      if (userOrgIds.length > 0) {
        const { data: teamMembers } = await supabase
          .from('project_team')
          .select('role, org_id')
          .eq('project_id', projectId)
          .in('org_id', userOrgIds);
        
        if (teamMembers && teamMembers.length > 0) {
          setViewerRole(teamMembers[0].role);
        }
      }
    }
    
    // Fetch contracts with org names
    const { data: contractData } = await supabase
      .from('project_contracts')
      .select(`
        id, from_role, to_role, contract_sum, retainage_percent, trade, from_org_id, to_org_id,
        from_org:organizations!project_contracts_from_org_id_fkey(name),
        to_org:organizations!project_contracts_to_org_id_fkey(name)
      `)
      .eq('project_id', projectId);
    
    // Map org names to the contract objects
    const contractsWithNames = (contractData || []).map((c: any) => ({
      ...c,
      from_org_name: c.from_org?.name || null,
      to_org_name: c.to_org?.name || null,
    })) as Contract[];
    
    setContracts(contractsWithNames);

    // Fetch billed amounts from invoices
    const { data: invoiceData } = await supabase
      .from('invoices')
      .select('total_amount, status')
      .eq('project_id', projectId)
      .in('status', ['SUBMITTED', 'APPROVED', 'PAID']);
    
    const totalBilled = (invoiceData || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    setBilledToDate(totalBilled);
    
    // Fetch work order totals
    const { data: workOrders } = await supabase
      .from('change_order_projects')
      .select('final_price')
      .eq('project_id', projectId);
    
    const woTotal = (workOrders || []).reduce((sum, wo) => sum + (wo.final_price || 0), 0);
    setWorkOrderTotal(woTotal);
    
    // Fetch FC participants for TC to create contracts
    const { data: fcData } = await supabase
      .from('project_participants')
      .select('organization_id, organizations:organization_id (name)')
      .eq('project_id', projectId)
      .eq('role', 'FC')
      .eq('invite_status', 'ACCEPTED');
    
    const fcList = (fcData || []).map((p: any) => ({
      org_id: p.organization_id,
      org_name: p.organizations?.name || 'Unknown',
    }));
    setFcParticipants(fcList);
    
    // Fetch material costs from work orders with linked POs
    const { data: workOrdersWithPO } = await supabase
      .from('change_order_projects')
      .select('id, linked_po_id, material_markup_type, material_markup_percent, material_markup_amount, material_total')
      .eq('project_id', projectId)
      .not('linked_po_id', 'is', null);

    if (workOrdersWithPO && workOrdersWithPO.length > 0) {
      const poIds = workOrdersWithPO.map(wo => wo.linked_po_id).filter(Boolean) as string[];
      
      // Fetch PO line item totals
      const { data: poItems } = await supabase
        .from('po_line_items')
        .select('po_id, line_total')
        .in('po_id', poIds);
      
      // Sum by PO
      const poSubtotals = new Map<string, number>();
      (poItems || []).forEach(item => {
        const current = poSubtotals.get(item.po_id) || 0;
        poSubtotals.set(item.po_id, current + (item.line_total || 0));
      });
      
      // Calculate totals
      let supplierCost = 0;
      let markupAmount = 0;
      let revenueTotal = 0;
      
      workOrdersWithPO.forEach(wo => {
        const baseCost = poSubtotals.get(wo.linked_po_id!) || 0;
        supplierCost += baseCost;
        
        const markup = wo.material_markup_type === 'percent'
          ? baseCost * ((wo.material_markup_percent || 0) / 100)
          : (wo.material_markup_amount || 0);
        
        markupAmount += markup;
        revenueTotal += baseCost + markup;
      });
      
      const avgMarkupPercent = supplierCost > 0 ? (markupAmount / supplierCost) * 100 : 0;
      
      setMaterialCosts({ 
        supplierCost, 
        markupAmount, 
        revenueTotal, 
        avgMarkupPercent,
        workOrderCount: workOrdersWithPO.length
      });
    }
    
    setLoading(false);
  };

  useEffect(() => {
    if (projectId) {
      fetchData();
    }
  }, [projectId, user]);

  // Fetch user org IDs for counterparty lookup
  useEffect(() => {
    const fetchUserOrgIds = async () => {
      if (user) {
        const { data: memberships } = await supabase
          .from('user_org_roles')
          .select('organization_id')
          .eq('user_id', user.id);
        
        setUserOrgIds((memberships || []).map(m => m.organization_id));
      }
    };
    fetchUserOrgIds();
  }, [user]);

  const startEditing = (contract: Contract) => {
    setEditingContractId(contract.id);
    setEditValue(contract.contract_sum);
    setEditRetainage(contract.retainage_percent);
  };

  const cancelEditing = () => {
    setEditingContractId(null);
    setEditValue(0);
    setEditRetainage(0);
  };

  const saveContract = async () => {
    if (!editingContractId) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('project_contracts')
        .update({
          contract_sum: editValue,
          retainage_percent: editRetainage,
        })
        .eq('id', editingContractId);

      if (error) throw error;

      // Update local state
      setContracts(contracts.map(c => 
        c.id === editingContractId 
          ? { ...c, contract_sum: editValue, retainage_percent: editRetainage }
          : c
      ));
      
      toast({ title: 'Contract updated' });
      setEditingContractId(null);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const createFcContract = async () => {
    if (!selectedFcOrgId || !user) return;
    
    const currentOrgId = userOrgRoles[0]?.organization?.id;
    if (!currentOrgId) return;
    
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('project_contracts')
        .insert({
          project_id: projectId,
          from_org_id: currentOrgId,
          to_org_id: selectedFcOrgId,
          from_role: 'Trade Contractor',
          to_role: 'Field Crew',
          contract_sum: newContractValue,
          retainage_percent: newContractRetainage,
          created_by_user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Get org name for display
      const fcOrg = fcParticipants.find(p => p.org_id === selectedFcOrgId);
      
      setContracts([...contracts, {
        ...data,
        from_org_name: userOrgRoles[0]?.organization?.name || null,
        to_org_name: fcOrg?.org_name || null,
      }]);
      
      toast({ title: 'Contract created' });
      setCreatingContract(false);
      setNewContractValue(0);
      setNewContractRetainage(0);
      setSelectedFcOrgId('');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

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
  const upstreamContract = contracts.find(c => 
    (c.from_role === 'General Contractor' && c.to_role === 'Trade Contractor') ||
    (c.to_role === 'General Contractor' && c.from_role === 'Trade Contractor')
  );
  
  const downstreamContract = contracts.find(c => 
    (c.from_role === 'Trade Contractor' && c.to_role === 'Field Crew') ||
    (c.to_role === 'Trade Contractor' && c.from_role === 'Field Crew')
  );

  const isTCView = viewerRole === 'Trade Contractor';
  const isGCView = viewerRole === 'General Contractor';
  const isFCView = viewerRole === 'Field Crew';

  const gcContractValue = upstreamContract?.contract_sum || 0;
  const fcContractValue = downstreamContract?.contract_sum || 0;
  const hasUpstream = upstreamContract && gcContractValue > 0;
  const hasDownstream = downstreamContract && fcContractValue > 0;
  const hasBothContracts = hasUpstream && hasDownstream;
  
  const profit = hasBothContracts ? gcContractValue - fcContractValue : 0;
  const profitPercent = hasBothContracts && gcContractValue > 0
    ? (profit / gcContractValue) * 100
    : 0;

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

  // Helper to get the "other party" company name for a contract
  // based on current user's organization
  const getContractCounterpartyName = (contract: Contract | undefined, userOrgIds: string[]): string => {
    if (!contract) return 'Unknown';
    
    // Check if user's org is the "from" side (client/payer)
    const isFromOrg = contract.from_org_id && userOrgIds.includes(contract.from_org_id);
    // Check if user's org is the "to" side (contractor/receiver)
    const isToOrg = contract.to_org_id && userOrgIds.includes(contract.to_org_id);
    
    if (isFromOrg) {
      // User is the client, show the contractor they hired
      return contract.to_org_name || contract.to_role;
    } else if (isToOrg) {
      // User is the contractor, show who hired them
      return contract.from_org_name || contract.from_role;
    }
    
    // Fallback: prefer showing the "to" party
    return contract.to_org_name || contract.from_org_name || contract.to_role;
  };


  const getUpstreamCompanyName = () => {
    return getContractCounterpartyName(upstreamContract, userOrgIds);
  };

  const getDownstreamCompanyName = () => {
    return getContractCounterpartyName(downstreamContract, userOrgIds);
  };

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

  // Inline edit form component
  const InlineEditForm = ({ contract, label }: { contract: Contract; label: string }) => {
    const isEditing = editingContractId === contract.id;
    
    if (isEditing) {
      return (
        <div className="space-y-2 mt-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                type="number"
                min="0"
                step="1000"
                className="pl-6 h-8 text-sm"
                value={editValue || ''}
                onChange={(e) => setEditValue(parseFloat(e.target.value) || 0)}
                placeholder="Contract sum"
                autoFocus
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                type="number"
                min="0"
                max="20"
                step="0.5"
                className="pr-6 h-8 text-sm"
                value={editRetainage || ''}
                onChange={(e) => setEditRetainage(parseFloat(e.target.value) || 0)}
                placeholder="Retainage"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
            </div>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="default" onClick={saveContract} disabled={saving} className="h-9 px-3">
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelEditing} disabled={saving} className="h-9 px-3">
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  // Editable contract card content
  const EditableContractValue = ({ contract, value, retainage, label }: { 
    contract: Contract; 
    value: number; 
    retainage: number;
    label: string;
  }) => {
    const isEditing = editingContractId === contract.id;
    
    if (isEditing) {
      return <InlineEditForm contract={contract} label={label} />;
    }

    return (
      <div className="group">
        <div className="flex items-center gap-2">
          <p className="text-2xl font-bold">{formatCurrency(value)}</p>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
            onClick={() => startEditing(contract)}
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {retainage}% retainage • {label}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Contract Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 overflow-hidden">
        {/* Trade Contractor: Show both contracts and profit */}
        {isTCView && (
          <>
            {/* Contract with GC (Revenue) */}
            <Card className={`border-l-4 ${hasUpstream ? 'border-l-primary' : 'border-l-muted border-dashed'}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${hasUpstream ? 'bg-primary/10' : 'bg-muted'}`}>
                    {hasUpstream ? (
                      <DollarSign className="h-5 w-5 text-primary" />
                    ) : (
                      <Plus className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      Contract with {getUpstreamCompanyName() || 'General Contractor'}
                    </p>
                    {hasUpstream ? (
                      <EditableContractValue 
                        contract={upstreamContract} 
                        value={gcContractValue} 
                        retainage={upstreamContract.retainage_percent}
                        label="Revenue" 
                      />
                    ) : (
                      <div className="mt-1">
                        <p className="text-sm text-muted-foreground mb-2">Add a General Contractor to track revenue</p>
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/project/${projectId}/edit?step=team`}>
                            <Plus className="h-3 w-3 mr-1" />
                            Add Contract
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contract with FC (Cost) */}
            <Card className={`border-l-4 ${hasDownstream ? 'border-l-orange-500' : 'border-l-muted border-dashed'}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${hasDownstream ? 'bg-orange-100 dark:bg-orange-900/20' : 'bg-muted'}`}>
                    <DollarSign className={`h-5 w-5 ${hasDownstream ? 'text-orange-600' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      Contract with {getDownstreamCompanyName() || 'Field Crew'}
                    </p>
                    {hasDownstream ? (
                      <EditableContractValue 
                        contract={downstreamContract} 
                        value={fcContractValue} 
                        retainage={downstreamContract.retainage_percent}
                        label="Cost" 
                      />
                    ) : creatingContract ? (
                      <div className="space-y-2 mt-2">
                        {fcParticipants.length > 1 && (
                          <select
                            className="w-full h-8 text-sm border rounded px-2 bg-background"
                            value={selectedFcOrgId}
                            onChange={(e) => setSelectedFcOrgId(e.target.value)}
                          >
                            <option value="">Select Field Crew...</option>
                            {fcParticipants.map(fc => (
                              <option key={fc.org_id} value={fc.org_id}>{fc.org_name}</option>
                            ))}
                          </select>
                        )}
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                            <Input
                              type="number"
                              min="0"
                              step="1000"
                              className="pl-6 h-8 text-sm"
                              value={newContractValue || ''}
                              onChange={(e) => setNewContractValue(parseFloat(e.target.value) || 0)}
                              placeholder="Contract sum"
                              autoFocus
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <Input
                              type="number"
                              min="0"
                              max="20"
                              step="0.5"
                              className="pr-6 h-8 text-sm"
                              value={newContractRetainage || ''}
                              onChange={(e) => setNewContractRetainage(parseFloat(e.target.value) || 0)}
                              placeholder="Retainage"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                           <Button 
                             size="sm" 
                             variant="default" 
                             onClick={createFcContract} 
                             disabled={saving || (fcParticipants.length > 1 && !selectedFcOrgId)} 
                             className="h-9 px-3"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                           <Button 
                             size="sm" 
                             variant="ghost" 
                             onClick={() => setCreatingContract(false)} 
                             disabled={saving} 
                             className="h-9 px-3"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : fcParticipants.length > 0 ? (
                      <div className="mt-1">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            setCreatingContract(true);
                            if (fcParticipants.length === 1) {
                              setSelectedFcOrgId(fcParticipants[0].org_id);
                            }
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Contract
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No Field Crew added</p>
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
                        <p className="text-sm text-muted-foreground">
                          {profitPercent.toFixed(1)}% margin
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        {!hasUpstream && !hasDownstream 
                          ? 'Add contracts to calculate'
                          : !hasUpstream 
                            ? 'Add upstream contract'
                            : 'Add Field Crew contract'}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Material Costs Summary - TC Only */}
            {materialCosts.supplierCost > 0 && (
              <Card className="border-l-4 border-l-teal-500">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/20">
                      <Package className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Material Costs</p>
                      <p className="text-sm text-muted-foreground">From {materialCosts.workOrderCount} work order{materialCosts.workOrderCount > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Supplier Costs</span>
                      <span>{formatCurrency(materialCosts.supplierCost)}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Markup ({materialCosts.avgMarkupPercent.toFixed(1)}%)</span>
                      <span>+{formatCurrency(materialCosts.markupAmount)}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between font-semibold">
                      <span>Material Revenue</span>
                      <span>{formatCurrency(materialCosts.revenueTotal)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* GC View: Show TC contract and Work Orders Total */}
        {isGCView && (
          <>
            {primaryContract && (
              <Card className="border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">
                        Contract with {getContractCounterpartyName(primaryContract, userOrgIds)}
                      </p>
                      <EditableContractValue 
                        contract={primaryContract} 
                        value={primaryContract.contract_sum} 
                        retainage={primaryContract.retainage_percent}
                        label="Contract" 
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Work Orders Total for GC */}
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/20">
                    <ClipboardList className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Work Orders Total</p>
                    <p className="text-2xl font-bold">{formatCurrency(workOrderTotal)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* FC View: Show their single contract */}
        {isFCView && primaryContract && (
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">
                    Contract with {getContractCounterpartyName(primaryContract, userOrgIds)}
                  </p>
                  <EditableContractValue 
                    contract={primaryContract} 
                    value={primaryContract.contract_sum} 
                    retainage={primaryContract.retainage_percent}
                    label="Contract" 
                  />
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
                <p className="text-sm text-muted-foreground">
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
                <p className="text-sm text-muted-foreground">{retainagePercent}% of billed</p>
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
            <Progress value={billingProgress} className="h-3" />
            <div className="flex justify-between mt-2 text-sm text-muted-foreground">
              <span>Billed: {formatCurrency(billedToDate)}</span>
              <span>Remaining: {formatCurrency(outstanding)}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
