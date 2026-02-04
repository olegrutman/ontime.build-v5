import { useState, useEffect } from 'react';
import { Check, AlertCircle, HelpCircle, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LineItem {
  id: string;
  estimate_id: string;
  raw_text_line: string | null;
  description: string;
  quantity: number | null;
  uom: string | null;
  pack_name: string;
  status: 'imported' | 'needs_review' | 'matched' | 'unmatched';
  catalog_item_id: string | null;
  sort_order: number;
  catalog_item?: {
    id: string;
    description: string;
    supplier_sku: string | null;
  } | null;
}

interface CatalogItem {
  id: string;
  description: string;
  supplier_sku: string | null;
  dimension: string | null;
}

interface EstimateReviewTableProps {
  estimateId: string;
  supplierId: string;
  projectId: string;
  items: LineItem[];
  onItemsChange: () => void;
  onFinalize: () => void;
  disabled?: boolean;
}

const STATUS_CONFIG = {
  imported: { label: 'Imported', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', icon: Check },
  needs_review: { label: 'Needs Review', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', icon: AlertCircle },
  matched: { label: 'Matched', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: Check },
  unmatched: { label: 'Unmatched', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300', icon: HelpCircle },
};

const UOM_OPTIONS = ['EA', 'BF', 'LF', 'SF', 'PC', 'BD', 'BAG', 'BOX', 'ROLL', 'GAL', 'LB'];

export function EstimateReviewTable({
  estimateId,
  supplierId,
  projectId,
  items,
  onItemsChange,
  onFinalize,
  disabled = false,
}: EstimateReviewTableProps) {
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [searchingItem, setSearchingItem] = useState<string | null>(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogResults, setCatalogResults] = useState<CatalogItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  // Get unique pack names
  const packNames = [...new Set(items.map(i => i.pack_name))];

  // Search catalog
  useEffect(() => {
    if (!catalogSearch || catalogSearch.length < 2 || !searchingItem) {
      setCatalogResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const { data, error } = await supabase
          .from('catalog_items')
          .select('id, description, supplier_sku, dimension')
          .eq('supplier_id', supplierId)
          .or(`description.ilike.%${catalogSearch}%,supplier_sku.ilike.%${catalogSearch}%`)
          .limit(10);

        if (error) throw error;
        setCatalogResults(data || []);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [catalogSearch, searchingItem, supplierId]);

  const handleUpdateItem = async (itemId: string, updates: Partial<LineItem>) => {
    try {
      const { error } = await supabase
        .from('estimate_line_items')
        .update(updates)
        .eq('id', itemId);

      if (error) throw error;
      onItemsChange();
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update item');
    }
    setEditingCell(null);
  };

  const handleMatchItem = async (itemId: string, catalogItemId: string) => {
    await handleUpdateItem(itemId, { catalog_item_id: catalogItemId, status: 'matched' });
    setSearchingItem(null);
    setCatalogSearch('');
    toast.success('Item matched to catalog');
  };

  const handleFinalize = async () => {
    // Check if all items are matched or explicitly reviewed
    const unmatchedCount = items.filter(i => i.status === 'unmatched' || i.status === 'needs_review').length;
    
    if (unmatchedCount > 0) {
      const confirm = window.confirm(
        `${unmatchedCount} items are not matched to the catalog. Continue anyway? Unmatched items will not be available for restricted ordering.`
      );
      if (!confirm) return;
    }

    setFinalizing(true);
    try {
      // Get matched items
      const matchedItems = items.filter(i => i.catalog_item_id);

      if (matchedItems.length > 0) {
        // Create catalog mappings
        const mappings = matchedItems.map(item => ({
          estimate_id: estimateId,
          project_id: projectId,
          catalog_item_id: item.catalog_item_id,
          line_item_id: item.id,
        }));

        const { error: mappingError } = await supabase
          .from('estimate_catalog_mapping')
          .upsert(mappings, { onConflict: 'estimate_id,catalog_item_id,line_item_id' });

        if (mappingError) throw mappingError;
      }

      toast.success('Estimate finalized successfully');
      onFinalize();
    } catch (error) {
      console.error('Finalize error:', error);
      toast.error('Failed to finalize estimate');
    } finally {
      setFinalizing(false);
    }
  };

  const matchedCount = items.filter(i => i.status === 'matched').length;
  const totalCount = items.length;

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-4 text-sm">
          <span>
            <strong>{matchedCount}</strong> of <strong>{totalCount}</strong> items matched
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">
            {packNames.length} pack{packNames.length !== 1 ? 's' : ''}
          </span>
        </div>
        <Button onClick={handleFinalize} disabled={disabled || finalizing || items.length === 0}>
          {finalizing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Finalizing...
            </>
          ) : (
            'Finalize Estimate'
          )}
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Pack</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-20 text-right">Qty</TableHead>
              <TableHead className="w-20">UOM</TableHead>
              <TableHead className="w-48">Matched Product</TableHead>
              <TableHead className="w-28">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const StatusIcon = STATUS_CONFIG[item.status].icon;
              
              return (
                <TableRow key={item.id}>
                  {/* Pack Name */}
                  <TableCell>
                    <Select
                      value={item.pack_name}
                      onValueChange={(value) => handleUpdateItem(item.id, { pack_name: value })}
                      disabled={disabled}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {packNames.map(pack => (
                          <SelectItem key={pack} value={pack}>{pack}</SelectItem>
                        ))}
                        <SelectItem value="Loose Estimate Items">Loose Estimate Items</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Description */}
                  <TableCell>
                    {editingCell?.id === item.id && editingCell.field === 'description' ? (
                      <Input
                        autoFocus
                        defaultValue={item.description}
                        onBlur={(e) => handleUpdateItem(item.id, { description: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleUpdateItem(item.id, { description: (e.target as HTMLInputElement).value });
                          }
                          if (e.key === 'Escape') setEditingCell(null);
                        }}
                        className="h-8"
                      />
                    ) : (
                      <span
                        className={`cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded ${disabled ? 'cursor-default' : ''}`}
                        onClick={() => !disabled && setEditingCell({ id: item.id, field: 'description' })}
                      >
                        {item.description}
                      </span>
                    )}
                  </TableCell>

                  {/* Quantity */}
                  <TableCell className="text-right">
                    {editingCell?.id === item.id && editingCell.field === 'quantity' ? (
                      <Input
                        autoFocus
                        type="number"
                        defaultValue={item.quantity || ''}
                        onBlur={(e) => handleUpdateItem(item.id, { quantity: parseFloat(e.target.value) || null })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleUpdateItem(item.id, { quantity: parseFloat((e.target as HTMLInputElement).value) || null });
                          }
                          if (e.key === 'Escape') setEditingCell(null);
                        }}
                        className="h-8 w-16"
                      />
                    ) : (
                      <span
                        className={`cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded ${disabled ? 'cursor-default' : ''}`}
                        onClick={() => !disabled && setEditingCell({ id: item.id, field: 'quantity' })}
                      >
                        {item.quantity ?? '—'}
                      </span>
                    )}
                  </TableCell>

                  {/* UOM */}
                  <TableCell>
                    <Select
                      value={item.uom || ''}
                      onValueChange={(value) => handleUpdateItem(item.id, { uom: value })}
                      disabled={disabled}
                    >
                      <SelectTrigger className="h-8 text-xs w-16">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        {UOM_OPTIONS.map(uom => (
                          <SelectItem key={uom} value={uom}>{uom}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Matched Product */}
                  <TableCell>
                    <Popover open={searchingItem === item.id} onOpenChange={(open) => {
                      setSearchingItem(open ? item.id : null);
                      if (!open) setCatalogSearch('');
                    }}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-full justify-start text-xs font-normal"
                          disabled={disabled}
                        >
                          {item.catalog_item ? (
                            <span className="truncate">{item.catalog_item.description}</span>
                          ) : (
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Search className="h-3 w-3" />
                              Match to catalog
                            </span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-2" align="start">
                        <Input
                          placeholder="Search catalog..."
                          value={catalogSearch}
                          onChange={(e) => setCatalogSearch(e.target.value)}
                          className="mb-2"
                        />
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {searchLoading ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                          ) : catalogResults.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-2">
                              {catalogSearch.length < 2 ? 'Type to search...' : 'No results'}
                            </p>
                          ) : (
                            catalogResults.map(result => (
                              <button
                                key={result.id}
                                className="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-sm"
                                onClick={() => handleMatchItem(item.id, result.id)}
                              >
                                <div className="font-medium truncate">{result.description}</div>
                                {result.supplier_sku && (
                                  <div className="text-xs text-muted-foreground font-mono">
                                    {result.supplier_sku}
                                  </div>
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Badge className={`${STATUS_CONFIG[item.status].color} gap-1`}>
                      <StatusIcon className="h-3 w-3" />
                      {STATUS_CONFIG[item.status].label}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
