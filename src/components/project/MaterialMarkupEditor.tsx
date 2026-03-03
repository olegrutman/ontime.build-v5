import { useState } from 'react';
import { Pencil, Check, X, Percent, DollarSign } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useToast } from '@/hooks/use-toast';
import { ProjectFinancials } from '@/hooks/useProjectFinancials';
import { cn } from '@/lib/utils';

interface MaterialMarkupEditorProps {
  financials: ProjectFinancials;
  projectId: string;
  projectStatus?: string;
}

export function MaterialMarkupEditor({ financials, projectId, projectStatus }: MaterialMarkupEditorProps) {
  const { toast } = useToast();
  const {
    loading, viewerRole, upstreamContract,
    materialMarkupType, materialMarkupValue,
    isTCMaterialResponsible, updateMaterialMarkup,
  } = financials;

  const [editing, setEditing] = useState(false);
  const [editType, setEditType] = useState<string>('percent');
  const [editValue, setEditValue] = useState(0);
  const [saving, setSaving] = useState(false);

  if (loading) return null;
  if (viewerRole !== 'Trade Contractor' || !isTCMaterialResponsible) return null;

  const handleSave = async () => {
    if (!upstreamContract) return;
    setSaving(true);
    const ok = await updateMaterialMarkup(upstreamContract.id, editType, editValue);
    setSaving(false);
    if (ok) { toast({ title: 'Material markup updated' }); setEditing(false); }
    else toast({ title: 'Error', description: 'Failed to update markup', variant: 'destructive' });
  };

  const startEdit = () => {
    setEditType(materialMarkupType || 'percent');
    setEditValue(materialMarkupValue || 0);
    setEditing(true);
  };

  if (editing) {
    return (
      <div className="bg-card rounded-2xl shadow-sm p-5 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Material Markup</p>
        <ToggleGroup type="single" value={editType} onValueChange={(v) => v && setEditType(v)} className="justify-start">
          <ToggleGroupItem value="percent" className="text-xs gap-1 h-8"><Percent className="h-3 w-3" /> Percentage</ToggleGroupItem>
          <ToggleGroupItem value="fixed" className="text-xs gap-1 h-8"><DollarSign className="h-3 w-3" /> Fixed Amount</ToggleGroupItem>
        </ToggleGroup>
        <div className="flex gap-2 items-end flex-wrap">
          <div className="relative flex-1 min-w-[100px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              {editType === 'percent' ? '%' : '$'}
            </span>
            <Input type="number" min="0" step={editType === 'percent' ? '0.5' : '100'} className="pl-7 h-9 text-sm" value={editValue || ''} onChange={e => setEditValue(parseFloat(e.target.value) || 0)} autoFocus />
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving} className="h-9"><Check className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving} className="h-9"><X className="h-4 w-4" /></Button>
        </div>
      </div>
    );
  }

  const hasMarkup = materialMarkupType != null && materialMarkupValue != null && materialMarkupValue > 0;

  return (
    <div className="bg-card rounded-2xl shadow-sm p-4">
      <div className="group flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Percent className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Material Markup</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn("text-sm font-semibold tabular-nums", !hasMarkup && 'text-amber-600 dark:text-amber-400')}>
            {hasMarkup
              ? materialMarkupType === 'percent'
                ? `${materialMarkupValue}%`
                : `$${materialMarkupValue.toLocaleString()}`
              : 'Not set'}
          </span>
          <button onClick={startEdit} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-accent rounded">
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
