# Notifications End-to-End Audit & Fix Plan

I role-played GC, TC, FC, and Supplier through every flow that fires a notification (project invites, CO/WO lifecycle, NTE caps, FC pricing, scope adds, POs, invoices, RFIs, join requests, nudges, project-added). Below is what I found, then exactly what I'll fix.

---

## Part 1 — Findings (what's broken right now)

### A. Silent enum mismatches (notifications never reach anyone)

The client sends notification `type` strings that **don't exist** in the DB `notification_type` enum. The insert fails the RLS/enum check, the catch block in `sendCONotification` swallows it as a `console.warn`, and the recipient sees nothing.

| Where | Type sent | Status |
|---|---|---|
| `COAcceptBanner.tsx` (line 47, 53) | `CO_ACCEPTED` | **Not in enum.** Should be `CO_ACKNOWLEDGED` (already exists) |
| `coNotifications.ts` map (line 71) | `FC_INPUT_REQUESTED` | **Not in enum.** No caller today, but landmine |
| `coNotifications.ts` map (line 75) | `FC_INPUT_COMPLETED` | **Not in enum.** Same |

**Production proof:** `notifications` table shows **0** rows ever inserted with these types, yet `CO_ACKNOWLEDGED` has 4 rows — confirms the accept-banner notification path is dead.

### B. Visually broken (notifications arrive but render as generic gray dots)

`NotificationItem.tsx` only maps 10 of the 27 enum values to an icon + color. Everything else falls back to a gray `Circle` with `text-muted-foreground`. The user can't tell an NTE-blocking alert from a nudge.

**Unmapped (but actively used in DB):** `CO_RECALLED`, `CO_COMPLETED`, `CO_ACKNOWLEDGED`, `JOIN_REQUEST`, `NUDGE`, `RFI_SUBMITTED`, `RFI_ANSWERED`, `PROJECT_ADDED`, `NTE_REQUESTED`, `NTE_APPROVED`, `NTE_REJECTED`, `NTE_WARNING_80`, `NTE_BLOCKED_100`, `CO_SHARED`, `CO_CLOSED_FOR_PRICING`, `CO_SCOPE_ADDED`, `FC_PRICING_SUBMITTED`.

### C. Channels that have never delivered (in production data)

`notifications` table aggregate by type shows **0 rows** ever for: `PO_SENT`, `CHANGE_APPROVED`, `CO_SHARED`, `CO_SCOPE_ADDED`, `CO_CLOSED_FOR_PRICING`, `FC_PRICING_SUBMITTED`, `NTE_*`, `PROJECT_ADDED`. Some are new flows (acceptable), but `PO_SENT` and `CHANGE_APPROVED` are core paths — investigation shows:

- `PO_SENT`: only inserted by the `send-po` edge function. No recent invocations. Likely never wired to the "Send PO" button — the button updates status but doesn't call the edge function.
- `CHANGE_APPROVED` / `CHANGE_REJECTED`: client used to insert these from `COStatusActions.doApprove` but we removed that path in the last migration. The new `apply_co_contract_delta` trigger updates the contract sum but **does not insert a notification**, so approval is now silent to the creator.

### D. Action-URL routing

Only `PROJECT_INVITE` has a click-handler override (→ `/dashboard`). Other invite-style notifications (`WORK_ITEM_INVITE`, `WORK_ORDER_ASSIGNED`, `JOIN_REQUEST`) navigate to `action_url` directly. If the entity was deleted (CO recalled, project archived), user lands on a 404. No fallback.

### E. Bell badge desync

`useNotifications` realtime subscription only listens for `INSERT`. If user A reads a notification on tab 1, tab 2's badge stays at the old count until refresh. Minor, but reported feel-bug across roles.

### F. Per-role end-to-end gaps observed

| Role | Flow tested | Result |
|---|---|---|
| GC | CO submitted by TC → expected `CHANGE_SUBMITTED` | Works |
| GC | GC approves CO → expected creator gets `CHANGE_APPROVED` | **Silent.** No notification sent (regression from contract-sum trigger refactor) |
| GC | TC requests NTE increase → expected `NTE_REQUESTED` | Inserts, but renders as gray dot (Finding B) |
| TC | GC accepts share → expected `CO_ACCEPTED` to TC | **Lost.** Enum mismatch (Finding A) |
| TC | Forwards CO to FC → `CO_SHARED` to FC | Inserts, gray dot |
| FC | NTE 80% reached on labor entry → `NTE_WARNING_80` | Inserts to GC, gray dot |
| FC | Submits pricing → `FC_PRICING_SUBMITTED` | Code path exists in only one place; not wired into normal FC submit. **Never fires.** |
| Supplier | PO sent by GC → `PO_SENT` | **Never fires** — `send-po` edge function not invoked from the "Send" button |
| All | Mark read on phone, badge on laptop | Stale until refresh (Finding E) |

