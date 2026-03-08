import { useDemo } from '@/contexts/DemoContext';
import { getDemoProjectById, DEMO_TEAM } from '@/data/demoData';

export function useDemoProject() {
  const { isDemoMode, demoProjectId } = useDemo();
  if (!isDemoMode || !demoProjectId) return null;
  return getDemoProjectById(demoProjectId);
}

export function useDemoProjectData() {
  const { isDemoMode, demoProjectId, demoRole, store } = useDemo();
  if (!isDemoMode || !demoProjectId || !demoRole) return null;

  const workOrders = store.workOrders.filter(wo => wo.project_id === demoProjectId);
  const purchaseOrders = store.purchaseOrders.filter(po => po.project_id === demoProjectId);
  const invoices = store.invoices.filter(inv => inv.project_id === demoProjectId);
  const contracts = store.contracts.filter(c => c.project_id === demoProjectId);
  const sovItems = store.sovItems.filter(s => s.project_id === demoProjectId);
  const rfis = store.rfis.filter(r => r.project_id === demoProjectId);
  const attentionItems = store.attentionItems.filter(
    a => a.project_id === demoProjectId && a.role_visibility.includes(demoRole)
  );
  const poLineItems = store.poLineItems.filter(li => purchaseOrders.some(po => po.id === li.po_id));
  const invoiceLineItems = store.invoiceLineItems.filter(li => invoices.some(inv => inv.id === li.invoice_id));
  const workOrderDetails = store.workOrderDetails.filter(d => workOrders.some(wo => wo.id === d.id));

  return { attentionItems, workOrders, purchaseOrders, invoices, contracts, sovItems, rfis, poLineItems, invoiceLineItems, workOrderDetails };
}

export function useDemoTeam() {
  const { isDemoMode } = useDemo();
  if (!isDemoMode) return [];
  return DEMO_TEAM;
}
