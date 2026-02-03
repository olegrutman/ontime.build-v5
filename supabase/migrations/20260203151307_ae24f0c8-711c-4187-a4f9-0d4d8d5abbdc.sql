-- Add materials pricing lock tracking columns
ALTER TABLE change_order_projects
ADD COLUMN IF NOT EXISTS materials_pricing_locked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS materials_locked_at TIMESTAMPTZ;