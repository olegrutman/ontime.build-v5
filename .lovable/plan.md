
# Fix Bug #6 & #8 — Contract Lifecycle + SOW Line Items

## Bug #6: Contract Send/Accept/Sign Workflow

The `project_contracts` table already has a `status` column. We'll use it to drive a lightweight lifecycle.

### Status Flow
`draft` → `sent` → `accepted` (or `rejected` → `revised` → `sent` → ...)

### Migration
- Add `sent_at`, `accepted_at`, `rejected_at`, `rejection_note` columns to `project_contracts`

### UI Changes

**PhaseContracts.tsx** — Add per-row status badge + "Send" button:
- When contract has amount + retainage → show "Send" button
- On send: set `status = 'sent'`, `sent_at = now()`
- Counterparty sees: contract details (read-only) + Accept/Reject buttons
- Accept: `status = 'accepted'`, `accepted_at = now()`
- Reject: `status = 'rejected'`, `rejection_note`, `rejected_at = now()` → creator can revise and re-send

**New component: `ContractStatusBadge.tsx`** — shows Draft/Sent/Accepted/Rejected with color coding

**New component: `ContractReviewActions.tsx`** — Accept/Reject buttons with rejection note dialog (shown to counterparty)

---

## Bug #8: SOW Line Items

The app has a scope wizard for category-based selections, but lacks a traditional line-item SOW with quantities, units, and costs. We'll add this as an optional layer on top of each contract.

### Migration
Create `contract_sow_items` table:
- `id`, `contract_id`, `project_id`
- `description` (text), `quantity` (numeric), `unit` (text), `unit_cost` (numeric), `total` (computed)
- `item_type` (enum: 'work_item' | 'allowance' | 'exclusion')
- `sort_order`, `created_at`, `updated_at`
- `status`: 'draft' | 'sent' | 'accepted' | 'revision_requested'
- `revision_note` (text, nullable)

Add `sow_status` column to `project_contracts`: 'none' | 'draft' | 'sent' | 'accepted'

### UI Changes

**New component: `ContractSOWEditor.tsx`** (in `src/components/project-setup/`):
- Table of line items: description, qty, unit, unit cost, total
- Add/remove rows, drag to reorder
- Separate sections for Work Items, Allowances, and Exclusions
- "Send SOW" button → sets contract `sow_status = 'sent'`
- Counterparty view: read-only with Accept / Request Revision buttons
- Revision flow: counterparty adds note → creator sees flagged items → updates → re-sends

**Integration in PhaseContracts.tsx**:
- After a contract is accepted, show "Define Scope of Work" expandable section
- Or make SOW a separate tab/accordion within the contract row

### Files Changed

| File | Change |
|------|--------|
| Migration | Add columns to `project_contracts`, create `contract_sow_items` table with RLS |
| `src/components/project-setup/ContractStatusBadge.tsx` | **New** — status pill component |
| `src/components/project-setup/ContractReviewActions.tsx` | **New** — Accept/Reject dialog |
| `src/components/project-setup/ContractSOWEditor.tsx` | **New** — SOW line item editor |
| `src/components/project-setup/PhaseContracts.tsx` | Add status badges, send button, SOW toggle per contract |
