

# What Lovable Can Build for a True Interactive Demo

## Current State
You already have a solid foundation: static demo data (10 projects, ~100 WOs, ~60 invoices, etc.), role-based walkthroughs via BoltGuide, Sasha as an AI narrator, and demo-specific tab components that render without touching the database.

## What's Missing to Make It "Truly Interactive"
The current demo is **read-only with guided narration**. A truly interactive demo means the user can **perform actions** (create, approve, reject, price) and see realistic results — all without a real account.

## The Plan: Simulated Action Engine

### 1. In-Memory State Machine for Demo Data
Instead of static arrays, wrap demo data in a **local state store** (React context or zustand) so users can mutate it during the session:
- Create a Work Order → adds to the local WO list with "draft" status
- Price a WO → updates status to "priced", sets amounts
- Approve an Invoice → moves status from SUBMITTED to APPROVED
- Send a PO to a supplier → changes PO status
- Submit an RFI → adds to the RFI list

All mutations stay in-memory and reset on page refresh — no database writes.

### 2. Wire Up Existing Wizards and Action Buttons
The demo tabs already render "Create Work Order" buttons and open the `WorkOrderWizard`. Currently these show a toast saying "simulated success." Instead:
- The wizard writes to the in-memory store
- The new record appears in the list immediately
- Status transitions (approve, reject, price) update the store and re-render

### 3. Sasha Narrates Each Action
After each simulated action, Sasha automatically comments with context:
- "Nice — you just created a T&M Work Order. In a real project, your TC would now price it."
- "Invoice approved! Retainage of $2,400 is being held per the contract."

This uses the existing Sasha chat infrastructure with action-triggered messages.

### 4. Guided Scenarios (Optional Enhancement)
Pre-built "missions" that walk a specific role through a full lifecycle:
- **GC Mission**: Create project → Add WO → Approve pricing → Review invoice → Approve payment
- **TC Mission**: Receive WO → Price it → Create PO → Submit invoice
- Each step has a checklist overlay showing progress

### 5. Demo Sandbox Reset
A "Reset Demo" button in the DemoBanner that restores the in-memory store to its original state.

## Files Changed
- **`src/contexts/DemoContext.tsx`** — Expand to hold mutable demo state (WOs, POs, invoices, etc.) with dispatch actions
- **`src/data/demoData.ts`** — Extract initial state as a factory function (`createInitialDemoState()`)
- **`src/components/demo/DemoWorkOrdersTab.tsx`** — Wire create/status-change actions to context
- **`src/components/demo/DemoPurchaseOrdersTab.tsx`** — Same pattern
- **`src/components/demo/DemoInvoicesTab.tsx`** — Same pattern
- **`src/components/demo/DemoRFIsTab.tsx`** — Same pattern
- **`src/components/demo/DemoBanner.tsx`** — Add reset button
- **Sasha integration** — Add action-triggered narration messages

## What This Does NOT Require
- No database changes
- No new backend
- No video recording
- No authentication

This is 100% frontend, using the existing demo infrastructure, just making it **writeable in-memory** so users can actually click through a full GC or TC workflow and see results.

