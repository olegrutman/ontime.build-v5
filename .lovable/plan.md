
# Plan: Fix Invoice Send/Receive/Approve Flow

## Overview
This plan addresses three issues discovered in the invoice workflow:
1. No notification is sent when an invoice is submitted
2. The dashboard's "Needs Attention" panel doesn't properly show invoices pending approval
3. TC organizations can't see invoices from Field Crews in their attention items

---

## Changes Required

### 1. Create Invoice Notification Trigger (Database)
Add a new database trigger that creates a notification when an invoice status changes to SUBMITTED.

**New trigger function: `notify_invoice_submitted`**
- Fires when invoice `status` changes to `SUBMITTED`
- Looks up the contract to find the `to_org_id` (the party who should approve)
- Creates a notification for that organization with:
  - Type: `INVOICE_SUBMITTED`
  - Title: "Invoice Received: [invoice_number]"
  - Body: "[sender org name] has submitted invoice [number] for $[amount]"
  - Entity type: `INVOICE`
  - Action URL: `/project/[project_id]?tab=invoices`

**SQL Migration:**
```sql
-- Add INVOICE_SUBMITTED to notification_type enum if not exists
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'INVOICE_SUBMITTED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'INVOICE_APPROVED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'INVOICE_REJECTED';

-- Create the trigger function
CREATE OR REPLACE FUNCTION notify_invoice_submitted()
RETURNS TRIGGER AS $$
DECLARE
  _contract project_contracts;
  _from_org organizations;
  _invoice invoices;
BEGIN
  -- Only trigger when status changes to SUBMITTED
  IF NEW.status = 'SUBMITTED' AND (OLD.status IS NULL OR OLD.status != 'SUBMITTED') THEN
    -- Get invoice and contract details
    SELECT * INTO _contract FROM project_contracts WHERE id = NEW.contract_id;
    SELECT * INTO _from_org FROM organizations WHERE id = _contract.from_org_id;
    
    -- Notify the receiving organization (to_org)
    INSERT INTO notifications (
      recipient_org_id,
      type,
      title,
      body,
      entity_type,
      entity_id,
      action_url
    ) VALUES (
      _contract.to_org_id,
      'INVOICE_SUBMITTED',
      'Invoice Received: ' || NEW.invoice_number,
      _from_org.name || ' has submitted invoice "' || NEW.invoice_number || '" for $' || NEW.total_amount::text,
      'INVOICE',
      NEW.id,
      '/project/' || NEW.project_id || '?tab=invoices'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER notify_invoice_status_change
  AFTER UPDATE OF status ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION notify_invoice_submitted();
```

---

### 2. Fix Dashboard Attention Items Logic
Update `src/hooks/useDashboardData.ts` to properly filter and display pending invoices.

**Changes:**
1. Modify the pending invoices query to join with contracts and filter by `to_org_id`
2. Extend the attention items logic to include both GC and TC organizations

**Updated query (around line 182):**
```typescript
// Get pending invoices where current org is the APPROVER (to_org)
let pendingInvoices: { id: string; project_id: string; invoice_number: string; contract_id: string }[] = [];
if (projectIds.length > 0) {
  const { data } = await supabase
    .from('invoices')
    .select(`
      id, project_id, invoice_number, contract_id,
      project_contracts!inner(to_org_id)
    `)
    .in('project_id', projectIds)
    .eq('status', 'SUBMITTED')
    .eq('project_contracts.to_org_id', currentOrg.id);
  pendingInvoices = data || [];
}
```

**Updated attention items logic (around line 280):**
```typescript
// Show invoice approvals for orgs that receive invoices (GC receives from TC, TC receives from FC)
// The query already filters to only invoices where current org is the approver
pendingInvoices.forEach(inv => {
  const proj = allProjects.find(p => p.id === inv.project_id);
  attentionList.push({
    id: inv.id,
    type: 'invoice',
    title: inv.invoice_number,
    projectName: proj?.name || 'Unknown Project',
    projectId: inv.project_id,
  });
});
```

---

### 3. Add Notification for Invoice Approval/Rejection (Optional Enhancement)
Add notifications when an invoice is approved or rejected to notify the sender.

**Extend the trigger function to handle APPROVED and REJECTED status:**
```sql
-- When invoice is APPROVED, notify the sender (from_org)
IF NEW.status = 'APPROVED' AND OLD.status = 'SUBMITTED' THEN
  INSERT INTO notifications (...) VALUES (
    _contract.from_org_id,
    'INVOICE_APPROVED',
    'Invoice Approved: ' || NEW.invoice_number,
    ...
  );
END IF;

-- When invoice is REJECTED, notify the sender (from_org)
IF NEW.status = 'REJECTED' AND OLD.status = 'SUBMITTED' THEN
  INSERT INTO notifications (...) VALUES (
    _contract.from_org_id,
    'INVOICE_REJECTED',
    'Invoice Rejected: ' || NEW.invoice_number,
    ...
  );
END IF;
```

---

## Files to Modify

| File | Change |
|------|--------|
| New SQL Migration | Create `notify_invoice_submitted` trigger function and trigger |
| `src/hooks/useDashboardData.ts` | Fix pending invoice query to filter by `to_org_id` and update attention items logic |
| `src/components/notifications/NotificationItem.tsx` | Add icon handling for new `INVOICE_*` notification types (if not already handled) |

---

## Technical Notes

- The contract direction is: `from_org` (sender/contractor) to `to_org` (receiver/client)
- Invoice creators are always `from_org_id` (enforced by RLS)
- Invoice approvers are always `to_org_id`
- The existing RLS policies correctly allow `to_org` to update SUBMITTED invoices
- The UI already correctly shows approve/reject buttons based on `isInvoiceReceiver` check
