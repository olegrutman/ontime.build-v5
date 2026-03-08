

# T&M Work Order Flow Analysis — Bugs and Gaps

## Current Flow (as-built)

```text
TC creates WO (pricing_mode=tm, status=draft)
  → TC/FC sets hourly rates on the WO
  → FC adds time cards → FC submits time cards
  → TC approves FC time cards → TC submits cards to GC
  → TC clicks "Finalize T&M" → calls finalize_tm_work_order RPC
    → Converts T&M hours into fixed labor entries (tc_labor + fc_hours)
    → Switches pricing_mode from 'tm' to 'fixed'
  → TC now sees TCPricingSummary sidebar → clicks "Submit Pricing to GC"
    → Status → ready_for_approval
  → GC sees ApprovalPanel → clicks "Finalize Work Order"
    → Status → approved → trigger → contracted
```

## Identified Bugs

### Bug 1: `finalize_tm_work_order` RPC fails when TC has no participants
The RPC checks `change_order_participants` for the caller's org. But when a TC creates the work order (as shown in the network data — `created_by_role: TC_PM`, participants array is empty), **no participants exist**. The RPC will raise `'User is not a participant on this work order'`.

**Fix:** Update the RPC to also check if the caller is the `created_by` user on the `change_order_projects` row.

### Bug 2: Finalize button requires `fcRate > 0` even when self-performing
Line 275: `finalizeDisabled = !hasCards || pendingApproval || tcRate <= 0 || fcRate <= 0`. When TC is self-performing (no FC), `fcRate` stays 0/null, making finalize permanently disabled.

**Fix:** Only require `fcRate > 0` when an FC participant is active. When self-performing, skip the FC rate check.

### Bug 3: TC cannot add time cards as self-performer without FC flow
The `TimeCardForm` is structured around FC fields (`fc_men_count`, `fc_hours_per_man`, `fc_description`). When a TC is self-performing, they must fill FC fields for themselves, which is confusing. The TC's own hours field (`tc_own_hours`) exists on the card but there's no UI to edit it.

**Fix:** When no FC participant, show a simplified time card form that maps directly to `tc_own_hours` or uses the FC fields but labels them as "Your Hours". Add inline editing for `tc_own_hours` on existing cards.

### Bug 4: TC sidebar shows "Submit Pricing to GC" before finalization
The `TCPricingSummary` appears in the sidebar for all TC views (line 579-597), but in T&M mode before finalization, `tcLabor` is empty so `hasLaborPricing = false` and the submit button is disabled with "Add labor pricing" message. This is confusing — the TC should finalize T&M first, then submit.

**Fix:** Hide `TCPricingSummary` when `pricing_mode === 'tm'` (it only makes sense after finalization switches mode to fixed).

### Bug 5: FC rate editor visible even when no FC participant
The rate editor section always shows both FC and TC rate editors for non-GC users (line 466-509). When there's no FC, showing the FC rate editor is unnecessary and confusing.

**Fix:** Only show FC rate editor when `hasFCParticipant` is true. Pass this info to `TMTimeCardsPanel`.

---

## Plan

### 1. Fix RPC participant validation
**Migration SQL:** Update `finalize_tm_work_order` to also accept the work order creator as an authorized caller.

### 2. Fix finalize button for self-performing TC
**File:** `TMTimeCardsPanel.tsx` — Accept a `hasFCParticipant` prop. Only require `fcRate > 0` when FC is active. Hide FC rate editor when no FC.

### 3. Add TC own-hours support on time cards
**File:** `TMTimeCardsPanel.tsx` — Add inline `tc_own_hours` editing on each card for TC. When self-performing (no FC), allow TC to create time cards that populate `tc_own_hours` directly (skip FC fields).
**File:** `TimeCardForm.tsx` — Add a `selfPerforming` prop that shows a simplified form (date + hours + description) mapping to TC own hours.

### 4. Hide TCPricingSummary in T&M mode
**File:** `ChangeOrderDetailPage.tsx` — Wrap the `TCPricingSummary` render with `pricing_mode !== 'tm'` check.

### 5. Conditionally show FC rate editor
**File:** `ChangeOrderDetailPage.tsx` — Pass `hasFCParticipant` to `TMTimeCardsPanel`.
**File:** `TMTimeCardsPanel.tsx` — Use it to conditionally render FC rate editor.

---

## Files to Edit
- `supabase/migrations/` — New migration to fix `finalize_tm_work_order` RPC
- `src/components/change-order-detail/TMTimeCardsPanel.tsx` — Self-performing support, FC rate conditional, tc_own_hours editing
- `src/components/change-order-detail/TimeCardForm.tsx` — Self-performing variant
- `src/components/change-order-detail/ChangeOrderDetailPage.tsx` — Hide TCPricingSummary in T&M mode, pass hasFCParticipant

