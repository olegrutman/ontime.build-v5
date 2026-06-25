import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { DT } from '@/lib/design-tokens';
import { ContractStatusBadge } from './ContractStatusBadge';

interface SOWItem {
  id?: string;
  description: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  item_type: 'work_item' | 'allowance' | 'exclusion';
  sort_order: number;
  revision_note?: string | null;
}

interface ContractSOWEditorProps {
  contractId: string;
  projectId: string;
  sowStatus: string;
  isOwner: boolean; // true if this user's org is the hiring party (can edit)
  onStatusChange: () => void;
}

const UNITS = ['LS', 'EA', 'LF', 'SF', 'SY', 'HR', 'DAY', 'CY', 'TON', 'GAL'];
const ITEM_TYPES = [
  { value: 'work_item', label: 'Work Item' },
  { value: 'allowance', label: 'Allowance' },
  { value: 'exclusion', label: 'Exclusion' },
];

const emptyItem = (sortOrder: number, type: SOWItem['item_type'] = 'work_item'): SOWItem => ({
  description: '',
  quantity: 1,
  unit: 'LS',
  unit_cost: 0,
  item_type: type,
  sort_order: sortOrder,
});

export function ContractSOWEditor({
  contractId,
  projectId,
  sowStatus,
  isOwner,
  onStatusChange,
}: ContractSOWEditorProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState<SOWItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const canEdit = isOwner && (sowStatus === 'none' || sowStatus === 'draft');
  const canSend = isOwner && sowStatus === 'draft' && items.length > 0 && items.some(i => i.description.trim());
  const canReview = !isOwner && sowStatus === 'sent';

  const { data: dbItems = [], isLoading } = useQuery({
    queryKey: ['contract_sow_items', contractId],
    enabled: !!contractId && expanded,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_sow_items')
        .select('*')
        .eq('contract_id', contractId)
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (dbItems.length > 0) {
      setItems(dbItems.map(d => ({
        id: d.id,
        description: d.description,
        quantity: Number(d.quantity) || 1,
        unit: d.unit || 'LS',
        unit_cost: Number(d.unit_cost) || 0,
        item_type: (d.item_type as SOWItem['item_type']) || 'work_item',
        sort_order: d.sort_order,
        revision_note: d.revision_note,
      })));
    } else if (dbItems.length === 0 && expanded && !isLoading && canEdit) {
      setItems([emptyItem(0)]);
    }
  }, [dbItems, expanded, isLoading]);

  const addItem = (type: SOWItem['item_type'] = 'work_item') => {
    setItems(prev => [...prev, emptyItem(prev.length, type)]);
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof SOWItem, value: any) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Delete existing items for this contract
      await supabase.from('contract_sow_items').delete().eq('contract_id', contractId);

      // Insert all current items
      const validItems = items.filter(i => i.description.trim());
      if (validItems.length > 0) {
        const { error } = await supabase.from('contract_sow_items').insert(
          validItems.map((item, idx) => ({
            contract_id: contractId,
            project_id: projectId,
            description: item.description.trim(),
            quantity: item.quantity,
            unit: item.unit,
            unit_cost: item.unit_cost,
            item_type: item.item_type,
            sort_order: idx,
          }))
        );
        if (error) throw error;
      }

      // Update sow_status to draft if it was none
      if (sowStatus === 'none') {
        await supabase
          .from('project_contracts')
          .update({ sow_status: 'draft' } as any)
          .eq('id', contractId);
        onStatusChange();
      }

      qc.invalidateQueries({ queryKey: ['contract_sow_items', contractId] });
      toast({ title: 'Scope of Work saved' });
    } catch (err: any) {
      toast({ title: 'Error saving SOW', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    try {
      await handleSave();
      await supabase
        .from('project_contracts')
        .update({ sow_status: 'sent' } as any)
        .eq('id', contractId);
      onStatusChange();
      toast({ title: 'Scope of Work sent for review' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleAcceptSOW = async () => {
    try {
      await supabase
        .from('project_contracts')
        .update({ sow_status: 'accepted' } as any)
        .eq('id', contractId);
      onStatusChange();
      toast({ title: 'Scope of Work accepted' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleRequestRevision = async () => {
    try {
      await supabase
        .from('project_contracts')
        .update({ sow_status: 'draft' } as any)
        .eq('id', contractId);
      onStatusChange();
      toast({ title: 'Revision requested — SOW returned to sender' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const workItems = items.filter(i => i.item_type === 'work_item');
  const allowances = items.filter(i => i.item_type === 'allowance');
  const exclusions = items.filter(i => i.item_type === 'exclusion');
  const totalWork = workItems.reduce((s, i) => s + (i.quantity * i.unit_cost), 0);
  const totalAllowances = allowances.reduce((s, i) => s + (i.quantity * i.unit_cost), 0);

  return (
    <div className="border-t border-border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold font-heading">Scope of Work</span>
          {sowStatus !== 'none' && <ContractStatusBadge status={sowStatus} />}
        </div>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {isLoading ? (
            <p className="text-xs text-muted-foreground py-2">Loading...</p>
          ) : (
            <>
              {/* Section renderer */}
              {renderSection('Work Items', workItems, 'work_item')}
              {renderSection('Allowances', allowances, 'allowance')}
              {renderSection('Exclusions', exclusions, 'exclusion')}

              {/* Totals */}
              {items.length > 0 && (
                <div className="flex justify-end gap-6 pt-2 border-t border-border text-xs">
                  <span className="text-muted-foreground">Work Items: <strong className="text-foreground">${totalWork.toLocaleString()}</strong></span>
                  {totalAllowances > 0 && <span className="text-muted-foreground">Allowances: <strong className="text-foreground">${totalAllowances.toLocaleString()}</strong></span>}
                  <span className="text-muted-foreground">Grand Total: <strong className="text-foreground">${(totalWork + totalAllowances).toLocaleString()}</strong></span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                {canEdit && (
                  <>
                    <Button size="sm" variant="outline" onClick={handleSave} disabled={saving} className="h-7 text-xs">
                      {saving ? 'Saving…' : 'Save SOW'}
                    </Button>
                    {canSend && (
                      <Button size="sm" onClick={handleSend} disabled={sending} className="h-7 text-xs gap-1">
                        <Send className="w-3 h-3" />
                        {sending ? 'Sending…' : 'Send for Review'}
                      </Button>
                    )}
                  </>
                )}
                {canReview && (
                  <>
                    <Button size="sm" variant="outline" onClick={handleAcceptSOW} className="h-7 text-xs gap-1 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10">
                      Accept SOW
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleRequestRevision} className="h-7 text-xs gap-1 border-amber-500/30 text-amber-700 hover:bg-amber-500/10">
                      Request Revision
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );

  function renderSection(title: string, sectionItems: SOWItem[], type: SOWItem['item_type']) {
    const isExclusion = type === 'exclusion';
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className={DT.sectionHeader}>{title}</span>
          {canEdit && (
            <Button size="sm" variant="ghost" onClick={() => addItem(type)} className="h-6 text-[10px] gap-1 text-muted-foreground hover:text-foreground">
              <Plus className="w-3 h-3" /> Add
            </Button>
          )}
        </div>
        {sectionItems.length === 0 ? (
          <p className="text-[11px] text-muted-foreground italic pl-1">No {title.toLowerCase()} defined</p>
        ) : (
          <div className="space-y-1">
            {sectionItems.map((item) => {
              const globalIdx = items.indexOf(item);
              return (
                <div key={globalIdx} className="flex items-center gap-2">
                  <Input
                    value={item.description}
                    onChange={e => updateItem(globalIdx, 'description', e.target.value)}
                    placeholder={isExclusion ? 'Excluded item...' : 'Description...'}
                    className="flex-1 h-8 text-xs"
                    disabled={!canEdit}
                  />
                  {!isExclusion && (
                    <>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={e => updateItem(globalIdx, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-16 h-8 text-xs text-center"
                        disabled={!canEdit}
                      />
                      <Select
                        value={item.unit}
                        onValueChange={v => updateItem(globalIdx, 'unit', v)}
                        disabled={!canEdit}
                      >
                        <SelectTrigger className="w-16 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <div className="relative w-24">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                        <Input
                          type="number"
                          value={item.unit_cost}
                          onChange={e => updateItem(globalIdx, 'unit_cost', parseFloat(e.target.value) || 0)}
                          className="pl-5 h-8 text-xs"
                          disabled={!canEdit}
                        />
                      </div>
                      <span className="w-20 text-xs text-right font-mono text-muted-foreground">
                        ${(item.quantity * item.unit_cost).toLocaleString()}
                      </span>
                    </>
                  )}
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeItem(globalIdx)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
}
