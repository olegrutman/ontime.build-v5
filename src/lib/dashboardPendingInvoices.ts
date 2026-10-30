import { uniqueInvoices, invoiceAmountSum } from '@/lib/invoiceIntegrity';

export interface DashboardPendingInvoice {
  id: string;
  title: string;
  status: string;
  amount: number;
  projectId: string;
  projectName: string;
  created_at: string;
  direction: 'receivable' | 'payable';
}

interface InvoiceSource {
  id: string;
  invoice_number: string | null;
  status: string;
  total_amount: number | null;
  project_id: string;
  created_at: string;
  contract_id: string | null;
  po_id: string | null;
}

export function dashboardPendingInvoices(
  invoices: InvoiceSource[],
  orgId: string,
  contracts: ReadonlyMap<string, { from_org_id: string | null; to_org_id: string | null }>,
  purchaseOrders: ReadonlyMap<string, { supplier_org_id: string | null; pricing_owner_org_id: string | null }>,
  projects: ReadonlyMap<string, string>,
): DashboardPendingInvoice[] {
  return dashboardInvoiceRows(invoices, orgId, contracts, purchaseOrders, projects).filter(invoice => ['SUBMITTED', 'APPROVED'].includes(invoice.status));
}

export function dashboardInvoiceRows(
  invoices: InvoiceSource[],
  orgId: string,
  contracts: ReadonlyMap<string, { from_org_id: string | null; to_org_id: string | null }>,
  purchaseOrders: ReadonlyMap<string, { supplier_org_id: string | null; pricing_owner_org_id: string | null }>,
  projects: ReadonlyMap<string, string>,
): DashboardPendingInvoice[] {
  return uniqueInvoices(invoices).flatMap((invoice): DashboardPendingInvoice[] => {
    if (!['SUBMITTED', 'APPROVED', 'PAID'].includes(invoice.status)) return [];
    const contract = invoice.contract_id ? contracts.get(invoice.contract_id) : undefined;
    const po = !invoice.contract_id && invoice.po_id ? purchaseOrders.get(invoice.po_id) : undefined;
    const sender = contract?.from_org_id ?? po?.supplier_org_id;
    const recipient = contract?.to_org_id ?? po?.pricing_owner_org_id;
    if (sender === recipient || (sender !== orgId && recipient !== orgId)) return [];
    return [{
      id: invoice.id,
      title: invoice.invoice_number || 'Invoice',
      status: invoice.status,
      amount: Number(invoice.total_amount || 0),
      projectId: invoice.project_id,
      projectName: projects.get(invoice.project_id) || 'Unknown',
      created_at: invoice.created_at,
      direction: sender === orgId ? 'receivable' : 'payable',
    }];
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function pendingInvoiceSummary(invoices: DashboardPendingInvoice[], direction: DashboardPendingInvoice['direction']) {
  const rows = uniqueInvoices(invoices).filter(invoice => invoice.direction === direction && ['SUBMITTED', 'APPROVED'].includes(invoice.status));
  return { rows, count: rows.length, total: invoiceAmountSum(rows.map(row => ({ total_amount: row.amount }))) };
}