-- Add new columns for enhanced work order wizard
ALTER TABLE change_order_projects
ADD COLUMN IF NOT EXISTS reason TEXT,
ADD COLUMN IF NOT EXISTS fixing_trade_notes TEXT;