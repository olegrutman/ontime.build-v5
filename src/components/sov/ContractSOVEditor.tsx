import { useState } from 'react';
import { UploadSOVDialog } from './UploadSOVDialog';
import { Plus, Trash2, GripVertical, FileSpreadsheet, Pencil, Check, X, AlertCircle, ChevronDown, ChevronRight, Lock, Unlock, DollarSign, Upload, Sparkles, RefreshCw, Loader2 } from 'lucide-react';
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
import { DT } from '@/lib/design-tokens';

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
    generating,
    hasSOVs,
    contractsMissingSOVs,
    createAllSOVs,
    createSOVForContract,
    generateSOV,
    generateAllSOVs,
    updateItemPercent,
    updateItemAmount,
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
  const [expandedFloors, setExpandedFloors] = useState<Set<string>>(new Set());
  const [newItemNames, setNewItemNames] = useState<Record<string, string>>({});
  const [editingItem, setEditingItem] = useState<{ sovId: string; itemId: string } | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingPercent, setEditingPercent] = useState<{ sovId: string; itemId: string } | null>(null);
  const [editingPercentValue, setEditingPercentValue] = useState('');
  const [editingAmount, setEditingAmount] = useState<{ sovId: string; itemId: string } | null>(null);
  const [editingAmountValue, setEditingAmountValue] = useState('');
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
      if (next.has(sovId)) next.delete(sovId);
      else next.add(sovId);
      return next;
    });
  };

  const toggleFloor = (floorKey: string) => {
    setExpandedFloors(prev => {
      const next = new Set(prev);
      if (next.has(floorKey)) next.delete(floorKey);
      else next.add(floorKey);
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

  const handleStartAmountEdit = (sovId: string, item: ContractSOVItem) => {
    setEditingAmount({ sovId, itemId: item.id });
    setEditingAmountValue(String(item.value_amount || 0));
  };

  const handleSaveAmountEdit = async () => {
    if (editingAmount) {
      const amount = parseFloat(editingAmountValue) || 0;
      await updateItemAmount(editingAmount.sovId, editingAmount.itemId, amount);
    }
    setEditingAmount(null);
    setEditingAmountValue('');
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
              <Button onClick={generateAllSOVs} disabled={saving || generating}>
                {generating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {generating ? 'Generating...' : 'Generate SOV (AI-powered)'}
              </Button>
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


  const renderSOVItem = (sov: ContractSOV, item: ContractSOVItem, index: number, isLocked: boolean) => {
    const isEditing = editingItem?.sovId === sov.id && editingItem?.itemId === item.id;
    const isEditingPct = editingPercent?.sovId === sov.id && editingPercent?.itemId === item.id;
    const isEditingAmt = editingAmount?.sovId === sov.id && editingAmount?.itemId === item.id;
    const isDragging = draggedItem?.id === item.id;
    const isDragOver = dragOverIndex?.sovId === sov.id && dragOverIndex?.index === index;

    return (
      <div
        key={item.id}
        draggable={!isEditing && !isEditingPct && !isLocked}
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
          flex items-center gap-2 p-3
          ${!isEditing && !isEditingPct ? 'cursor-move hover:bg-muted/50' : ''}
        `}>
          <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-muted-foreground w-8 flex-shrink-0">{index + 1}.</span>

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
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveEdit}>
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingItem(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="flex-1 min-w-0">
                <span
                  className={`text-sm font-medium truncate block ${!isLocked && !isFC ? 'cursor-pointer hover:text-primary' : ''}`}
                  onClick={() => !isLocked && !isFC && handleStartEdit(sov.id, item)}
                  title={!isLocked && !isFC ? 'Click to edit name' : undefined}
                >{item.item_name}</span>
              </div>

              {item.source === 'user' && (
                <Badge variant="outline" className="text-xs flex-shrink-0">Custom</Badge>
              )}

              {isEditingPct ? (
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
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSavePercentEdit}>
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingPercent(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : isEditingAmt ? (
                <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-muted-foreground w-16 text-right tabular-nums text-sm" style={DT.mono}>
                    {item.percent_of_contract?.toFixed(2)}%
                  </span>
                  <span className="text-sm">$</span>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={editingAmountValue}
                    onChange={(e) => setEditingAmountValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveAmountEdit();
                      if (e.key === 'Escape') setEditingAmount(null);
                    }}
                    autoFocus
                    className="h-8 w-28"
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveAmountEdit}>
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingAmount(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm flex-shrink-0">
                  <span
                    className={`text-muted-foreground w-16 text-right tabular-nums ${!isLocked && !isFC ? 'cursor-pointer hover:text-primary' : ''}`}
                    style={DT.mono}
                    onClick={() => !isLocked && !isFC && handleStartPercentEdit(sov.id, item)}
                    title={!isLocked && !isFC ? 'Click to edit percentage' : undefined}
                  >
                    {item.percent_of_contract?.toFixed(2)}%
                  </span>
                  <span
                    className={`font-medium w-24 text-right tabular-nums ${!isLocked && !isFC ? 'cursor-pointer hover:text-primary' : ''}`}
                    style={DT.mono}
                    onClick={() => !isLocked && !isFC && handleStartAmountEdit(sov.id, item)}
                    title={!isLocked && !isFC ? 'Click to edit amount' : undefined}
                  >
                    {formatCurrency(item.value_amount || 0)}
                  </span>
                </div>
              )}

              {!isLocked && !isFC && (
                <>
                  {(item.total_billed_amount || 0) === 0 ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Line Item</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{item.item_name}"?
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
                    <Button size="icon" variant="ghost" className="h-8 w-8 cursor-not-allowed opacity-50" disabled title="Has billing history">
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {(item.value_amount || 0) > 0 && !isEditing && (
          <div className="px-3 pb-2">
            <SOVProgressBar
              scheduledValue={item.value_amount}
              billedToDate={item.total_billed_amount || 0}
              size="sm"
            />
          </div>
        )}
      </div>
    );
  };

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
          <div key={sov.id} className="border border-border rounded-lg bg-card overflow-hidden" data-sasha-card="Contract SOV">
            <Collapsible open={isExpanded} onOpenChange={() => toggleSov(sov.id)}>
              <div className="px-5 py-3.5 pb-3">
                <CollapsibleTrigger asChild>
                  <div className="flex items-start sm:items-center justify-between cursor-pointer gap-2 flex-wrap">
                    <div className="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5 sm:mt-0" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5 sm:mt-0" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold line-clamp-2" style={DT.heading}>{sov.sov_name || 'Unnamed SOV'}</span>
                          <Badge variant={isWorkOrderSOV ? "outline" : "secondary"} className="text-xs shrink-0">
                            {sovSourceLabel}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground tabular-nums" style={DT.mono}>
                          {formatCurrency(contract?.contract_sum || 0)} • {items.length} item{items.length !== 1 ? 's' : ''}
                        </CardDescription>
        {totals.totalValue > 0 && (
                          <div className="mt-2 w-48">
                            <SOVProgressBar
                              scheduledValue={totals.totalValue}
                              billedToDate={totals.totalBilled}
                              showLabels={false}
                              size="sm"
                            />
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {Math.round((totals.totalBilled / totals.totalValue) * 100)}% billed • {formatCurrency(totals.totalBilled)} / {formatCurrency(totals.totalValue)}
                            </span>
                          </div>
                        )}
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
                      
                      {/* Regenerate button - only when unlocked, not FC, no billing */}
                      {!isFC && !hasBilling && !sov.is_locked && contract && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-10 w-10"
                                disabled={saving || generating}
                                onClick={() => generateSOV(contract.id)}
                              >
                                {generating ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Regenerate with AI</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
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
              </div>

              <CollapsibleContent>
                <div className="px-5 pb-5 pt-0">
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

                  {/* Items list — grouped by floor_label */}
                  {(() => {
                    // Group items by floor_label
                    const floorGroups: { label: string; items: typeof items }[] = [];
                    const groupMap = new Map<string, typeof items>();
                    
                    for (const item of items) {
                      const label = item.floor_label || 'Uncategorized';
                      if (!groupMap.has(label)) {
                        groupMap.set(label, []);
                        floorGroups.push({ label, items: groupMap.get(label)! });
                      }
                      groupMap.get(label)!.push(item);
                    }

                    // If no floor_label grouping exists (legacy), render flat
                    const hasFloorLabels = items.some(i => i.floor_label);

                    if (!hasFloorLabels) {
                      return (
                        <div className="space-y-2">
                          {items.map((item, index) => renderSOVItem(sov, item, index, isEffectivelyLocked))}
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {floorGroups.map(({ label, items: floorItems }) => {
                          const floorPercent = floorItems.reduce((s, i) => s + (i.percent_of_contract || 0), 0);
                          const floorValue = floorItems.reduce((s, i) => s + (i.value_amount || 0), 0);
                          const floorBilled = floorItems.reduce((s, i) => s + (i.total_billed_amount || 0), 0);
                          const floorKey = `${sov.id}-${label}`;
                          const isFloorExpanded = expandedFloors.has(floorKey);

                          return (
                            <Collapsible key={floorKey} open={isFloorExpanded} onOpenChange={() => toggleFloor(floorKey)}>
                              <CollapsibleTrigger asChild>
                                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer border">
                                  <div className="flex items-center gap-2">
                                    {isFloorExpanded ? (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <span className="font-semibold text-sm">{label}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {floorItems.length} item{floorItems.length !== 1 ? 's' : ''}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-3 text-sm">
                                    <span className="text-muted-foreground tabular-nums">{floorPercent.toFixed(2)}%</span>
                                    <span className="font-medium tabular-nums">{formatCurrency(floorValue)}</span>
                                    {floorBilled > 0 && floorValue > 0 && (
                                      <div className="w-16">
                                        <SOVProgressBar
                                          scheduledValue={floorValue}
                                          billedToDate={floorBilled}
                                          showLabels={false}
                                          size="sm"
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="space-y-2 mt-2 ml-4 border-l-2 border-muted pl-3">
                                  {floorItems.map((item) => {
                                    const globalIndex = items.indexOf(item);
                                    return renderSOVItem(sov, item, globalIndex, isEffectivelyLocked);
                                  })}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          );
                        })}
                      </div>
                    );
                  })()}

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
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        );
  };

  return (
    <div className="space-y-4">
      {/* TC-specific layout: Upstream (revenue) on top, Downstream (costs) below */}
      {isTC ? (
        <>
          {gcToTcSovs.length > 0 && (
            <>
              <h3 className="text-sm font-bold text-muted-foreground" style={DT.heading}>Upstream Contracts (Revenue)</h3>
              {gcToTcSovs.map(sov => renderSOVCard(sov))}
            </>
          )}

          {tcToFcSovs.length > 0 && (
            <>
              <div className="border-t pt-4 mt-2">
                <h3 className="text-sm font-bold text-muted-foreground" style={DT.heading}>Downstream Contracts (Costs)</h3>
              </div>
              {tcToFcSovs.map(sov => renderSOVCard(sov))}
            </>
          )}
        </>
      ) : (
        <>
          {contractSovs.length > 0 && (
            <>
              <h3 className="text-sm font-bold text-muted-foreground" style={DT.heading}>Main Contracts</h3>
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
