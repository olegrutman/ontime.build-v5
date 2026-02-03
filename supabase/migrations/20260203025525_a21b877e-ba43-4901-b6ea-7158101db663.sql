-- Add sales tax percentage column to purchase_orders
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS sales_tax_percent numeric(5,3) DEFAULT 0;