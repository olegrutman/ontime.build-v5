import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, Loader2, Package, Pencil, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SmartPicker, type SmartPickerHandle } from '@/components/po-wizard-v2/SmartPicker';
import type { POWizardV2LineItem, ProjectSupplier } from '@/types/poWizardV2';
import { fieldMaterialSelection, pickerLineForFieldItem } from '@/lib/fieldMaterialRequests';
import { emitSashaGuideAction } from '@/lib/sashaGuideActions';

const db = supabase as any;

export async function loadSuppliers(projectId: string): Promise<ProjectSupplier[]> {
  const { data: team, error: teamError } = await db.from('project_team').select('org_id').eq('project_id', projectId).eq('role', 'Supplier');
  if (teamError) throw teamError;
  const orgIds = (team || []).map((row: any) => row.org_id);
  const [{ data: assigned, error: supplierError }, { data: system, error: systemError }] = await Promise.all([
    orgIds.length ? db.from('suppliers').select('id,name,supplier_code,organization_id').in('organization_id', orgIds) : Promise.resolve({ data: [], error: null }),
    db.from('suppliers').select('id,name,supplier_code,organization_id').eq('is_system', true).limit(1).maybeSingle(),
  ]);
  if (supplierError) throw supplierError;
  if (systemError) throw systemError;
  const result = [...(assigned || [])] as ProjectSupplier[];
  if (system && !result.some(s => s.id === system.id)) result.push(system as ProjectSupplier);
  return result;
}

interface Props {
  report: any;
  item?: any;
  /** Free-text material item this catalog pick replaces. */
  replaceItemId?: string;
  onSaved: () => void;
}

export function FieldMaterialPicker({ report, item, replaceItemId, onSaved }: Props) {
  const { toast } = useToast();
  const pickerRef = useRef<SmartPickerHandle>(null);
  const savingRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<ProjectSupplier[]>([]);
  const [supplierId, setSupplierId] = useState<string | null>(item?.supplier_id ?? null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(item?.location || '');
  const [pickerTitle, setPickerTitle] = useState(item ? 'Edit material request' : 'Choose materials');
  const editingItem = useMemo(() => item ? pickerLineForFieldItem(item) : null, [item]);

  useEffect(() => {
    if (!open) return;
    setLocation(item?.location || '');
    setSupplierId(item?.supplier_id ?? null);
    let cancelled = false;
    setLoading(true);
    loadSuppliers(report.project_id)
      .then(rows => {
        if (cancelled) return;
        setSuppliers(rows);
        setSupplierId(current => current && rows.some(s => s.id === current) ? current : rows[0]?.id ?? null);
      })
      .catch(error => toast({ title: 'Could not load material catalogs', description: error.message, variant: 'destructive' }))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, report.project_id, item, toast]);

  const close = () => { if (!savingRef.current) setOpen(false); };

  const save = async (line: POWizardV2LineItem) => {
    if (savingRef.current || !supplierId) return;
    savingRef.current = true;
    try {
      const selection = fieldMaterialSelection(line);
      const values = { ...selection, supplier_id: supplierId, location: location.trim() || null };
      if (item) {
        const { error } = await db.from('field_report_items').update(values).eq('id', item.id).eq('status', 'draft');
        if (error) throw error;
      } else {
        const { data: auth } = await supabase.auth.getUser();
        const { error } = await db.from('field_report_items').insert({
          ...values,
          report_id: report.id,
          project_id: report.project_id,
          crew_org_id: report.crew_org_id,
          reviewer_org_id: report.reviewer_org_id,
          kind: 'material',
          created_by: auth.user?.id,
          status: 'draft',
          ai_generated: false,
        });
        if (error) throw error;
        if (replaceItemId) await db.from('field_report_items').delete().eq('id', replaceItemId).eq('status', 'draft');
      }
      emitSashaGuideAction('field-report-material-saved');
      toast({ title: item ? 'Material request updated' : 'Material added to report', description: 'The reviewing company will create and send the order.' });
      onSaved();
      setOpen(false);
    } catch (error: any) {
      toast({ title: 'Could not save material request', description: error.message, variant: 'destructive' });
    } finally {
      savingRef.current = false;
    }
  };

  return <>
    {item ? <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Pencil />Edit request</Button> : <Button size="sm" onClick={() => setOpen(true)}><Plus />Choose materials</Button>}
    <Dialog open={open} onOpenChange={next => { if (!next) close(); else setOpen(true); }}>
      <DialogContent className="flex h-[100dvh] w-full max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-[92dvh] sm:max-w-[calc(100vw-2rem)] sm:rounded-2xl lg:max-w-[calc(100vw-240px)] xl:max-w-[calc(100vw-260px)] 2xl:max-w-6xl">
        <DialogHeader className="border-b border-border px-4 py-3 pr-12 text-left sm:px-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="shrink-0" aria-label="Back in material picker" onClick={() => pickerRef.current?.goBack()}><ChevronLeft /></Button>
            <div className="min-w-0">
              <DialogTitle className="font-heading text-xl uppercase">{pickerTitle}</DialogTitle>
              <DialogDescription className="mt-1 text-xs">Select the exact product and quantity. Prices are not shown or saved.</DialogDescription>
            </div>
          </div>
          <div className="max-w-md pt-2">
            <Label htmlFor={`material-location-${item?.id || 'new'}`} className="text-xs">Where is it needed? (optional)</Label>
            <Input id={`material-location-${item?.id || 'new'}`} className="mt-1" placeholder="For example: front elevation" value={location} onChange={event => setLocation(event.target.value)} />
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-hidden">
          {loading ? <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="animate-spin" />Loading material catalogs…</div> : supplierId ? <SmartPicker
            ref={pickerRef}
            key={`${item?.id || 'new'}-${supplierId}`}
            workspaceMode
            supplierId={supplierId}
            projectId={report.project_id}
            editingItem={editingItem}
            hidePricing
            submitLabel={item ? 'Update request' : 'Add to report'}
            supplierControl={<div className="flex w-full shrink-0 items-center gap-3 sm:w-72"><span className="shrink-0 text-xs text-muted-foreground">Catalog</span><Select value={supplierId} onValueChange={setSupplierId} disabled={!!item}><SelectTrigger aria-label="Material supplier catalog" className="bg-background"><SelectValue /></SelectTrigger><SelectContent>{suppliers.map(supplier => <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>)}</SelectContent></Select></div>}
            onAddItem={line => { void save(line); }}
            onUpdateItem={line => { void save(line); }}
            onClearEdit={() => undefined}
            onClose={close}
            onExitPicker={close}
            onStateChange={(_step, title) => setPickerTitle(title)}
          /> : <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center"><Package className="text-muted-foreground" /><p className="text-sm text-muted-foreground">No material catalog is available for this project.</p></div>}
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
