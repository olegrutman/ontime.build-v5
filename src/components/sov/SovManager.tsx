import { useMemo, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText,
  CheckCircle,
  Loader2,
  AlertCircle,
  DollarSign,
  Play
} from 'lucide-react';
import { toast } from 'sonner';
import SovGenerator from './SovGenerator';
import { GeneratedSovItem, ProjectTypeForSOV } from '@/lib/sovTemplates';
import { computeSovPercents } from '@/lib/sovPercentages';
import { Json } from '@/integrations/supabase/types';

interface SovManagerProps {
  projectId: string;
  contractContextId: string;
  structureType: string;
  floors: number;
  scopeFlags: Record<string, boolean>;
}

type SovStatus = 'DRAFT' | 'ACTIVE';

interface SovData {
  id: string;
  status: SovStatus;
  created_at: string;
  updated_at: string;
  contract_context_id: string;
  contract_value: number | null;
}

interface SovLineItem {
  id: string;
  sov_id: string;
  name: string;
  percent: number | null;
  amount: number | null;
  unit: string | null;
  unit_cost: number | null;
  quantity: number | null;
  sort_order: number;
  is_from_change_order?: boolean;
  source_change_order_id?: string | null;
}

// Map structure_type to ProjectTypeForSOV
function getProjectTypeFromStructure(structureType: string): ProjectTypeForSOV {
  const typeMap: Record<string, ProjectTypeForSOV> = {
    'SINGLE_FAMILY': 'single_family',
    'TOWNHOME': 'townhomes',
    'TOWNHOMES': 'townhomes',
    'APARTMENT': 'apartments',
    'APARTMENTS': 'apartments',
    'HOTEL': 'hotel',
    'MIXED_USE': 'mixed_use',
  };
  return typeMap[structureType] || 'single_family';
}

// Convert DB line items to GeneratedSovItem format
function dbItemsToGeneratedItems(items: SovLineItem[]): GeneratedSovItem[] {
  return items.map((item, index) => ({
    name: item.name,
    percentage: item.percent || 0,
    floor: null,
    floorLabel: null,
    category: 'structural' as const,
    source: item.is_from_change_order ? 'custom' as const : 'auto' as const,
    status: 'not_started' as const,
    is_active: true,
    is_from_change_order: item.is_from_change_order || false,
    change_order_id: item.source_change_order_id || null,
    sort_order: item.sort_order || index,
  }));
}

