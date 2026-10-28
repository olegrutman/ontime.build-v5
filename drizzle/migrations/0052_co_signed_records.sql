ALTER TABLE public.change_orders
  ADD COLUMN IF NOT EXISTS owner_signed_record_path text,
  ADD COLUMN IF NOT EXISTS architect_signed_record_path text;

CREATE POLICY "CO participants read signed records"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'co-signed-records'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND public.can_access_change_order(((storage.foldername(name))[1])::uuid, auth.uid())
);