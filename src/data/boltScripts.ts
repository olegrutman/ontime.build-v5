import type { DemoRole } from '@/data/demoData';

export interface BoltStep {
  id: string;
  pose: 'wave' | 'point' | 'thumbsup' | 'thinking' | 'celebrate' | 'hardhat';
  instruction: string;
  explanation: string;
  targetSelector?: string; // CSS selector to spotlight
  targetTab?: string; // tab to navigate to
}

const GC_STEPS: BoltStep[] = [
  { id: 'gc-1', pose: 'wave', instruction: 'Welcome! This is your project overview — contracts and urgent items live here.', explanation: 'The overview gives GCs a bird\'s-eye view of every active project. Urgent items float to the top so nothing slips.', targetTab: 'overview', targetSelector: '[data-demo-target="attention-banner"]' },
  { id: 'gc-2', pose: 'point', instruction: 'Here are your Work Orders. Each one tracks scope, labor, and materials for a specific task.', explanation: 'Work Orders are mini-projects inside a project. They flow from Draft → Active → Locked → Invoiced.', targetTab: 'work-orders', targetSelector: '[data-demo-target="wo-list"]' },
  { id: 'gc-3', pose: 'thinking', instruction: 'Open a Work Order to review details, approve pricing, or check field-crew hours.', explanation: 'GCs approve Work Order pricing before the TC can invoice. T&M orders show real-time labor logs.', targetSelector: '[data-demo-target="wo-card-0"]' },
  { id: 'gc-4', pose: 'point', instruction: 'Purchase Orders track material buys. You can create POs from estimates or from scratch.', explanation: 'POs link to suppliers in the directory. Once the supplier prices it, you approve and it becomes a committed cost.', targetTab: 'purchase-orders', targetSelector: '[data-demo-target="po-list"]' },
  { id: 'gc-5', pose: 'thumbsup', instruction: 'Invoices are generated from SOV progress or directly from Work Orders.', explanation: 'Billing flows: SOV-based for prime contracts, WO-based for subcontract pay-apps. Retainage is auto-calculated.', targetTab: 'invoices', targetSelector: '[data-demo-target="invoice-list"]' },
  { id: 'gc-6', pose: 'celebrate', instruction: 'That\'s the GC tour! Next: invite your team and create your first real project.', explanation: 'Onboarding takes 5 minutes. Add your TC partners and suppliers, then Ontime tracks everything automatically.' },
];

const TC_STEPS: BoltStep[] = [
  { id: 'tc-1', pose: 'wave', instruction: 'Welcome, Trade Contractor! Your financial snapshot lives on the overview.', explanation: 'TCs see contract value vs. billed-to-date, open WOs, and any items needing action.', targetTab: 'overview', targetSelector: '[data-demo-target="financial-signal"]' },
  { id: 'tc-2', pose: 'point', instruction: 'Work Orders are your mini-projects. They move from Draft → Active → Locked.', explanation: 'As a TC you price WOs, assign field crews, and track labor & materials per order.', targetTab: 'work-orders', targetSelector: '[data-demo-target="wo-list"]' },
  { id: 'tc-3', pose: 'thinking', instruction: 'Create a PO to order materials for a Work Order.', explanation: 'POs tie directly to a WO. Material costs roll up into the WO total.', targetTab: 'purchase-orders' },
  { id: 'tc-4', pose: 'point', instruction: 'When a supplier prices a PO, it shows here. You approve and commit the cost.', explanation: 'Pricing visibility depends on material responsibility set in the contract.' },
  { id: 'tc-5', pose: 'thumbsup', instruction: 'Pricing visibility protects margins. What the GC sees depends on the contract.', explanation: 'If material responsibility = TC, the GC sees the final WO price but not individual supplier costs.' },
  { id: 'tc-6', pose: 'celebrate', instruction: 'Tour complete! Set up your org, invite your field crews, and start building.', explanation: 'Your next step: complete your company profile and invite at least one field crew.' },
];

const FC_STEPS: BoltStep[] = [
  { id: 'fc-1', pose: 'wave', instruction: 'Welcome, Field Crew! You\'ll see Work Orders assigned to you right here.', explanation: 'FCs only see WOs they\'re assigned to — keeping the interface clean and focused.', targetTab: 'overview', targetSelector: '[data-demo-target="wo-section"]' },
  { id: 'fc-2', pose: 'point', instruction: 'Open a Work Order to see what needs to be done and fill in required fields.', explanation: 'Each WO has scope, location, and any special instructions from the TC.', targetTab: 'work-orders', targetSelector: '[data-demo-target="wo-card-0"]' },
  { id: 'fc-3', pose: 'thinking', instruction: 'Add photos and notes as you complete work in the field.', explanation: 'Documentation protects everyone. Photos are attached to the WO for the record.' },
  { id: 'fc-4', pose: 'thumbsup', instruction: 'When work is done, submit for approval. The TC reviews and locks it.', explanation: 'Once locked, labor hours and materials are finalized for billing.' },
  { id: 'fc-5', pose: 'point', instruction: 'Invoices show your billing history for completed work.', explanation: 'FC invoices are generated from locked WOs. Retainage is held per the contract.', targetTab: 'invoices' },
  { id: 'fc-6', pose: 'celebrate', instruction: 'That\'s it! Simple and focused — just the way field work should be.', explanation: 'Your TC handles pricing and GC approvals. You focus on the work.' },
];

const SUPPLIER_STEPS: BoltStep[] = [
  { id: 'sup-1', pose: 'wave', instruction: 'Welcome, Supplier! Purchase Orders sent to you appear here.', explanation: 'You\'ll only see POs addressed to your organization.', targetTab: 'purchase-orders', targetSelector: '[data-demo-target="po-list"]' },
  { id: 'sup-2', pose: 'point', instruction: 'Open a PO to see the line items and quantities requested.', explanation: 'Each line has a description, quantity, and UOM. You add unit pricing.', targetSelector: '[data-demo-target="po-card-0"]' },
  { id: 'sup-3', pose: 'thinking', instruction: 'Enter your price for each line item.', explanation: 'You can price all at once or line-by-line. Totals calculate automatically.' },
  { id: 'sup-4', pose: 'thumbsup', instruction: 'When done, mark the PO as "Priced". The contractor gets notified.', explanation: 'Marking as Priced locks your pricing and sends a notification to the ordering party.' },
  { id: 'sup-5', pose: 'point', instruction: 'Note: you only see POs and estimates. Contract values and WO details stay private.', explanation: 'Ontime keeps financial boundaries clear between parties.' },
  { id: 'sup-6', pose: 'celebrate', instruction: 'Tour complete! Check your PO list regularly for new orders.', explanation: 'Enable email notifications to get alerted when a new PO arrives.' },
];

export const BOLT_SCRIPTS: Record<DemoRole, BoltStep[]> = {
  GC: GC_STEPS,
  TC: TC_STEPS,
  FC: FC_STEPS,
  SUPPLIER: SUPPLIER_STEPS,
};
