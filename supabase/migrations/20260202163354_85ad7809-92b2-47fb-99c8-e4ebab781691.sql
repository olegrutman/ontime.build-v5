-- Migrate existing DRAFT to ACTIVE
UPDATE purchase_orders 
SET status = 'ACTIVE' 
WHERE status = 'DRAFT';

-- Migrate existing SENT to SUBMITTED
UPDATE purchase_orders 
SET status = 'SUBMITTED', 
    submitted_at = sent_at,
    submitted_by = sent_by 
WHERE status = 'SENT';