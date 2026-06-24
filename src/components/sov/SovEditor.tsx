import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash2,
  AlertTriangle,
  Sparkles,
  PenLine,
  ChevronUp,
  ChevronDown,
  Bug
} from 'lucide-react';
import { GeneratedSovItem, SovCategory, getCategoryLabel, getCategoryColor } from '@/lib/sovTemplates';
import { computeSovPercents, formatPercent } from '@/lib/sovPercentages';

interface SovEditorProps {
  items: GeneratedSovItem[];
  onChange: (items: GeneratedSovItem[]) => void;
  contractValue?: number;
  showWarnings?: boolean;
  disabled?: boolean;
}

const CATEGORY_OPTIONS: SovCategory[] = ['structural', 'exterior', 'correction', 'milestone'];

export default function SovEditor({ 
  items, 
  onChange, 
  contractValue = 0,
  showWarnings = false,
  disabled = false 
}: SovEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  // Single source of truth: percents derived from raw numeric amounts (not rounded strings)
  const activeItems = useMemo(() => items.filter(i => i.is_active !== false), [items]);
  const percentModel = useMemo(() => {
    const inputs = items.map((i) => {
      const amountRaw = contractValue > 0 ? (contractValue * (Number(i.percentage) || 0)) / 100 : 0;
      const isActive = i.is_active !== false;
      // "Original" excludes CO items (base contract). "Allocated" includes everything active.
      return {
        name: i.name,
        is_active: isActive,
        is_from_change_order: i.is_from_change_order === true,
        original_amount: isActive && !i.is_from_change_order ? amountRaw : 0,
        allocated_amount: isActive ? amountRaw : 0,
      };
    });

    return computeSovPercents(inputs, {
      debugLabel: 'SovEditor',
    });
  }, [items, contractValue]);

  // Sum of original contract items' percentages (excludes CO items)
  const originalInputPercentSum = useMemo(() => {
    return items
      .filter(i => i.is_active !== false && !i.is_from_change_order)
      .reduce((sum, item) => sum + (Number(item.percentage) || 0), 0);
  }, [items]);

  // Items contributing to mismatch (percentage != expected share)
  const mismatchItems = useMemo(() => {
    if (Math.abs(originalInputPercentSum - 100) <= 0.5) return [];
    return items
      .filter(i => i.is_active !== false && !i.is_from_change_order)
      .map((item, idx) => ({
        name: item.name,
        percentage: Number(item.percentage) || 0,
        index: idx,
      }))
      .filter(item => item.percentage > 0);
  }, [items, originalInputPercentSum]);

  // Use tolerance of 0.5% to account for floating-point rounding across many items
  const isOriginalInputValid = Math.abs(originalInputPercentSum - 100) <= 0.5;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleNameChange = (index: number, name: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], name };
    onChange(updated);
  };

  const handlePercentageChange = (index: number, percentage: number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], percentage: Math.max(0, Math.min(100, percentage)) };
    onChange(updated);
  };

  const handleCategoryChange = (index: number, category: SovCategory) => {
    const updated = [...items];
    updated[index] = { ...updated[index], category };
    onChange(updated);
  };

  const handleToggleActive = (index: number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], is_active: !updated[index].is_active };
    onChange(updated);
  };

  const handleDelete = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    // Re-calculate sort orders
    updated.forEach((item, i) => {
      item.sort_order = i;
    });
    onChange(updated);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...items];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    updated.forEach((item, i) => {
      item.sort_order = i;
    });
    onChange(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    const updated = [...items];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    updated.forEach((item, i) => {
      item.sort_order = i;
    });
    onChange(updated);
  };

  const handleAddItem = () => {
    const newItem: GeneratedSovItem = {
      name: 'New Item',
      percentage: 0,
      floor: null,
      floorLabel: null,
      category: 'structural',
      source: 'custom',
      status: 'not_started',
      is_active: true,
      sort_order: items.length,
    };
    onChange([...items, newItem]);
    setEditingIndex(items.length);
  };

  // Calculate change order dollar value (raw)
  const changeOrderDollarValue = contractValue > 0
    ? items
        .filter(i => i.is_active && i.is_from_change_order)
        .reduce((sum, item) => sum + (contractValue * (Number(item.percentage) || 0) / 100), 0)
    : 0;

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className={!isOriginalInputValid ? 'border-destructive' : ''}>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Original Contract % (sum)</p>
              <p className={`text-xl font-bold ${isOriginalInputValid ? 'text-foreground' : 'text-destructive'}`}>
                {originalInputPercentSum.toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Allocated % (computed)</p>
              <p className="text-xl font-bold text-foreground">
                {formatPercent(percentModel.sum_allocated_percent, 2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Contract Value</p>
              <p className="text-xl font-bold text-foreground">
                {contractValue > 0 ? formatCurrency(contractValue) : '—'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Line Items</p>
              <p className="text-xl font-bold text-foreground">{activeItems.length}</p>
            </div>
          </div>

          {percentModel.zero_total_warning && (
            <div className="flex items-center gap-2 mt-3 p-2 bg-warning/10 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
              <p className="text-sm text-warning">Total is zero</p>
            </div>
          )}

          {!isOriginalInputValid && (
            <div className="flex items-center gap-2 mt-3 p-2 bg-destructive/10 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">
                Percent mismatch: Original Contract line items must total 100.00% (currently {originalInputPercentSum.toFixed(2)}%).
              </p>
            </div>
          )}

          {percentModel.percent_mismatch_warning && (
            <div className="flex items-center gap-2 mt-3 p-2 bg-destructive/10 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">Percent mismatch (computed). Check amounts/active items.</p>
            </div>
          )}

          {items.some(i => i.is_active && i.is_from_change_order) && (
            <div className="mt-4 p-3 rounded-lg bg-muted/30 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Change Orders (included in Allocated total)</span>
              <span className="text-sm font-medium text-accent">+{formatCurrency(changeOrderDollarValue)}</span>
            </div>
          )}

          {showWarnings && items.some(i => i.source === 'custom') && (
            <div className="flex items-center gap-2 mt-3 p-2 bg-accent/10 rounded-lg">
              <PenLine className="h-4 w-4 text-accent flex-shrink-0" />
              <p className="text-sm text-muted-foreground">Custom items will be preserved if you regenerate the SOV</p>
            </div>
          )}

          {/* Debug Panel */}
          <Collapsible open={showDebug} onOpenChange={setShowDebug} className="mt-4">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground">
                <span className="flex items-center gap-2">
                  <Bug className="h-4 w-4" />
                  Debug Info
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showDebug ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="p-3 bg-muted/50 rounded-lg text-xs font-mono space-y-2 border border-border">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground">Original % (input sum):</span>
                    <span className={`ml-2 font-semibold ${isOriginalInputValid ? 'text-green-600' : 'text-destructive'}`}>
                      {originalInputPercentSum.toFixed(4)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Allocated % (computed):</span>
                    <span className="ml-2 font-semibold">
                      {(percentModel.sum_allocated_percent * 100).toFixed(4)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total items:</span>
                    <span className="ml-2 font-semibold">{items.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Active items:</span>
                    <span className="ml-2 font-semibold">{activeItems.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">CO items:</span>
                    <span className="ml-2 font-semibold">{items.filter(i => i.is_from_change_order).length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Contract value:</span>
                    <span className="ml-2 font-semibold">${contractValue.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total original $:</span>
                    <span className="ml-2 font-semibold">${percentModel.total_original.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total allocated $:</span>
                    <span className="ml-2 font-semibold">${percentModel.total_allocated.toLocaleString()}</span>
                  </div>
                </div>
                
                {percentModel.zero_total_warning && (
                  <div className="text-amber-600 mt-2">⚠️ Zero total warning active</div>
                )}
                {percentModel.percent_mismatch_warning && (
                  <div className="text-destructive mt-2">⚠️ Percent mismatch warning active</div>
                )}
                
                {mismatchItems.length > 0 && !isOriginalInputValid && (
                  <div className="mt-3 border-t border-border pt-2">
                    <p className="text-muted-foreground mb-1">Items contributing to total ({mismatchItems.length}):</p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {mismatchItems.slice(0, 10).map((item, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className="truncate max-w-[200px]">{item.name}</span>
                          <span>{item.percentage.toFixed(2)}%</span>
                        </div>
                      ))}
                      {mismatchItems.length > 10 && (
                        <div className="text-muted-foreground">...and {mismatchItems.length - 10} more</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* SOV Items List */}
      <div className="space-y-2">
        {items.map((item, index) => (
          <Card 
            key={index} 
            className={`transition-all ${!item.is_active ? 'opacity-50' : ''} ${disabled ? 'pointer-events-none' : ''}`}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                {/* Reorder Controls */}
                <div className="flex flex-col gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0 || disabled}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === items.length - 1 || disabled}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>

                {/* Item Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {editingIndex === index ? (
                      <Input
                        value={item.name}
                        onChange={(e) => handleNameChange(index, e.target.value)}
                        onBlur={() => setEditingIndex(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingIndex(null)}
                        autoFocus
                        className="h-8 text-sm flex-1 min-w-[150px]"
                        disabled={disabled}
                      />
                    ) : (
                      <button
                        onClick={() => !disabled && setEditingIndex(index)}
                        className="text-left font-medium text-sm text-foreground hover:text-accent transition-colors truncate max-w-[200px]"
                      >
                        {item.name}
                      </button>
                    )}
                    <Badge 
                      variant="outline"
                      className={`flex-shrink-0 text-xs border ${getCategoryColor(item.category)}`}
                    >
                      {getCategoryLabel(item.category)}
                    </Badge>
                    <Badge 
                      variant={item.source === 'auto' ? 'secondary' : 'outline'} 
                      className="flex-shrink-0 text-xs"
                    >
                      {item.source === 'auto' ? (
                        <><Sparkles className="h-3 w-3 mr-1" /> Auto</>
                      ) : (
                        <><PenLine className="h-3 w-3 mr-1" /> Custom</>
                      )}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={item.percentage === 0 ? '' : item.percentage}
                        onChange={(e) => handlePercentageChange(index, parseFloat(e.target.value) || 0)}
                        className="h-7 w-16 text-sm text-center"
                        step="0.01"
                        min="0"
                        max="100"
                        disabled={disabled}
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                    <div className={`px-2 py-0.5 rounded text-sm font-medium ${contractValue > 0 ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'}`}>
                      {contractValue > 0 ? formatCurrency((contractValue * item.percentage) / 100) : '$—'}
                    </div>
                    {item.source === 'custom' && !disabled && (
                      <Select
                        value={item.category}
                        onValueChange={(val) => handleCategoryChange(index, val as SovCategory)}
                      >
                        <SelectTrigger className="h-7 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map(cat => (
                            <SelectItem key={cat} value={cat} className="text-xs">
                              {getCategoryLabel(cat)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                {/* Actions - only show toggle/delete when not fully disabled (active SOV) */}
                {!disabled && (
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={item.is_active}
                      onCheckedChange={() => handleToggleActive(index)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Item Button */}
      <Button
        variant="outline"
        className="w-full"
        onClick={handleAddItem}
        disabled={disabled}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Line Item
      </Button>
    </div>
  );
}
