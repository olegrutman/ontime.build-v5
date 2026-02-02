-- Add new status values to po_status enum
ALTER TYPE po_status ADD VALUE IF NOT EXISTS 'ACTIVE';
ALTER TYPE po_status ADD VALUE IF NOT EXISTS 'SUBMITTED';
ALTER TYPE po_status ADD VALUE IF NOT EXISTS 'PRICED';
ALTER TYPE po_status ADD VALUE IF NOT EXISTS 'ORDERED';
ALTER TYPE po_status ADD VALUE IF NOT EXISTS 'DELIVERED';

-- Add new tracking columns to purchase_orders
ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
ADD COLUMN IF NOT EXISTS submitted_by uuid,
ADD COLUMN IF NOT EXISTS priced_at timestamptz,
ADD COLUMN IF NOT EXISTS priced_by uuid,
ADD COLUMN IF NOT EXISTS ordered_at timestamptz,
ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

-- Add pricing columns to po_line_items for supplier to fill
ALTER TABLE po_line_items
ADD COLUMN IF NOT EXISTS unit_price numeric(12,4),
ADD COLUMN IF NOT EXISTS line_total numeric(12,2);