# Bundle Multiple Work Orders into One Proposal

Persisted proposals (option 2): each bundle becomes a real record with its own number, status, and re-downloadable PDF.

## 1. Select mode on the Work Order list

On the CO/WO list page (T&M / Remodel projects, WO document type):
- A "Select" toggle in the header turns rows into selectable rows (checkbox on the left of each `CORow`).
- A sticky bottom bar shows "N selected · $X total" and a "Create Proposal" button.
- Only WOs on the same project and same payer perspective are selectable together; once the first is picked, incompatible rows dim out.
- WOs already inside an accepted proposal show a small "In proposal" tag and warn if re-selected.

## 2. Proposal builder screen

Route `/project/:projectId/proposals/new?ids=...`:
- Ordered list of selected WOs (move up/down), each with its rolled-up client price and a remove action.
- Cover fields: proposal title, intro paragraph, validity days, payment terms.
- Optional single "proposal markup %" applied on top of the sum (shown as one adjustment line, never per-WO).
- Live grand total. Client-facing rules preserved: no crew math, no hourly rates, no internal cost.
- "Save & Generate" creates the record and downloads the PDF.

## 3. Proposal record

Two new tables:
- `co_proposals` — project_id, org_id, proposal_number, title, intro, validity_days, payment_terms, markup_percent, subtotal, total, status (`draft` | `sent` | `accepted` | `declined`), created_by, timestamps.
- `co_proposal_items` — proposal_id, change_order_id, sort_order, amount_snapshot.

Access follows existing project participant rules: the issuing org reads/writes its own proposals; the upstream/paying party can read. Numbering mirrors the CO numbering helper (project-code prefixed sequence).

## 4. Proposal list + detail

- A "Proposals" section on the WO list page (or a tab) listing number, title, WO count, total, status, date.
- Detail view: cover fields, member WOs, total, status actions (Mark sent / Accepted / Declined), Download PDF.
- Accepting a proposal is recorded on the proposal only in this phase; per-WO approval stays where it is today (a follow-up can cascade approvals or add token-based external client sign-off, reusing the existing CO external-approval flow).

## 5. PDF engine

Extend `generate-co-pdf` to accept either `co_id` (unchanged, no regression) or `proposal_id`:
- Cover page with proposal number, title, intro, validity, payment terms, parties.
- One section per member WO with the existing priced item blocks (proposal styling: scope + item totals only).
- Consolidated summary table (WO number, title, amount), optional markup line, grand total.
- One signature block for the whole package.

## Technical notes

- New: `src/pages/ProposalBuilder.tsx`, `src/pages/ProposalDetail.tsx`, `src/hooks/useCOProposals.ts`, `src/components/change-orders/ProposalsCard.tsx`; selection state added to `COListPage.tsx` and a checkbox prop on `CORow.tsx`.
- Migration creates both tables with GRANTs, RLS enabled, and participant-scoped policies.
- PDF changes are additive inside `supabase/functions/generate-co-pdf/index.ts`, sharing the existing item-block renderer.
