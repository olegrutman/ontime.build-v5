import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { sendCONotification, buildCONotification } from '@/lib/coNotifications';
import { toast } from 'sonner';
import { StepCatalog } from './wizard/StepCatalog';
import type { COCreatedByRole, ChangeOrder } from '@/types/changeOrder';
import type { COWizardData } from './wizard/COWizard';

interface AddScopeItemButtonProps {
  coId: string;
  orgId: string;
  projectId: string;
  role: COCreatedByRole;
  co: ChangeOrder;
  collaborators: { organization_id: string; status: string }[];
  onAdded: () => void;
}

const EMPTY_WIZARD: COWizardData = {
  reason: null,
  locationTag: '',
  selectedItems: [],
  pricingType: 'fixed',
  nteCap: '',
  gcBudget: '',
  assignedToOrgId: '',
  fcOrgId: '',
  fcInputNeeded: false,
  materialsNeeded: false,
  materialsOnSite: false,
  equipmentNeeded: false,
  materialsResponsible: null,
  equipmentResponsible: null,
  shareDraftNow: false,
  quickHours: null,
};

export function AddScopeItemButton({ coId, orgId, projectId, role, co, collaborators, onAdded }: AddScopeItemButtonProps) {
  const [open, setOpen] = useState(false);
  const [wizardData, setWizardData] = useState<COWizardData>({ ...EMPTY_WIZARD });
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  function updateWizard(patch: Partial<COWizardData>) {
    setWizardData(prev => ({ ...prev, ...patch }));
  }

  async function handleSaveItems() {
    if (wizardData.selectedItems.length === 0) return;
    setSaving(true);
    try {
      const maxSort = await supabase.from('co_line_items').select('sort_order').eq('co_id', coId).order('sort_order', { ascending: false }).limit(1).single();
      let nextSort = (maxSort.data?.sort_order ?? 0) + 1;

      const rows = wizardData.selectedItems.map((item, idx) => ({
        co_id: coId, org_id: orgId, item_name: item.item_name, unit: item.unit,
        catalog_item_id: item.id, division: item.division, category_name: item.category_name,
        created_by_role: role, sort_order: nextSort + idx, location_tag: item.locationTag || null,
        reason: item.reason || null, description: item.reasonDescription || null,
      }));

      const { error } = await supabase.from('co_line_items').insert(rows);
      if (error) throw error;

      const userId = (await supabase.auth.getUser()).data.user!.id;
      const itemNames = wizardData.selectedItems.map(i => i.item_name).join(', ');
      await supabase.from('co_activity').insert({
        co_id: coId, project_id: projectId,
        actor_user_id: userId,
        actor_role: role, action: 'scope_added', detail: `Added: ${itemNames}`,
      });

      // Notify other orgs
      const orgIds = new Set<string>();
      if (co.org_id) orgIds.add(co.org_id);
      if (co.assigned_to_org_id) orgIds.add(co.assigned_to_org_id);
      for (const c of collaborators) { if (c.status === 'active') orgIds.add(c.organization_id); }
      orgIds.delete(orgId);
      const { title: nTitle, body: nBody } = buildCONotification('CO_SCOPE_ADDED', co.title);
      for (const tid of orgIds) {
        const { data: members } = await supabase.from('user_org_roles').select('user_id').eq('organization_id', tid);
        if (members) await Promise.allSettled(members.map(m => sendCONotification({ recipient_user_id: m.user_id, recipient_org_id: tid, co_id: coId, project_id: projectId, type: 'CO_SCOPE_ADDED', title: nTitle, body: nBody })));
      }

      toast.success(`${wizardData.selectedItems.length} item(s) added`);
      setWizardData({ ...EMPTY_WIZARD });
      setOpen(false);
      onAdded();
      queryClient.invalidateQueries({ queryKey: ['co-detail'] });
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to add items');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setWizardData({ ...EMPTY_WIZARD }); setOpen(true); }}>
        <Plus className="h-3.5 w-3.5" /> Add item
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle className="text-base font-semibold">Add scope items</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
            <StepCatalog data={wizardData} onChange={updateWizard} projectId={projectId} />
          </div>
          <div className="flex items-center justify-between border-t px-4 sm:px-6 py-3 shrink-0 bg-card">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSaveItems} disabled={wizardData.selectedItems.length === 0 || saving}>
              {saving ? 'Saving…' : `Add ${wizardData.selectedItems.length} item(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
