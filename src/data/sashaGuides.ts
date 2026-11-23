import type { SashaGuideDefinition, SashaGuideRole, SashaGuideStep } from '@/types/sashaGuide';

const PROJECT_PATTERN = /^\/project\/[^/]+(?:\/|$)/;

const selectProjectStep: SashaGuideStep = {
  id: 'select-project',
  title: 'Choose your project',
  instruction: 'Open the project you want to work on. I’ll pick up the guide there.',
  explanation: 'Guides use your real project and permissions, so you learn the exact controls available to your company.',
  targetSelector: '[data-sasha-target="dashboard-projects"]',
  route: () => '/dashboard',
  advanceOn: 'route',
  matchPath: PROJECT_PATTERN,
};

const navStep = (
  id: string,
  section: 'change-orders' | 'daily-reports' | 'purchase-orders' | 'invoices',
  title: string,
  instruction: string,
): SashaGuideStep => ({
  id,
  title,
  instruction,
  targetSelector: `[data-sasha-target="project-nav-${section}"]`,
  route: (projectId) => projectId ? `/project/${projectId}/overview` : '/dashboard',
  advanceOn: 'click',
});

const createOrderSteps: SashaGuideStep[] = [
  navStep('open-orders', 'change-orders', 'Open work items', 'Open Change Orders or Work Orders. This is where extra scope, labor, materials, equipment, review, and billing stay connected.'),
  {
    id: 'new-order',
    title: 'Start a new order',
    instruction: 'Choose New. You’ll pick how to describe the work before adding pricing.',
    targetSelector: '[data-sasha-target="create-change-order"]',
    route: (projectId) => projectId ? `/project/${projectId}/change-orders` : '/dashboard',
    advanceOn: 'click',
  },
  {
    id: 'choose-method',
    title: 'Choose how to begin',
    instruction: 'Choose Guided for step-by-step scope and routing, or another option that fits the information you have. Pricing comes later on the order page.',
    targetSelector: '[data-sasha-target="change-order-guided"]',
    route: (projectId) => projectId ? `/project/${projectId}/change-orders/start` : '/dashboard',
    advanceOn: 'click',
  },
];

const fieldReportSteps: SashaGuideStep[] = [
  navStep('open-field-reports', 'daily-reports', 'Open Field Reports', 'Open Field Reports to record progress, hours, material requests, issues, and site photos without prices.'),
  {
    id: 'new-field-report',
    title: 'Start today’s report',
    instruction: 'Choose New Field Report. Save a draft as you work, then submit it only when it is ready for review.',
    targetSelector: '[data-sasha-target="new-field-report"]',
    route: (projectId) => projectId ? `/project/${projectId}/daily-reports` : '/dashboard',
    advanceOn: 'click',
  },
];

