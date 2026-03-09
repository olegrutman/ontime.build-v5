
I understand exactly what you want! You want a **bidirectional sync between schedule items and SOV items** so that:

## **Current State Analysis**
Looking at the codebase, I can see:
- `project_schedule_items` table has `progress` field (0-100%)
- `project_sov_items` table has `total_completion_percent` field (0-100%)
- `invoice_line_items` table links to `sov_item_id` with billing amounts
- SOV items control billing limits in `CreateInvoiceFromSOV.tsx`

## **What We Need to Build**

### **1. SOV ↔ Schedule Linking**
Add `sov_item_id` field to `project_schedule_items` table to create the link:
```sql
ALTER TABLE project_schedule_items 
ADD COLUMN sov_item_id UUID REFERENCES project_sov_items(id) ON DELETE SET NULL;
```

### **2. Bidirectional Sync Logic**

**Schedule → SOV (Progress Controls Billing)**
- When schedule item `progress` changes → update linked SOV item `total_completion_percent`
- This automatically affects billing limits in invoice creation (already works)

**SOV → Schedule (Billing Updates Progress)**
- When invoice is approved with SOV line items → calculate completion % from billing
- Update linked schedule items `progress` to match billing completion

### **3. Database Triggers for Auto-Sync**

**Trigger 1: Schedule Progress → SOV Completion**
```sql
CREATE OR REPLACE FUNCTION sync_schedule_to_sov()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sov_item_id IS NOT NULL AND NEW.progress != OLD.progress THEN
    UPDATE project_sov_items 
    SET total_completion_percent = NEW.progress
    WHERE id = NEW.sov_item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Trigger 2: Invoice Approval → Schedule Progress**
```sql
CREATE OR REPLACE FUNCTION sync_invoice_to_schedule()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'APPROVED' AND OLD.status != 'APPROVED' THEN
    -- Update schedule progress based on SOV billing completion
    UPDATE project_schedule_items 
    SET progress = (
      SELECT COALESCE(
        ROUND((total_billed_amount / NULLIF(value_amount, 0)) * 100), 
        0
      )
      FROM project_sov_items 
      WHERE id = project_schedule_items.sov_item_id
    )
    WHERE sov_item_id IN (
      SELECT DISTINCT sov_item_id 
      FROM invoice_line_items 
      WHERE invoice_id = NEW.id
    );
  END IF;
  RETURN NEW;
END;
```

### **4. UI Integration**

**Schedule Form Enhancement**
- Add "Link to SOV Item" dropdown in `ScheduleItemForm.tsx`
- Show linked SOV item name/value in schedule table
- Show billing progress vs schedule progress side-by-side

**SOV Editor Enhancement** 
- Add "Link to Schedule" button for each SOV item
- Show schedule timeline dates in SOV items list
- Display schedule progress vs billing progress

### **5. Visual Progress Sync**

**Schedule Tab**
- Show both "Schedule Progress" and "Billing Progress" columns
- Color-code when they're out of sync (schedule ahead = yellow, billing ahead = red)
- Add sync button to manually align if needed

**SOV Tab**
- Add mini timeline view showing linked schedule dates
- Progress bars show both completion types
- Highlight items where billing exceeds planned schedule

## **Real-World Example Flow**

1. **Project Setup**: SOV item "Foundation Work" ($100k, 0% billed)
2. **Schedule Creation**: Link schedule item "Pour Foundation" (Jan 1-15, 0% progress)
3. **Work Progress**: Update schedule to 75% complete → SOV auto-updates to 75% completion
4. **Billing**: Create invoice for 60% of foundation work ($60k) → Gets approved
5. **Auto-Sync**: Schedule progress auto-updates to 60% (since billing = actual completion)
6. **Next Update**: Schedule shows 75% planned vs 60% billed (ahead of billing = good)

## **Technical Implementation**

**Files to Create:**
- Database migration for `sov_item_id` column and triggers
- Enhanced `ScheduleItemForm.tsx` with SOV linking
- Enhanced `ContractSOVEditor.tsx` with schedule linking
- `useSOVScheduleSync.tsx` hook for bidirectional updates

**Files to Modify:**
- `useProjectSchedule.ts` - add SOV relationship queries
- `CreateInvoiceFromSOV.tsx` - add schedule update on approval
- `ScheduleTab.tsx` - show billing vs schedule progress
- Types for the new relationships

This creates a **living project timeline** where financial progress (billing) and physical progress (schedule) stay synchronized automatically, giving you real-time project health insights.
