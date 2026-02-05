-- Add po_id column to invoices table to link invoices to POs for suppliers
ALTER TABLE public.invoices 
ADD COLUMN po_id UUID REFERENCES public.purchase_orders(id);

-- Index for faster lookups
CREATE INDEX idx_invoices_po_id ON public.invoices(po_id);