export default function SovManager({
  projectId,
  contractContextId,
  structureType,
  floors,
  scopeFlags,
}: SovManagerProps) {
  const [loading, setLoading] = useState(true);
  const [sov, setSov] = useState<SovData | null>(null);
  const [sovItems, setSovItems] = useState<GeneratedSovItem[]>([]);
  const [contractValue, setContractValue] = useState<number>(0);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  const projectType = getProjectTypeFromStructure(structureType);

  useEffect(() => {
    fetchSov();
  }, [contractContextId]);

  const fetchSov = async () => {
    try {
      setLoading(true);

      // Prefer ACTIVE SOV; fallback to most recently updated (draft)
      let sovData: SovData | null = null;

      const { data: activeSov, error: activeErr } = await supabase
        .from('sovs')
        .select('*')
        .eq('contract_context_id', contractContextId)
        .eq('status', 'ACTIVE')
        .maybeSingle();

      if (activeErr) throw activeErr;

      if (activeSov) {
        sovData = activeSov as SovData;
      } else {
        const { data: latestSov, error: latestErr } = await supabase
          .from('sovs')
          .select('*')
          .eq('contract_context_id', contractContextId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestErr) throw latestErr;
        sovData = (latestSov as SovData) ?? null;
      }

      if (sovData) {
        setSov(sovData);
        setContractValue(sovData.contract_value || 0);

        // Fetch line items
        const { data: lineItems, error: itemsError } = await supabase
          .from('sov_line_items')
          .select('*')
          .eq('sov_id', sovData.id)
          .order('sort_order', { ascending: true });

        if (itemsError) throw itemsError;

        if (lineItems && lineItems.length > 0) {
          setSovItems(dbItemsToGeneratedItems(lineItems as SovLineItem[]));
        } else {
          setSovItems([]);
        }
      } else {
        setSov(null);
        setSovItems([]);
        setContractValue(0);
      }
    } catch (error) {
      console.error('Error fetching SOV:', error);
      toast.error('Failed to load SOV');
    } finally {
      setLoading(false);
    }
  };

  const handleItemsChange = (items: GeneratedSovItem[]) => {
    setSovItems(items);
  };

  const handleSave = async () => {
    if (!contractContextId) return;

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let sovId = sov?.id;

      // Create SOV if doesn't exist
      if (!sovId) {
        const { data: newSov, error: createError } = await supabase
          .from('sovs')
          .insert({
            contract_context_id: contractContextId,
            created_by_user_id: user.id,
            updated_by_user_id: user.id,
            status: 'DRAFT',
          })
          .select()
          .single();

        if (createError) throw createError;
        sovId = newSov.id;
        setSov(newSov as SovData);
      }

      // Delete existing line items (except change order items)
      await supabase
        .from('sov_line_items')
        .delete()
        .eq('sov_id', sovId)
        .eq('is_from_change_order', false);

      // Insert new line items (skip change order items - they are managed separately)
      const lineItemsToInsert = sovItems
        .filter(item => !item.is_from_change_order)
        .map((item, index) => ({
          sov_id: sovId,
          name: item.name,
          percent: item.percentage,
          sort_order: index,
          amount: contractValue > 0 ? (contractValue * item.percentage) / 100 : null,
          is_from_change_order: false,
        }));

      const { error: insertError } = await supabase
        .from('sov_line_items')
        .insert(lineItemsToInsert);

      if (insertError) throw insertError;

      // Update SOV timestamp and contract value
      await supabase
        .from('sovs')
        .update({ 
          updated_by_user_id: user.id, 
          updated_at: new Date().toISOString(),
          contract_value: contractValue
        })
        .eq('id', sovId);

      toast.success('SOV saved successfully');
    } catch (error: any) {
      console.error('Error saving SOV:', error);
      toast.error(error.message || 'Failed to save SOV');
    } finally {
      setIsSaving(false);
    }
  };

  const handleActivate = async () => {
    if (!sov?.id) return;

    // Validate totals using the shared SOV% helper
    const originalInputPercentSum = sovItems
      .filter(i => i.is_active !== false && i.is_from_change_order !== true)
      .reduce((sum, item) => sum + (Number(item.percentage) || 0), 0);

    if (Math.abs(originalInputPercentSum - 100) > 0.01) {
      toast.error(`SOV must total 100.00% before activation (currently ${originalInputPercentSum.toFixed(2)}%)`);
      return;
    }

    setIsActivating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Save first
      await handleSave();

      // Activate
      const { error } = await supabase
        .from('sovs')
        .update({ 
          status: 'ACTIVE',
          updated_by_user_id: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', sov.id);

      if (error) throw error;

      setSov(prev => prev ? { ...prev, status: 'ACTIVE' } : null);
      setShowActivateDialog(false);
      toast.success('SOV activated successfully');
    } catch (error: any) {
      console.error('Error activating SOV:', error);
      toast.error(error.message || 'Failed to activate SOV');
    } finally {
      setIsActivating(false);
    }
  };

  // Hooks must be called before early returns
  const percentModel = useMemo(() => {
    const inputs = sovItems.map((i) => {
      const amountRaw = contractValue > 0 ? (contractValue * (Number(i.percentage) || 0)) / 100 : 0;
      const isActiveItem = i.is_active !== false;
      return {
        name: i.name,
        is_active: isActiveItem,
        is_from_change_order: i.is_from_change_order === true,
        original_amount: isActiveItem && !i.is_from_change_order ? amountRaw : 0,
        allocated_amount: isActiveItem ? amountRaw : 0,
      };
    });

    return computeSovPercents(inputs, {
      activeSovId: sov?.id,
      debugLabel: 'SovManager',
    });
  }, [sovItems, contractValue, sov?.id]);

  // Sum of original contract items' percentages (excludes CO items)
  const originalInputPercentSum = useMemo(() => {
    return sovItems
      .filter(i => i.is_active !== false && !i.is_from_change_order)
      .reduce((sum, item) => sum + (Number(item.percentage) || 0), 0);
  }, [sovItems]);

  const isActive = sov?.status === 'ACTIVE';
  // Use tolerance of 0.5% to account for floating-point rounding across many items
  const isValid = Math.abs(originalInputPercentSum - 100) <= 0.5;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-accent" />
              <div>
                <CardTitle className="text-base">Schedule of Values</CardTitle>
                <CardDescription>
                  {isActive ? 'Active SOV - Read Only' : 'Draft SOV - Configure and edit'}
                </CardDescription>
              </div>
            </div>
            <Badge variant={isActive ? 'default' : 'secondary'} className="gap-1">
              {isActive ? (
                <><CheckCircle className="h-3 w-3" /> Active</>
              ) : (
                <><AlertCircle className="h-3 w-3" /> Draft</>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Contract Value Display - Always visible */}
          <div className={`flex items-center justify-between gap-4 mb-4 p-4 rounded-lg ${isActive ? 'bg-accent/10' : 'bg-muted/50'}`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/20 rounded-full">
                <DollarSign className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Contract Value</p>
                {isActive ? (
                  <p className="text-2xl font-bold text-foreground">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(contractValue)}
                  </p>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-lg text-muted-foreground">$</span>
                    <Input
                      id="contractValue"
                      type="number"
                      value={contractValue || ''}
                      onChange={(e) => setContractValue(parseFloat(e.target.value) || 0)}
                      placeholder="Enter contract value"
                      className="w-48 text-lg font-semibold h-10"
                    />
                  </div>
                )}
              </div>
            </div>
            {contractValue > 0 && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">{sovItems.filter(i => i.is_active).length} Line Items</p>
                <p className="text-sm font-medium text-accent">{(percentModel.sum_allocated_percent * 100).toFixed(2)}% allocated</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {!isActive && (
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                variant="outline"
              >
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save Draft
              </Button>
              <Button 
                onClick={() => setShowActivateDialog(true)}
                disabled={!isValid || sovItems.length === 0}
              >
                <Play className="h-4 w-4 mr-2" />
                Activate SOV
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SOV Generator/Editor */}
      <SovGenerator
        initialProjectType={projectType}
        initialFloors={floors}
        contractValue={contractValue}
        existingItems={sovItems}
        onItemsChange={handleItemsChange}
        showProjectTypeSelector={!isActive}
        showFloorSelector={!isActive}
        disabled={isActive}
      />

      {/* Activate Confirmation Dialog */}
      <Dialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-accent" />
              Activate SOV?
            </DialogTitle>
            <DialogDescription>
              Once activated, the SOV becomes read-only and will be used for invoicing. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm">Original Contract % (sum)</span>
              <span className="font-semibold">{originalInputPercentSum.toFixed(2)}%</span>
            </div>
            {contractValue > 0 && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg mt-2">
                <span className="text-sm">Contract Value</span>
                <span className="font-semibold">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(contractValue)}
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActivateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleActivate} disabled={isActivating}>
              {isActivating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Activate SOV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
