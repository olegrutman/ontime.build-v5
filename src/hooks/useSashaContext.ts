import { useLocation } from 'react-router-dom';

export function useSashaContext(): string {
  const location = useLocation();
  const path = location.pathname;
  const params = new URLSearchParams(location.search);
  const tab = params.get('tab');

  if (path === '/dashboard') return 'Dashboard — their list of projects';
  if (path.startsWith('/project/') && path.endsWith('/edit')) return 'Editing a project';
  if (path.startsWith('/projects/') && path.endsWith('/scope')) return 'Editing project scope';

  if (path.startsWith('/project/')) {
    if (tab === 'work-orders') return 'Project Work Orders tab — list of all Work Orders on this project';
    if (tab === 'purchase-orders') return 'Project Purchase Orders tab — list of all POs on this project';
    if (tab === 'invoices') return 'Project Invoices tab — list of all invoices on this project';
    if (tab === 'financials') return 'Project Financials tab — budget and cost overview';
    if (tab === 'team') return 'Project Team tab — who is on this project';
    return 'Project Overview — summary of a single project';
  }

  if (path.startsWith('/change-order/')) return 'Work Order detail page — viewing a specific Work Order';
  if (path.startsWith('/work-item/')) return 'Work Item detail page';
  if (path === '/change-orders') return 'All Work Orders list';
  if (path === '/purchase-orders') return 'All Purchase Orders list';
  if (path === '/orders') return 'Material Orders list';
  if (path === '/estimates') return 'Supplier Estimates list';
  if (path === '/partners') return 'Partner Directory — organizations and people';
  if (path === '/catalog') return 'Product Catalog — browsing materials';
  if (path === '/create-project') return 'Creating a new project';
  if (path === '/profile') return 'User Profile settings';
  if (path === '/supplier/inventory') return 'Supplier Inventory management';
  if (path === '/supplier/estimates') return 'Supplier Project Estimates';

  return 'the Ontime.Build application';
}
