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
  section: 'change-orders' | 'daily-reports' | 'purchase-orders' | 'invoices' | 'overview',
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
    instruction: 'Choose New Field Report. If today’s draft already exists, this opens it instead of creating a duplicate.',
    targetSelector: '[data-sasha-target="new-field-report"]',
    route: (projectId) => projectId ? `/project/${projectId}/daily-reports` : '/dashboard',
    advanceOn: 'click',
  },
  {
    id: 'field-report-update',
    title: 'Tell the story of the day',
    instruction: 'Type or record what happened, then choose Sort into items. Check the suggested items carefully; Sasha never adds prices or invents details.',
    explanation: 'The draft is visible only to your company and its reviewing company. Individual items reach the project only after review and release.',
    targetSelector: '[data-sasha-target="field-report-update"]',
    advanceOn: 'manual',
  },
  {
    id: 'field-report-manual-entry',
    title: 'Add hours, progress, or a blocker',
    instruction: 'Choose an update type, describe it, and add its location or quantity when known. Choose Add item, then repeat for anything else that happened.',
    targetSelector: '[data-sasha-target="field-report-manual-entry"]',
    advanceOn: 'manual',
  },
  {
    id: 'field-report-materials',
    title: 'Request exact materials',
    instruction: 'Choose materials, select the supplier catalog, exact product and quantity, then Add to report. The reviewing company creates and sends the order—this does not mark it Ordered.',
    explanation: 'Use only known specifications and quantities. Prices stay out of Field Reports.',
    targetSelector: '[data-sasha-target="field-report-materials"]',
    advanceOn: 'manual',
  },
  {
    id: 'field-report-photos',
    title: 'Attach field photos',
    instruction: 'Choose Add photos for useful jobsite evidence. Photos stay private with the report and can be linked to resulting work or material orders.',
    targetSelector: '[data-sasha-target="field-report-photos"]',
    advanceOn: 'manual',
  },
  {
    id: 'field-report-check-items',
    title: 'Check every draft item',
    instruction: 'Review the entries below. Remove anything wrong and edit material requests before sending; submitted items still remain private until the reviewer releases them.',
    targetSelector: '[data-sasha-target="field-report-items"]',
    advanceOn: 'manual',
  },
  {
    id: 'field-report-send',
    title: 'Send it to the reviewer',
    instruction: 'When at least one item is ready, choose Send for review. After the report sends, choose Finish here; the reviewer can then release or hold each item.',
    targetSelector: '[data-sasha-target="field-report-submit"]',
    advanceOn: 'manual',
  },
];

export const SASHA_GUIDES: SashaGuideDefinition[] = [
  {
    id: 'crew-first-day',
    roles: ['FC'],
    title: 'First day on site',
    description: 'Find your project and create your first Field Report.',
    completion: 'You’ve walked through the complete Field Report: update, items, exact materials, photos, final check, and reviewer handoff. Unreleased items stay private.',
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
    description: 'Complete a draft with work, hours, materials and photos, then send it for review.',
    completion: 'You’ve walked through the complete Field Report: update, items, exact materials, photos, final check, and reviewer handoff. Sasha did not submit the report for you.',
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
  {
    id: 'price-order-items',
    roles: ['TC', 'FC'],
    title: 'Price items on an order',
    description: 'Choose Use crew hours or Set manually on each item, then log its hours and actuals.',
    completion: 'Each item keeps its own pricing method, hours, actuals and Mark item completed action. Nothing was saved by this tour.',
    requiresProject: true,
    steps: [
      navStep('price-open-orders', 'change-orders', 'Find the order', 'Open Change Orders or Work Orders to see the orders you can price.'),
      {
        id: 'price-open-order',
        title: 'Open an order',
        instruction: 'Open the order you want to price. Pricing happens here, not in the creation wizard.',
        targetSelector: '[data-sasha-target="change-order-row"]',
        route: (projectId) => projectId ? `/project/${projectId}/change-orders` : '/dashboard',
        advanceOn: 'click',
      },
      {
        id: 'price-scope-items',
        title: 'Set each item’s method',
        instruction: 'In Scope & Labor, open an item and choose Use crew hours or Set manually. This is separate from the order’s Fixed, T&M or Not to exceed label.',
        explanation: 'Different items can use different methods, each with its own hours and actuals log.',
        targetSelector: '[data-sasha-target="scope-labor"]',
        advanceOn: 'manual',
      },
    ],
  },
  {
    id: 'order-documents-approval',
    roles: ['GC', 'TC'],
    title: 'PDFs, proposals and outside approval',
    description: 'Find the order header actions for PDF, proposal, invoicing and owner sign-off.',
    completion: 'You’ve found the order actions. Outside approval sends a secure link; the recipient does not need an account.',
    requiresProject: true,
    steps: [
      navStep('docs-open-orders', 'change-orders', 'Find the order', 'Open Change Orders or Work Orders.'),
      {
        id: 'docs-open-order',
        title: 'Open an order',
        instruction: 'Open the order you want to share or send for sign-off.',
        targetSelector: '[data-sasha-target="change-order-row"]',
        route: (projectId) => projectId ? `/project/${projectId}/change-orders` : '/dashboard',
        advanceOn: 'click',
      },
      {
        id: 'docs-actions',
        title: 'Use the order actions',
        instruction: 'Download a PDF, create a proposal, start an invoice, or send for Outside approval from this panel. Each action asks before sending anything.',
        targetSelector: '[data-sasha-target="order-actions"]',
        advanceOn: 'manual',
      },
    ],
  },
  {
    id: 'track-supplier-orders',
    roles: ['SUPPLIER'],
    title: 'Fulfill a purchase order',
    description: 'Open a project’s purchase orders and review what needs pricing or delivery.',
    completion: 'Save pricing first; mark the order Ordered only when you actually confirm it.',
    requiresProject: true,
    steps: [
      navStep('supplier-open-pos', 'purchase-orders', 'Open Orders', 'Open Orders to see purchase orders sent to your company.'),
      {
        id: 'supplier-open-po',
        title: 'Open a purchase order',
        instruction: 'Open an order to review products and quantities, add your pricing, and update its delivery status.',
        targetSelector: '[data-sasha-target="purchase-order-row"]',
        route: (projectId) => projectId ? `/project/${projectId}/purchase-orders` : '/dashboard',
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
