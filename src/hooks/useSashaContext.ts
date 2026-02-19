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

  if (path === '/dashboard') return context + 'Dashboard — their list of projects';
  if (path === '/demo') return context + 'Demo role selection page — choosing which role to explore';
  if (path.startsWith('/project/') && path.endsWith('/edit')) return context + 'Editing a project';
  if (path.startsWith('/projects/') && path.endsWith('/scope')) return context + 'Editing project scope';

  if (path.startsWith('/project/')) {
    if (tab === 'work-orders') return context + 'Project Work Orders tab — list of all Work Orders on this project';
    if (tab === 'purchase-orders') return context + 'Project Purchase Orders tab — list of all POs on this project';
    if (tab === 'invoices') return context + 'Project Invoices tab — list of all invoices on this project';
    if (tab === 'sov') return context + 'Project Schedule of Values tab — SOV line items and billing progress';
    if (tab === 'rfis') return context + 'Project RFIs tab — requests for information';
    if (tab === 'financials') return context + 'Project Financials tab — budget and cost overview';
    if (tab === 'team') return context + 'Project Team tab — who is on this project';
    return context + 'Project Overview — summary of a single project';
  }

  if (path.startsWith('/change-order/')) return context + 'Work Order detail page — viewing a specific Work Order';
  if (path.startsWith('/work-item/')) return context + 'Work Item detail page';
  if (path === '/change-orders') return context + 'All Work Orders list';
  if (path === '/purchase-orders') return context + 'All Purchase Orders list';
  if (path === '/orders') return context + 'Material Orders list';
  if (path === '/estimates') return context + 'Supplier Estimates list';
  if (path === '/partners') return context + 'Partner Directory — organizations and people';
  if (path === '/catalog') return context + 'Product Catalog — browsing materials';
  if (path === '/create-project') return context + 'Creating a new project';
  if (path === '/profile') return context + 'User Profile settings';
  if (path === '/supplier/inventory') return context + 'Supplier Inventory management';
  if (path === '/supplier/estimates') return context + 'Supplier Project Estimates';

  return context + 'the Ontime.Build application';
}
