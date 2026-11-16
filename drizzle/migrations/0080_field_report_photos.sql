CREATE TABLE public.field_report_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.field_reports(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL,
  storage_path text NOT NULL UNIQUE,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.field_report_photos TO authenticated;
GRANT ALL ON public.field_report_photos TO service_role;

ALTER TABLE public.field_report_photos ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_view_field_report_photos(_user uuid, _report uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.field_reports r
    WHERE r.id = _report
      AND public.can_see_project(r.project_id)
      AND (
        public.user_in_org(_user, r.crew_org_id)
        OR public.user_in_org(_user, r.reviewer_org_id)
        OR (
          public.is_project_participant(_user, r.project_id)
          AND EXISTS (
            SELECT 1 FROM public.field_report_items i
            WHERE i.report_id = r.id AND i.status IN ('released', 'converted')
          )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_upload_field_report_photo(_report uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.field_reports r
    WHERE r.id = _report
      AND r.status = 'draft'
      AND public.can_see_project(r.project_id)
      AND public.user_in_org(auth.uid(), r.crew_org_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_field_report_photo_object(_object_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  _report uuid;
BEGIN
  BEGIN
    _report := (storage.foldername(_object_name))[1]::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;
  RETURN public.can_view_field_report_photos(auth.uid(), _report);
END;
$$;

CREATE POLICY field_report_photos_select
ON public.field_report_photos FOR SELECT TO authenticated
USING (public.can_view_field_report_photos(auth.uid(), report_id));

CREATE POLICY field_report_photos_insert
ON public.field_report_photos FOR INSERT TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND public.can_upload_field_report_photo(report_id)
  AND EXISTS (
    SELECT 1 FROM public.field_reports r
    WHERE r.id = report_id AND r.project_id = field_report_photos.project_id
  )
);

CREATE POLICY field_report_photos_delete
ON public.field_report_photos FOR DELETE TO authenticated
USING (uploaded_by = auth.uid() AND public.can_upload_field_report_photo(report_id));

CREATE POLICY field_report_photos_storage_read
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'field-report-photos' AND public.can_access_field_report_photo_object(name));

CREATE POLICY field_report_photos_storage_insert
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'field-report-photos'
  AND public.can_upload_field_report_photo(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY field_report_photos_storage_delete
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'field-report-photos'
  AND owner = auth.uid()
  AND public.can_upload_field_report_photo(((storage.foldername(name))[1])::uuid)
);

CREATE INDEX field_report_photos_report_idx ON public.field_report_photos(report_id, created_at);
CREATE INDEX field_report_photos_project_idx ON public.field_report_photos(project_id, created_at);