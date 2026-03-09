

# Add System Supplier to Project + PO Email Configuration

## Problem

Currently there are two disconnected issues:
1. **No way to add the system supplier to a project** — The system supplier (ONTIME-SYS) is used as a fallback in the PO wizard, but there's no explicit way to assign it to a project from the UI
2. **PO send email is manual every time** — When sending a PO, the user must type the supplier email. There's no saved email on the `project_designated_suppliers` record or on the project-supplier relationship

## Solution

### 1. Add `po_email` column to `project_designated_suppliers`

Add a `po_email` text column so that when a user designates a supplier contact (or themselves as the system supplier contact), they can also set the email where POs should be sent. This email auto-populates the Send PO dialog.

### 2. Update `DesignateSupplierDialog` to include PO email field

Both the "Find User" and "Invite by Email" flows get a new field: **"PO Delivery Email"** — the email address where purchase orders will be sent. Defaults to the invited email but can be overridden (e.g., a sales@ address).

### 3. Auto-populate Send PO dialog with saved email

When the user clicks "Send" on a PO:
- First check `project_designated_suppliers.po_email` for the PO's project
- Then fall back to `supplier.contact_info`
- Then fall back to empty (manual entry)

### 4. Add "Use System Supplier" option to ProjectTeamSection

For projects without a real Supplier org on the team, show a clear action: **"Use System Catalog"** which creates the designated supplier record with just a PO email (no user assignment needed). This satisfies the readiness check and lets POs flow to that email.

---

## Database Change

```sql
ALTER TABLE project_designated_suppliers 
ADD COLUMN po_email text;
```

## Files to Modify

| Action | File | Changes |
|--------|------|---------|
| Migration | New migration | Add `po_email` column |
| Edit | `DesignateSupplierDialog.tsx` | Add PO email input field to both tabs |
| Edit | `ProjectTeamSection.tsx` | Show po_email, add "Use System Catalog" quick action |
| Edit | `PurchaseOrders.tsx` | Fetch designated supplier po_email to pre-fill send dialog |
| Edit | `PurchaseOrdersTab.tsx` | Same pre-fill logic for project-scoped PO tab |
| Edit | `TeamMembersCard.tsx` | Display po_email if set |