export const SASHA_GUIDES: SashaGuideDefinition[] = [
  {
    id: 'crew-first-day',
    roles: ['FC'],
    title: 'First day on site',
    description: 'Find your project and create your first Field Report.',
    completion: 'You know where to record field work. Your draft stays private until you submit it for review.',
    requiresProject: true,
    steps: fieldReportSteps,
  },
  {
    id: 'subcontractor-command-center',
    roles: ['TC'],
    title: 'Subcontractor command center',
    description: 'Learn the order workspace from scope through upstream review.',
    completion: 'You’ve reached the order builder. Add scope and routing first; labor, materials, equipment, and pricing stay on the order page.',
    requiresProject: true,
    steps: createOrderSteps,
  },
  {
    id: 'contractor-project-control',
    roles: ['GC'],
    title: 'Project control and approvals',
    description: 'See where work items enter the review and contract workflow.',
    completion: 'You’ve reached the order builder. Review status, pricing readiness, approvals, and billing from the same workspace.',
    requiresProject: true,
    steps: createOrderSteps,
  },
  {
    id: 'supplier-fulfillment',
    roles: ['SUPPLIER'],
    title: 'Pricing and fulfillment',
    description: 'Find project purchase orders and the line items awaiting your response.',
    completion: 'Open an order when you are ready to review quantities, save pricing, and follow its delivery status.',
    requiresProject: true,
    steps: [
      navStep('open-purchase-orders', 'purchase-orders', 'Open Purchase Orders', 'Open Purchase Orders to see requests addressed to your company and their fulfillment status.'),
      {
        id: 'open-purchase-order',
        title: 'Review an order',
        instruction: 'Open an order to review its lines. Saving pricing does not mark it Ordered; that remains a separate explicit action.',
        targetSelector: '[data-sasha-target="purchase-order-row"]',
        route: (projectId) => projectId ? `/project/${projectId}/purchase-orders` : '/dashboard',
        advanceOn: 'click',
      },
    ],
  },
  {
    id: 'create-work-item',
    roles: ['GC', 'TC', 'FC'],
    title: 'Create a Change Order or Work Order',
    description: 'Start with scope and routing, then price on the order page.',
    completion: 'You’re in the builder. Sasha will not submit or save anything for you.',
    requiresProject: true,
    steps: createOrderSteps,
  },
  {
    id: 'submit-field-report',
    roles: ['GC', 'TC', 'FC'],
    title: 'Create a Field Report',
    description: 'Record work and photos, then submit through the normal review flow.',
    completion: 'Your report is ready for draft entry. Nothing was submitted by the guide.',
    requiresProject: true,
    steps: fieldReportSteps,
  },
  {
    id: 'review-crew-input',
    roles: ['TC'],
    title: 'Review Crew hours and actuals',
    description: 'Open an order and find its item-level crew review workspace.',
    completion: 'Open an item to approve or return crew entries. A rejection still requires a Crew-visible reason.',
    requiresProject: true,
    steps: [
      navStep('review-open-orders', 'change-orders', 'Find the order', 'Open Change Orders or Work Orders and choose the order with Crew input awaiting review.'),
      {
        id: 'review-open-order',
        title: 'Open the order',
        instruction: 'Open the order you need to review. Overall Crew approval stays internal and separate from upstream forwarding.',
        targetSelector: '[data-sasha-target="change-order-row"]',
        route: (projectId) => projectId ? `/project/${projectId}/change-orders` : '/dashboard',
        advanceOn: 'click',
      },
      {
        id: 'review-scope-labor',
        title: 'Open an item',
        instruction: 'In Scope & Labor, open an item to review its hours and actuals. Each item keeps its own labor pricing method and completion action.',
        targetSelector: '[data-sasha-target="scope-labor"]',
        advanceOn: 'manual',
      },
    ],
  },
  {
    id: 'create-purchase-order',
    roles: ['GC', 'TC'],
    title: 'Order materials',
    description: 'Open the purchase-order builder and choose exact supplier products.',
    completion: 'You’re in the purchase-order builder. Product selection, pricing, sending, and Ordered status remain under your control.',
    requiresProject: true,
    steps: [
      navStep('purchase-open-orders', 'purchase-orders', 'Open Purchase Orders', 'Open Purchase Orders to manage material requests and supplier fulfillment.'),
      {
        id: 'purchase-create',
        title: 'Start a purchase order',
        instruction: 'Choose Create PO. Use the guided picker for explicit products and quantities; Sasha never guesses specifications.',
        targetSelector: '[data-sasha-target="create-purchase-order"]',
        route: (projectId) => projectId ? `/project/${projectId}/purchase-orders` : '/dashboard',
        advanceOn: 'click',
      },
    ],
  },
  {
    id: 'create-invoice',
    roles: ['GC', 'TC', 'FC'],
    title: 'Create an invoice',
    description: 'Find the normal billing entry point without bypassing eligibility rules.',
    completion: 'You’ve found the billing action. Available balances and approval rules still determine what can be invoiced.',
    requiresProject: true,
    steps: [
      navStep('invoice-open-orders', 'invoices', 'Open Invoices', 'Open Invoices to review billing status and amounts in your company’s direction.'),
      {
        id: 'invoice-create',
        title: 'Start billing',
        instruction: 'Choose the available invoice action. The builder will show eligible work and remaining balances before anything is created.',
        targetSelector: '[data-sasha-target="create-invoice"]',
        route: (projectId) => projectId ? `/project/${projectId}/invoices` : '/dashboard',
        advanceOn: 'click',
      },
    ],
  },
  {
    id: 'supplier-catalog',
    roles: ['SUPPLIER'],
    title: 'Update your catalog',
    description: 'Find catalog management and the controls for products and pricing.',
    completion: 'You’ve found catalog management. Imports and product changes still require your confirmation.',
    steps: [
      {
        id: 'catalog-open',
        title: 'Open Catalog Management',
        instruction: 'Open Catalog Management to maintain the products and pricing used by guided material selection.',
        targetSelector: '[data-sasha-target="supplier-catalog"]',
        route: () => '/dashboard',
        advanceOn: 'click',
      },
      {
        id: 'catalog-add',
        title: 'Add or import products',
        instruction: 'Use Add Product for one item or Import for a reviewed file. You confirm every change before it is applied.',
        targetSelector: '[data-sasha-target="supplier-add-product"]',
        route: () => '/supplier/inventory',
        advanceOn: 'manual',
      },
    ],
  },
];

export function guidesForRole(role: SashaGuideRole | null): SashaGuideDefinition[] {
  return role ? SASHA_GUIDES.filter((guide) => guide.roles.includes(role)) : [];
}

export function resolveGuideSteps(guide: SashaGuideDefinition, projectId: string | null): SashaGuideStep[] {
  return guide.requiresProject && !projectId ? [selectProjectStep, ...guide.steps] : guide.steps;
}
