-- Create estimate_pdf_uploads table
CREATE TABLE public.estimate_pdf_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estimate_id UUID NOT NULL REFERENCES public.supplier_estimates(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create estimate_line_items table
CREATE TABLE public.estimate_line_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estimate_id UUID NOT NULL REFERENCES public.supplier_estimates(id) ON DELETE CASCADE,
  raw_text_line TEXT,
  description TEXT NOT NULL,
  quantity NUMERIC,
  uom TEXT,
  pack_name TEXT NOT NULL DEFAULT 'Loose Estimate Items',
  status TEXT NOT NULL DEFAULT 'imported' CHECK (status IN ('imported', 'needs_review', 'matched', 'unmatched')),
  catalog_item_id UUID REFERENCES public.catalog_items(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create estimate_catalog_mapping table
CREATE TABLE public.estimate_catalog_mapping (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estimate_id UUID NOT NULL REFERENCES public.supplier_estimates(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  catalog_item_id UUID NOT NULL REFERENCES public.catalog_items(id) ON DELETE CASCADE,
  line_item_id UUID NOT NULL REFERENCES public.estimate_line_items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(estimate_id, catalog_item_id, line_item_id)
);

-- Add source fields to purchase_orders
ALTER TABLE public.purchase_orders 
ADD COLUMN IF NOT EXISTS source_estimate_id UUID REFERENCES public.supplier_estimates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source_pack_name TEXT;

-- Create indexes for performance
CREATE INDEX idx_estimate_pdf_uploads_estimate_id ON public.estimate_pdf_uploads(estimate_id);
CREATE INDEX idx_estimate_line_items_estimate_id ON public.estimate_line_items(estimate_id);
CREATE INDEX idx_estimate_line_items_pack_name ON public.estimate_line_items(pack_name);
CREATE INDEX idx_estimate_line_items_catalog_item_id ON public.estimate_line_items(catalog_item_id);
CREATE INDEX idx_estimate_catalog_mapping_estimate_id ON public.estimate_catalog_mapping(estimate_id);
CREATE INDEX idx_estimate_catalog_mapping_project_id ON public.estimate_catalog_mapping(project_id);
CREATE INDEX idx_estimate_catalog_mapping_catalog_item_id ON public.estimate_catalog_mapping(catalog_item_id);

-- Enable RLS
ALTER TABLE public.estimate_pdf_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_catalog_mapping ENABLE ROW LEVEL SECURITY;

-- RLS policies for estimate_pdf_uploads
-- Supplier org members can manage their own uploads
CREATE POLICY "Supplier org can manage own uploads" ON public.estimate_pdf_uploads
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.supplier_estimates se
    JOIN public.user_org_roles uor ON uor.organization_id = se.supplier_org_id
    WHERE se.id = estimate_pdf_uploads.estimate_id
    AND uor.user_id = auth.uid()
  )
);

-- Project participants can view uploads
CREATE POLICY "Project participants can view uploads" ON public.estimate_pdf_uploads
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.supplier_estimates se
    JOIN public.project_team pt ON pt.project_id = se.project_id
    JOIN public.user_org_roles uor ON uor.organization_id = pt.org_id
    WHERE se.id = estimate_pdf_uploads.estimate_id
    AND uor.user_id = auth.uid()
  )
);

-- RLS policies for estimate_line_items
-- Supplier org members can manage their own line items
CREATE POLICY "Supplier org can manage own line items" ON public.estimate_line_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.supplier_estimates se
    JOIN public.user_org_roles uor ON uor.organization_id = se.supplier_org_id
    WHERE se.id = estimate_line_items.estimate_id
    AND uor.user_id = auth.uid()
  )
);

-- Project participants can view line items
CREATE POLICY "Project participants can view line items" ON public.estimate_line_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.supplier_estimates se
    JOIN public.project_team pt ON pt.project_id = se.project_id
    JOIN public.user_org_roles uor ON uor.organization_id = pt.org_id
    WHERE se.id = estimate_line_items.estimate_id
    AND uor.user_id = auth.uid()
  )
);

-- RLS policies for estimate_catalog_mapping
-- Supplier org members can manage their own mappings
CREATE POLICY "Supplier org can manage own mappings" ON public.estimate_catalog_mapping
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.supplier_estimates se
    JOIN public.user_org_roles uor ON uor.organization_id = se.supplier_org_id
    WHERE se.id = estimate_catalog_mapping.estimate_id
    AND uor.user_id = auth.uid()
  )
);

-- Project participants can view mappings (needed for restricted picking)
CREATE POLICY "Project participants can view mappings" ON public.estimate_catalog_mapping
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.project_team pt
    JOIN public.user_org_roles uor ON uor.organization_id = pt.org_id
    WHERE pt.project_id = estimate_catalog_mapping.project_id
    AND uor.user_id = auth.uid()
  )
);

-- Create storage bucket for estimate PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('estimate-pdfs', 'estimate-pdfs', false, 20971520, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for estimate-pdfs bucket
-- Supplier org members can upload PDFs (using SUPPLIER enum value)
CREATE POLICY "Supplier org can upload estimate PDFs" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'estimate-pdfs'
  AND EXISTS (
    SELECT 1 FROM public.user_org_roles uor
    JOIN public.organizations o ON o.id = uor.organization_id
    WHERE uor.user_id = auth.uid()
    AND o.type = 'SUPPLIER'
  )
);

-- Supplier org members can view their own PDFs
CREATE POLICY "Supplier org can view own estimate PDFs" ON storage.objects
FOR SELECT USING (
  bucket_id = 'estimate-pdfs'
  AND EXISTS (
    SELECT 1 FROM public.estimate_pdf_uploads epu
    JOIN public.supplier_estimates se ON se.id = epu.estimate_id
    JOIN public.user_org_roles uor ON uor.organization_id = se.supplier_org_id
    WHERE epu.file_path = name
    AND uor.user_id = auth.uid()
  )
);

-- Project participants can view PDFs
CREATE POLICY "Project team can view estimate PDFs" ON storage.objects
FOR SELECT USING (
  bucket_id = 'estimate-pdfs'
  AND EXISTS (
    SELECT 1 FROM public.estimate_pdf_uploads epu
    JOIN public.supplier_estimates se ON se.id = epu.estimate_id
    JOIN public.project_team pt ON pt.project_id = se.project_id
    JOIN public.user_org_roles uor ON uor.organization_id = pt.org_id
    WHERE epu.file_path = name
    AND uor.user_id = auth.uid()
  )
);

-- Supplier org can delete their own PDFs
CREATE POLICY "Supplier org can delete own estimate PDFs" ON storage.objects
FOR DELETE USING (
  bucket_id = 'estimate-pdfs'
  AND EXISTS (
    SELECT 1 FROM public.estimate_pdf_uploads epu
    JOIN public.supplier_estimates se ON se.id = epu.estimate_id
    JOIN public.user_org_roles uor ON uor.organization_id = se.supplier_org_id
    WHERE epu.file_path = name
    AND uor.user_id = auth.uid()
  )
);

-- Trigger for updated_at on estimate_line_items
CREATE TRIGGER update_estimate_line_items_updated_at
BEFORE UPDATE ON public.estimate_line_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();