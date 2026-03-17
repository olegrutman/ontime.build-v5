

# Profile Hourly Rate and In-App Notifications

## Context from exploration

- **Profile page** (`src/pages/Profile.tsx`) already has a "Pricing Defaults" section (line 481-571) with `default_hourly_rate` at the **org settings** level. The `profiles` table already has a personal `hourly_rate` column.
- **LaborEntryForm** already loads rate from `profiles.hourly_rate` (line 51-64) — this is working.
- **Notifications table** already exists but uses different columns than the prompt assumes: `recipient_user_id` (not `user_id`), `is_read` (not `read`), `entity_type`, `entity_id`, `action_url`, and a `notification_type` enum (not free text `type`). Available enum values include `CHANGE_SUBMITTED`, `CHANGE_APPROVED`, `CHANGE_REJECTED` but not NTE-specific types.

## Files to create

1. **`src/components/change-orders/HourlyRateSetting.tsx`** — Inline personal hourly rate editor. Loads from `profiles.hourly_rate`, saves back. Shows current rate with edit toggle. This is the **personal** rate (vs org default).

2. **`src/lib/coNotifications.ts`** — Notification helper adapted to the **existing** notifications table schema. Uses `recipient_user_id`, `is_read`, `entity_type: 'change_order'`, `entity_id: co.id`, `action_url` for deep link. Maps CO event types to the existing `notification_type` enum values where available (`CHANGE_SUBMITTED`, `CHANGE_APPROVED`, `CHANGE_REJECTED`), and uses `CHANGE_SUBMITTED` as fallback for NTE events since we can't add new enum values without a migration.

## Files to modify

3. **`src/pages/Profile.tsx`** — Add a personal hourly rate field inside the Personal Information card (after phone/contact fields, before save button). Add `hourly_rate` to `personalForm` state, sync from profile, include in `handleSavePersonal`. No need for a separate `HourlyRateSetting` component since the profile page already has form state management — but the prompt requests the component, so we'll add it as a standalone card between Personal Info and Organization sections.

4. **`src/components/change-orders/COStatusActions.tsx`** — Add `financials` prop, import `sendCONotification`/`buildCONotification`, add `notifyAssignedParty` helper. Call after each `logActivity`: `doShare` → `co_shared`, `doSubmit` → `co_submitted` with amount, `doApprove` → `co_approved`, `doReject` → `co_rejected`, `doRecall` → `co_recalled`.

5. **`src/components/change-orders/CONTEPanel.tsx`** — Import notification helpers, add `notifyCreator` and `notifyGC` helpers. Wire into `doRequest` → `nte_requested`, `doApprove` → `nte_approved`, `doReject` → `nte_rejected`.

6. **`src/components/change-orders/CODetailPage.tsx`** — Pass `financials` prop to `<COStatusActions>`.

7. **`src/components/change-orders/index.ts`** — Add `HourlyRateSetting` export.

## DB migration needed

Add new enum values to `notification_type` for NTE events, or use a simpler approach: since adding enum values requires a migration, we'll add `NTE_REQUESTED`, `NTE_APPROVED`, `NTE_REJECTED` to the `notification_type` enum.

```sql
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'NTE_REQUESTED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'NTE_APPROVED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'NTE_REJECTED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'CO_SHARED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'CO_RECALLED';
```

## Key adaptation details

- `coNotifications.ts` inserts with: `recipient_user_id`, `type` (enum), `title`, `body`, `entity_type: 'change_order'`, `entity_id: co.id`, `action_url: '/co/{id}'`, `is_read: false`
- All notification sends are fire-and-forget with try/catch
- `HourlyRateSetting` reads/writes `profiles.hourly_rate` for the current user — this is what `LaborEntryForm` already reads

