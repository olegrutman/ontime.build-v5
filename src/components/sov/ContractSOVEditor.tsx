import { useState } from 'react';
import { Plus, Trash2, GripVertical, FileSpreadsheet, Pencil, Check, X, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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

interface ContractSOVEditorProps {
  projectId: string;
}

export function ContractSOVEditor({ projectId }: ContractSOVEditorProps) {
  const {
    contracts,
    sovs,
    sovItems,
    loading,
    saving,
    hasSOVs,
    createAllSOVs,
    updateItemPercent,
    updateItemName,
    addItem,
    deleteItem,
    deleteSOV,
    reorderItems,
    getSOVTotals
  } = useContractSOV(projectId);

  const [expandedSovs, setExpandedSovs] = useState<Set<string>>(new Set());
  const [newItemNames, setNewItemNames] = useState<Record<string, string>>({});
  const [editingItem, setEditingItem] = useState<{ sovId: string; itemId: string } | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingPercent, setEditingPercent] = useState<{ sovId: string; itemId: string } | null>(null);
  const [editingPercentValue, setEditingPercentValue] = useState('');
  const [draggedItem, setDraggedItem] = useState<ContractSOVItem | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<{ sovId: string; index: number } | null>(null);

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
          <h3 className="text-lg font-medium mb-2">Create Schedule of Values</h3>
          <p className="text-sm text-muted-foreground mb-2 max-w-md">
            Create SOVs for your {contracts.length} contract{contracts.length > 1 ? 's' : ''}.
            Each contract will get matching line items with percentage allocations.
          </p>
          <div className="text-xs text-muted-foreground mb-6">
            {contracts.map((c, i) => (
              <div key={c.id}>
                {i + 1}. {getContractDisplayName(c.from_role, c.to_role)} — {formatCurrency(c.contract_sum)}
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
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Schedule of Values</h2>
        <Badge variant="outline">{sovs.length} Contract{sovs.length > 1 ? 's' : ''}</Badge>
      </div>

      {sovs.map(sov => {
        const contract = getContractForSOV(sov);
        const items = sovItems[sov.id] || [];
        const totals = getSOVTotals(sov.id);
        const isExpanded = expandedSovs.has(sov.id);

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
                        <CardTitle className="text-base">{sov.sov_name}</CardTitle>
                        <CardDescription>
                          Contract: {formatCurrency(contract?.contract_sum || 0)} • {items.length} items
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {!totals.isValid && items.length > 0 && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {totals.totalPercent.toFixed(1)}%
                        </Badge>
                      )}
                      {totals.isValid && items.length > 0 && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          100%
                        </Badge>
                      )}
                      
                      {/* Delete SOV button - only if no billed items */}
                      {totals.totalBilled === 0 ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              disabled={saving}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete SOV</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{sov.sov_name}" and all {items.length} line items? This action cannot be undone.
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
                          className="h-8 w-8 cursor-not-allowed opacity-50"
                          disabled
                          title="Cannot delete - SOV has billing history"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>
              </CardHeader>

              <CollapsibleContent>
                <CardContent className="pt-0">
                  {/* Percent validation warning */}
                  {!totals.isValid && items.length > 0 && (
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

                  {/* Add new item */}
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

                  {/* Items list */}
                  <div className="space-y-2">
                    {items.map((item, index) => {
                      const isEditing = editingItem?.sovId === sov.id && editingItem?.itemId === item.id;
                      const isEditingPercent = editingPercent?.sovId === sov.id && editingPercent?.itemId === item.id;
                      const isDragging = draggedItem?.id === item.id;
                      const isDragOver = dragOverIndex?.sovId === sov.id && dragOverIndex?.index === index;

                      return (
                        <div
                          key={item.id}
                          draggable={!isEditing && !isEditingPercent}
                          onDragStart={(e) => handleDragStart(e, sov.id, item)}
                          onDragOver={(e) => handleDragOver(e, sov.id, index)}
                          onDragLeave={() => setDragOverIndex(null)}
                          onDrop={(e) => handleDrop(e, sov.id, index)}
                          onDragEnd={() => { setDraggedItem(null); setDragOverIndex(null); }}
                          className={`
                            rounded-lg border bg-card overflow-hidden
                            ${isDragging ? 'opacity-50' : ''}
                            ${isDragOver ? 'border-primary border-2' : 'border-border'}
                            transition-colors
                          `}
                        >
                          <div className={`
                            flex items-center gap-2 p-3
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
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSavePercentEdit}>
                                      <Check className="h-4 w-4 text-green-600" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingPercent(null)}>
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleStartPercentEdit(sov.id, item)}
                                    className="flex items-center gap-2 text-sm hover:text-foreground transition-colors flex-shrink-0"
                                  >
                                    <span className="text-muted-foreground w-16 text-right">
                                      {item.percent_of_contract?.toFixed(2)}%
                                    </span>
                                    <span className="font-medium w-24 text-right">
                                      {formatCurrency(item.value_amount || 0)}
                                    </span>
                                  </button>
                                )}

                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleStartEdit(sov.id, item)}>
                                  <Pencil className="h-4 w-4 text-muted-foreground" />
                                </Button>

                                {/* Only show delete for unused items (no billing) */}
                                {(item.billed_to_date || 0) === 0 ? (
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
                                    className="h-8 w-8 cursor-not-allowed opacity-50"
                                    disabled
                                    title="Cannot delete - item has billing history"
                                  >
                                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                                  </Button>
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
      })}

      {/* Regenerate option */}
      {hasSOVs && (
        <div className="flex justify-end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={saving}>
                Regenerate All SOVs
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Regenerate All SOVs</AlertDialogTitle>
                <AlertDialogDescription>
                  This will replace all SOV line items with a fresh generation from the template.
                  All custom items and percentage edits will be lost.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={createAllSOVs}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Regenerate
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
