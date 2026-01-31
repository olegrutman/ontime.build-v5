import { useState } from 'react';
import { Plus, Trash2, GripVertical, FileSpreadsheet, Pencil, Check, X, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useProjectSOV, ProjectSOVItem } from '@/hooks/useProjectSOV';
import { SOVProgressBar } from './SOVProgressBar';
import { SOVProgressSummary } from './SOVProgressSummary';

interface ProjectSOVEditorProps {
  projectId: string;
}

export function ProjectSOVEditor({ projectId }: ProjectSOVEditorProps) {
  const {
    projectSOV,
    sovItems,
    loading,
    saving,
    hasSOV,
    createProjectSOV,
    addItem,
    updateItem,
    deleteItem,
    reorderItems
  } = useProjectSOV(projectId);

  const [newItemName, setNewItemName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingValueId, setEditingValueId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [draggedItem, setDraggedItem] = useState<ProjectSOVItem | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleAddItem = async () => {
    if (!newItemName.trim()) return;
    await addItem(newItemName.trim());
    setNewItemName('');
  };

  const handleStartEdit = (item: ProjectSOVItem) => {
    setEditingId(item.id);
    setEditingName(item.item_name);
  };

  const handleSaveEdit = async () => {
    if (editingId && editingName.trim()) {
      await updateItem(editingId, { item_name: editingName.trim() });
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleStartValueEdit = (item: ProjectSOVItem) => {
    setEditingValueId(item.id);
    setEditingValue(String(item.scheduled_value || ''));
  };

  const handleSaveValueEdit = async () => {
    if (editingValueId) {
      const value = parseFloat(editingValue) || 0;
      await updateItem(editingValueId, { scheduled_value: value });
    }
    setEditingValueId(null);
    setEditingValue('');
  };

  const handleCancelValueEdit = () => {
    setEditingValueId(null);
    setEditingValue('');
  };

  const handleDragStart = (e: React.DragEvent, item: ProjectSOVItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (!draggedItem) return;

    const dragIndex = sovItems.findIndex(item => item.id === draggedItem.id);
    if (dragIndex === dropIndex) return;

    const newItems = [...sovItems];
    newItems.splice(dragIndex, 1);
    newItems.splice(dropIndex, 0, draggedItem);

    await reorderItems(newItems);
    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasSOV) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileSpreadsheet className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No Schedule of Values</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md">
            Create a Schedule of Values from a template based on your project type and scope.
            The template will be customized based on your project details.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={saving}>
                <Plus className="mr-2 h-4 w-4" />
                Create SOV from Template
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Create Schedule of Values</AlertDialogTitle>
                <AlertDialogDescription>
                  This will generate SOV line items based on your project type and scope details.
                  The template will be automatically selected and customized.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={createProjectSOV}>
                  Create SOV
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Summary */}
      <SOVProgressSummary items={sovItems} />

      {/* SOV Items Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Schedule of Values
              </CardTitle>
              {projectSOV?.created_from_template_key && (
                <CardDescription className="mt-1">
                  Generated from {projectSOV.created_from_template_key.replace(/_/g, ' ')} template
                </CardDescription>
              )}
            </div>
            <Badge variant="secondary">{sovItems.length} items</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Add new item */}
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Add new line item..."
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddItem();
              }}
              disabled={saving}
            />
            <Button onClick={handleAddItem} disabled={saving || !newItemName.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* SOV items list */}
          <div className="space-y-2">
            {sovItems.map((item, index) => {
              const hasValue = (item.scheduled_value || 0) > 0;
              const percentage = hasValue 
                ? Math.min(((item.billed_to_date || 0) / item.scheduled_value) * 100, 100)
                : 0;

              return (
                <div
                  key={item.id}
                  draggable={editingId !== item.id && editingValueId !== item.id}
                  onDragStart={(e) => handleDragStart(e, item)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`
                    rounded-lg border bg-card overflow-hidden
                    ${draggedItem?.id === item.id ? 'opacity-50' : ''}
                    ${dragOverIndex === index ? 'border-primary border-2' : 'border-border'}
                    transition-colors
                  `}
                >
                  <div className={`
                    flex items-center gap-2 p-3
                    ${editingId === item.id || editingValueId === item.id ? '' : 'cursor-move hover:bg-muted/50'}
                  `}>
                    <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    
                    <span className="text-sm text-muted-foreground w-8 flex-shrink-0">
                      {index + 1}.
                    </span>

                    {editingId === item.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          autoFocus
                          className="h-8"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={handleSaveEdit}
                          disabled={saving}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={handleCancelEdit}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium truncate block">{item.item_name}</span>
                        </div>
                        
                        {item.source === 'user' && (
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            Custom
                          </Badge>
                        )}

                        {/* Scheduled Value */}
                        {editingValueId === item.id ? (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveValueEdit();
                                if (e.key === 'Escape') handleCancelValueEdit();
                              }}
                              autoFocus
                              className="h-8 w-24"
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={handleSaveValueEdit}
                              disabled={saving}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={handleCancelValueEdit}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartValueEdit(item)}
                            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 min-w-[80px] justify-end"
                          >
                            {hasValue ? (
                              <span className="font-medium">{formatCurrency(item.scheduled_value)}</span>
                            ) : (
                              <span className="text-xs italic">Set value</span>
                            )}
                          </button>
                        )}
                        
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleStartEdit(item)}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        
                        {/* Only show delete for unused items (no billing) */}
                        {(item.billed_to_date || 0) === 0 ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                              >
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
                                  onClick={() => deleteItem(item.id)}
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

                  {/* Progress bar for items with scheduled value */}
                  {hasValue && editingId !== item.id && (
                    <div className="px-3 pb-3">
                      <SOVProgressBar
                        scheduledValue={item.scheduled_value}
                        billedToDate={item.billed_to_date || 0}
                        size="sm"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{percentage.toFixed(0)}% billed</span>
                        <span>{formatCurrency(item.scheduled_value - (item.billed_to_date || 0))} remaining</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {sovItems.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              No line items yet. Add your first item above.
            </p>
          )}

          {/* Regenerate option */}
          {sovItems.length > 0 && (
            <div className="mt-6 pt-4 border-t flex justify-end">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={saving}>
                    Regenerate from Template
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Regenerate SOV</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will replace all current SOV line items with a fresh generation from the template.
                      All custom items and edits will be lost. Are you sure?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={createProjectSOV}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Regenerate
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
