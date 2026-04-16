
-- Create public storage bucket for org logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('org-logos', 'org-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Anyone can view org logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'org-logos');

-- Authenticated users can upload logos to their org's folder
CREATE POLICY "Org members can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'org-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT uor.organization_id::text FROM public.user_org_roles uor
    WHERE uor.user_id = auth.uid()
  )
);

-- Org members can update their org's logos
CREATE POLICY "Org members can update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'org-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT uor.organization_id::text FROM public.user_org_roles uor
    WHERE uor.user_id = auth.uid()
  )
);

-- Org members can delete their org's logos
CREATE POLICY "Org members can delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'org-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT uor.organization_id::text FROM public.user_org_roles uor
    WHERE uor.user_id = auth.uid()
  )
);
