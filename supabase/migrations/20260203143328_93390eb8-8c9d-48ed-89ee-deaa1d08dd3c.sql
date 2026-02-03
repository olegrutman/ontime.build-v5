-- Add column to track linked PO on work order
ALTER TABLE change_order_projects 
ADD COLUMN linked_po_id UUID REFERENCES purchase_orders(id);

-- Add markup fields for materials when TC is responsible
ALTER TABLE change_order_projects
ADD COLUMN material_markup_type TEXT CHECK (material_markup_type IN ('percent', 'lump_sum')),
ADD COLUMN material_markup_percent NUMERIC DEFAULT 0,
ADD COLUMN material_markup_amount NUMERIC DEFAULT 0;