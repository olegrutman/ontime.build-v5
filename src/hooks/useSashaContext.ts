import { useLocation } from 'react-router-dom';
import { useDemo } from '@/contexts/DemoContext';

export function useSashaContext(): string {
  const location = useLocation();
  const { isDemoMode, demoRole, demoProjectId } = useDemo();
  const path = location.pathname;
  const params = new URLSearchParams(location.search);
  const tab = params.get('tab');

  let context = '';

  // Demo mode context
  if (isDemoMode) {
    const roleLabels: Record<string, string> = {
      GC: 'General Contractor Project Manager',
      TC: 'Trade Contractor Project Manager',
      FC: 'Field Crew member',
      SUPPLIER: 'Material Supplier',
    };
    context = `[DEMO MODE] The user is exploring Ontime.Build as a ${roleLabels[demoRole || ''] || demoRole}. `;
    if (demoProjectId) context += `Viewing demo project ID: ${demoProjectId}. `;
  }

  if (path === '/dashboard') return context + 'Dashboard — Shows: list of projects with status badges, quick stats (active projects, pending items), financial snapshot tiles, needs-attention panel highlighting urgent items, reminders tile, and a "New Project" button. Users can click any project to open it.';
  if (path === '/demo') return context + 'Demo role selection page — Shows: role cards for General Contractor, Trade Contractor, Field Crew, and Supplier. Users pick a role to explore a demo project from that perspective.';
  if (path.startsWith('/project/') && path.endsWith('/edit')) return context + 'Edit Project page — Shows: editable project details like name, address, type, and status. Users can update project information and save changes.';
  if (path.startsWith('/projects/') && path.endsWith('/scope')) return context + 'Edit Project Scope page — Shows: structures and levels defined for the project. Users can add, remove, or rename structures (e.g. Building A, Building B) and levels (e.g. Level 1, Level 2).';

  if (path.startsWith('/project/')) {
    if (tab === 'work-orders') return context + 'Project Work Orders tab — Currently being rebuilt. No work orders UI available yet.';
    if (tab === 'purchase-orders') return context + 'Project Purchase Orders tab — Shows: PO cards with PO number, supplier name, status badge, and total amount. Users can create new POs, filter by status, and click into any PO to see line-item details and pricing.';
    if (tab === 'invoices') return context + 'Project Invoices tab — Shows: invoice cards with invoice number, billing period, status (Draft, Submitted, Approved, Paid), subtotal, retainage, and total amount. Users can create new invoices from the Schedule of Values or from a PO.';
    if (tab === 'sov') return context + 'Project Schedule of Values (SOV) tab — Shows: SOV line items with scheduled values, billed-to-date amounts, and remaining balances. A progress bar shows overall billing progress. Users can edit SOV items and create invoices from them.';
    if (tab === 'rfis') return context + 'Project RFIs tab — Shows: list of Requests for Information with priority badges (Low, Medium, High, Critical), status (Open, Answered, Closed), subject, and assigned responder. Users can create new RFIs or click into existing ones.';
    if (tab === 'financials') return context + 'Project Financials tab — Shows: budget overview with contract value, total billed, total paid, retainage held, and remaining balance. Financial health charts show trends over time.';
    if (tab === 'team') return context + 'Project Team tab — Shows: list of team members with their organization, role, and permissions. Users can add new team members or manage existing member roles.';
    return context + 'Project Overview — Shows: attention banner (items needing action), financial signal cards (contract value, billed, retainage), metric strip, operational summary (Work Orders, POs, Invoices counts), team members list, contracts section, readiness checklist, and project scope summary.';
  }

  if (path === '/purchase-orders') return context + 'All Purchase Orders list — Shows: all POs across all projects with status filters and search. Each card shows PO number, supplier, project, status, and total amount.';
  if (path === '/purchase-orders') return context + 'All Purchase Orders list — Shows: all POs across all projects with status filters and search. Each card shows PO number, supplier, project, status, and total amount.';
  if (path === '/orders') return context + 'Material Orders list — Shows: material orders linked to Work Items, with order number, supplier, status, and item count. Users can track order progress from draft through delivery.';
  if (path === '/estimates') return context + 'Supplier Estimates list — Shows: estimates from suppliers with line items, pack groupings, and catalog matching status. Users can review and approve supplier estimates.';
  if (path === '/partners') return context + 'Partner Directory — Shows: two tabs: Organizations (companies you work with) and People (individual contacts). Users can search, view details, and manage business relationships.';
  if (path === '/catalog') return context + 'Product Catalog — Shows: searchable catalog of materials and products with categories, specifications, and supplier SKUs. Users can browse, search, and filter items.';
  if (path === '/create-project') return context + 'Create New Project wizard — Shows: step-by-step project setup with Basics (name, type, address), Scope (structures, levels), Contracts, Team (invite members), and Review steps.';
  if (path === '/profile') return context + 'User Profile settings — Shows: user name, email, phone, organization details, and account settings. Users can update their personal information.';
  if (path === '/supplier/inventory') return context + 'Supplier Inventory management — Shows: list of products in the supplier catalog with SKU, description, category, and pricing. Suppliers can add, edit, or remove products.';
  if (path === '/supplier/estimates') return context + 'Supplier Project Estimates — Shows: estimates the supplier has created or received for specific projects, with line items and pricing details.';
  if (path === '/reminders') return context + 'Reminders page — Shows: list of reminders with due dates, descriptions, and completion status. Users can add new reminders or mark existing ones complete.';
  if (path === '/financials') return context + 'Financials overview — Shows: financial summary across all projects with total contract values, billed amounts, and outstanding balances.';
  if (path === '/rfis') return context + 'All RFIs list — Shows: all Requests for Information across projects with priority, status, and assignment details.';

  return context + 'the Ontime.Build application';
}
