export type RolePageContent = {
  slug: string;
  icon: string;
  eyebrow: string;
  name: string;
  headline: string;
  headlineAccent: string;
  sub: string;
  ctaLabel: string;
  metaTitle: string;
  metaDescription: string;
  problems: { title: string; body: string }[];
  solution: { title: string; body: string }[];
  workflow: { step: string; title: string; body: string }[];
  features: { title: string; body: string }[];
  proof: { label: string; value: string }[];
  faq: { q: string; a: string }[];
};

export const rolePages: RolePageContent[] = [
  {
    slug: 'general-contractors',
    icon: '🏗️',
    eyebrow: 'For General Contractors',
    name: 'General Contractors',
    headline: 'Every dollar on the job,',
    headlineAccent: 'in one place.',
    sub: 'Approve change orders and invoices in seconds, see committed vs. billed cost per trade, and stop chasing paper between the office, the field, and your suppliers.',
    ctaLabel: 'Start as a General Contractor',
    metaTitle: 'Ontime.build for General Contractors — Cost & Approval Control',
    metaDescription: 'Approve change orders and invoices fast, track committed vs. billed cost per trade, and keep every subcontractor and supplier aligned in one system.',
    problems: [
      { title: 'Change orders live in email', body: 'A trade sends a price in a text, you approve it verbally, and nobody updates the contract sum. Two months later the budget is wrong and nobody knows why.' },
      { title: 'Invoices arrive without context', body: 'A pay app shows up with no link to the schedule of values, so verifying what was actually billed takes an afternoon of cross-checking.' },
      { title: 'Material spend is invisible', body: 'Trades order material through your account and you find out when the supplier invoice lands.' },
    ],
    solution: [
      { title: 'One approval queue', body: 'Change orders, purchase orders, and invoices route to you with the numbers already reconciled against the contract.' },
      { title: 'Live contract sum', body: 'Every approved change order updates the contract sum automatically — original, approved changes, revised total.' },
      { title: 'Supplier visibility', body: 'When a trade orders on your account, the PO becomes yours on approval and totals show on your books.' },
    ],
    workflow: [
      { step: '01', title: 'Set up the project once', body: 'Budget, tax, retainage, and a schedule of values generated from your scope — then invite the trades that will work on it.' },
      { step: '02', title: 'Trades submit priced work', body: 'Change orders arrive with labor, materials, and equipment already broken out and totaled.' },
      { step: '03', title: 'Approve or send back', body: 'One tap approves and pushes the delta into the contract sum, or requests a revision with a comment.' },
      { step: '04', title: 'Bill the owner with proof', body: 'Payment applications pull from billed SOV lines, so what you invoice always ties to what was approved.' },
    ],
    features: [
      { title: 'Approval inbox', body: 'Change orders, POs, invoices, and estimates in a single queue with the money visible before you tap.' },
      { title: 'Schedule of values', body: 'Percent-complete billing that stays balanced to 100% and reconciles against every invoice.' },
      { title: 'Committed vs. billed', body: 'See contracted, invoiced, and remaining per trade and per line item.' },
      { title: 'Cost privacy controls', body: 'Choose per project whether trade markups are hidden, summarized, or fully visible.' },
      { title: 'External approvals', body: 'Send a change order or invoice to an owner or architect by link — no account required to sign off.' },
      { title: 'PDF exports', body: 'Contract-ready change orders, POs, and payment applications on your letterhead.' },
    ],
    proof: [
      { label: 'Approval time', value: 'Seconds' },
      { label: 'Contract math', value: 'Automatic' },
      { label: 'Per-seat fees', value: 'None' },
    ],
    faq: [
      { q: 'Can I keep trade markups private from the owner?', a: 'Yes. Markup disclosure is a per-project setting: hidden, summary, or detailed.' },
      { q: 'Do my subs need to pay for accounts?', a: 'No. Pricing is one flat rate per company. Every role you invite gets full access to your project.' },
      { q: 'Does it replace my accounting system?', a: 'No — it controls what gets approved and billed. Exports are built for handoff to your accountant.' },
    ],
  },
  {
    slug: 'trade-contractors',
    icon: '🔧',
    eyebrow: 'For Trade Contractors',
    name: 'Trade Contractors',
    headline: 'Get paid for the extra work',
    headlineAccent: 'you actually did.',
    sub: 'Capture change orders on the jobsite by voice, price them with your own labor rates and markup, route them to the GC, and bill them the moment they are approved.',
    ctaLabel: 'Start as a Trade Contractor',
    metaTitle: 'Ontime.build for Trade Contractors — Change Orders & Invoicing',
    metaDescription: 'Capture change orders by voice, price labor and materials with your markup, route them to the GC, and invoice approved work without spreadsheets.',
    problems: [
      { title: 'Extra work never gets written up', body: 'The crew does it, the foreman mentions it, and no paperwork ever gets created. That is margin you gave away.' },
      { title: 'Pricing takes a night at the kitchen table', body: 'Hours, rates, markup, material, and tax — recalculated by hand every single time.' },
      { title: 'Invoicing approved changes is manual', body: 'The change order is approved but nothing carries into the pay app, so you re-enter it and hope the numbers match.' },
    ],
    solution: [
      { title: 'Voice to change order', body: 'Describe the condition on site. It becomes a scoped, itemized change order you can price and send.' },
      { title: 'Your rates, your markup', body: 'Internal cost stays yours. Billable amount is what the GC sees — the spread is never exposed.' },
      { title: 'One-tap billing', body: 'Approved change orders appear as billable lines in your next invoice with the approved totals already in place.' },
    ],
    workflow: [
      { step: '01', title: 'Capture it in the field', body: 'Voice note, guided picker, or plain description — whichever is fastest where you are standing.' },
      { step: '02', title: 'Price the work', body: 'Add crew hours, material, and equipment. Base cost and billable amount calculate as you type.' },
      { step: '03', title: 'Route it upstream', body: 'Send to the GC. Status moves from submitted to approved with a visible trail.' },
      { step: '04', title: 'Bill and track', body: 'Invoice approved changes alongside your base contract, and watch your revised contract sum grow.' },
    ],
    features: [
      { title: 'Voice change orders', body: 'Talk through the problem and get a structured scope back — no typing on a phone in the rain.' },
      { title: 'Labor rate library', body: 'Base hourly cost plus markup per crew type, applied automatically to every entry.' },
      { title: 'Material responsibility', body: 'Clear rules for whether you or the GC procures, so nobody double-orders.' },
      { title: 'Crew assignment', body: 'Push work to field crews and get updates, hours, and photo proof back.' },
      { title: 'Contract tracking', body: 'Original sum, approved changes, revised sum, billed to date, remaining.' },
      { title: 'Purchase orders', body: 'Order material against the project and route to the GC when they own the account.' },
    ],
    proof: [
      { label: 'Change order capture', value: 'By voice' },
      { label: 'Your margin', value: 'Never exposed' },
      { label: 'Approved → billable', value: 'One tap' },
    ],
    faq: [
      { q: 'Can the GC see my labor cost?', a: 'No. They see the billable amount. Your base rate and markup stay internal unless you choose to disclose them.' },
      { q: 'Do I need the GC to be on Ontime?', a: 'It is better if they are, but you can send change orders and invoices out by external approval link.' },
      { q: 'Does it handle T&M work?', a: 'Yes. T&M projects swap fixed-price KPIs for work-order driven tracking and billing.' },
    ],
  },
  {
    slug: 'field-crews',
    icon: '👷',
    eyebrow: 'For Field Crews',
    name: 'Field Crews',
    headline: 'Know what to build,',
    headlineAccent: 'prove that you built it.',
    sub: 'Your assigned work, your hours, and your photo proof — on your phone, in a screen simple enough to use with gloves on.',
    ctaLabel: 'Start as a Field Crew',
    metaTitle: 'Ontime.build for Field Crews — Assigned Work & Field Updates',
    metaDescription: 'See assigned work, log hours, attach jobsite photos, and flag problems from your phone. Built for crews, not office software.',
    problems: [
      { title: 'The scope changes by phone call', body: 'Instructions arrive verbally and get remembered differently by everyone on the crew.' },
      { title: 'Extra work goes unrecorded', body: 'You fix a condition nobody planned for, and there is no record that it happened.' },
      { title: 'Proof lives in a camera roll', body: 'Photos are on someone\'s phone with no connection to the task they document.' },
    ],
    solution: [
      { title: 'A clear task list', body: 'Only the work assigned to you, with scope and location spelled out.' },
      { title: 'Report a problem in seconds', body: 'Record what you found. It becomes a note the office can turn into paid work.' },
      { title: 'Photos attached to the work', body: 'Jobsite images land on the task, not in a group chat.' },
    ],
    workflow: [
      { step: '01', title: 'Open your day', body: 'Assigned work by project and location, newest first.' },
      { step: '02', title: 'Log progress', body: 'Hours, percent complete, and notes as you go.' },
      { step: '03', title: 'Attach proof', body: 'Photos upload straight to the task from the jobsite.' },
      { step: '04', title: 'Flag conditions', body: 'Found something unexpected? Record it and the office prices it as extra work.' },
    ],
    features: [
      { title: 'Mobile-first screens', body: 'Big targets, high contrast, readable in sunlight.' },
      { title: 'Voice problem notes', body: 'Speak the issue instead of typing it.' },
      { title: 'Photo documentation', body: 'Private, project-scoped storage for jobsite images.' },
      { title: 'Hours logging', body: 'Record time against the exact work item.' },
      { title: 'Assigned-only view', body: 'No budgets, no contracts, no noise — just your work.' },
      { title: 'Offline-friendly', body: 'Installable as an app with push notifications for new assignments.' },
    ],
    proof: [
      { label: 'Screens to learn', value: 'Three' },
      { label: 'Financial data shown', value: 'None' },
      { label: 'Works on', value: 'Any phone' },
    ],
    faq: [
      { q: 'Can crews see project money?', a: 'No. Field crew views exclude budgets, margins, and supplier pricing entirely.' },
      { q: 'Is there an app to install?', a: 'Yes — it installs to the home screen from the browser and supports push notifications.' },
      { q: 'What if there is no signal?', a: 'The app loads from cache and syncs updates once you are back in coverage.' },
    ],
  },
  {
    slug: 'suppliers',
    icon: '📦',
    eyebrow: 'For Suppliers',
    name: 'Suppliers',
    headline: 'Clean orders in,',
    headlineAccent: 'clean invoices out.',
    sub: 'Receive purchase orders tied to live project demand, price estimates, confirm deliveries, handle returns, and invoice straight from the PO.',
    ctaLabel: 'Start as a Supplier',
    metaTitle: 'Ontime.build for Suppliers — Purchase Orders, Estimates, Returns',
    metaDescription: 'Receive clean purchase orders, upload priced estimates, confirm deliveries, process returns, and invoice from the PO without phone tag.',
    problems: [
      { title: 'Orders arrive by phone and text', body: 'Quantities get misheard and the wrong material shows up on the wrong jobsite.' },
      { title: 'Estimates get re-keyed', body: 'You send a quote as a PDF and someone types it back into a spreadsheet, introducing errors.' },
      { title: 'Returns are a paperwork fight', body: 'Credits get argued over weeks later with no record of what came back.' },
    ],
    solution: [
      { title: 'Structured purchase orders', body: 'Line items, quantities, delivery date, and jobsite address — no interpretation needed.' },
      { title: 'Estimates that stay digital', body: 'Upload a quote and it is parsed into priced line items ready to convert into an order.' },
      { title: 'Returns with a paper trail', body: 'Quantity, reason, and credit amount recorded and visible to both sides.' },
    ],
    workflow: [
      { step: '01', title: 'Get invited to a project', body: 'The contractor adds you and you see only that project\'s demand.' },
      { step: '02', title: 'Price the estimate', body: 'Upload or enter pricing per line item. The buyer approves it as-is.' },
      { step: '03', title: 'Fulfill the order', body: 'Move the PO through confirmed, shipped, and delivered with dates.' },
      { step: '04', title: 'Invoice from the PO', body: 'Generate the invoice with line items and totals already carried over.' },
    ],
    features: [
      { title: 'Order pipeline', body: 'Estimated, ordered, received, and billed at a glance per project.' },
      { title: 'Estimate parsing', body: 'Upload a PDF quote and get itemized pricing back automatically.' },
      { title: 'Delivery confirmation', body: 'Record what shipped and what actually arrived.' },
      { title: 'Returns and credits', body: 'Full return workflow with credit tracking against the original PO.' },
      { title: 'Invoice from PO', body: 'One-step invoicing with tax handled and totals reconciled.' },
      { title: 'Project-scoped access', body: 'You only ever see the projects you were invited to.' },
    ],
    proof: [
      { label: 'Order clarity', value: 'Line-item' },
      { label: 'Estimate entry', value: 'Automated' },
      { label: 'PO → invoice', value: 'One step' },
    ],
    faq: [
      { q: 'Do I issue purchase orders?', a: 'No — contractors issue POs to you. You price estimates, confirm, deliver, and invoice.' },
      { q: 'Can I see other suppliers on the project?', a: 'No. Your access is scoped to your own orders and estimates.' },
      { q: 'What does it cost me?', a: 'Suppliers join projects at no cost to participate in orders and invoicing.' },
    ],
  },
];

export const getRolePage = (slug?: string) => rolePages.find((r) => r.slug === slug);
