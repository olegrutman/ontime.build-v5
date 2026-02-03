-- Add ready_for_delivery_at column to purchase_orders
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS ready_for_delivery_at TIMESTAMPTZ;

-- Add READY_FOR_DELIVERY to po_status enum
ALTER TYPE po_status ADD VALUE IF NOT EXISTS 'READY_FOR_DELIVERY' AFTER 'FINALIZED';