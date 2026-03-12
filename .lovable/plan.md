

# Invoice Page Redesign -- Analysis and Proposal

## What I See Today (The Problems)

After reviewing the full invoice page code, here is what is happening and why it is not ideal:

### 1. Cards are nice to look at, but terrible for managing invoices
Right now every invoice is a card in a grid. When you have 5 invoices, cards are fine. When you have 20 or 50, you cannot scan them. You cannot sort by amount, date, or status. You cannot compare two invoices side by side. In real construction billing, a project manager needs to see a list and immediately spot which invoices are overdue, which are the biggest, and which need their action. Cards do not let you do that.

### 2. No aging information
This is the biggest gap. In construction, the single most important thing about an unpaid invoice is how old it is. "This invoice was submitted 45 days ago and still not approved" is critical information. Right now there is zero indication of aging. A 2-day-old submitted invoice looks identical to a 60-day-old one.

### 3. Summary cards are counts, not insights
The 5 summary tiles show Draft: 2, Pending: 3, Approved: 1, Paid: 4, Total Billed: $50K. These are just counts. They do not tell you "You have $21K sitting unpaid for over 30 days" which is what actually matters for cash flow.

### 4. The role context alert is noise
There is a blue alert box that says "Invoices you send to the General Contractor for completed work" every time you visit the tab. After the first visit, this is just visual clutter taking up space.

### 5. No quick-action workflow for approvers
If a GC has 8 invoices to review, they have to click into each one individually. There is no way to approve multiple invoices at once or even see a summary of what is waiting for them at a glance.

---

## What I Propose

### A. Replace the card grid with a table view (default) + card view toggle
Add a table as the primary view. Each row shows: Invoice #, Date, Billing Period, Amount, Status badge, and an **Age column** (e.g., "12d" in green, "34d" in amber, "62d" in red). Sortable by any column. Keep the card grid as an optional toggle for users who prefer it.

### B. Replace summary tiles with an actionable summary bar
Instead of 5 count cards, show a single compact bar with:
- **Needs Your Action**: count + total $ (invoices you can approve/submit)
- **Awaiting Payment**: count + total $ + average age
- **Paid This Month**: total $
This is 1 row instead of 5 cards, and every number is meaningful.

### C. Add aging badges to every invoice
Color-coded age indicator on each invoice (table row or card):
- Green: 0-14 days
- Amber: 15-30 days  
- Red: 30+ days
Calculated from `submitted_at` (or `approved_at` for approved invoices awaiting payment).

### D. Remove the static role context alert
The Sent/Received tabs already make it obvious what direction you are looking at. Remove the always-visible blue alert box.

### E. Add "Needs Action" filter preset
Add a quick-filter button next to the status dropdown: "Needs My Action" that automatically shows only invoices the current user can act on (DRAFT for creators, SUBMITTED for approvers, APPROVED for payers).

---

## Technical Changes

| File | Change |
|------|--------|
| `src/components/invoices/InvoicesTab.tsx` | Replace summary cards with compact action bar. Remove role context alert. Add table/card view toggle. Add "Needs Action" quick filter. |
| `src/components/invoices/InvoiceTableView.tsx` | **New file.** Sortable table with columns: Invoice #, Date, Amount, Status, Age, Actions. Clickable rows navigate to detail. |
| `src/components/invoices/InvoiceCard.tsx` | Add aging badge (calculate days since submission). |
| `src/components/invoices/InvoiceActionBar.tsx` | **New file.** Compact summary bar showing "Needs Action", "Awaiting Payment", "Paid This Month" with counts and amounts. |

No database changes needed -- all aging calculations use existing `submitted_at`, `approved_at`, and `created_at` timestamps.

