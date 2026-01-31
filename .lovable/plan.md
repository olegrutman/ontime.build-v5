# Plan: Fix Invoice Send/Receive/Approve Flow

## Status: ✅ COMPLETED

## Overview
This plan addressed three issues discovered in the invoice workflow:
1. ✅ No notification is sent when an invoice is submitted
2. ✅ The dashboard's "Needs Attention" panel doesn't properly show invoices pending approval
3. ✅ TC organizations can't see invoices from Field Crews in their attention items

---

## Changes Implemented

### 1. ✅ Created Invoice Notification Trigger (Database)
Added a new database trigger `notify_invoice_status_change` that creates notifications when:
- Invoice status changes to `SUBMITTED` → notifies `to_org_id` (approver)
- Invoice status changes to `APPROVED` → notifies `from_org_id` (sender)
- Invoice status changes to `REJECTED` → notifies `from_org_id` (sender)

### 2. ✅ Fixed Dashboard Attention Items Logic
Updated `src/hooks/useDashboardData.ts`:
- Modified pending invoices query to join with contracts and filter by `to_org_id`
- Removed the GC-only restriction for invoice attention items
- Now all orgs see invoices where they are the approver

### 3. ✅ Added Notification Icons for Invoice Types
Updated `src/components/notifications/NotificationItem.tsx`:
- Added `INVOICE_SUBMITTED` with Receipt icon (blue)
- Added `INVOICE_APPROVED` with FileCheck icon (green)
- Added `INVOICE_REJECTED` with FileX icon (red)

---

## Files Modified

| File | Change |
|------|--------|
| SQL Migration | Created `notify_invoice_status_change` trigger function |
| `src/hooks/useDashboardData.ts` | Fixed pending invoice query to filter by `to_org_id` |
| `src/components/notifications/NotificationItem.tsx` | Added invoice notification type icons |
