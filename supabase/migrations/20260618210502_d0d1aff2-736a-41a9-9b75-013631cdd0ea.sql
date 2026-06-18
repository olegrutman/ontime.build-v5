
CREATE POLICY "co-voice-notes upload own org"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'co-voice-notes'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM public.user_org_roles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "co-voice-notes read own org"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'co-voice-notes'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM public.user_org_roles WHERE user_id = auth.uid()
  )
);