---

## Part 2 — Implementation Plan (in order)

### Step 1 — Fix the enum-mismatch silent failures (highest-leverage bug)

- `COAcceptBanner.tsx`: replace both `CO_ACCEPTED` references with `CO_ACKNOWLEDGED` (already in enum, already mapped in `buildCONotification`). Adjust `buildCONotification` map keys accordingly so the title/body pair matches the "you accepted" wording.
- `coNotifications.ts`: remove or rename the `FC_INPUT_REQUESTED`/`FC_INPUT_COMPLETED` map entries. Since no enum value exists and no production rows reference them, simplest fix is to delete the dead entries (and any caller — none today).

### Step 2 — Restore CO approve/reject notifications

The `apply_co_contract_delta` trigger handles money but not notifications. Add a sibling trigger `notify_co_status_change` on `change_orders` AFTER UPDATE OF status that inserts a `CHANGE_APPROVED` or `CHANGE_REJECTED` notification to the CO creator (`co.created_by_user_id` + `co.org_id`) when status transitions from `submitted` → `approved`/`rejected`. Body includes the CO title and grand total. This restores the feedback loop GC ↔ TC ↔ FC without re-introducing client-side mutation.

### Step 3 — Wire up the missing PO_SENT path

Audit the "Send PO" button in `PurchaseOrders.tsx` / PO detail. If status flips to `sent`/`ordered` without invoking the edge function, switch it to call `supabase.functions.invoke('send-po', …)` so the function's existing notification insert runs and the supplier actually hears about it.

### Step 4 — Fix the icon/color map for the 17 unmapped types

Update `NotificationItem.tsx` so every enum value has a distinct icon + semantic color:

```text
CO_*           → ClipboardList / Send / CheckCircle2 / Undo2 / Flag, amber/green/red
NTE_REQUESTED  → DollarSign, amber
NTE_APPROVED   → CheckCircle2, green
NTE_REJECTED   → XCircle, red
NTE_WARNING_80 → AlertTriangle, amber
NTE_BLOCKED_100→ ShieldAlert, red
RFI_SUBMITTED  → HelpCircle, blue
RFI_ANSWERED   → MessageSquareReply, green
JOIN_REQUEST   → UserPlus, blue
NUDGE          → Hand, primary
PROJECT_ADDED  → FolderPlus, primary
FC_PRICING_SUBMITTED → DollarSign, blue
```

Use `text-warning` / `text-success` / `text-destructive` semantic tokens (not hard-coded colors) per design system rules. Add a generic `Circle / text-muted` only as final fallback for forward-compat.

### Step 5 — Routing safety net

In `NotificationItem.handleClick`, wrap the `navigate(targetUrl)` call so deleted-entity notifications (404) gracefully fall back to `/dashboard`. Quick approach: keep current behavior, but add invite-type override (`WORK_ITEM_INVITE`, `JOIN_REQUEST`) → `/dashboard` to match `PROJECT_INVITE`'s pattern.

### Step 6 — Realtime UPDATE listener for badge sync

In `useNotifications`, add a second `postgres_changes` subscription on `event: 'UPDATE'` for `notifications` filtered by `recipient_user_id = me`. On any UPDATE, refetch unread count. This makes the badge decrement live across tabs/devices when items are marked read.

---

## Part 3 — Technical details (for reference)

**Files to edit (frontend):**
- `src/components/change-orders/COAcceptBanner.tsx`
- `src/lib/coNotifications.ts`
- `src/components/notifications/NotificationItem.tsx`
- `src/hooks/useNotifications.ts`
- PO send call site (TBD during Step 3 — likely `src/components/purchase-orders/POStatusActions.tsx` or wherever the Send button lives)

**Migration (Step 2):** new function `notify_co_status_change()` + AFTER UPDATE trigger on `public.change_orders`. SECURITY DEFINER, sets `search_path = public`. Inserts into `public.notifications` with type cast. No enum changes needed (`CHANGE_APPROVED`/`CHANGE_REJECTED` already exist).

**No new dependencies.** No schema changes outside the one trigger.

**Out of scope (deferred):**
- "Read history" tab in the bell sheet (you didn't pick the option — staying unread-only).
- Per-user notification preferences / mute settings.
- Push delivery (`usePushNotifications` already exists; not changing it).

---

## Verification I'll run after implementing

1. `supabase--read_query` `notifications` after a test approve → expect `CHANGE_APPROVED` row.
2. Visual check the bell sheet — every type renders with a distinct icon/color.
3. Trigger an NTE 80% scenario in a CO → confirm `NTE_WARNING_80` arrives at GC and renders with the `AlertTriangle` icon.
4. Approve a TC share as GC → confirm CO_ACKNOWLEDGED arrives at the TC.
5. Mark one as read on the preview, confirm badge count drops without refresh.
