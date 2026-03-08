import { useState } from 'react';
import { UploadSOVDialog } from './UploadSOVDialog';
import { Plus, Trash2, GripVertical, FileSpreadsheet, Pencil, Check, X, AlertCircle, ChevronDown, ChevronRight, Lock, Unlock, DollarSign, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useContractSOV, ContractSOV, ContractSOVItem, ProjectContract, getContractDisplayName } from '@/hooks/useContractSOV';
import { SOVProgressBar } from './SOVProgressBar';
import { RequireOrgType } from '@/components/auth/RequirePermission';
import { useAuth } from '@/hooks/useAuth';

interface ContractSOVEditorProps {
  projectId: string;
}

export function ContractSOVEditor({ projectId }: ContractSOVEditorProps) {
  const { currentRole, userOrgRoles } = useAuth();
  const isFC = currentRole === 'FC_PM';
  const isTC = currentRole === 'TC_PM';
  const currentOrgId = userOrgRoles[0]?.organization?.id;
  
  const {
    contracts,
    sovs,
    sovItems,
    loading,
    saving,
    hasSOVs,
    contractsMissingSOVs,
    createAllSOVs,
    createSOVForContract,
    updateItemPercent,
    updateItemName,
    addItem,
    deleteItem,
    deleteSOV,
    reorderItems,
    getSOVTotals,
    toggleSOVLock,
    hasBillingActivity,
    refresh
  } = useContractSOV(projectId);

  const [expandedSovs, setExpandedSovs] = useState<Set<string>>(new Set());
  const [newItemNames, setNewItemNames] = useState<Record<string, string>>({});
  const [editingItem, setEditingItem] = useState<{ sovId: string; itemId: string } | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingPercent, setEditingPercent] = useState<{ sovId: string; itemId: string } | null>(null);
  const [editingPercentValue, setEditingPercentValue] = useState('');
  const [draggedItem, setDraggedItem] = useState<ContractSOVItem | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<{ sovId: string; index: number } | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const toggleSov = (sovId: string) => {
    setExpandedSovs(prev => {
      const next = new Set(prev);
      if (next.has(sovId)) {
        next.delete(sovId);
      } else {
        next.add(sovId);
      }
      return next;
    });
  };

  const handleAddItem = async (sovId: string) => {
    const name = newItemNames[sovId]?.trim();
    if (!name) return;
    await addItem(sovId, name);
    setNewItemNames(prev => ({ ...prev, [sovId]: '' }));
  };

  const handleStartEdit = (sovId: string, item: ContractSOVItem) => {
    setEditingItem({ sovId, itemId: item.id });
    setEditingName(item.item_name);
  };

  const handleSaveEdit = async () => {
    if (editingItem && editingName.trim()) {
      await updateItemName(editingItem.sovId, editingItem.itemId, editingName.trim());
    }
    setEditingItem(null);
    setEditingName('');
  };

  const handleStartPercentEdit = (sovId: string, item: ContractSOVItem) => {
    setEditingPercent({ sovId, itemId: item.id });
    setEditingPercentValue(String(item.percent_of_contract || 0));
  };

  const handleSavePercentEdit = async () => {
    if (editingPercent) {
      const percent = parseFloat(editingPercentValue) || 0;
      await updateItemPercent(editingPercent.sovId, editingPercent.itemId, percent);
    }
    setEditingPercent(null);
    setEditingPercentValue('');
  };

  const handleDragStart = (e: React.DragEvent, sovId: string, item: ContractSOVItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, sovId: string, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex({ sovId, index });
  };

  const handleDrop = async (e: React.DragEvent, sovId: string, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    
    if (!draggedItem) return;
    
    const items = sovItems[sovId] || [];
    const dragIndex = items.findIndex(item => item.id === draggedItem.id);
    if (dragIndex === dropIndex || dragIndex === -1) return;
    
    const newItems = [...items];
    newItems.splice(dragIndex, 1);
    newItems.splice(dropIndex, 0, draggedItem);
    
    await reorderItems(sovId, newItems);
    setDraggedItem(null);
  };

  const getContractForSOV = (sov: ContractSOV): ProjectContract | undefined => {
    return contracts.find(c => c.id === sov.contract_id);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileSpreadsheet className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No Contracts Found</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Add contracts in the Project Setup to create a Schedule of Values.
            Each contract will have its own SOV tied to the contract amount.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!hasSOVs) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileSpreadsheet className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {isFC ? 'No Schedule of Values' : 'Create Schedule of Values'}
          </h3>
          <p className="text-sm text-muted-foreground mb-2 max-w-md">
            {isFC 
              ? 'The Trade Contractor has not created a Schedule of Values for this project yet.'
              : `Create SOVs for your ${contracts.length} contract${contracts.length > 1 ? 's' : ''}. Each contract will get matching line items with percentage allocations.`}
          </p>
          {!isFC && (
            <>
              <div className="text-xs text-muted-foreground mb-6">
                {contracts.map((c, i) => (
                  <div key={c.id}>
                    {i + 1}. {getContractDisplayName(c.from_role, c.to_role, c.from_org_name, c.to_org_name)} — {formatCurrency(c.contract_sum)}
                  </div>
                ))}
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={saving}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create SOVs from Template
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Create Schedule of Values</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will generate SOV line items for each contract based on your project type.
                      Line items will be distributed evenly by percentage and must total 100%.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={createAllSOVs}>Create SOVs</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <p className="text-xs text-muted-foreground my-2">— or —</p>
              <Button variant="outline" onClick={() => setUploadDialogOpen(true)} disabled={saving}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Your SOV
              </Button>
              <UploadSOVDialog
                open={uploadDialogOpen}
                onOpenChange={setUploadDialogOpen}
                contracts={contractsMissingSOVs.length > 0 ? contractsMissingSOVs : contracts}
                projectId={projectId}
                onCreated={refresh}
              />
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // Partition SOVs into main contracts vs work orders
  const contractSovs = sovs.filter(sov => {
    const contract = getContractForSOV(sov);
    return contract?.trade !== 'Work Order' && contract?.trade !== 'Work Order Labor';
  });
  const workOrderSovs = sovs.filter(sov => {
    const contract = getContractForSOV(sov);
    return contract?.trade === 'Work Order' || contract?.trade === 'Work Order Labor';
  });

  // For TC: further partition main contracts by direction
  const gcToTcSovs = isTC ? contractSovs.filter(sov => {
    const contract = getContractForSOV(sov);
    return contract?.from_org_id === currentOrgId; // TC is worker (GC pays TC)
  }) : [];
  const tcToFcSovs = isTC ? contractSovs.filter(sov => {
    const contract = getContractForSOV(sov);
    return contract?.to_org_id === currentOrgId; // TC is payer (TC pays FC)
  }) : [];

  // Helper to calculate billing totals for a set of SOVs
  const calcBillingTotals = (sovList: typeof sovs) => {
    const totals = sovList.reduce((acc, sov) => {
      const items = sovItems[sov.id] || [];
      const scheduled = items.reduce((sum, item) => sum + (item.value_amount || 0), 0);
      const billed = items.reduce((sum, item) => sum + (item.billed_to_date || 0), 0);
      return { scheduled: acc.scheduled + scheduled, billed: acc.billed + billed };
    }, { scheduled: 0, billed: 0 });
    const percent = totals.scheduled > 0 ? (totals.billed / totals.scheduled) * 100 : 0;
    return { ...totals, percent };
  };

  // Calculate main contract billing totals
  const mainContractBillingTotals = calcBillingTotals(contractSovs);
  const mainBilledPercent = mainContractBillingTotals.percent;

  // TC-specific billing totals
  const gcToTcBilling = isTC ? calcBillingTotals(gcToTcSovs) : { scheduled: 0, billed: 0, percent: 0 };
  const tcToFcBilling = isTC ? calcBillingTotals(tcToFcSovs) : { scheduled: 0, billed: 0, percent: 0 };

  const renderSOVCard = (sov: ContractSOV) => {
        const contract = getContractForSOV(sov);
        const items = sovItems[sov.id] || [];
        const totals = getSOVTotals(sov.id);
        const isExpanded = expandedSovs.has(sov.id);
        
        // Determine if this is a work order SOV
        const isWorkOrderSOV = contract?.trade === 'Work Order' || contract?.trade === 'Work Order Labor';
        const sovSourceLabel = isWorkOrderSOV ? 'Work Order' : 'Contract';
        
        // Check if SOV has billing activity (submitted/approved/paid invoices)
        const hasBilling = hasBillingActivity(sov.id);
        
        // SOV is effectively locked if manually locked OR has billing activity
        const isEffectivelyLocked = sov.is_locked || hasBilling;

        return (
          <Card key={sov.id}>
            <Collapsible open={isExpanded} onOpenChange={() => toggleSov(sov.id)}>
              <CardHeader className="pb-3">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{sov.sov_name || 'Unnamed SOV'}</CardTitle>
                          <Badge variant={isWorkOrderSOV ? "outline" : "secondary"} className="text-xs">
                            {sovSourceLabel}
                          </Badge>
                        </div>
                        <CardDescription>
                          {formatCurrency(contract?.contract_sum || 0)} • {items.length} item{items.length !== 1 ? 's' : ''}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {/* Billing Active badge - takes precedence over manual lock */}
                      {hasBilling && (
                        <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          <DollarSign className="h-3 w-3" />
                          Billing Active
                        </Badge>
                      )}
                      
                      {/* Manual lock status badge - only show if not billing active */}
                      {!hasBilling && sov.is_locked && (
                        <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                          <Lock className="h-3 w-3" />
                          Locked
                        </Badge>
                      )}
                      
                      {!totals.isValid && items.length > 0 && !isEffectivelyLocked && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {totals.totalPercent.toFixed(1)}%
                        </Badge>
                      )}
                      {totals.isValid && items.length > 0 && !hasBilling && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          100%
                        </Badge>
                      )}
                      
                      {/* Lock/Unlock button - hidden for FC and when billing is active */}
                      {!isFC && !hasBilling && (
                        <>
                          {sov.is_locked ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-10 w-10"
                                  disabled={saving}
                                >
                                  <Unlock className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Unlock SOV</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will unlock the SOV and allow editing. Are you sure you want to unlock "{sov.sov_name || 'this SOV'}"?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => toggleSOVLock(sov.id, false)}>
                                    Unlock
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : totals.isValid && items.length > 0 ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-10 w-10"
                                  disabled={saving}
                                  title="Lock SOV"
                                >
                                  <Lock className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Lock SOV</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Locking will prevent any further edits to this SOV. You can still create invoices against it.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => toggleSOVLock(sov.id, true)}>
                                    Lock SOV
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : null}
                        </>
                      )}
                      
                      {/* Billing active indicator - tooltip explaining why locked */}
                      {hasBilling && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">
                                <Lock className="h-4 w-4 text-green-600" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>SOV is locked because invoices have been submitted</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      
                      {/* Delete SOV button - only if no billed items, not locked, and no billing activity */}
                      {!isFC && (
                        totals.totalBilled === 0 && !isEffectivelyLocked ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-10 w-10"
                            disabled={saving}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete SOV</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{sov.sov_name || 'this SOV'}" and all {items.length} line items? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteSOV(sov.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete SOV
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-10 w-10 cursor-not-allowed opacity-50"
                            disabled
                            title={hasBilling ? "SOV has billing activity" : sov.is_locked ? "SOV is locked" : "Cannot delete - SOV has billing history"}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>
              </CardHeader>

              <CollapsibleContent>
                <CardContent className="pt-0">
                  {/* Billing Active notice */}
                  {hasBilling && (
                    <Alert className="mb-4 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800 dark:text-green-200">
                        This SOV has active billing. Editing is disabled because invoices have been submitted.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {/* Manual Locked notice - only show if not billing active */}
                  {!hasBilling && sov.is_locked && (
                    <Alert className="mb-4 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                      <Lock className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800 dark:text-amber-200">
                        This SOV is locked. Unlock to make changes.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Percent validation warning */}
                  {!totals.isValid && items.length > 0 && !isEffectivelyLocked && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Percentages total {totals.totalPercent.toFixed(2)}%.
                        {totals.remaining > 0
                          ? ` Add ${totals.remaining.toFixed(2)}% to reach 100%.`
                          : ` Remove ${Math.abs(totals.remaining).toFixed(2)}% to reach 100%.`}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Add new item - hidden when effectively locked or FC */}
                  {!isEffectivelyLocked && !isFC && (
                    <div className="flex gap-2 mb-4">
                      <Input
                        placeholder="Add new line item..."
                        value={newItemNames[sov.id] || ''}
                        onChange={(e) => setNewItemNames(prev => ({ ...prev, [sov.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddItem(sov.id);
                        }}
                        disabled={saving}
                      />
                      <Button 
                        onClick={() => handleAddItem(sov.id)} 
                        disabled={saving || !newItemNames[sov.id]?.trim()}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* Items list */}
                  <div className="space-y-2">
                    {items.map((item, index) => {
                      const isEditing = editingItem?.sovId === sov.id && editingItem?.itemId === item.id;
                      const isEditingPercent = editingPercent?.sovId === sov.id && editingPercent?.itemId === item.id;
                      const isDragging = draggedItem?.id === item.id;
                      const isDragOver = dragOverIndex?.sovId === sov.id && dragOverIndex?.index === index;

                      // Use effective lock (manual lock OR billing activity)
                      const isLocked = isEffectivelyLocked;

                      return (
                        <div
                          key={item.id}
                          draggable={!isEditing && !isEditingPercent && !isLocked}
                          onDragStart={(e) => !isLocked && handleDragStart(e, sov.id, item)}
                          onDragOver={(e) => !isLocked && handleDragOver(e, sov.id, index)}
                          onDragLeave={() => setDragOverIndex(null)}
                          onDrop={(e) => !isLocked && handleDrop(e, sov.id, index)}
                          onDragEnd={() => { setDraggedItem(null); setDragOverIndex(null); }}
                          className={`
                            group rounded-lg border bg-card overflow-hidden
                            ${isDragging ? 'opacity-50' : ''}
                            ${isDragOver ? 'border-primary border-2' : 'border-border'}
                            transition-colors
                          `}
                        >
                          <div className={`
                            flex items-center gap-2 p-4
                            ${!isEditing && !isEditingPercent ? 'cursor-move hover:bg-muted/50' : ''}
                          `}>
                            <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            
                            <span className="text-sm text-muted-foreground w-8 flex-shrink-0">
                              {index + 1}.
                            </span>

                            {isEditing ? (
                              <div className="flex-1 flex items-center gap-2">
                                <Input
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEdit();
                                    if (e.key === 'Escape') setEditingItem(null);
                                  }}
                                  autoFocus
                                  className="h-8"
                                />
                                <Button size="icon" variant="ghost" className="h-10 w-10" onClick={handleSaveEdit}>
                                  <Check className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-10 w-10" onClick={() => setEditingItem(null)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm font-medium truncate block">{item.item_name}</span>
                                </div>

                                {item.source === 'user' && (
                                  <Badge variant="outline" className="text-xs flex-shrink-0">Custom</Badge>
                                )}

                                {/* Percent */}
                                {isEditingPercent ? (
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      max="100"
                                      value={editingPercentValue}
                                      onChange={(e) => setEditingPercentValue(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSavePercentEdit();
                                        if (e.key === 'Escape') setEditingPercent(null);
                                      }}
                                      autoFocus
                                      className="h-8 w-20"
                                    />
                                    <span className="text-sm">%</span>
                                    <Button size="icon" variant="ghost" className="h-10 w-10" onClick={handleSavePercentEdit}>
                                      <Check className="h-4 w-4 text-green-600" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-10 w-10" onClick={() => setEditingPercent(null)}>
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-sm flex-shrink-0">
                                    <span className="text-muted-foreground w-20 text-right">
                                      {item.percent_of_contract?.toFixed(2)}%
                                    </span>
                                    <span className="font-medium w-28 text-right">
                                      {formatCurrency(item.value_amount || 0)}
                                    </span>
                                  </div>
                                )}

                                {/* Edit buttons - hidden when locked or FC */}
                                {!isLocked && !isFC && (
                                  <>
                                    <Button 
                                      size="icon" 
                                      variant="ghost" 
                                      className="h-10 w-10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" 
                                      onClick={() => handleStartPercentEdit(sov.id, item)}
                                      title="Edit percentage"
                                    >
                                      <Pencil className="h-3 w-3 text-muted-foreground" />
                                    </Button>
                                    <Button 
                                      size="icon" 
                                      variant="ghost" 
                                      className="h-10 w-10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" 
                                      onClick={() => handleStartEdit(sov.id, item)}
                                      title="Edit name"
                                    >
                                      <Pencil className="h-4 w-4 text-muted-foreground" />
                                    </Button>

                                    {/* Delete button - only for unused items (no billing) */}
                                    {(item.billed_to_date || 0) === 0 ? (
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button size="icon" variant="ghost" className="h-10 w-10">
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Delete Line Item</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Are you sure you want to delete "{item.item_name}"? This action cannot be undone.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => deleteItem(sov.id, item.id)}
                                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                              Delete
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    ) : (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-10 w-10 cursor-not-allowed opacity-50"
                                        disabled
                                        title="Cannot delete - item has billing history"
                                      >
                                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                                      </Button>
                                    )}
                                  </>
                                )}
                              </>
                            )}
                          </div>

                          {/* Progress bar */}
                          {(item.value_amount || 0) > 0 && !isEditing && (
                            <div className="px-3 pb-3">
                              <SOVProgressBar
                                scheduledValue={item.value_amount}
                                billedToDate={item.billed_to_date || 0}
                                size="sm"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {items.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      No line items yet. Add your first item above.
                    </p>
                  )}

                  {/* Summary footer */}
                  {items.length > 0 && (
                    <div className="mt-4 pt-4 border-t flex justify-between items-center text-sm">
                      <div className="text-muted-foreground">
                        Total: {totals.totalPercent.toFixed(2)}% = {formatCurrency(totals.totalValue)}
                      </div>
                      {totals.totalBilled > 0 && (
                        <div className="text-muted-foreground">
                          Billed: {formatCurrency(totals.totalBilled)}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Schedule of Values</h2>
        <Badge variant="outline">{sovs.length} Contract{sovs.length > 1 ? 's' : ''}</Badge>
      </div>

      {/* TC-specific layout: GC→TC on top, TC→FC below */}
      {isTC ? (
        <>
          {/* GC → TC Contracts (revenue) */}
          {gcToTcSovs.length > 0 && (
            <>
              <h3 className="text-base font-medium text-muted-foreground">GC → TC Contracts</h3>
              {gcToTcBilling.scheduled > 0 && (
                <div className="rounded-lg border bg-muted/30 p-3 flex flex-wrap items-center gap-4 text-sm">
                  <span className="font-medium">Billing:</span>
                  <span>{formatCurrency(gcToTcBilling.billed)} of {formatCurrency(gcToTcBilling.scheduled)}</span>
                  <SOVProgressBar
                    scheduledValue={gcToTcBilling.scheduled}
                    billedToDate={gcToTcBilling.billed}
                    size="sm"
                  />
                  <span className="text-muted-foreground">{gcToTcBilling.percent.toFixed(1)}% complete</span>
                </div>
              )}
              {gcToTcSovs.map(sov => renderSOVCard(sov))}
            </>
          )}

          {/* TC → FC Contracts (costs) */}
          {tcToFcSovs.length > 0 && (
            <>
              <div className="border-t pt-4 mt-2">
                <h3 className="text-base font-medium text-muted-foreground">TC → FC Contracts</h3>
              </div>
              {tcToFcBilling.scheduled > 0 && (
                <div className="rounded-lg border bg-muted/30 p-3 flex flex-wrap items-center gap-4 text-sm">
                  <span className="font-medium">Billing:</span>
                  <span>{formatCurrency(tcToFcBilling.billed)} of {formatCurrency(tcToFcBilling.scheduled)}</span>
                  <SOVProgressBar
                    scheduledValue={tcToFcBilling.scheduled}
                    billedToDate={tcToFcBilling.billed}
                    size="sm"
                  />
                  <span className="text-muted-foreground">{tcToFcBilling.percent.toFixed(1)}% complete</span>
                </div>
              )}
              {tcToFcSovs.map(sov => renderSOVCard(sov))}
            </>
          )}
        </>
      ) : (
        <>
          {/* Non-TC: original layout */}
          {/* Main Contract Billing Summary */}
          {contractSovs.length > 0 && mainContractBillingTotals.scheduled > 0 && (
            <div className="rounded-lg border bg-muted/30 p-3 flex flex-wrap items-center gap-4 text-sm">
              <span className="font-medium">Main Contract Billing:</span>
              <span>{formatCurrency(mainContractBillingTotals.billed)} of {formatCurrency(mainContractBillingTotals.scheduled)}</span>
              <SOVProgressBar
                scheduledValue={mainContractBillingTotals.scheduled}
                billedToDate={mainContractBillingTotals.billed}
                size="sm"
              />
              <span className="text-muted-foreground">{mainBilledPercent.toFixed(1)}% complete</span>
            </div>
          )}

          {/* Main Contracts Section */}
          {contractSovs.length > 0 && (
            <>
              <h3 className="text-base font-medium text-muted-foreground">Main Contracts</h3>
              {contractSovs.map(sov => renderSOVCard(sov))}
            </>
          )}
        </>
      )}

      {/* Work Orders Section */}
      {workOrderSovs.length > 0 && (
        <>
          <div className="border-t pt-4 mt-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-medium text-muted-foreground">Work Orders</h3>
              {mainContractBillingTotals.scheduled > 0 && (
                <span className="text-xs text-muted-foreground">
                  Main Contract Billed: {formatCurrency(mainContractBillingTotals.billed)} of {formatCurrency(mainContractBillingTotals.scheduled)} ({mainBilledPercent.toFixed(1)}%)
                </span>
              )}
            </div>
          </div>
          {workOrderSovs.map(sov => renderSOVCard(sov))}
        </>
      )}

      {/* Contracts Missing SOV Section */}
      {contractsMissingSOVs.length > 0 && !isFC && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              Contracts Missing SOV
            </CardTitle>
            <CardDescription>
              The following contracts need a Schedule of Values before you can bill against them.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {contractsMissingSOVs.map(contract => (
              <div key={contract.id} className="flex items-center justify-between p-3 rounded-lg bg-background border">
                <div>
                  <span className="font-medium">
                    {getContractDisplayName(contract.from_role, contract.to_role, contract.from_org_name, contract.to_org_name)}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    {formatCurrency(contract.contract_sum)}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm"
                    onClick={() => createSOVForContract(contract.id)}
                    disabled={saving}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Create SOV
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setUploadDialogOpen(true)}
                  >
                    <Upload className="mr-1 h-4 w-4" />
                    Upload SOV
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <UploadSOVDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        contracts={contractsMissingSOVs.length > 0 ? contractsMissingSOVs : contracts}
        projectId={projectId}
        onCreated={refresh}
      />
    </div>
  );
}
